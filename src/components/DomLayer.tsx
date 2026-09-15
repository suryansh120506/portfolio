"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { sceneState } from "@/lib/scene-state";
import { useSceneToggle } from "@/lib/scene-toggle";
import { onBoot } from "@/lib/boot";
import MediaAdmin from "./MediaAdmin";
import TechIcon from "./TechIcon";
import CrossfadeGallery from "./CrossfadeGallery";
import MagneticButton from "./MagneticButton";
import PipelineStack from "./PipelineStack";
import BeyondTheCode from "./BeyondTheCode";
import RecordRail from "./RecordRail";
import type { Project } from "@/lib/projects";
import type { MediaManifest } from "@/lib/media-shape";
import type { SiteContent } from "@/lib/content";

// TextPlugin went with the terminal — nothing types itself out any more.
gsap.registerPlugin(useGSAP, ScrollTrigger);

type DomLayerProps = {
  /**
   * Fully resolved content. Every image path in here is already a usable
   * URL — local /public for the media panel, cdn.sanity.io when Sanity is
   * supplying it — so this component never has to know which source won.
   */
  content: SiteContent;
  projects: Project[];
  /** Raw manifest, needed only by the operator panel's gallery list. */
  media: MediaManifest;
};
/**
 * The entire DOM layer, and the single owner of every ScrollTrigger on the
 * page.
 *
 * Consolidating GSAP here is deliberate. When triggers were created across
 * eight separate components, React's child-before-parent effect order meant a
 * component near the top of the page registered against a document that later
 * grew by several viewports, leaving stale start/end values — pins that never
 * engaged and scrubs frozen at their end state. One `useGSAP` context, running
 * once in document order, removes that whole class of bug.
 */
export default function DomLayer({ content, projects, media }: DomLayerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [photoFailed, setPhotoFailed] = useState(false);
  const { is3DEnabled } = useSceneToggle();

  const {
    hero,
    stack,
    experience,
    records,
    identityNode,
    beyondTheCode,
    contact,
  } = content;

  /* ---------------------------------------------------------------- *
   * All GSAP, one context.
   * ---------------------------------------------------------------- */
  useGSAP(
    () => {
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      /* ---------- Hero focus drives the particle field + scrim ---------- */

      const setFocus = (value: number) => {
        sceneState.heroFocus = value;
        // Scrim thins over the hero so the field reads at full contrast, then
        // restores for the copy below. A CSS variable keeps it out of React.
        document.documentElement.style.setProperty(
          "--scrim",
          String(0.2 + (1 - value) * 0.4),
        );
      };

      ScrollTrigger.create({
        trigger: "[data-hero]",
        start: "top top",
        end: "bottom top",
        onUpdate: (self) => setFocus(1 - self.progress),
        onLeave: () => setFocus(0),
        onLeaveBack: () => setFocus(1),
      });

      /* ---------- Infinite marquee ---------- */

      // Two identical copies translated -50% of the track's own width: at that
      // instant copy B sits exactly where copy A began, so the wrap is
      // invisible. Nothing is measured, so nothing can drift or stutter.
      if (marqueeRef.current && !reduced) {
        const drift = gsap.to(marqueeRef.current, {
          xPercent: -50,
          duration: 42,
          ease: "none",
          repeat: -1,
        });

        // Scroll velocity drives the strip's timeScale: it speeds up as you
        // move, reverses when you scroll back, and settles to its resting
        // drift when you stop. One number written per scroll tick — the whole
        // effect costs a single property write, no extra elements.
        //
        // The eased value lives on a plain object rather than being written
        // straight to timeScale: that is a method on the timeline, not a data
        // property, so it is not reliably eligible for quickTo's fast path.
        const speed = { value: 1 };
        const speedTo = gsap.quickTo(speed, "value", {
          duration: 0.6,
          ease: "power2.out",
          onUpdate: () => drift.timeScale(speed.value),
        });

        let settle: gsap.core.Tween | undefined;

        ScrollTrigger.create({
          trigger: document.body,
          start: "top top",
          end: "bottom bottom",
          onUpdate: (self) => {
            const boost = gsap.utils.clamp(
              1,
              6,
              Math.abs(self.getVelocity()) / 280,
            );
            // direction is 1 scrolling down, -1 up; a negative timeScale runs
            // the loop backwards without breaking the repeat.
            speedTo(self.direction * boost);

            // onUpdate stops firing the moment scrolling stops, so without
            // this the strip would stay locked at its boosted speed.
            settle?.kill();
            settle = gsap.delayedCall(0.35, () => speedTo(self.direction));
          },
        });
      }

      if (reduced) {
        ScrollTrigger.refresh();
        return;
      }

      /* ---------- Hero entrance ---------- */

      // Built paused and released by the preloader: otherwise the reveal
      // plays out behind the boot overlay and is over before it is seen.
      const intro = gsap
        .timeline({ paused: true, defaults: { ease: "power4.out" } })
        .from("[data-portrait]", {
          scale: 0.9,
          opacity: 0,
          filter: "blur(16px)",
          duration: 1.6,
        })
        .from(
          "[data-name-line]",
          { yPercent: 112, duration: 1.35, stagger: 0.1 },
          0.25,
        )
        .from(
          "[data-hero-rise]",
          { y: 22, opacity: 0, duration: 1.1, stagger: 0.1 },
          0.6,
        )
        .from("[data-hero-rule]", { scaleX: 0, duration: 1.2 }, 0.75);

      const releaseIntro = onBoot(() => {
        intro.play();

        // Re-measure once the loader lets go.
        //
        // `.boot-shell` carries `transform: scale(1.035)` for the focus-pull,
        // and a transform on an ancestor scales every descendant's measured
        // geometry with it. The refresh at the end of this context runs while
        // that is still applied, so every trigger on the page was being
        // measured against a 3.5%-inflated document — enough to put the hero's
        // computed start at roughly -135 instead of 0, and to leave the scroll
        // indicator already part-faded at the top of the page. Refreshing here,
        // after the transform is removed, is the only point at which the real
        // layout is available.
        ScrollTrigger.refresh();
      });

      gsap.to("[data-ring-a]", {
        rotate: 360,
        duration: 42,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      gsap.to("[data-ring-b]", {
        rotate: -360,
        duration: 64,
        ease: "none",
        repeat: -1,
        transformOrigin: "50% 50%",
      });
      gsap.fromTo(
        "[data-scan]",
        { yPercent: -150 },
        {
          yPercent: 360,
          duration: 3.4,
          ease: "power1.inOut",
          repeat: -1,
          repeatDelay: 2.4,
        },
      );

      /* ---------- Hero scroll indicator ---------- */

      // The rail fills as you scroll from the hero into Experience — the
      // same fromTo/scaleY-scrub idiom as the Experience rail itself, just
      // spanning a wider range via endTrigger. The whole indicator fades out
      // well before that: it has done its job once you're already moving.
      gsap.fromTo(
        "[data-scroll-rail-fill]",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-hero]",
            start: "top top",
            endTrigger: "#experience",
            end: "top top",
            scrub: true,
          },
        },
      );

      gsap.to("[data-scroll-indicator]", {
        opacity: 0,
        ease: "none",
        scrollTrigger: {
          trigger: "[data-hero]",
          start: "top top",
          end: "55% top",
          scrub: true,
        },
      });

      /* ---------- Experience ---------- */

      gsap.from("[data-exp-head]", {
        opacity: 0,
        y: 36,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#experience",
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      // The rail draws downward with a marker riding its leading edge. Both
      // sit on one scrubbed timeline at position 0, so the head can never
      // drift off the tip of the fill. The head's travel is measured from
      // the track rather than expressed as a percentage — `y` is a transform
      // (no layout per frame), and `invalidateOnRefresh` re-measures it when
      // the column reflows.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: "[data-exp-list]",
            start: "top 70%",
            end: "bottom 75%",
            scrub: true,
            invalidateOnRefresh: true,
          },
        })
        .fromTo("[data-rail-fill]", { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0)
        .fromTo(
          "[data-rail-head]",
          { y: 0 },
          { y: () => railRef.current?.offsetHeight ?? 0, ease: "none" },
          0,
        );

      // Each node fills as the head reaches it. Both are anchored to the
      // same 70% line — the fill's leading edge sits at the entry's own
      // offset down the track at exactly the moment that entry's top
      // crosses it — so they land together without sharing any state.
      gsap.utils.toArray<HTMLElement>("[data-exp-entry]").forEach((entry) => {
        const node = entry.querySelector("[data-exp-node]");
        if (!node) return;

        gsap.to(node, {
          backgroundColor: "#0A0A0A", // --ink; a literal so GSAP can tween it
          borderColor: "#0A0A0A",
          scale: 1.2,
          duration: 0.4,
          ease: "power2.out",
          scrollTrigger: {
            trigger: entry,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        });
      });

      /* ---------- The pipeline stack opens, holds, then folds ---------- */

      const layers = gsap.utils.toArray<HTMLElement>("[data-pipeline-layer]");
      if (layers.length) {
        const SPREAD = 64; // local-space gap between stages when open
        const mid = (layers.length - 1) / 2;
        // Closed: a single card with the rest peeking out behind it. The
        // centring lives in xPercent/yPercent rather than a Tailwind
        // -translate class, because GSAP writes the whole transform and
        // would otherwise wipe the class out on its first frame.
        const closed = {
          y: (i: number) => (i - mid) * 3,
          opacity: (i: number) => (i === 0 ? 1 : 0.55),
        };

        gsap.set(layers, { xPercent: -50, yPercent: -50, ...closed });

        gsap
          .timeline({
            scrollTrigger: {
              // Keyed to the list, not the section. The stack is sticky
              // inside the column beside the list, so it scrolls away when
              // the list does — running to the section's bottom meant it
              // folded several hundred pixels after it had left the screen,
              // and the close was never actually seen.
              trigger: "[data-exp-list]",
              start: "top 80%",
              end: "bottom 65%",
              scrub: 0.6,
            },
          })
          .to(
            "[data-pipeline-inner]",
            { rotateX: 52, rotateY: -7, duration: 1, ease: "power2.out" },
            0,
          )
          .to(
            layers,
            {
              y: (i: number) => (i - mid) * SPREAD,
              opacity: 1,
              duration: 1,
              ease: "power2.out",
              stagger: 0.06,
            },
            0,
          )
          // Held open while the entries beside it scroll past.
          .to({}, { duration: 1.2 })
          .to("[data-pipeline-inner]", {
            rotateX: 0,
            rotateY: 0,
            duration: 1,
            ease: "power2.in",
          })
          .to(
            layers,
            {
              ...closed,
              duration: 1,
              ease: "power2.in",
              stagger: { each: 0.06, from: "end" },
            },
            "<",
          );
      }

      gsap.utils.toArray<HTMLElement>("[data-exp-entry]").forEach((entry) => {
        gsap.from(entry.querySelectorAll("[data-exp-rise]"), {
          opacity: 0,
          y: 34,
          duration: 0.9,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: {
            trigger: entry,
            start: "top 78%",
            toggleActions: "play none none reverse",
          },
        });
      });

      /* ---------- Work: travel sideways through the cards ---------- */

      const track = trackRef.current;
      if (track && projects.length > 0) {
        // Function-based distance + invalidateOnRefresh so the travel stays
        // correct across resizes and font reflows.
        const distance = () =>
          Math.max(0, track.scrollWidth - window.innerWidth);

        const travel = gsap.to(track, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: '[data-work-stage]',
            start: 'top top',
            end: () => '+=' + distance(),
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // This pin adds its own scroll distance to the document, and
            // every section below it sits that much further down. Triggers
            // refresh in creation order by default, and this one is created
            // after Experience — so Experience measured a document without
            // the pin-spacer in it and started ~790px early, which is why
            // its rail finished before you reached the section. A higher
            // priority refreshes the pin first, so everything below it
            // measures against the real, final page height.
            refreshPriority: 1,
          },
        });

        // Each card settles as it crosses the middle of the viewport, so the
        // row breathes rather than sliding past as one rigid strip.
        //
        // containerAnimation is what makes this work: these elements move by
        // the parent tween's transform, not by page scroll, so a normal
        // trigger would never fire. It tells ScrollTrigger to measure them
        // against that animation instead.
        gsap.utils
          .toArray<HTMLElement>('[data-work-card]')
          .forEach((card) => {
          gsap.fromTo(
            card,
            { yPercent: card.dataset.offset === 'down' ? 7 : -7, opacity: 0.45 },
            {
              yPercent: 0,
              opacity: 1,
              ease: 'power2.out',
              scrollTrigger: {
                trigger: card,
                containerAnimation: travel,
                start: 'left right',
                end: 'center center',
                scrub: true,
              },
            },
          );
        });
      }

      /* ---------- Record rail ---------- */

      // The rail's hover choreography lives in RecordRail itself (it is
      // pointer-driven, not scroll-driven). Only the entrance belongs here.
      gsap.from('[data-record-rise]', {
        opacity: 0,
        y: 26,
        duration: 0.85,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: '[data-record-rail]',
          start: 'top 80%',
          toggleActions: 'play none none reverse',
        },
      });

      /* ---------- Identity node ---------- */

      gsap.from("[data-identity-rise]", {
        opacity: 0,
        y: 36,
        duration: 1,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "#identity",
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.utils
        .toArray<HTMLElement>("[data-identity-row]")
        .forEach((row) => {
          const media = row.querySelector("[data-identity-media]");
          const copy = row.children[0];

          if (copy) {
            gsap.from(copy.children, {
              opacity: 0,
              y: 30,
              duration: 0.9,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: {
                trigger: row,
                start: "top 78%",
                toggleActions: "play none none reverse",
              },
            });
          }

          if (media) {
            // Unmask downward, the same wipe used elsewhere on the page.
            gsap.fromTo(
              media,
              { clipPath: "inset(0% 0% 100% 0%)" },
              {
                clipPath: "inset(0% 0% 0% 0%)",
                ease: "none",
                scrollTrigger: {
                  trigger: row,
                  start: "top 85%",
                  end: "top 45%",
                  scrub: true,
                },
              },
            );
          }
        });

      /* ---------- Beyond the code ---------- */

      gsap.from("[data-beyond-code-rise]", {
        opacity: 0,
        y: 32,
        duration: 0.95,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: {
          trigger: "[data-beyond-code]",
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      // Tiles settle in after the copy, on a slight overshoot — four small
      // marks reading in sequence, not a block appearing at once.
      gsap.from("[data-beyond-code-tile]", {
        opacity: 0,
        y: 18,
        scale: 0.92,
        duration: 0.7,
        stagger: 0.07,
        ease: "back.out(1.6)",
        scrollTrigger: {
          trigger: "[data-beyond-code]",
          start: "top 72%",
          toggleActions: "play none none reverse",
        },
      });

      const mm = gsap.matchMedia();

      /* ---------- Contact ---------- */

      gsap.from("[data-outro-line]", {
        yPercent: 115,
        duration: 1.25,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "#contact",
          start: "top 78%",
          toggleActions: "play none none reverse",
        },
      });

      gsap.from("[data-contact-rise]", {
        opacity: 0,
        y: 40,
        duration: 1.1,
        stagger: 0.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: "#contact",
          start: "top 75%",
          toggleActions: "play none none reverse",
        },
      });

      /* ---------- Pointer parallax on the portrait ---------- */

      const portrait = portraitRef.current;
      let onMove: ((event: PointerEvent) => void) | undefined;

      if (portrait) {
        const tiltX = gsap.quickTo(portrait, "rotateX", {
          duration: 0.9,
          ease: "power3.out",
        });
        const tiltY = gsap.quickTo(portrait, "rotateY", {
          duration: 0.9,
          ease: "power3.out",
        });

        onMove = (event: PointerEvent) => {
          const nx = (event.clientX / window.innerWidth) * 2 - 1;
          const ny = (event.clientY / window.innerHeight) * 2 - 1;
          tiltY(nx * 10);
          tiltX(-ny * 8);
        };
        window.addEventListener("pointermove", onMove, { passive: true });
      }

      // Every trigger above now exists; one refresh measures them all in
      // refreshPriority order.
      ScrollTrigger.refresh();

      return () => {
        if (onMove) window.removeEventListener("pointermove", onMove);
        releaseIntro();
        mm.revert();
      };
    },
    { scope: rootRef, dependencies: [projects.length] },
  );

  // Mounting or dropping the canvas can shift layout slightly; re-measure.
  useEffect(() => {
    ScrollTrigger.refresh();
  }, [is3DEnabled]);

  const [firstName, ...rest] = hero.name.split(" ");
  const lastName = rest.join(" ");
  const initials = hero.name
    .split(" ")
    .map((word) => word[0])
    .join("");

  return (
    <div ref={rootRef} className="relative z-10">
      {/* ============ FIRST SCREEN: hero + stack strip ============ */}
      {/*
        Both live inside one viewport-height column so the strip is part of
        the first thing a visitor sees rather than sitting just under the
        fold. The hero flexes to fill whatever is left after the strip, so
        the two always add up to exactly one screen.

        svh, not vh: on mobile `vh` is the height with the browser chrome
        HIDDEN, so a 100vh hero is taller than the visible area on load and
        pushes the strip back under the fold — the exact problem this is
        fixing. `svh` is the height with the chrome showing, which is what
        you actually get when the page opens. `dvh` would fit too but
        changes as the chrome collapses, and a first screen that resizes
        mid-scroll forces ScrollTrigger to re-measure.
      */}
      <div className="flex min-h-svh flex-col">
      {/* ==================== HERO ==================== */}
      <section
        id="top"
        data-hero
        className="relative flex w-full flex-1 items-center px-6 pb-10 pt-16 sm:px-10 sm:pb-24 sm:pt-28 lg:px-16"
      >
        {/* Corner frame marks */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-5 sm:inset-9"
        >
          {[
            "left-0 top-0 border-l border-t",
            "right-0 top-0 border-r border-t",
            "bottom-0 left-0 border-b border-l",
            "bottom-0 right-0 border-b border-r",
          ].map((pos) => (
            <span
              key={pos}
              className={`absolute h-6 w-6 border-rule ${pos}`}
            />
          ))}
        </div>

        <div className="mx-auto grid w-full max-w-6xl items-center gap-8 sm:gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          {/* ---- Identity ---- */}
          <div className="order-2 lg:order-1">
            <div data-hero-rise className="flex items-center gap-4">
              <span aria-hidden="true" className="h-px w-10 bg-ink/60" />
              <span className="font-mono text-[10px] uppercase tracking-[0.34em] text-ink">
                Neural Architecture &amp; Data Pipelines
              </span>
            </div>

            <h1 className="mt-7 text-[clamp(2.4rem,6.6vw,5rem)] font-semibold uppercase leading-[0.92] tracking-[-0.02em] text-ink">
              <span className="block overflow-hidden">
                <span data-name-line className="block will-change-transform">
                  {firstName}
                </span>
              </span>
              <span className="block overflow-hidden">
                <span data-name-line className="block will-change-transform">
                  {lastName}
                </span>
              </span>
            </h1>

            <span
              data-hero-rule
              aria-hidden="true"
              className="mt-8 block h-px w-full max-w-sm origin-left bg-gradient-to-r from-ink/60 via-ink/20 to-transparent"
            />

            <p
              data-hero-rise
              className="mt-7 text-[clamp(0.8rem,1.25vw,1rem)] font-medium uppercase tracking-[0.26em] text-ink"
            >
              {hero.title}
            </p>

            <div
              data-hero-rise
              className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-[0.26em] text-ink-muted"
            >
              <span className="flex items-center gap-2.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-ink" />
                </span>
                {hero.status}
              </span>
            </div>
          </div>

          {/* ---- Portrait ---- */}
          <div className="order-1 flex justify-center lg:order-2 lg:justify-end">
            <div className="relative [perspective:1100px]">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-10 bg-[radial-gradient(circle,rgba(56,189,248,0.22),transparent_66%)] blur-2xl"
              />

              <div
                ref={portraitRef}
                data-portrait
                className="relative h-[clamp(158px,32vw,380px)] w-[clamp(158px,32vw,380px)] [transform-style:preserve-3d] will-change-transform"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 200"
                  className="absolute inset-0 h-full w-full overflow-visible"
                >
                  <circle
                    data-ring-a
                    cx="100"
                    cy="100"
                    r="97"
                    fill="none"
                    stroke="rgba(10,10,10,0.45)"
                    strokeWidth="0.5"
                    strokeDasharray="1 7"
                  />
                  <circle
                    data-ring-b
                    cx="100"
                    cy="100"
                    r="91"
                    fill="none"
                    stroke="rgba(10,10,10,0.18)"
                    strokeWidth="0.4"
                    strokeDasharray="26 14"
                  />
                  {[0, 90, 180, 270].map((deg) => (
                    <line
                      key={deg}
                      x1="100"
                      y1="2"
                      x2="100"
                      y2="9"
                      stroke="rgba(10,10,10,0.7)"
                      strokeWidth="1"
                      transform={`rotate(${deg} 100 100)`}
                    />
                  ))}
                </svg>

                <div className="absolute inset-[7%] overflow-hidden rounded-full border border-rule bg-bone">
                  {hero.photo && !photoFailed ? (
                    <Image
                      src={hero.photo}
                      alt=""
                      fill
                      priority
                      sizes="380px"
                      className="object-cover contrast-[1.03] saturate-[1.05]"
                      onError={() => setPhotoFailed(true)}
                    />
                  ) : (
                    <div className="relative flex h-full w-full flex-col items-center justify-center bg-ink/[0.03]">
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 opacity-50 [background-image:linear-gradient(to_right,rgba(10,10,10,0.07)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.07)_1px,transparent_1px)] [background-size:16px_16px]"
                      />
                      <span className="relative text-3xl font-medium tracking-[0.3em] text-ink-muted">
                        {initials}
                      </span>
                      <span className="relative mt-3 font-mono text-[9px] uppercase tracking-[0.3em] text-ink-faint">
                        No signal
                      </span>
                    </div>
                  )}

                  {/* Halftone — the portrait resolves into the same dot matrix
                      as the particle field behind it. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-multiply [background-image:radial-gradient(rgba(10,10,10,0.85)_0.5px,transparent_0.5px)] [background-size:3px_3px]"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-ink/[0.09] mix-blend-color"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(125%_105%_at_50%_28%,transparent_68%,rgba(244,243,240,0.55))]"
                  />
                  <div
                    data-scan
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-[26%] bg-gradient-to-b from-transparent via-ink/[0.10] to-transparent"
                  />
                </div>

                <span
                  data-hero-rise
                  className="absolute -bottom-7 right-0 font-mono text-[9px] uppercase tracking-[0.3em] text-ink-faint"
                >
                  Sys · Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator: the rail draws downward as the hero gives way
            to Experience, and the whole thing fades before you get there —
            it has done its job once you're already moving. */}
        <div
          data-scroll-indicator
          className="pointer-events-none absolute inset-x-0 bottom-8 hidden flex-col items-center gap-3 sm:flex sm:bottom-10"
        >
          <span className="font-mono text-[9px] uppercase tracking-[0.32em] text-ink-faint">
            Scroll to initialize
          </span>
          <span
            aria-hidden="true"
            className="relative h-12 w-px overflow-hidden bg-ink/15"
          >
            <span
              data-scroll-rail-fill
              className="absolute inset-x-0 top-0 h-full origin-top bg-ink"
            />
          </span>
        </div>
      </section>

      {/* ==================== STACK MARQUEE ==================== */}
      <div className="relative w-full shrink-0 overflow-hidden border-y border-rule bg-bone/90 py-6">
        <h2 className="sr-only">Technical stack</h2>
        <p className="sr-only">{stack.join(", ")}</p>

        <div
          ref={marqueeRef}
          aria-hidden="true"
          className="flex w-max will-change-transform"
        >
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center">
              {stack.map((item) => (
                <div key={`${copy}-${item}`} className="flex items-center">
                  <span className="group/tech flex shrink-0 items-center gap-2.5 whitespace-nowrap px-7 text-ink-muted transition-colors duration-300 hover:text-ink">
                    <TechIcon name={item} className="h-[15px] w-[15px]" />
                    <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                      {item}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="h-[3px] w-[3px] shrink-0 bg-ink/20"
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-bone to-transparent sm:w-32"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-bone to-transparent sm:w-32"
        />
      </div>

      </div>
      {/* ====================== end first screen ====================== */}

      {/* ==================== WORK ==================== */}
      <div id="work" className="scroll-mt-24">
        <div className="px-6 pt-24 sm:px-10 lg:px-20">
          <div className="mx-auto max-w-5xl">
            <p className="font-mono text-[12px] lowercase tracking-[0.08em] text-ink-muted">
              / selected work
            </p>
            <h2 className="mt-6 max-w-2xl text-[clamp(1.8rem,4.4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
              Things I have shipped.
            </h2>
          </div>
        </div>

        {projects.length > 0 ? (
          <section
            data-work-stage
            className="relative mt-14 h-screen overflow-hidden"
          >
            <div
              ref={trackRef}
              className="flex h-full w-max items-center gap-10 px-6 will-change-transform sm:gap-16 sm:px-10 lg:px-20"
            >
              {projects.map((project, index) => (
                <article
                  key={project.id}
                  data-work-card
                  data-offset={index % 2 === 0 ? "up" : "down"}
                  className="flex w-[78vw] shrink-0 flex-col sm:w-[56vw] lg:w-[38vw]"
                >
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-rule bg-ink/[0.04]">
                    {project.thumbnail ? (
                      <Image
                        src={project.thumbnail}
                        alt={project.title}
                        fill
                        sizes="(max-width: 1024px) 78vw, 38vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center">
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(10,10,10,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.05)_1px,transparent_1px)] [background-size:32px_32px]"
                        />
                        <span className="relative font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint">
                          {project.title}
                        </span>
                        <span className="relative mt-2 font-mono text-[9px] uppercase tracking-[0.26em] text-ink-faint">
                          Thumbnail pending
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-7 flex items-baseline gap-4">
                    <span className="font-mono text-[12px] text-ink-faint">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-[clamp(1.4rem,2.6vw,2rem)] font-semibold tracking-[-0.025em] text-ink">
                      {project.title}
                    </h3>
                  </div>

                  {(project.stack || project.year) && (
                    <p className="mt-2 pl-9 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-faint">
                      {[project.stack, project.year].filter(Boolean).join("  ·  ")}
                    </p>
                  )}

                  {project.summary && (
                    <p className="mt-4 max-w-md pl-9 text-[14.5px] leading-7 text-ink-muted">
                      {project.summary}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center gap-3 pl-9">
                    {project.liveUrl && (
                      <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 rounded-full bg-ink px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-bone transition-transform duration-300 hover:scale-[1.04]"
                      >
                        View live
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                    {project.repoUrl && (
                      <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2.5 rounded-full border border-rule px-5 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted transition-colors duration-300 hover:border-ink/40 hover:text-ink"
                      >
                        Source
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </div>
                </article>
              ))}

              <div className="w-[12vw] shrink-0" aria-hidden="true" />
            </div>
          </section>
        ) : (
          <p className="mx-auto mt-12 max-w-5xl px-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint sm:px-10 lg:px-20">
            No projects yet — add one from the media panel.
          </p>
        )}
      </div>

      {/* ==================== RECORD ==================== */}
      {/* Was a full-viewport terminal box typing four lines. Now a compact
          logo rail — same content, about a fifth of the height. */}
      <section
        id="logs"
        className="scroll-mt-24 px-6 py-24 sm:px-10 lg:px-20"
      >
        <div className="mx-auto w-full max-w-5xl">
          <RecordRail label={records.label} items={records.items} />
        </div>
      </section>

      {/* ==================== EXPERIENCE ==================== */}
      <section
        id="experience"
        className="relative scroll-mt-24 px-6 py-32 sm:px-10 lg:px-20"
      >
        <div className="mx-auto max-w-6xl">
          <p
            data-exp-head
            className="font-mono text-[12px] lowercase tracking-[0.08em] text-ink-muted"
          >
            / experience
          </p>
          <h2
            data-exp-head
            className="mt-6 max-w-2xl text-[clamp(1.8rem,4.4vw,3.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink"
          >
            Where the systems were built.
          </h2>

          {/* The right column is deliberately allowed to stretch: `sticky`
              needs a tall parent to travel inside, so no `items-start`. */}
          <div className="mt-20 grid gap-16 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-20">
          <ol data-exp-list className="relative">
            <div
              ref={railRef}
              aria-hidden="true"
              className="absolute left-0 top-2 h-[calc(100%-1rem)] w-px bg-ink/10"
            >
              {/* Brightest at the leading edge so the draw reads as travel
                  rather than a bar quietly getting longer. */}
              <div
                data-rail-fill
                className="h-full w-px origin-top bg-gradient-to-b from-ink/15 via-ink/45 to-ink"
              />
              {/* Rides the leading edge. The ring is bone, not a shadow, so
                  it punches a clean hole in the track behind it. */}
              <span
                data-rail-head
                className="absolute -left-[3.5px] -top-1 h-2 w-2 rotate-45 bg-ink shadow-[0_0_0_3px_var(--bone),0_0_12px_2px_rgba(10,10,10,0.22)]"
              />
            </div>

            {experience.map((job) => (
              <li
                key={job.id}
                data-exp-entry
                className="relative pb-20 pl-8 last:pb-0 sm:pl-14"
              >
                <span
                  data-exp-node
                  aria-hidden="true"
                  className="absolute -left-[4.5px] top-1.5 h-[9px] w-[9px] rotate-45 border border-ink/60 bg-bone"
                />

                <div
                  data-exp-rise
                  className="flex flex-wrap items-baseline gap-x-4 gap-y-1"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink">
                    {job.node}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-muted">
                    {job.timeline}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-ink-faint">
                    {job.location}
                  </span>
                </div>

                <h3
                  data-exp-rise
                  className="mt-4 text-[clamp(1.5rem,3.4vw,2.5rem)] font-semibold leading-tight tracking-[-0.025em] text-ink"
                >
                  {job.company}
                </h3>

                <p
                  data-exp-rise
                  className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-ink-muted"
                >
                  {job.role}
                </p>

                <ul className="mt-7 space-y-3.5 border-l border-rule pl-5">
                  {job.metrics.map((metric) => (
                    <li
                      key={metric}
                      data-exp-rise
                      className="relative text-[15px] leading-7 text-ink-muted"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute -left-5 top-3 h-px w-3 bg-ink/25"
                      />
                      {metric}
                    </li>
                  ))}
                </ul>

                <ul data-exp-rise className="mt-7 flex flex-wrap gap-2">
                  {job.stack.map((tech) => (
                    <li
                      key={tech}
                      className="border border-rule px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-muted transition-colors duration-300 hover:border-ink/40 hover:text-ink"
                    >
                      {tech}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>

            {/* Hidden below lg — the column it fills only exists at widths
                where the timeline leaves room beside it. */}
            <div className="hidden lg:block">
              <div className="sticky top-32">
                <PipelineStack />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== BEYOND ==================== */}
      <section
        id="identity"
        className="relative scroll-mt-24 px-6 py-32 sm:px-10 lg:px-20"
      >
        <div className="mx-auto max-w-6xl">
          <p
            data-identity-rise
            className="font-mono text-[12px] lowercase tracking-[0.08em] text-ink-muted"
          >
            / {identityNode.label}
          </p>
          <h2
            data-identity-rise
            className="mt-6 max-w-2xl text-[clamp(1.9rem,4.8vw,3.5rem)] font-semibold leading-[1.03] tracking-[-0.03em] text-ink"
          >
            {identityNode.headline}
          </h2>
          <p
            data-identity-rise
            className="mt-6 max-w-xl text-[15px] leading-8 text-ink-muted"
          >
            {identityNode.intro}
          </p>

          <div className="mt-24 space-y-28">
            {identityNode.rows.map((category, i) => {

              return (
              <article
                key={category.id}
                data-identity-row
                className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
              >
                {/* Alternate sides so the column does not march in a line. */}
                <div className={i % 2 === 1 ? "lg:order-2" : undefined}>
                  <div className="flex items-baseline gap-5">
                    <span className="font-mono text-[13px] text-ink-faint">
                      {category.index}
                    </span>
                    <h3 className="text-[clamp(1.6rem,3.4vw,2.5rem)] font-semibold tracking-[-0.03em] text-ink">
                      {category.title}
                    </h3>
                  </div>

                  <p className="mt-3 pl-[2.6rem] font-mono text-[11px] uppercase tracking-[0.2em] text-ink-muted">
                    {category.role}
                  </p>

                  <p className="mt-6 max-w-md pl-[2.6rem] text-[15px] leading-8 text-ink-muted">
                    {category.detail}
                  </p>

                  <ul className="mt-7 flex flex-wrap gap-2 pl-[2.6rem]">
                    {category.facts.map((fact) => (
                      <li
                        key={fact}
                        className="rounded-full border border-rule px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-muted"
                      >
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>

                <figure
                  data-identity-media
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg border border-rule bg-ink/[0.04] ${
                    i % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  {/* Every row is a gallery. CrossfadeGallery renders a
                      single image as a still and cycles two or more, so
                      adding performance shots to any row — Raw Acoustics
                      included — is an upload, not a code change. */}
                  <CrossfadeGallery
                    images={category.images}
                    label={category.title}
                  />
                </figure>
              </article>
              );
            })}
          </div>

          <BeyondTheCode
            eyebrow={beyondTheCode.eyebrow}
            title={beyondTheCode.title}
            copy={beyondTheCode.copy}
          />
        </div>
      </section>

      {/* ==================== CONTACT ==================== */}
      <footer
        id="contact"
        className="invert-block relative scroll-mt-24 border-t border-bone/15 px-6 pb-12 pt-32 sm:px-10 lg:px-20"
      >
        <div className="mx-auto max-w-5xl">
          <p
            data-contact-rise
            className="font-mono text-[12px] lowercase tracking-[0.08em] text-bone/55"
          >
            / contact
          </p>

          <div
            data-contact-rise
            className="mt-8 inline-flex items-center gap-3 border border-bone/15 px-4 py-2"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bone/50" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-bone" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-bone">
              {contact.availability}
            </span>
          </div>

          {/* Was a bouncing per-character drop; replaced with a line mask —
              the restraint reads far better at this size. */}
          <h2 className="mt-14 max-w-4xl text-[clamp(2.4rem,8vw,6.5rem)] font-semibold leading-[0.94] tracking-[-0.045em] text-bone">
            {["Engineering logic.", "Training intelligence."].map((line) => (
              <span key={line} className="block overflow-hidden">
                <span data-outro-line className="block will-change-transform">
                  {line}
                </span>
              </span>
            ))}
          </h2>

          <MagneticButton
            data-contact-rise
            href={`mailto:${contact.email}`}
            strength={0.2}
            className="group mt-12 inline-block max-w-full"
          >
            <span className="block truncate text-[clamp(1.1rem,3.4vw,2.25rem)] font-medium tracking-[-0.02em] text-bone transition-colors duration-300">
              {contact.email}
            </span>
            <span
              aria-hidden="true"
              className="mt-2 block h-px w-full bg-bone/25 transition-colors duration-500 group-hover:bg-bone/70"
            />
          </MagneticButton>

          <ul data-contact-rise className="mt-14 flex flex-wrap gap-3">
            {contact.links.map((link) => (
              <li key={link.label}>
                <MagneticButton
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  strength={0.4}
                  className="inline-flex items-center gap-2.5 border border-bone/15 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.24em] text-bone/60 transition-colors duration-300 hover:border-bone/50 hover:text-bone"
                >
                  {link.label}
                  <span aria-hidden="true" className="text-[11px]">
                    ↗
                  </span>
                </MagneticButton>
              </li>
            ))}
          </ul>

          <div className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-bone/15 pt-8 font-mono text-[10px] uppercase tracking-[0.24em] text-bone/40">
            <span>{hero.name}</span>
            <span>Next.js · R3F · GSAP · Lenis</span>
          </div>
        </div>
      </footer>

      {/* Operator-only. Renders only when NEXT_PUBLIC_SHOW_ADMIN=1; every
          write is authorised server-side against ADMIN_TOKEN. */}
      <MediaAdmin
        projects={projects}
        records={records.items}
        experience={experience}
        media={media}
      />
    </div>
  );
}
