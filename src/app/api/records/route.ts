import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { readRecords, writeRecords, recordId } from "@/lib/records";

/**
 * Record (accolade) CRUD. Every write is authorised server-side against
 * ADMIN_TOKEN, exactly like the project and media endpoints.
 *
 * The logo is NOT handled here — it is an upload, so it goes through
 * /api/media under the `record:<id>` slot, which keeps every file write in
 * one place with one set of type and size checks.
 */

function field(body: Record<string, unknown>, key: string, max = 120): string {
  const value = typeof body[key] === "string" ? (body[key] as string).trim() : "";
  return value.slice(0, max);
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

  const name = field(body, "name", 48);
  if (!name) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  const rows = await readRecords();
  const id = field(body, "id") || recordId(name, rows);
  const existing = rows.find((row) => row.id === id);

  const entry = {
    id,
    name,
    organiser: field(body, "organiser", 48),
    outcome: field(body, "outcome", 90),
    year: field(body, "year", 12),
    // Editing a row must not wipe a logo that was uploaded separately.
    logo: existing?.logo ?? null,
  };

  await writeRecords(
    existing
      ? rows.map((row) => (row.id === id ? entry : row))
      : [...rows, entry],
  );

  return NextResponse.json({ ok: true, id });
}

export async function DELETE(request: Request) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = new URL(request.url).searchParams.get("id") ?? "";
  const rows = await readRecords();
  await writeRecords(rows.filter((row) => row.id !== id));

  return NextResponse.json({ ok: true });
}
