"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";
import { sceneState } from "@/lib/scene-state";
import { useIsCompact } from "@/lib/use-media-query";

/* ================================================================== *
 * Camera distance.
 * ================================================================== */

const CAMERA_Z = 6.4;

/* ================================================================== *
 * Ambient particle field
 * ================================================================== */

const GRID_X = 176;
const GRID_Y = 104;
const SPACING = 0.32;

/**
 * The same field, drawn with a quarter of the points.
 *
 * Spacing is doubled as the counts are halved, so the lattice covers exactly
 * the same world extent — it reads as the same field, just less dense. The
 * wave itself is a vertex shader, so cost here is vertices and fill rate,
 * not JavaScript; dropping 18,304 points to 4,576 is a real saving on a
 * phone GPU and costs nothing on a desktop one, which never sees it.
 */
const COMPACT_GRID_X = 88;
const COMPACT_GRID_Y = 52;
const COMPACT_SPACING = SPACING * 2;

function createLattice(gridX: number, gridY: number, spacing: number) {
  const count = gridX * gridY;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  let i = 0;
  for (let y = 0; y < gridY; y++) {
    for (let x = 0; x < gridX; x++) {
      positions[i * 3] = (x - gridX / 2) * spacing;
      positions[i * 3 + 1] = (y - gridY / 2) * spacing;
      positions[i * 3 + 2] = 0;
      seeds[i] = Math.random();
      i++;
    }
  }
  return { positions, seeds };
}

const LATTICE = createLattice(GRID_X, GRID_Y, SPACING);
const COMPACT_LATTICE = createLattice(
  COMPACT_GRID_X,
  COMPACT_GRID_Y,
  COMPACT_SPACING,
);

const LATTICE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uDistort;
  uniform float uVelocity;
  uniform float uSize;
  uniform float uFocus;
  attribute float aSeed;
  varying float vElevation;
  varying float vDistort;
  varying float vFocus;

  void main() {
    vec3 pos = position;

    // Three scales, like open water: long swell, cross swell, and fine chop.
    float swell  = sin(pos.x * 0.16 + uTime * 0.42) * 0.62;
    float cross  = sin(pos.y * 0.21 - uTime * 0.33) * 0.48;
    float chop   = sin(pos.x * 0.62 + pos.y * 0.47 + uTime * 1.05) * 0.13;
    float ripple = sin(length(pos.xy) * 0.30 - uTime * 0.7) * 0.16;
    float elevation = swell + cross + chop + ripple;

    float turbulence =
        sin(pos.x * 2.3 + uTime * 1.8 + aSeed * 6.2831)
      * cos(pos.y * 1.9 - uTime * 1.5);
    elevation += turbulence * uDistort * 1.6;

    pos.x += sin(pos.y * 0.8 + uTime * 0.9) * uDistort * 0.9;
    elevation += uVelocity * sin(pos.y * 0.9 + uTime) * 0.34;

    pos.z += elevation;

    vElevation = elevation;
    vDistort = uDistort;
    vFocus = uFocus;

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (0.6 + aSeed * 0.9) * (1.0 + uFocus * 0.3) * (16.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const LATTICE_FRAG = /* glsl */ `
  varying float vElevation;
  varying float vDistort;
  varying float vFocus;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.05, d);

    float h = clamp(vElevation * 0.45 + 0.5, 0.0, 1.0);

    // Ink points on the bone ground, darkening with elevation. Normal
    // blending — additive would simply vanish against a light background.
    vec3 color = mix(vec3(0.66, 0.66, 0.63), vec3(0.04, 0.04, 0.04), h);

    // Hero: dominant. Past it: an ambient wash that never fights body copy.
    float punch = mix(0.42, 1.0, vFocus);
    gl_FragColor = vec4(color, alpha * (0.10 + h * 0.60) * punch);
    #include <colorspace_fragment>
  }
`;

function AmbientLattice({ compact }: { compact: boolean }) {
  const lattice = compact ? COMPACT_LATTICE : LATTICE;
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const groupRef = useRef<THREE.Group>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDistort: { value: 0 },
      uVelocity: { value: 0 },
      uSize: { value: 2.7 },
      uFocus: { value: 1 },
    }),
    [],
  );

  useFrame((_, delta) => {
    const material = materialRef.current;
    const group = groupRef.current;
    if (!material || !group) return;

    const dt = Math.min(delta, 0.1);
    const u = material.uniforms;
    u.uTime.value += dt;
    u.uDistort.value = THREE.MathUtils.damp(
      u.uDistort.value,
      sceneState.distort,
      5,
      dt,
    );
    u.uVelocity.value = THREE.MathUtils.damp(
      u.uVelocity.value,
      sceneState.velocity,
      6,
      dt,
    );
    u.uFocus.value = THREE.MathUtils.damp(
      u.uFocus.value,
      sceneState.heroFocus,
      3,
      dt,
    );

  });

  return (
    <group ref={groupRef} rotation={[-1.36, 0, 0]} position={[0, 0.55, 0]}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[lattice.positions, 3]}
          />
          <bufferAttribute attach="attributes-aSeed" args={[lattice.seeds, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={materialRef}
          uniforms={uniforms}
          vertexShader={LATTICE_VERT}
          fragmentShader={LATTICE_FRAG}
          transparent
          depthWrite={false}
        />
      </points>
    </group>
  );
}

/* ================================================================== *
 * Canvas shell
 * ================================================================== */

/**
 * Fixed, full-viewport particle field.
 *
 * Reduced to the lattice alone. Measured against a scripted stepped-wheel
 * scroll, the previous hall (cabinets, skyline, grid floor and a bloom pass)
 * cost 36 dropped frames out of 183 with a 216ms worst frame; the same scroll
 * with WebGL disabled held a flat 60fps and dropped nothing. The field is the
 * part worth keeping — it is one draw call and it is what the page reads as.
 */
export default function Scene() {
  const [dpr, setDpr] = useState(1.25);
  const compact = useIsCompact();

  /**
   * DPR is the dominant cost on a phone, well ahead of point count.
   *
   * A 390x844 screen at its native 3x is 2.96 million pixels to shade every
   * frame; the same screen at 1x is 0.33 million. The field is a soft dot
   * matrix with no hard edges, so it survives the lower resolution far
   * better than text or UI would — this is the cheapest large saving
   * available, and the PerformanceMonitor's escalation is capped with it so
   * a brief good patch cannot push a phone back up to 1.5.
   */
  const effectiveDpr = compact ? Math.min(dpr, 1) : dpr;

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <Canvas
        dpr={effectiveDpr}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        camera={{ position: [0, 0.85, CAMERA_Z], fov: 68 }}
      >
        <color attach="background" args={["#f4f3f0"]} />

        <PerformanceMonitor
          onIncline={() => setDpr(1.5)}
          onDecline={() => setDpr(1)}
        />

        <AmbientLattice key={compact ? "compact" : "full"} compact={compact} />
      </Canvas>
    </div>
  );
}
