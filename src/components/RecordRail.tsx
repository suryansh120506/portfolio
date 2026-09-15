"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";

/**
 * The Record section — accolades as a compact logo rail.
 *
 * Replaces the old terminal box, which spent a full viewport (`min-h-screen`)
 * typing out four lines of text. This says the same thing in roughly a fifth
 * of the height and leads with the marks themselves.
 *
 * The shape is borrowed from the "integrations" strips on good product sites:
 * a single row of small tiles, hairline-divided, with one shared caption
 * underneath. Hovering a tile recedes the others, lifts the focused one, and
 * slides a marker beneath it while the caption cross-fades. Because there is
 * exactly one caption slot — absolutely positioned layers, fixed height — the
 * section never reflows as you move across it, which is what keeps a hover
 * rail from feeling twitchy.
 *
 * All hover motion is local to this component: it is pointer-driven, not
 * scroll-driven, so it does not belong in DomLayer's ScrollTrigger context.
 * The scroll entrance for this section does live there, keyed off
 * `[data-record-rise]`.
 */

export type RecordItem = {
  id: string;
  name: string;
  organiser: string;
  outcome: string;
  year: string;
  /** Uploaded mark. Falls back to a monogram when absent. */
  logo?: string | null;
};

/**
 * Two-letter monogram, for a tile with no logo yet.
 *
 * Numeric tokens are dropped before initials are taken, and a single-word
 * name falls back to its first two letters — otherwise "RIFT '26" reads as
 * "R2" (initial of RIFT, then of 26) and "Foodoscope" as a lone "F".
 */
function monogram(name: string) {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word));

  const initials =
    words.length > 1
      ? words.slice(0, 2).map((word) => word[0])
      : [...(words[0] ?? name).slice(0, 2)];

  return initials.join("").toUpperCase();
}

export default function RecordRail({
  label,
  items,
}: {
  label: string;
  items: readonly RecordItem[];
}) {
  const [active, setActive] = useState(0);
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const tiles = useRef<(HTMLButtonElement | null)[]>([]);
  const captions = useRef<(HTMLDivElement | null)[]>([]);
  const marker = useRef<HTMLSpanElement>(null);
  const row = useRef<HTMLDivElement>(null);

  // Clamped during render so a shorter list can never leave the index past
  // the end — the same reason the gallery derives its index rather than
  // correcting it in an effect.
  const index = active < items.length ? active : 0;

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    captions.current.length = items.length;
    captions.current.forEach((node, i) => {
      if (!node) return;
      gsap.to(node, {
        opacity: i === index ? 1 : 0,
        y: i === index ? 0 : 4,
        duration: reduced ? 0 : 0.34,
        ease: "power2.out",
        overwrite: true,
      });
    });

    // The marker is measured against the row rather than tracked in state:
    // widths change with the viewport, and reading them here means it stays
    // correct after a resize without a re-render.
    const tile = tiles.current[index];
    const bar = marker.current;
    if (tile && bar && row.current) {
      gsap.to(bar, {
        x: tile.offsetLeft,
        width: tile.offsetWidth,
        duration: reduced ? 0 : 0.42,
        ease: "power3.out",
        overwrite: true,
      });
    }
  }, [index, items.length]);

  if (items.length === 0) return null;

  return (
    <div data-record-rail>
      {/* ---- header row ---- */}
      <div
        data-record-rise
        className="flex items-baseline justify-between gap-6"
      >
        <p className="font-mono text-[12px] lowercase tracking-[0.08em] text-ink-muted">
          / {label}
        </p>
        <p className="font-mono text-[9px] uppercase tracking-[0.28em] text-ink-faint">
          {String(items.length).padStart(2, "0")} entries
        </p>
      </div>

      {/* ---- tiles ---- */}
      <div
        ref={row}
        data-record-rise
        className="group/rail relative mt-7 flex flex-wrap items-stretch border-y border-rule"
        onPointerLeave={() => setActive(0)}
      >
        {items.map((item, i) => {
          const showLogo = item.logo && !failed.has(item.logo);

          return (
            <button
              key={item.id}
              type="button"
              ref={(node) => {
                tiles.current[i] = node;
              }}
              onPointerEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              // Touch has no hover. Without this a phone could only ever see
              // the first caption, which is most of the section's content.
              onClick={() => setActive(i)}
              aria-label={`${item.name} — ${item.outcome}`}
              // Siblings recede on hover so the focused mark carries the row.
              // Driven by the parent's group so it also holds on keyboard
              // focus, not just pointer.
              className="relative flex flex-1 basis-[7.5rem] items-center justify-center px-4 py-7 transition-opacity duration-500 [&:not(:hover)]:group-hover/rail:opacity-40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ink/30 sm:px-6"
            >
              {/* Hairline between tiles, never before the first. */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-4 left-0 w-px bg-rule first:hidden"
                hidden={i === 0}
              />

              <span className="relative flex h-11 w-full max-w-[5.5rem] items-center justify-center transition-transform duration-500 group-hover/rail:[button:hover_&]:-translate-y-0.5">
                {showLogo ? (
                  <Image
                    src={item.logo as string}
                    alt={item.name}
                    fill
                    sizes="88px"
                    // Marks arrive in every colour; muting them at rest keeps
                    // the row calm and lets the focused one come forward.
                    className="object-contain opacity-70 grayscale transition-all duration-500 [button:hover_&]:opacity-100 [button:hover_&]:grayscale-0"
                    onError={() =>
                      setFailed((current) =>
                        new Set(current).add(item.logo as string),
                      )
                    }
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center border border-rule font-mono text-[12px] tracking-[0.14em] text-ink-muted transition-colors duration-500 [button:hover_&]:border-ink/40 [button:hover_&]:text-ink">
                    {monogram(item.name)}
                  </span>
                )}
              </span>
            </button>
          );
        })}

        {/* Slides beneath the focused tile. */}
        <span
          ref={marker}
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[-1px] left-0 h-px w-0 bg-ink"
        />
      </div>

      {/* ---- one shared caption slot ---- */}
      <div
        data-record-rise
        className="relative mt-5 h-10 sm:h-6"
        aria-live="polite"
      >
        {items.map((item, i) => (
          <div
            key={item.id}
            ref={(node) => {
              captions.current[i] = node;
            }}
            className={`absolute inset-0 flex flex-wrap items-baseline gap-x-3 gap-y-1 ${
              i === 0 ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink">
              {item.name}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
              {item.organiser}
            </span>
            <span aria-hidden="true" className="h-px w-6 bg-ink/25" />
            <span className="text-[13px] text-ink-muted">{item.outcome}</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-ink-faint">
              {item.year}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
