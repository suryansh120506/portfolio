import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * File-backed project store.
 *
 * Projects are authored by the operator through the admin panel rather than
 * scraped from GitHub — GitHub cannot supply thumbnails or a live URL you
 * control, and a repo list is not a portfolio.
 *
 * SERVER ONLY. This module touches `node:fs`; importing it from a client
 * component will fail the build, which is the intended guard rail.
 *
 * DEPLOYMENT LIMIT: writes land on the local filesystem. Fine in dev and on a
 * persistent server; on serverless hosts (Vercel, Netlify) the filesystem is
 * read-only and ephemeral, so swap `readStore`/`writeStore` for a database or
 * object store. Nothing else needs to change.
 */

export type Project = {
  id: string;
  title: string;
  summary: string;
  /** Short mono line under the title, e.g. "Node.js · Prisma". */
  stack: string;
  year: string;
  liveUrl: string | null;
  repoUrl: string | null;
  /** Public path, set by the media endpoint. Null until one is uploaded. */
  thumbnail: string | null;
};

const STORE_DIR = path.join(process.cwd(), "content");
const STORE_FILE = path.join(STORE_DIR, "projects.json");

/** Shipped so the section is never empty on a fresh clone. */
const SEED: Project[] = [
  {
    id: "snop-vantage",
    title: "Snop Vantage",
    summary:
      "Architected a Node.js/TypeScript geofencing engine automating 25% anomaly claims, backed by Prisma ORM ledger rollbacks.",
    stack: "TypeScript · Node.js · Prisma",
    year: "2026",
    liveUrl: null,
    repoUrl: null,
    thumbnail: null,
  },
  {
    id: "quant-engine",
    title: "QuantEngine",
    summary:
      "A 3-layer stacked LSTM that extracts temporal price signatures from raw NSE volatility, with inference logic decoupled behind strict SDLC boundaries.",
    stack: "Python · PyTorch",
    year: "2026",
    liveUrl: null,
    repoUrl: "https://github.com/suryansh120506/QuantEngine",
    thumbnail: null,
  },
  {
    id: "ticx",
    title: "TicX",
    summary:
      "A PyTorch forecasting engine utilizing Stacked LSTMs and NLP pipelines to model market volatility from live financial news feeds.",
    stack: "TypeScript · React",
    year: "2026",
    liveUrl: "https://ticx-cyan.vercel.app",
    repoUrl: "https://github.com/suryansh120506/TicX",
    thumbnail: null,
  },
];

/**
 * Accepts only http(s). A stored `javascript:` URL becomes an XSS sink the
 * moment it is rendered into an href, so anything else resolves to null.
 */
export function sanitiseLink(value: unknown): string | null {
  const candidate = typeof value === "string" ? value.trim() : "";
  return /^https?:\/\//i.test(candidate) ? candidate : null;
}

function normalise(value: unknown): Project | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  if (!id || !title) return null;

  const text = (key: string) =>
    typeof raw[key] === "string" ? (raw[key] as string).trim() : "";
  const link = (key: string) => sanitiseLink(raw[key]);

  return {
    id,
    title,
    summary: text("summary"),
    stack: text("stack"),
    year: text("year"),
    liveUrl: link("liveUrl"),
    repoUrl: link("repoUrl"),
    thumbnail: text("thumbnail").startsWith("/") ? text("thumbnail") : null,
  };
}

export async function readProjects(): Promise<Project[]> {
  try {
    const raw = await readFile(STORE_FILE, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return SEED;
    const rows = parsed.map(normalise).filter((row): row is Project => !!row);
    return rows.length ? rows : SEED;
  } catch {
    // No store yet (or unreadable) — fall back to the seed rather than 500.
    return SEED;
  }
}

export async function writeProjects(projects: Project[]): Promise<void> {
  const clean = projects.map(normalise).filter((row): row is Project => !!row);
  await mkdir(STORE_DIR, { recursive: true });
  await writeFile(STORE_FILE, JSON.stringify(clean, null, 2), "utf8");
}

/** Slug safe for both a filename and a DOM id. */
export function toId(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
