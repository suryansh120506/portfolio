/**
 * Placeholder for a media slot with nothing in it yet.
 *
 * Shared by the single-image Beyond rows and the Fading Echoes gallery so an
 * empty slot looks identical — and deliberate — wherever it appears, rather
 * than leaving a bare bordered box that reads as a broken image.
 */
export default function MediaPending({
  label,
  /** Skip the absolute fill when the parent layer already provides it. */
  bare = false,
}: {
  label: string;
  bare?: boolean;
}) {
  return (
    <div
      className={`flex ${bare ? "" : "absolute inset-0"} h-full w-full flex-col items-center justify-center`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgba(10,10,10,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(10,10,10,0.05)_1px,transparent_1px)] [background-size:28px_28px]"
      />
      <span className="relative font-mono text-[10px] uppercase tracking-[0.3em] text-ink-faint">
        {label}
      </span>
      <span className="relative mt-2 font-mono text-[9px] uppercase tracking-[0.26em] text-ink-faint/70">
        Image pending
      </span>
    </div>
  );
}
