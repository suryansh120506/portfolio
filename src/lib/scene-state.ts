/**
 * Shared, mutable bridge between the GSAP/DOM layer and the WebGL layer.
 *
 * ScrollTriggers (page components) and Lenis (SmoothScroll.tsx) WRITE to this
 * object; the R3F render loop (Scene.tsx) READS it inside `useFrame`. It is
 * deliberately a plain mutable singleton rather than React state — scroll
 * updates at display rate must never trigger a React re-render.
 *
 * Kept in its own module so SmoothScroll.tsx can write scroll values without
 * pulling the entire three.js/R3F bundle into its import graph.
 */
export type SceneState = {
  /** Whole-document scroll progress, 0 → 1. Written by Lenis. */
  progress: number;
  /** Normalized scroll velocity, roughly -1 → 1. Written by Lenis. */
  velocity: number;
  /** Lattice turbulence, 0 → 1. Written by pinned section ScrollTriggers. */
  distort: number;
  /**
   * 1 while the hero owns the viewport, easing to 0 as it leaves.
   *
   * The particle field is the signature of the page and should dominate the
   * hero at full strength — but at that brightness it competes with body copy
   * further down. This lets the lattice be loud exactly where it should be.
   */
  heroFocus: number;

};

export const sceneState: SceneState = {
  progress: 0,
  velocity: 0,
  distort: 0,
  heroFocus: 1,

};
