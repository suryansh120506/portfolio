import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { toMediaArray, type MediaManifest } from "./media-shape";

/**
 * Resolves the actual, current file(s) behind each fixed image slot (hero
 * portrait, the four Beyond rows — one of which, Fading Echoes, is a small
 * gallery instead of a single image).
 *
 * The bug this exists to fix: an uploaded file is saved with whatever
 * extension matches its real MIME type (`profile.png`, `profile.webp`, …),
 * but the page's default copy in `data.ts` names one fixed extension
 * (`/images/profile.jpg`). A PNG upload — the Windows screenshot default —
 * would then write to a path the page never requests, so nothing ever
 * appeared to change after a successful upload.
 *
 * The fix mirrors how project thumbnails already work: the resolved path is
 * recorded server-side (here, not per-project but per fixed slot) and read at
 * request time, instead of being assumed from a hardcoded string. A gallery
 * slot records an array instead of one string; every other slot still holds
 * exactly one.
 *
 * SERVER ONLY — touches `node:fs`. The manifest's shape and its normaliser
 * live in `media-shape.ts` so client components can read the manifest they
 * are handed without dragging the filesystem into the browser bundle.
 */

const MANIFEST_DIR = path.join(process.cwd(), "content");
const MANIFEST_FILE = path.join(MANIFEST_DIR, "media.json");

export type { MediaManifest };

async function writeManifest(manifest: MediaManifest): Promise<void> {
  await mkdir(MANIFEST_DIR, { recursive: true });
  await writeFile(MANIFEST_FILE, JSON.stringify(manifest, null, 2), "utf8");
}

export async function readMediaManifest(): Promise<MediaManifest> {
  try {
    const raw = await readFile(MANIFEST_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};

    const clean: MediaManifest = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "string" && value.startsWith("/")) {
        clean[key] = value;
      } else if (Array.isArray(value)) {
        const items = value.filter(
          (item): item is string => typeof item === "string" && item.startsWith("/"),
        );
        if (items.length > 0) clean[key] = items;
      }
    }
    return clean;
  } catch {
    // No manifest yet — every slot falls back to its default in data.ts.
    return {};
  }
}

export async function setMediaSlot(slot: string, publicPath: string | null): Promise<void> {
  const manifest = await readMediaManifest();
  if (publicPath) manifest[slot] = publicPath;
  else delete manifest[slot];
  await writeManifest(manifest);
}

/** Appends one path to a gallery slot, creating it if this is its first item. */
export async function appendMediaGalleryItem(
  slot: string,
  publicPath: string,
): Promise<string[]> {
  const manifest = await readMediaManifest();
  const next = [...toMediaArray(manifest[slot]), publicPath];
  manifest[slot] = next;
  await writeManifest(manifest);
  return next;
}

/** Removes one path from a gallery slot; drops the key entirely once empty. */
export async function removeMediaGalleryItem(
  slot: string,
  publicPath: string,
): Promise<string[]> {
  const manifest = await readMediaManifest();
  const next = toMediaArray(manifest[slot]).filter((item) => item !== publicPath);
  if (next.length > 0) manifest[slot] = next;
  else delete manifest[slot];
  await writeManifest(manifest);
  return next;
}
