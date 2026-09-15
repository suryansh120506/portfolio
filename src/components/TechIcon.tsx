"use client";

/**
 * Real, full-colour brand marks for the stack strip.
 *
 * Simple Icons (the previous source) ships every mark as one flat
 * silhouette — accurate as a wordmark, but not what anyone recognises as
 * "the Python logo." These are devicon's `-original` variants instead: the
 * actual multi-colour logos (Python's blue/yellow snakes, React's cyan atom,
 * MongoDB's layered green leaf, PyTorch's flame, …).
 *
 * Loaded as `<img>` from devicon's CDN rather than inlined as raw SVG markup.
 * Several of these marks (Python, Next.js) define their colour via a
 * `<linearGradient id="a">`-style def with a short, repeated id — fine
 * inside their own SVG document, but two such icons inlined into the same
 * page would collide on that id and start bleeding into each other's fill.
 * An `<img>` keeps each icon's SVG in its own document, so that never
 * happens; it also means nothing here needs `dangerouslySetInnerHTML`.
 *
 * Devicon has no mark for SQL — a language, not a product — so that one
 * stays a drawn glyph, coloured to sit alongside the real logos rather than
 * left monochrome.
 */

const CDN = "https://cdn.jsdelivr.net/gh/devicons/devicon/icons";

/** Keyed by the exact label in `portfolioData.stack`. */
const DEVICON_SLUG: Record<string, string> = {
  Python: "python",
  "C++": "cplusplus",
  TypeScript: "typescript",
  JavaScript: "javascript",
  "Next.js 15": "nextjs",
  React: "react",
  "Tailwind CSS": "tailwindcss",
  "Node.js": "nodejs",
  "Prisma ORM": "prisma",
  FastAPI: "fastapi",
  PyTorch: "pytorch",
  TensorFlow: "tensorflow",
  PostgreSQL: "postgresql",
  MongoDB: "mongodb",
};

/** Drawn in place of a brand mark that does not exist. */
function SqlGlyph({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className}>
      <ellipse cx="12" cy="5" rx="8" ry="3" fill="#4A6B8A" />
      <path
        d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5c0 1.66-3.58 3-8 3S4 6.66 4 5Z"
        fill="#5C7FA3"
      />
      <path
        d="M4 13v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6c0 1.66-3.58 3-8 3s-8-1.34-8-3Z"
        fill="#6E92B8"
      />
    </svg>
  );
}

export default function TechIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  if (name === "SQL") return <SqlGlyph className={className} />;

  const slug = DEVICON_SLUG[name];
  // An unmapped label still renders its text in the strip — never a gap.
  if (!slug) return null;

  return (
    /* An SVG has no pixel dimensions for next/image to optimise, and there
       is nothing to gain from proxying fourteen vector icons that never
       change through the image optimiser. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${CDN}/${slug}/${slug}-original.svg`}
      alt=""
      draggable={false}
      // Deliberately NOT lazy: the strip is driven by a transform, not by
      // scroll, so icons drift into view without the viewport ever moving —
      // a lazy icon would pop in mid-drift. Fourteen cached vector files.
      decoding="async"
      className={`shrink-0 object-contain transition-transform duration-300 group-hover/tech:scale-110 ${className}`}
    />
  );
}
