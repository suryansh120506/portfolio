"use client";

/**
 * The scroll-driven object in the Experience column.
 *
 * Closed it reads as a single card. As the section arrives it tips back into
 * an isometric view and separates into the stages a model actually moves
 * through, then folds flat again on the way out — the same open-on-approach,
 * close-on-exit mechanic as a laptop lid, but built from this site's own
 * vocabulary (hairline rules, mono labels, halftone, corner ticks) rather
 * than a literal device.
 *
 * Presentation only. Every transform on it is written by the single
 * `useGSAP` context in DomLayer, which owns all scroll animation on the
 * page; this file just lays the layers out and exposes the hooks
 * (`data-pipeline-inner`, `data-pipeline-layer`) for it to drive.
 *
 * Stages are the real ones from the stack in data.ts, bottom-up, so the
 * diagram says something true rather than decorating the column.
 */

const LAYERS = [
  { id: "interface", index: "05", label: "Interface", tools: "Next.js · React" },
  { id: "serve", index: "04", label: "Serve", tools: "FastAPI · Node.js" },
  { id: "train", index: "03", label: "Train", tools: "PyTorch · TensorFlow" },
  { id: "transform", index: "02", label: "Transform", tools: "Python · SQL" },
  { id: "ingest", index: "01", label: "Ingest", tools: "PostgreSQL · MongoDB" },
];

export default function PipelineStack() {
  return (
    // Decorative: every stage named here is already stated in the stack
    // strip, so it is hidden rather than read out a second time.
    <div aria-hidden="true" className="select-none">
      <div className="flex items-center gap-3">
        <span className="h-px w-6 bg-ink/40" />
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-ink-faint">
          Pipeline
        </span>
      </div>

      <div className="relative mt-8 h-[360px] w-full [perspective:1100px]">
        <div
          data-pipeline-inner
          className="absolute inset-0 [transform-style:preserve-3d]"
        >
          {LAYERS.map((layer, i) => (
            <div
              key={layer.id}
              data-pipeline-layer
              // Top card paints over the ones behind it while collapsed.
              style={{ zIndex: LAYERS.length - i }}
              className="absolute left-1/2 top-1/2 h-[74px] w-[min(100%,250px)] [transform-style:preserve-3d]"
            >
              <div className="relative flex h-full w-full flex-col justify-center border border-ink/20 bg-bone px-4 shadow-[0_12px_26px_-20px_rgba(10,10,10,0.6)]">
                {/* Same halftone the portrait resolves into. */}
                <span className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(rgba(10,10,10,0.18)_0.5px,transparent_0.5px)] [background-size:6px_6px]" />

                <span className="relative flex items-baseline gap-2.5">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-ink-faint">
                    {layer.index}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.26em] text-ink">
                    {layer.label}
                  </span>
                </span>
                <span className="relative mt-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-ink-faint">
                  {layer.tools}
                </span>

                <span className="absolute left-0 top-0 h-2 w-2 border-l border-t border-ink/40" />
                <span className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-ink/40" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
