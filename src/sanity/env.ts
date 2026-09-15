/**
 * Sanity environment, read defensively.
 *
 * `projectId` is intentionally allowed to be empty. The studio route checks
 * `isSanityConfigured` and renders setup instructions instead of mounting the
 * Studio, so a clone of this repo with no Sanity project still builds and the
 * site still runs — the CMS is additive, not a hard dependency.
 *
 * Set these in `.env.local` (which is gitignored):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID=...
 *   NEXT_PUBLIC_SANITY_DATASET=production
 *
 * Both are NEXT_PUBLIC_ by necessity — the embedded Studio runs in the
 * browser and needs them. They are not secrets; a project id identifies a
 * dataset, it does not grant write access. Writes are authorised by the
 * Sanity login session, and any read token you add later must stay
 * server-side.
 */

export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";

export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

/** Pinned so a future API change cannot silently alter query results. */
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2026-01-01";

export const isSanityConfigured = projectId.trim().length > 0;
