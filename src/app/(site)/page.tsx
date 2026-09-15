// Server Component — deliberately no "use client".
//
// Content resolves through `getSiteContent()`, which reads from Sanity when
// it is configured and from the local store otherwise. Reading happens on
// the server so neither `node:fs` nor any Sanity credential reaches the
// browser.

import DomLayer from "@/components/DomLayer";
import { getSiteContent } from "@/lib/content";
import { readProjects } from "@/lib/projects";
import { readMediaManifest } from "@/lib/media-manifest";

// The local store is written at runtime by the media panel, so this route
// must not be frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [content, projects, media] = await Promise.all([
    getSiteContent(),
    readProjects(),
    readMediaManifest(),
  ]);

  return <DomLayer content={content} projects={projects} media={media} />;
}
