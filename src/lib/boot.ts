/**
 * One-shot boot signal.
 *
 * The preloader covers the whole page, so the hero entrance must not play
 * behind it — otherwise the reveal is already over by the time anyone sees it.
 * The DOM layer builds its intro timeline paused and plays it from here.
 *
 * Deliberately not React state: this fires once, and routing it through a
 * provider would re-render the entire tree at exactly the moment the intro
 * animation needs the main thread.
 */
let booted = false;
let listeners = new Set<() => void>();

export function markBooted() {
  if (booted) return;
  booted = true;
  for (const listener of listeners) listener();
  listeners.clear();
}

/** Runs `callback` once the loader has finished — immediately if already done. */
export function onBoot(callback: () => void): () => void {
  if (booted) {
    callback();
    return () => {};
  }
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

export function isBooted() {
  return booted;
}

/** Test/HMR escape hatch. */
export function resetBoot() {
  booted = false;
  listeners = new Set();
}
