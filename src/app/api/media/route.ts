import { NextResponse } from "next/server";
import { mkdir, writeFile, unlink, readdir } from "node:fs/promises";
import path from "node:path";
import { requireAdmin } from "@/lib/admin-auth";
import { readProjects, writeProjects, toId } from "@/lib/projects";
import { readRecords, writeRecords } from "@/lib/records";
import {
  setMediaSlot,
  readMediaManifest,
  appendMediaGalleryItem,
  removeMediaGalleryItem,
} from "@/lib/media-manifest";
import { toMediaArray } from "@/lib/media-shape";

/**
 * Admin media endpoint — upload and delete the site's images.
 *
 * SECURITY MODEL, stated plainly:
 *  - Every request is authorised on the SERVER against `ADMIN_TOKEN`. The
 *    secret never ships to the browser, so a visitor cannot discover it by
 *    reading the bundle. Without a matching token every write is refused.
 *  - The token is compared in constant time to avoid leaking it a character
 *    at a time through response timing.
 *  - Writes are confined to a fixed allow-list of destinations and the
 *    resolved path is re-checked against its root, so a crafted filename
 *    cannot escape into the rest of the repo.
 *
 * This is a single-operator gate, not a user system: anyone holding the token
 * is you. Keep it out of version control.
 *
 * WHY FILENAMES ARE VERSIONED: Next's image optimiser caches by URL. Writing
 * every upload for a slot to the same filename means the URL never changes, so
 * a re-upload kept serving the previous image from cache even though the bytes
 * on disk had already been replaced. Stamping the filename gives each upload a
 * genuinely new URL, which no cache layer — optimiser, browser or CDN — can
 * confuse with the old one. Prior files for the slot are deleted on write, so
 * a slot still holds exactly one file.
 *
 * DEPLOYMENT LIMIT: this writes to `public/` on the local filesystem. That
 * works in local dev and on a persistent server, but NOT on serverless hosts
 * (Vercel, Netlify), where the filesystem is read-only and ephemeral. To ship
 * there, swap the fs calls for an object-store SDK — the auth and validation
 * above stay exactly as they are.
 */

const MAX_BYTES = 8 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const EXTENSION: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

const EXTENSIONS = Object.values(EXTENSION);

/**
 * Separator between a slot's base name and its version stamp.
 *
 * Deliberately `__`: `toId` collapses every non-alphanumeric character to `-`,
 * so a double underscore can never occur inside a slug. A single `-` would be
 * ambiguous — slot `ticx` would match the file belonging to slot `ticx-2`.
 */
const VERSION_MARK = "__v";

/** Only these destinations may be written to. */
const SLOTS: Record<string, { dir: string; base: string }> = {
  profile: { dir: "images", base: "profile" },
  "beyond-fading-echoes": { dir: "images/beyond", base: "fading-echoes" },
  "beyond-acoustic": { dir: "images/beyond", base: "acoustic" },
};

/**
 * Slots that hold a small gallery instead of one image: an upload here is
 * appended, never overwrites the previous file, and each item is removed
 * individually (by its own path, not by clearing the whole slot).
 *
 * Every Beyond row is a gallery — the front end renders one image as a
 * still and crossfades two or more, so there is no reason for a row to be
 * capped at a single photo.
 */
const GALLERY_SLOTS = new Set(["beyond-fading-echoes", "beyond-acoustic"]);
const MAX_GALLERY_ITEMS = 8;

const PUBLIC_ROOT = path.join(process.cwd(), "public");

/**
 * Resolves a slot to its directory and base name, refusing anything outside
 * public/.
 *
 * Fixed slots come from the allow-list; project thumbnails are dynamic, so the
 * id is re-slugged through `toId` before it can touch a path — a crafted id
 * cannot introduce separators or dots.
 */
function slotTarget(slot: string) {
  let entry = SLOTS[slot];

  if (!entry && slot.startsWith("project:")) {
    const id = toId(slot.slice("project:".length));
    if (id) entry = { dir: "images/projects", base: id };
  }

  if (!entry && slot.startsWith("record:")) {
    const id = toId(slot.slice("record:".length));
    if (id) entry = { dir: "images/records", base: id };
  }

  if (!entry) return null;

  const dir = path.join(PUBLIC_ROOT, entry.dir);

  // Defence in depth: even with a fixed allow-list, confirm we stayed inside.
  const relative = path.relative(PUBLIC_ROOT, dir);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  return { dir, base: entry.base, publicDir: entry.dir };
}

/** Every file currently belonging to a slot, including the pre-version scheme. */
async function filesForSlot(dir: string, base: string): Promise<string[]> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }

  return entries.filter((name) => {
    const ext = path.extname(name);
    if (!EXTENSIONS.includes(ext)) return false;
    const stem = name.slice(0, -ext.length);
    // `base` exactly (legacy) or `base__v<stamp>` (current).
    return stem === base || stem.startsWith(`${base}${VERSION_MARK}`);
  });
}

async function removeSlotFiles(dir: string, base: string): Promise<number> {
  const names = await filesForSlot(dir, base);
  let removed = 0;
  for (const name of names) {
    try {
      await unlink(path.join(dir, name));
      removed++;
    } catch {
      // Already gone — nothing to do.
    }
  }
  return removed;
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected form data." }, { status: 400 });
  }

  const slot = String(form.get("slot") ?? "");
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file supplied." }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported type: ${file.type || "unknown"}.` },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Too large — limit is ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 },
    );
  }

  const target = slotTarget(slot);
  if (!target) {
    return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
  }

  const isGallery = GALLERY_SLOTS.has(slot);

  if (isGallery) {
    const manifest = await readMediaManifest();
    const count = toMediaArray(manifest[slot]).length;
    if (count >= MAX_GALLERY_ITEMS) {
      return NextResponse.json(
        {
          error: `Gallery is full — remove a photo before adding another (max ${MAX_GALLERY_ITEMS}).`,
        },
        { status: 409 },
      );
    }
  }

  const extension = EXTENSION[file.type];
  const stamp = Date.now().toString(36);
  const filename = `${target.base}${VERSION_MARK}${stamp}${extension}`;
  const publicPath = `/${target.publicDir}/${filename}`;

  try {
    await mkdir(target.dir, { recursive: true });

    // Single-image slots hold exactly one file: clear it first, then write —
    // the cleanup pattern would otherwise match the file we just wrote and
    // delete it. Gallery slots are additive, so existing files are left alone.
    if (!isGallery) {
      await removeSlotFiles(target.dir, target.base);
    }
    await writeFile(
      path.join(target.dir, filename),
      Buffer.from(await file.arrayBuffer()),
    );
  } catch (error) {
    console.error("[media] write failed:", error);
    return NextResponse.json({ error: "Write failed." }, { status: 500 });
  }

  if (slot.startsWith("project:")) {
    const id = toId(slot.slice("project:".length));
    const projects = await readProjects();
    await writeProjects(
      projects.map((project) =>
        project.id === id ? { ...project, thumbnail: publicPath } : project,
      ),
    );
  } else if (slot.startsWith("record:")) {
    const id = toId(slot.slice("record:".length));
    const rows = await readRecords();
    await writeRecords(
      rows.map((row) => (row.id === id ? { ...row, logo: publicPath } : row)),
    );
  } else if (isGallery) {
    await appendMediaGalleryItem(slot, publicPath);
  } else {
    // Fixed slots (hero portrait, Beyond images) carry a default path in
    // data.ts. Recording the ACTUAL written path here is what lets an upload
    // in any supported format, under any version stamp, reach the page.
    await setMediaSlot(slot, publicPath);
  }

  return NextResponse.json({ ok: true, path: publicPath });
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const slot = String(params.get("slot") ?? "");
  const requestedPath = params.get("path");

  const target = slotTarget(slot);
  if (!target) {
    return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
  }

  if (GALLERY_SLOTS.has(slot)) {
    if (!requestedPath) {
      return NextResponse.json(
        { error: "Missing path for gallery item." },
        { status: 400 },
      );
    }

    // The path must resolve to exactly one file inside this slot's own
    // directory — otherwise a crafted `path` could unlink anything on disk.
    const filename = path.basename(requestedPath);
    const expectedPrefix = `/${target.publicDir}/`;
    const isInSlot =
      requestedPath.startsWith(expectedPrefix) &&
      requestedPath.slice(expectedPrefix.length) === filename;
    if (!isInSlot) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    }

    await unlink(path.join(target.dir, filename)).catch(() => {});
    const remaining = await removeMediaGalleryItem(slot, requestedPath);
    return NextResponse.json({ ok: true, removed: 1, remaining: remaining.length });
  }

  const removed = await removeSlotFiles(target.dir, target.base);

  if (slot.startsWith("project:")) {
    const id = toId(slot.slice("project:".length));
    const projects = await readProjects();
    await writeProjects(
      projects.map((project) =>
        project.id === id ? { ...project, thumbnail: null } : project,
      ),
    );
  } else if (slot.startsWith("record:")) {
    const id = toId(slot.slice("record:".length));
    const rows = await readRecords();
    await writeRecords(
      rows.map((row) => (row.id === id ? { ...row, logo: null } : row)),
    );
  } else {
    await setMediaSlot(slot, null);
  }

  return NextResponse.json({ ok: true, removed });
}
