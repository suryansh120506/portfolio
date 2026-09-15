"use client";

import { useEffect, useRef } from "react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import gsap from "gsap";

type MagneticButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  /** Fraction of the cursor's offset from centre the element follows. */
  strength?: number;
  /** Ceiling on the displacement, in px, in either axis. */
  maxShift?: number;
};

/**
 * Subtle pointer-attraction for a handful of high-intent footer links (the
 * email address, GitHub, LinkedIn) — not a global cursor effect. This site
 * runs the native cursor everywhere else; magnetism is reserved for the few
 * elements where "come find me" reads as an invitation rather than noise.
 *
 * quickTo drives x/y directly on the anchor, the same idiom already used for
 * the hero portrait's pointer tilt. Always eases back to (0, 0) on pointer
 * leave, and is inert under prefers-reduced-motion.
 *
 * `strength` alone is a fraction of the cursor's offset from centre, so on a
 * wide target (the email address spans most of the column) the same fraction
 * produces a much larger slide than it does on a small pill — 30-odd pixels
 * rather than ten, which reads as the element running away from you.
 * `maxShift` caps the result so the pull stays a nudge at any size.
 */
export default function MagneticButton({
  strength = 0.3,
  maxShift = 14,
  children,
  ...rest
}: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const moveX = useRef<gsap.QuickToFunc | null>(null);
  const moveY = useRef<gsap.QuickToFunc | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  const quick = () => {
    const node = ref.current;
    if (!node) return null;
    moveX.current ??= gsap.quickTo(node, "x", {
      duration: 0.5,
      ease: "power3.out",
    });
    moveY.current ??= gsap.quickTo(node, "y", {
      duration: 0.5,
      ease: "power3.out",
    });
    return { x: moveX.current, y: moveY.current };
  };

  return (
    <a
      ref={ref}
      onPointerMove={(event) => {
        if (reduced.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const pull = gsap.utils.clamp(-maxShift, maxShift);
        const q = quick();
        q?.x(pull((event.clientX - (rect.left + rect.width / 2)) * strength));
        q?.y(pull((event.clientY - (rect.top + rect.height / 2)) * strength));
      }}
      onPointerLeave={() => {
        const q = quick();
        q?.x(0);
        q?.y(0);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
