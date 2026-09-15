import type { StructureResolver } from "sanity/structure";

/**
 * Studio sidebar, ordered to match the page top to bottom rather than
 * alphabetically, so editing follows the section you are looking at.
 *
 * `siteSettings` and `beyondTheCode` are singletons: they are pinned as a
 * single editable document instead of a list you could accidentally create a
 * second copy in.
 */
export const structure: StructureResolver = (S) =>
  S.list()
    .title("Portfolio")
    .items([
      S.listItem()
        .title("Site settings")
        .id("siteSettings")
        .child(S.document().schemaType("siteSettings").documentId("siteSettings")),
      S.divider(),
      S.documentTypeListItem("project").title("Projects"),
      S.documentTypeListItem("record").title("Record / Accolades"),
      S.documentTypeListItem("experienceNode").title("Experience"),
      S.documentTypeListItem("beyondCategory").title("Beyond rows"),
      S.listItem()
        .title("Beyond the code")
        .id("beyondTheCode")
        .child(S.document().schemaType("beyondTheCode").documentId("beyondTheCode")),
    ]);
