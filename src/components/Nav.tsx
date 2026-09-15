"use client";

import { useRef, useState } from "react";
import { useLenis } from "lenis/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useSceneToggle } from "@/lib/scene-toggle";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const LINKS = [
  { id: "work", label: "Work" },
  { id: "logs", label: "Record" },
  { id: "experience", label: "Experience" },
  { id: "identity", label: "Beyond" },
  { id: "contact", label: "Contact" },
] as const;

/**
 * Fixed brutalist navigation carrying the GPU killswitch.
 *
 * The progress rail and active-section state are written straight to the DOM
 * rather than through React — scroll fires at display rate, and re-rendering
 * the nav every frame would be the most expensive thing on the page. The only
 * React state here is the 3D toggle, which flips on a click.
 */
export default function Nav() {
  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const { is3DEnabled, toggle3D } = useSceneToggle();
  const [menuOpen, setMenuOpen] = useState(false);

  useLenis((instance) => {
    const bar = progressRef.current;
    if (bar) bar.style.transform = `scaleX(${instance.progress || 0})`;
  });

  useGSAP(
    () => {
      // Active link: flip a data attribute and let CSS do the rest.
      LINKS.forEach(({ id }) => {
        const section = document.getElementById(id);
        if (!section) return;

        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onToggle: (self) => {
            const link = rootRef.current?.querySelector(
              `[data-nav-link="${id}"]`,
            );
            if (link instanceof HTMLElement) {
              link.dataset.active = self.isActive ? "true" : "false";
            }
          },
        });
      });
    },
    { scope: rootRef },
  );

  const goTo = (id: string) => {
    setMenuOpen(false);
    const target = document.getElementById(id);
    if (!target) return;
    // Route through Lenis so the jump is eased by the same engine as the page.
    if (lenis) lenis.scrollTo(target, { offset: -8, duration: 1.4 });
    else target.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <header
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 top-0 z-50"
    >
      {/* Scroll progress rail */}
      <div className="h-px w-full bg-ink/10">
        <div
          ref={progressRef}
          className="h-px w-full origin-left scale-x-0 bg-ink/60"
        />
      </div>

      <nav
        aria-label="Primary"
        className="pointer-events-auto flex items-center justify-between gap-4 border-b border-rule bg-bone/90 px-4 py-3 sm:px-8"
      >
        <button
          type="button"
          onClick={() => goTo("top")}
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.3em] text-ink transition-opacity hover:opacity-70"
        >
          ST
        </button>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <li key={link.id}>
              <button
                type="button"
                data-nav-link={link.id}
                data-active="false"
                onClick={() => goTo(link.id)}
                className="group relative px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink-muted transition-colors duration-300 hover:text-ink data-[active=true]:text-ink"
              >
                {link.label}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-3 -bottom-px h-px scale-x-0 bg-ink/70 transition-transform duration-300 group-hover:scale-x-100 group-data-[active=true]:scale-x-100"
                />
              </button>
            </li>
          ))}
        </ul>

        {/* ---------- GPU killswitch ---------- */}
        <button
          type="button"
          onClick={toggle3D}
          aria-pressed={is3DEnabled}
          title={
            is3DEnabled
              ? "Disable the WebGL layer to free the GPU"
              : "Re-enable the WebGL layer"
          }
          className="shrink-0 border border-ink/25 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink transition-colors duration-200 hover:border-ink/60 hover:text-ink"
        >
          <span aria-hidden="true">[ </span>
          3D:{" "}
          <span className={is3DEnabled ? "text-ink" : "text-ink-muted"}>
            {is3DEnabled ? "ON" : "OFF"}
          </span>
          <span aria-hidden="true"> ]</span>
        </button>

        {/* ---------- menu trigger, phones and tablets ---------- */}
        {/* Below `md` the link list is hidden, which until now left no way
            to reach any section on a phone at all. Two hairlines rather
            than the usual three — it matches the rule weight used
            everywhere else on the page. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="-mr-2 flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-[5px] md:hidden"
        >
          <span
            aria-hidden="true"
            className={`h-px w-5 bg-ink transition-transform duration-300 ${
              menuOpen ? "translate-y-[3px] rotate-45" : ""
            }`}
          />
          <span
            aria-hidden="true"
            className={`h-px w-5 bg-ink transition-transform duration-300 ${
              menuOpen ? "-translate-y-[3px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* ---------- mobile sheet ---------- */}
      {/* Kept mounted and collapsed by max-height so opening and closing both
          animate; unmounting it would make the close instant and the open
          jump. `invisible` when shut so nothing inside is focusable. */}
      <div
        id="mobile-menu"
        className={`pointer-events-auto overflow-hidden border-b border-rule bg-bone/95 backdrop-blur-sm transition-all duration-400 md:hidden ${
          menuOpen ? "max-h-96" : "invisible max-h-0"
        }`}
      >
        <ul className="px-4 py-2">
          {LINKS.map((link) => (
            <li key={link.id}>
              <button
                type="button"
                tabIndex={menuOpen ? 0 : -1}
                onClick={() => goTo(link.id)}
                // A full-width row with a 44px hit area — a 10px mono label
                // is far too small a target to tap on its own.
                className="flex w-full items-center justify-between border-b border-rule/60 py-3.5 text-left font-mono text-[11px] uppercase tracking-[0.24em] text-ink-muted transition-colors last:border-b-0 active:text-ink"
              >
                {link.label}
                <span aria-hidden="true" className="text-ink-faint">
                  →
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
