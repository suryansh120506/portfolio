"use client";

import Scene from "./Scene";
import { useSceneToggle } from "@/lib/scene-toggle";

/**
 * Conditional mount point for the WebGL layer.
 *
 * Returning `null` unmounts the R3F `<Canvas>` outright rather than hiding it:
 * R3F disposes the renderer, the WebGL context is released and the render loop
 * stops, so the GPU genuinely goes idle. Toggling `visibility` or `display`
 * would keep the context alive and still cost frames.
 *
 * The legibility scrim also goes with it — with no canvas there is nothing to
 * dim, and every section already sits on a solid black ground.
 */
export default function SceneMount() {
  const { is3DEnabled } = useSceneToggle();

  if (!is3DEnabled) return null;

  return (
    <>
      <Scene />
      {/*
        Legibility scrim at z-1: sits between the lattice (z-0) and the DOM
        (z-10). Without it, body copy competes with the particle field and the
        mono labels become unreadable over dense regions.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[1]"
        style={{ background: "rgb(244 243 240 / var(--scrim, 0.55))" }}
      />
    </>
  );
}
