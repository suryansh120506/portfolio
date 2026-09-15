import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { toId } from "./projects";

/**
 * File-backed store for the Record rail (accolades).
 *
 * Same shape as the project store, deliberately: one file per collection,
 * seeded so a fresh clone is never empty, and every row normalised on the
 * way in and out so a hand-edited JSON file cannot inject a bad field.
 *
 * `logo` is written by the media endpoint under the `record:<id>` slot — one
 * image per entry, which is all a logo tile can show.
 *
 * SERVER ONLY — touches `node:fs`.
 */

export type RecordEntry = {
  id: string;
  name: string;
  organiser: string;
  outcome: string;
  year: string;
  /** Public path, set by the media endpoint. Null until one is uploaded. */
  logo: string | null;
};

const STORE_DIR = path.join(process.cwd(), "content");
const STORE_FILE = path.join(STORE_DIR, "records.json");

/** Mirrors what was in data.ts, so the rail looks the same before any edit. */
const SEED: RecordEntry[] = [
  {
    id: "foodoscope",
    name: "Foodoscope",
    organiser: "IIIT Delhi",
    outcome: "National Finalist — scalable schema architecture",
    year: "2026",
    logo: null,
  },
  {
    id: "rift-26",
    name: "RIFT '26",
    organiser: "24-hour build",
    outcome: "Shipped a full API deployment layer",
    year: "2026",
    logo: null,
  },
  {
    id: "escape-room",
    name: "Escape Room",
    organiser: "Tech Challenge",
    outcome: "Podium finish — C++/Python bug-fixing",
    year: "2025",
    logo: null,
  },
  {
    id: "mckinsey-forward",
    name: "McKinsey Forward",
    organiser: "Programme",
    outcome: "Executive management frameworks",
    year: "2025",
    logo: null,
  },
];

function normalise(value: unknown): RecordEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim() : "";

  const id = text("id");
  const name = text("name");
  if (!id || !name) return null;

  const logo = text("logo");

  return {
    id,
    name,
    organiser: text("organiser"),
    outcome: text("outcome"),
    year: text("year"),
    // Only a public path is ever accepted, so a stored value cannot point at
    // an arbitrary origin once it reaches an <img src>.
    logo: logo.startsWith("/") ? logo : null,
  };
}

export async function readRecords(): Promise<RecordEntry[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED;
    const rows = parsed
      .map(normalise)
      .filter((row): row is RecordEntry => !!row);
    return rows.length ? rows : SEED;
  } catch {
    return SEED;
  }
}

export async function writeRecords(rows: RecordEntry[]): Promise<void> {
  const clean = rows.map(normalise).filter((row): row is RecordEntry => !!row);
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(clean, null, 2), "utf8");
}

/** Unique slug for a new entry, so two "Hackathon" rows cannot collide. */
export function recordId(name: string, existing: RecordEntry[]): string {
  const base = toId(name) || "record";
  if (!existing.some((row) => row.id === base)) return base;
  let n = 2;
  while (existing.some((row) => row.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}
