import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import {
  readExperience,
  writeExperience,
  experienceId,
  nextNodeLabel,
} from "@/lib/experience-store";

/**
 * Experience timeline CRUD.
 *
 * `stack` arrives comma-separated and `metrics` one per line, because that is
 * how they are natural to type. Splitting happens here rather than in the
 * store so the stored shape stays structured.
 */

function field(body: Record<string, unknown>, key: string, max = 160): string {
  const value = typeof body[key] === "string" ? (body[key] as string).trim() : "";
  return value.slice(0, max);
}

function split(value: string, separator: RegExp, cap: number): string[] {
  return value
    .split(separator)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, cap);
}

export async function POST(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected JSON." }, { status: 400 });
  }

  const company = field(body, "company", 80);
  if (!company) {
    return NextResponse.json(
      { error: "A company is required." },
      { status: 400 },
    );
  }

  const rows = await readExperience();
  const id = field(body, "id") || experienceId(company, rows);
  const isEdit = rows.some((row) => row.id === id);

  const entry = {
    id,
    node: field(body, "node", 24) || nextNodeLabel(rows),
    company,
    role: field(body, "role", 80),
    timeline: field(body, "timeline", 48),
    location: field(body, "location", 64),
    stack: split(field(body, "stack", 400), /,/, 10),
    metrics: split(field(body, "metrics", 1200), /\r?\n/, 8),
  };

  await writeExperience(
    isEdit ? rows.map((row) => (row.id === id ? entry : row)) : [...rows, entry],
  );

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const rows = await readExperience();
  await writeExperience(rows.filter((row) => row.id !== id));

  return NextResponse.json({ ok: true });
}
