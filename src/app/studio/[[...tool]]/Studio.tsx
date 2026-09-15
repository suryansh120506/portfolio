"use client";

import { NextStudio } from "next-sanity/studio";
import config from "../../../../sanity.config";

/**
 * The Studio itself, behind a client boundary.
 *
 * This separation is load-bearing, not stylistic. Importing `sanity.config`
 * from the server page pulled the whole Sanity library into the React Server
 * Components graph, where `swr` resolves to its `react-server` build — which
 * has no default export, so the build failed outright. Keeping the config
 * behind "use client" keeps it out of the RSC layer entirely.
 *
 * The Studio is a browser application regardless: it talks to Sanity's API
 * directly and there is nothing meaningful to render on the server.
 */
export default function Studio() {
  return <NextStudio config={config} />;
}
