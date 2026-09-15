import { defineField, defineType } from "sanity";

/**
 * A Beyond row — Fading Echoes, Raw Acoustics.
 *
 * `images` is an ARRAY on every row, not just the band one. That is the
 * point of this type: any row can hold a single photo or a set, and the
 * front end crossfades whatever it is given. One image renders as a still;
 * several cycle. So adding performance shots to Raw Acoustics is an upload,
 * not a code change.
 */
export const beyondCategory = defineType({
  name: "beyondCategory",
  title: "Beyond row",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: "index",
      title: "Index",
      type: "string",
      description: 'The small number beside the title — "01", "02".',
      validation: (rule) => rule.max(4),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      description: 'The line under the title — "Founder · Lead Guitarist".',
    }),
    defineField({
      name: "detail",
      title: "Detail",
      type: "text",
      rows: 4,
      validation: (rule) => rule.required().max(420),
    }),
    defineField({
      name: "facts",
      title: "Facts",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "The rounded chips under the copy.",
    }),
    defineField({
      name: "images",
      title: "Images",
      type: "array",
      of: [
        {
          type: "image",
          options: { hotspot: true },
          fields: [
            defineField({
              name: "alt",
              title: "Alt text",
              type: "string",
              description: "Described for screen readers. Worth filling in.",
            }),
          ],
        },
      ],
      description:
        "One image renders as a still; two or more crossfade every 3s in this order. Logo first, then performance shots.",
      options: { layout: "grid" },
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "title", subtitle: "role", media: "images.0" },
  },
});
