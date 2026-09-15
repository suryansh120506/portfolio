"use client";

/**
 * Ambient page texture.
 *
 * Previously also carried a custom cursor and magnetic buttons; both were
 * removed in favour of the native cursor and the scroll-reactive stack strip,
 * which reads as lively without taking over the pointer.
 *
 * What remains is a single static SVG grain — no canvas, no per-frame work,
 * no listeners. It sits above the WebGL canvas but below content and never
 * intercepts input.
 */

/** Fine-grain texture, inlined so it costs no extra request. */
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export default function ExperienceLayer() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[2] opacity-[0.16] mix-blend-multiply"
      style={{ backgroundImage: GRAIN }}
    />
  );
}
