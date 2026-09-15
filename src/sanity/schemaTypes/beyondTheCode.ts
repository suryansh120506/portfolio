import { defineField, defineType } from "sanity";

/**
 * Singleton: the condensed "Beyond the code" block.
 *
 * The four tiles' glyphs are drawn in `BeyondTheCode.tsx` and matched by
 * `tileId`, so a tile added here without a matching glyph renders its label
 * with no icon rather than breaking.
 */
export const beyondTheCode = defineType({
  name: "beyondTheCode",
  title: "Beyond the code",
  type: "document",
  fields: [
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: "copy",
      title: "Copy",
      type: "text",
      rows: 5,
      validation: (rule) => rule.required().max(600),
    }),
    defineField({
      name: "tiles",
      title: "Tiles",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "tileId",
              title: "Glyph",
              type: "string",
              options: {
                list: [
                  { title: "Gaming (gamepad)", value: "gaming" },
                  { title: "Football", value: "football" },
                  { title: "Gym (dumbbell)", value: "gym" },
                  { title: "Trekking (mountain)", value: "trekking" },
                ],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "detail", title: "Detail", type: "string" }),
          ],
          preview: { select: { title: "label", subtitle: "detail" } },
        },
      ],
      validation: (rule) => rule.max(4),
    }),
  ],
  preview: { prepare: () => ({ title: "Beyond the code" }) },
});
