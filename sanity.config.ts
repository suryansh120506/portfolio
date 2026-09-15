import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { apiVersion, dataset, projectId } from "./src/sanity/env";

/**
 * Embedded Studio config, served at /studio.
 *
 * `projectId` may be an empty string when nothing is configured yet. That is
 * safe here — `defineConfig` does not validate, and the /studio route checks
 * `isSanityConfigured` and shows setup steps rather than mounting a Studio
 * that would throw. The site itself never imports this file.
 */
export default defineConfig({
  name: "portfolio",
  title: "Suryansh Tripathi — Portfolio",
  basePath: "/studio",
  projectId,
  dataset,
  schema: { types: schemaTypes },
  plugins: [
    structureTool({ structure }),
    // Query the dataset with GROQ from inside the Studio. Handy when wiring
    // the front end up to these documents later.
    visionTool({ defaultApiVersion: apiVersion }),
  ],
});
