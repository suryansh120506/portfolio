import { createClient } from "next-sanity";
import imageUrlBuilder, { type SanityImageSource } from "@sanity/image-url";
import { apiVersion, dataset, isSanityConfigured, projectId } from "./env";

/**
 * Read-only Sanity client for the front end.
 *
 * `useCdn` is on: this reads published content on a page that is already
 * `force-dynamic`, so the few seconds of CDN staleness costs nothing and the
 * latency saving is real.
 *
 * No token is set here on purpose. This client only ever reads published
 * documents, so it needs no credentials — and since anything with a token
 * must stay server-side, leaving it out removes the chance of one leaking
 * into a client bundle later.
 */
export const sanityClient = isSanityConfigured
  ? createClient({ projectId, dataset, apiVersion, useCdn: true })
  : null;

const builder = sanityClient ? imageUrlBuilder(sanityClient) : null;

/**
 * Resolves a Sanity image reference to a CDN URL.
 *
 * Width is baked into the URL so Sanity does the heavy resize at the edge
 * and `next/image` is only ever handed a sensibly-sized original — asking
 * the optimiser to fetch a 4000px upload just to emit a 640px file wastes
 * the transfer twice.
 *
 * Returns null when Sanity is unconfigured or the reference is empty, which
 * every caller already handles as "no image".
 */
export function imageUrl(
  source: SanityImageSource | null | undefined,
  width = 1200,
): string | null {
  if (!builder || !source) return null;
  try {
    return builder.image(source).width(width).auto("format").fit("max").url();
  } catch {
    // A malformed reference should degrade to a placeholder, not a crash.
    return null;
  }
}
