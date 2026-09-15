"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import MediaPending from "./MediaPending";

/**
 * Auto-crossfading stack of images for a Beyond row that has more than one
 * photo — currently just Fading Echoes (band logo, then performance shots,
 * in upload order). A single-photo slot renders exactly like the static
 * image it replaces: no timer, no fade, nothing to gate on.
 *
 * The interval only ever changes which index is "active"; GSAP owns the
 * actual opacity of each layer from there, so a fade is a fade rather than a
 * jump — mixing a reactive `style={{opacity}}` with a GSAP tween on the same
 * property would fight itself, each render snapping to the target before the
 * tween has a chance to ease into it.
 */
export default function CrossfadeGallery({
  images,
  label,
}: {
  images: readonly string[];
  label: string;
}) {
  const [activeIndex, setActive] = useState(0);
  // Failed images are tracked by path, not by index. Indices shift when a
  // photo is removed from the middle of the gallery, so an index-keyed flag
  // would blank whichever image happened to inherit that slot.
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const layers = useRef<(HTMLDivElement | null)[]>([]);

  // Clamped during render rather than corrected in an effect. Removing a
  // photo can leave the stored index past the end of a now-shorter gallery;
  // deriving the value here keeps it valid on the very first frame, and
  // avoids the setState-in-effect the React Compiler (correctly) rejects.
  const active = activeIndex < images.length ? activeIndex : 0;

  useEffect(() => {
    if (images.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      setActive((current) => (current + 1) % images.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [images.length]);

  useEffect(() => {
    // Drop refs left behind by removed photos, so nothing below tweens a
    // node that is no longer in the document.
    layers.current.length = images.length;

    layers.current.forEach((node, i) => {
      if (!node) return;
      gsap.to(node, {
        opacity: i === active ? 1 : 0,
        duration: 1.1,
        ease: "power2.inOut",
        overwrite: true,
      });
    });
  }, [active, images.length]);

  if (images.length === 0) return <MediaPending label={label} />;

  return (
    <>
      {images.map((src, i) => (
        <div
          key={src}
          ref={(node) => {
            layers.current[i] = node;
          }}
          className={`absolute inset-0 ${i === 0 ? "opacity-100" : "opacity-0"}`}
        >
          {!failed.has(src) ? (
            <Image
              src={src}
              alt={i === 0 ? label : `${label} — ${i + 1}`}
              fill
              sizes="(max-width: 1024px) 90vw, 560px"
              className="object-cover"
              onError={() =>
                setFailed((current) => new Set(current).add(src))
              }
            />
          ) : (
            <MediaPending label={label} bare />
          )}
        </div>
      ))}

      {images.length > 1 && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full border border-bone/10 bg-ink/75 px-2 py-1.5 backdrop-blur-sm">
          {images.map((src, i) => (
            <span
              key={src}
              aria-hidden="true"
              className={`h-1 w-4 rounded-full transition-colors duration-500 ${
                i === active ? "bg-bone" : "bg-bone/35"
              }`}
            />
          ))}
        </div>
      )}
    </>
  );
}
