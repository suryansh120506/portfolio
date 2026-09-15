import { defineField, defineType } from "sanity";

/**
 * A shipped project — the cards in the WORK section.
 *
 * Fields mirror the shape already used by `lib/projects.ts` so migrating the
 * file-backed store to Sanity is a mapping exercise rather than a rewrite:
 *   id → slug.current, title, summary, stack, year, liveUrl, repoUrl,
 *   thumbnail → image asset.
 */
export const project = defineType({
  name: "project",
  title: "Project",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description:
        "Stable id used in URLs and to match the existing thumbnail files.",
      options: { source: "title", maxLength: 64 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description: "Two or three lines. This is what the card shows.",
      validation: (rule) => rule.required().max(320),
    }),
    defineField({
      name: "stack",
      title: "Stack",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "Rendered joined with · on the card.",
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
      validation: (rule) => rule.max(12),
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      options: { hotspot: true },
      description: "Landscape works best — the card crops to 16:10.",
    }),
    defineField({
      name: "liveUrl",
      title: "Live URL",
      type: "url",
      description: "The deployed site. Leave empty if it is not public.",
    }),
    defineField({
      name: "repoUrl",
      title: "Repository URL",
      type: "url",
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first in the WORK rail.",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Display order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "title", subtitle: "year", media: "thumbnail" },
  },
});
