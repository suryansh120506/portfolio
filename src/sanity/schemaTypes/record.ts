import { defineField, defineType } from "sanity";

/**
 * An accolade — one tile in the Record rail.
 *
 * Replaces the earlier `hackathon` type. The rail is logo-first, so `logo`
 * is the field that matters most; without one the tile falls back to a
 * monogram, which looks deliberate but says less.
 */
export const record = defineType({
  name: "record",
  title: "Record / Accolade",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      description: 'e.g. "Foodoscope", "McKinsey Forward"',
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      description:
        "Square-ish works best; the tile renders it at 44px with object-contain. A transparent PNG or SVG-exported PNG looks cleanest.",
    }),
    defineField({
      name: "organiser",
      title: "Organiser",
      type: "string",
      description: 'e.g. "IIIT Delhi", "24-hour build"',
      validation: (rule) => rule.max(48),
    }),
    defineField({
      name: "outcome",
      title: "Outcome",
      type: "string",
      description: 'The caption line — "National Finalist — scalable schema architecture"',
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: "year",
      title: "Year",
      type: "string",
      validation: (rule) => rule.max(12),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Left to right along the rail.",
      initialValue: 0,
    }),
  ],
  orderings: [
    { title: "Display order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] },
  ],
  preview: {
    select: { title: "name", subtitle: "outcome", media: "logo" },
  },
});
