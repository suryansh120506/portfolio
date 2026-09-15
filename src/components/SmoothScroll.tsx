"use client";

import "lenis/dist/lenis.css";
import { useEffect, type ReactNode } from "react";
import { ReactLenis, useLenis } from "lenis/react";
import type Lenis from "lenis";
import type { LenisOptions } from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { sceneState } from "@/lib/scene-state";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Anti-stutter scroll physics.
 *
 * `lerp` and `duration` are mutually exclusive in Lenis: duration-based easing
 * restarts its tween on every wheel event, which is exactly what makes a
 * stepped Windows mouse wheel feel notchy — each click interrupts the previous
 * animation. Frame-rate-independent lerp instead chases a moving target, so
 * rapid discrete deltas accumulate into one continuous glide.
 *
 * `autoRaf: false` is mandatory here: GSAP's ticker drives the loop, and two
 * competing rAF loops would tear.
 */
const LENIS_OPTIONS: LenisOptions = {
  lerp: 0.08,
  wheelMultiplier: 1.2,
  syncTouch: true,
  smoothWheel: true,
  autoRaf: false,
};

/** Divisor mapping raw Lenis velocity into a usable -1 → 1 range. */
const VELOCITY_SCALE = 40;

/**
 * Binds Lenis to the GSAP ticker.
 *
 * This lives in a child component rather than in `SmoothScroll` itself because
 * `ReactLenis` instantiates Lenis in a *passive* effect and stores it in state —
 * a parent layout effect (which is what `useGSAP` uses) would observe
 * `undefined` on first mount. Reading the instance from context via `useLenis`
 * and keying the effect on it removes that race entirely.
 */
function GsapLenisBridge() {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;

    // Lenis writes the scroll position, then ScrollTrigger reads it — in the
    // same pass, so pinned/scrubbed elements can never lag the WebGL by a frame.
    const handleScroll = (instance: Lenis) => {
      ScrollTrigger.update();
      sceneState.progress = instance.progress;
      sceneState.velocity = gsap.utils.clamp(
        -1,
        1,
        instance.velocity / VELOCITY_SCALE,
      );
    };
    lenis.on("scroll", handleScroll);

    // One authoritative clock: GSAP drives Lenis (ticker time is in seconds,
    // Lenis expects milliseconds).
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);

    // Lag smoothing would let GSAP skip time after a stall, desyncing the
    // scroll position from the DOM/WebGL transforms.
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.off("scroll", handleScroll);
      gsap.ticker.remove(update);
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, [lenis]);

  return null;
}

/**
 * Global smooth-scroll provider. `root` mode drives the real window scroll,
 * which means ScrollTrigger needs no `scrollerProxy` — it works natively.
 */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <GsapLenisBridge />
      {children}
    </ReactLenis>
  );
}
