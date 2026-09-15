import { defineField, defineType } from "sanity";

/**
 * A role on the Experience timeline — "Node A", "Node B" and so on.
 *
 * Mirrors the `experience` entries in `data.ts` exactly, so the section can
 * be pointed at Sanity without touching its markup or its GSAP.
 */
export const experienceNode = defineType({
  name: "experienceNode",
  title: "Experience node",
  type: "document",
  fields: [
    defineField({
      name: "company",
      title: "Company",
      type: "string",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: "node",
      title: "Node label",
      type: "string",
      description: 'The marker on the rail — "Node A", "Node B", …',
      validation: (rule) => rule.required().max(24),
    }),
    defineField({
      name: "timeline",
      title: "Timeline",
      type: "string",
      description: 'Free text, e.g. "Aug 2026 — Present".',
      validation: (rule) => rule.required().max(48),
    }),
    defineField({
      name: "location",
      title: "Location",
      type: "string",
      validation: (rule) => rule.max(64),
    }),
    defineField({
      name: "stack",
      title: "Stack",
      type: "array",
      of: [{ type: "string" }],
      options: { layout: "tags" },
      description: "Rendered as the bordered chips under the entry.",
    }),
    defineField({
      name: "metrics",
      title: "Metrics",
      type: "array",
      of: [{ type: "string" }],
      description:
        "One achievement per line. Lead with the verb and keep a number in it where you can.",
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers sit higher on the timeline (most recent first).",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Timeline order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "company", role: "role", node: "node" },
    prepare: ({ title, role, node }) => ({
      title: [node, title].filter(Boolean).join(" · "),
      subtitle: role,
    }),
  },
});
