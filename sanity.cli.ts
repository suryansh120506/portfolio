import { defineCliConfig } from "sanity/cli";
import { dataset, projectId } from "./src/sanity/env";

/**
 * Powers the `sanity` CLI (dataset exports, migrations, `sanity deploy`).
 * The Studio itself is served by Next at /studio, not by the CLI.
 */
export default defineCliConfig({
  api: { projectId, dataset },
  autoUpdates: true,
});
