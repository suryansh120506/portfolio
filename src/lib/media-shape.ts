/**
 * The manifest's SHAPE, with no filesystem access — safe to import from
 * client components.
 *
 * `media-manifest.ts` reads and writes the file and therefore imports
 * `node:fs/promises`; pulling anything from it into a client component drags
 * that into the browser bundle and fails the build outright. Anything both
 * sides need lives here instead.
 */

/**
 * Resolved paths for the fixed image slots, keyed by slot id. Most slots hold
 * one path; a gallery slot (Fading Echoes) holds an ordered array.
 */
export type MediaManifest = Record<string, string | string[]>;

/** Normalises a manifest entry (absent, single path, or array) to an array. */
export function toMediaArray(value: string | string[] | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return [value];
  return [];
}
