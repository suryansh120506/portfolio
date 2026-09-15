import { defineField, defineType } from "sanity";

/**
 * Singleton: the copy that is not a list — hero, stack strip, contact.
 *
 * Kept as one document rather than three so the Studio has a single "Site"
 * entry to open, and so the pieces that are edited together live together.
 */
export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  groups: [
    { name: "hero", title: "Hero" },
    { name: "stack", title: "Stack strip" },
    { name: "contact", title: "Contact" },
  ],
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      group: "hero",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      group: "hero",
      description: 'The line under the name — "Machine Learning & Data Engineer".',
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow",
      type: "string",
      group: "hero",
      description: 'Small caps above the name — "Neural architecture & data pipelines".',
    }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      group: "hero",
      description: "Next to the pulsing dot.",
    }),
    defineField({
      name: "portrait",
      title: "Portrait",
      type: "image",
      group: "hero",
      options: { hotspot: true },
    }),
    defineField({
      name: "stack",
      title: "Stack",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      group: "stack",
      description:
        "Must match the keys in TechIcon.tsx to get a logo — otherwise the label shows on its own.",
    }),
    defineField({
      name: "email",
      title: "Email",
      type: "string",
      group: "contact",
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: "availability",
      title: "Availability",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "outroLines",
      title: "Footer headline",
      type: "array",
      of: [{ type: "string" }],
      group: "contact",
      description: 'One string per line — "Engineering logic." / "Training intelligence."',
      validation: (rule) => rule.max(3),
    }),
    defineField({
      name: "links",
      title: "Social links",
      type: "array",
      group: "contact",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "href", title: "URL", type: "url" }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        },
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});
