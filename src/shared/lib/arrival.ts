/**
 * Whether the reader has asked for less motion: then the loading screen does not hold, the page
 * arrives at once, and every draw-in is skipped. Asked where it matters rather than once, so a
 * change of the system setting takes effect on the next arrival.
 */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}
