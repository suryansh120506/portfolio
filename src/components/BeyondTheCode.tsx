"use client";

import type { SVGProps } from "react";

/**
 * "Beyond the code" — the competitive and physical half of the Beyond
 * section, condensed.
 *
 * This replaces what used to be two full-bleed rows ("Digital Environments"
 * and "Physical Conditioning"), each carrying a large photo. Four interests
 * did not warrant two viewports of scroll, and the photos were the weakest
 * images on the page. Copy carries it now; the tiles are just markers.
 *
 * Glyphs are drawn here rather than pulled from an icon set so they share
 * the hairline weight of everything else on the page — a stroked 1.25px
 * line on a 24px box, the same language as the corner ticks and rules.
 */

type Tile = {
  id: string;
  label: string;
  detail: string;
  Icon: (props: SVGProps<SVGSVGElement>) => React.ReactElement;
};

const stroke: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.25,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function GamepadGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M7.5 8h9a4.5 4.5 0 0 1 4.4 3.6l.8 4a3 3 0 0 1-5.3 2.5L15 16H9l-1.4 2.1a3 3 0 0 1-5.3-2.5l.8-4A4.5 4.5 0 0 1 7.5 8Z" />
      <path d="M7 11.5v2M6 12.5h2M16 11.5h.01M18 13.5h.01" />
    </svg>
  );
}

function FootballGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 3.6 2.6-1.4 4.2H9.8L8.4 10.1 12 7.5Z" />
      <path d="M12 3v4.5M19.5 9.8l-3.9.3M17.1 19l-2.9-4.7M6.9 19l2.9-4.7M4.5 9.8l3.9.3" />
    </svg>
  );
}

function DumbbellGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="M4.5 9v6M7.5 7.5v9M16.5 7.5v9M19.5 9v6M7.5 12h9" />
    </svg>
  );
}

function MountainGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...stroke} {...props}>
      <path d="m2.5 19 6.2-11 3.5 6 2.2-3.6L21.5 19H2.5Z" />
      <path d="m6.6 12.4 2.1 1.7 2.1-1.7" />
    </svg>
  );
}

const TILES: Tile[] = [
  { id: "gaming", label: "Gaming", detail: "Valorant", Icon: GamepadGlyph },
  { id: "football", label: "Football", detail: "Since school", Icon: FootballGlyph },
  { id: "gym", label: "Gym", detail: "Resistance", Icon: DumbbellGlyph },
  { id: "trekking", label: "Trekking", detail: "High altitude", Icon: MountainGlyph },
];

export default function BeyondTheCode({
  eyebrow,
  title,
  copy,
}: {
  eyebrow: string;
  title: string;
  copy: string;
}) {
  return (
    <div
      data-beyond-code
      className="mt-28 grid gap-12 border-t border-rule pt-20 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-20"
    >
      {/* ---- copy ---- */}
      <div>
        <div data-beyond-code-rise className="flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-ink/40" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-muted">
            {eyebrow}
          </span>
        </div>

        <h3
          data-beyond-code-rise
          className="mt-6 max-w-xl text-[clamp(1.9rem,4.6vw,3.25rem)] font-semibold uppercase leading-[1.02] tracking-[-0.03em] text-ink"
        >
          {title}
        </h3>

        <p
          data-beyond-code-rise
          className="mt-7 max-w-xl text-[15px] leading-8 text-ink-muted"
        >
          {copy}
        </p>
      </div>

      {/* ---- 2x2 tiles ---- */}
      <ul className="grid w-fit grid-cols-2 gap-4 lg:gap-5">
        {TILES.map(({ id, label, detail, Icon }) => (
          <li key={id} data-beyond-code-tile>
            <div className="group flex flex-col items-center gap-2.5">
              {/* Frosted glass: a translucent ground plus a backdrop blur, so
                  the particle field behind stays faintly readable through it
                  rather than being boxed out. */}
              <div className="relative flex h-16 w-16 items-center justify-center rounded-xl border border-ink/10 bg-bone/40 shadow-[0_6px_18px_-14px_rgba(10,10,10,0.5)] backdrop-blur-md transition-all duration-500 group-hover:-translate-y-0.5 group-hover:border-ink/25 group-hover:bg-bone/60">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-2 top-px h-px bg-gradient-to-r from-transparent via-bone to-transparent"
                />
                <Icon className="h-[22px] w-[22px] text-ink-muted transition-colors duration-500 group-hover:text-ink" />
              </div>

              <div className="text-center">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink">
                  {label}
                </p>
                <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-ink-faint">
                  {detail}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
