import { NextResponse } from "next/server";
import {
  readProjects,
  writeProjects,
  toId,
  sanitiseLink,
  type Project,
} from "@/lib/projects";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Project CRUD. Reads are public (the page renders from them); every write is
 * authorised server-side against `ADMIN_TOKEN`.
 */

export async function GET() {
  return NextResponse.json({ projects: await readProjects() });
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const input = body as Partial<Project> & { id?: string };
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const id = (input.id && toId(input.id)) || toId(title);
  if (!id) {
    return NextResponse.json({ error: "Title must contain letters or digits." }, { status: 400 });
  }

  const projects = await readProjects();
  const existing = projects.find((project) => project.id === id);

  const next: Project = {
    id,
    title,
    summary: String(input.summary ?? existing?.summary ?? "").trim(),
    stack: String(input.stack ?? existing?.stack ?? "").trim(),
    year: String(input.year ?? existing?.year ?? "").trim(),
    // Sanitise here too, so the record we echo back is exactly what is stored.
    liveUrl: sanitiseLink(input.liveUrl ?? existing?.liveUrl),
    repoUrl: sanitiseLink(input.repoUrl ?? existing?.repoUrl),
    // Thumbnails are owned by the media endpoint; never clobber one here.
    thumbnail: existing?.thumbnail ?? null,
  };

  const updated = existing
    ? projects.map((project) => (project.id === id ? next : project))
    : [...projects, next];

  await writeProjects(updated);
  return NextResponse.json({ ok: true, project: next, created: !existing });
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const projects = await readProjects();
  const remaining = projects.filter((project) => project.id !== id);

  if (remaining.length === projects.length) {
    return NextResponse.json({ error: "No such project." }, { status: 404 });
  }

  await writeProjects(remaining);
  return NextResponse.json({ ok: true });
}
