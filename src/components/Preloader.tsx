"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { markBooted } from "@/lib/boot";

gsap.registerPlugin(useGSAP);

/** Status lines swapped as the counter climbs — diegetic, not decorative. */
const STAGES: ReadonlyArray<[number, string]> = [
  [0, "Establishing uplink"],
  [22, "Loading telemetry lattice"],
  [48, "Compiling shaders"],
  [70, "Fetching repository index"],
  [88, "Calibrating scroll physics"],
  [100, "Online"],
];

const AXIS = [0, 25, 50, 75, 100];

/**
 * Boot sequence overlay.
 *
 * The counter is animated rather than wired to real asset progress on purpose:
 * browsers give no reliable total-bytes signal for a Next.js route, so a "real"
 * percentage would stall at arbitrary numbers and jump. What IS awaited is the
 * genuine blocker — `document.fonts.ready` — so the reveal never lands on
 * unstyled text. The bar is honest about duration, not about byte counts.
 */
export default function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const clipRef = useRef<SVGRectElement>(null);
  const headRef = useRef<SVGCircleElement>(null);

  useGSAP(
    () => {
      const counter = counterRef.current;
      const status = statusRef.current;
      const clip = clipRef.current;
      const head = headRef.current;

      const root = document.documentElement;

      // Defocus is applied from JS so a script failure can never strand the
      // page behind a permanent blur.
      root.style.setProperty("--boot-blur", "16px");
      root.style.setProperty("--boot-scale", "1.035");

      const settle = () => {
        root.dataset.booted = "true";
        root.style.removeProperty("--boot-blur");
        root.style.removeProperty("--boot-scale");
      };

      const finish = () => {
        const exit = gsap.timeline({
          onComplete: () => {
            settle();
            markBooted();
            // Remove from the layer tree entirely once it has played.
            if (rootRef.current) rootRef.current.style.display = "none";
          },
        });

        exit
          .to("[data-boot-panel]", {
            opacity: 0,
            y: -14,
            duration: 0.5,
            ease: "power2.in",
          })
          // The focus pull: the page sharpens as the cover lifts.
          .to(
            root,
            {
              "--boot-blur": "0px",
              "--boot-scale": "1",
              duration: 1.25,
              ease: "power2.out",
            },
            0.1,
          )
          .to(
            rootRef.current,
            {
              // Wipes upward rather than fading, so the page feels uncovered
              // rather than cross-dissolved.
              clipPath: "inset(0% 0% 100% 0%)",
              duration: 0.9,
              ease: "power3.inOut",
            },
            "-=0.15",
          );
      };

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        settle();
        markBooted();
        if (rootRef.current) rootRef.current.style.display = "none";
        return;
      }

      const progress = { value: 0 };
      let stageIndex = -1;

      const timeline = gsap.timeline({
        onComplete: () => {
          // The one genuine gate: never reveal onto unstyled text.
          const fonts = document.fonts?.ready ?? Promise.resolve();
          fonts.then(finish).catch(finish);
        },
      });

      timeline.to(progress, {
        value: 100,
        duration: 2.1,
        // Uneven pacing reads as work being done; a linear bar reads as a fake.
        ease: "power2.inOut",
        onUpdate: () => {
          const value = Math.round(progress.value);

          if (counter) counter.textContent = String(value).padStart(3, "0");

          // Reveal by clip rather than strokeDasharray: the SVG is stretched
          // with preserveAspectRatio="none", which distorts a dash pattern into
          // visibly uneven segments. A clip rect in viewBox units is exact.
          if (clip) clip.setAttribute("width", String(value));
          if (head) head.style.transform = `translateX(${value}%)`;

          // Advance the status line at its threshold.
          const next = STAGES.findLastIndex(([at]) => value >= at);
          if (next !== stageIndex && status) {
            stageIndex = next;
            status.textContent = STAGES[next][1];
          }
        },
      });
    },
    { scope: rootRef },
  );

  return (
    <div
      ref={rootRef}
      // aria-hidden + no focusable content: assistive tech skips straight to
      // the page, which is already fully rendered underneath.
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-bone/95 px-6"
    >
      <div
        data-boot-panel
        className="w-full max-w-xl border border-rule bg-ink/[0.02] p-7 sm:p-9"
      >
        {/* Label + counter */}
        <div className="flex items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-ink-muted">
              System boot
            </span>
            <span
              ref={statusRef}
              className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink"
            >
              Establishing uplink
            </span>
          </div>

          <div className="flex items-baseline">
            <span
              ref={counterRef}
              className="font-mono text-[clamp(2.5rem,7vw,4rem)] font-semibold leading-none tracking-[-0.04em] text-ink tabular-nums"
            >
              000
            </span>
            <span className="ml-1 font-mono text-lg text-ink-faint">%</span>
          </div>
        </div>

        {/* Plotted trace */}
        <div className="relative mt-8">
          <div className="mb-2 flex justify-between font-mono text-[9px] tracking-[0.2em] text-ink-faint">
            {AXIS.map((tick) => (
              <span key={tick}>{tick}%</span>
            ))}
          </div>

          <svg
            viewBox="0 0 100 22"
            preserveAspectRatio="none"
            className="h-16 w-full overflow-visible"
          >
            {/* Baseline */}
            <line
              x1="0"
              y1="21"
              x2="100"
              y2="21"
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="0.25"
            />
            {AXIS.map((tick) => (
              <line
                key={tick}
                x1={tick}
                y1="18"
                x2={tick}
                y2="21"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.25"
              />
            ))}

            <defs>
              <clipPath id="boot-reveal">
                <rect ref={clipRef} x="0" y="0" width="0" height="22" />
              </clipPath>
            </defs>

            {/* Unlit track, so the readout has a shape before it fills. */}
            <path
              d="M0,20 L8,16 L16,18 L24,11 L32,14 L40,7 L48,10 L56,5 L64,8 L72,4 L80,6 L88,2 L96,4 L100,1"
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* The trace itself — a plotted readout, not a plain bar. */}
            <path
              d="M0,20 L8,16 L16,18 L24,11 L32,14 L40,7 L48,10 L56,5 L64,8 L72,4 L80,6 L88,2 L96,4 L100,1"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              clipPath="url(#boot-reveal)"
            />
          </svg>

          {/* Sweeping head */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ink/10">
            <div
              className="h-px w-full origin-left"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
          <svg
            viewBox="0 0 100 2"
            preserveAspectRatio="none"
            className="absolute inset-x-0 bottom-0 h-1 w-full overflow-visible"
          >
            <circle
              ref={headRef}
              cx="0"
              cy="1"
              r="1.2"
              fill="#38bdf8"
              style={{ transformBox: "view-box" }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
