import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { toId } from "./projects";

/**
 * File-backed store for the Experience timeline.
 *
 * `stack` and `metrics` are arrays here but are edited as text in the panel
 * (comma-separated and one-per-line respectively) — splitting happens at the
 * API boundary so the stored shape stays structured rather than becoming a
 * blob the renderer has to parse.
 *
 * SERVER ONLY — touches `node:fs`.
 */

export type ExperienceEntry = {
  id: string;
  /** Rail marker — "Node A", "Node B". */
  node: string;
  company: string;
  role: string;
  timeline: string;
  location: string;
  stack: string[];
  metrics: string[];
};

const STORE_DIR = path.join(process.cwd(), "content");
const STORE_FILE = path.join(STORE_DIR, "experience.json");

/** Mirrors data.ts so the timeline is unchanged before any edit. */
const SEED: ExperienceEntry[] = [
  {
    id: "vk-global",
    node: "Node A",
    company: "VK Global Digital",
    role: "Software Engineering Intern",
    timeline: "Aug 2026 — Present",
    location: "Faridabad, India",
    stack: ["TypeScript", "Node.js", "Prisma ORM", "React Native"],
    metrics: [
      "Spearheaded Snop Vantage cross-platform CRM.",
      "Architected Node.js/TypeScript geofence engine flagging 25% anomaly claims.",
      "Engineered Prisma ORM automatic ledger rollbacks.",
    ],
  },
  {
    id: "genero",
    node: "Node B",
    company: "Genero Technology",
    role: "Data Analyst Intern",
    timeline: "May 2026 — July 2026",
    location: "New Delhi, India",
    stack: ["Python", "SQL", "LLM Tooling"],
    metrics: [
      "Engineered Python/SQL extraction scripts reducing wrangling by 5+ hours weekly.",
      "Integrated LLM assistants for EDA.",
    ],
  },
];

function normalise(value: unknown): ExperienceEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;

  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
  const list = (key: string) =>
    Array.isArray(raw[key])
      ? (raw[key] as unknown[])
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

  const id = text("id");
  const company = text("company");
  if (!id || !company) return null;

  return {
    id,
    node: text("node"),
    company,
    role: text("role"),
    timeline: text("timeline"),
    location: text("location"),
    stack: list("stack"),
    metrics: list("metrics"),
  };
}

export async function readExperience(): Promise<ExperienceEntry[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED;
    const rows = parsed
      .map(normalise)
      .filter((row): row is ExperienceEntry => !!row);
    return rows.length ? rows : SEED;
  } catch {
    return SEED;
  }
}

export async function writeExperience(rows: ExperienceEntry[]): Promise<void> {
  const clean = rows
    .map(normalise)
    .filter((row): row is ExperienceEntry => !!row);
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(clean, null, 2), "utf8");
}

export function experienceId(
  company: string,
  existing: ExperienceEntry[],
): string {
  const base = toId(company) || "node";
  if (!existing.some((row) => row.id === base)) return base;
  let n = 2;
  while (existing.some((row) => row.id === `${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** "Node A", "Node B", … for a new row, continuing from what exists. */
export function nextNodeLabel(existing: ExperienceEntry[]): string {
  const letter = String.fromCharCode(65 + existing.length);
  return `Node ${letter <= "Z" ? letter : "X"}`;
}
