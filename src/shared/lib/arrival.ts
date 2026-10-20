import { INTRO_SESSION_KEY } from './preference-keys.ts';

/**
 * Whether this visit has already arrived: the loading screen's spectrum and the interface's
 * four-second arrival play once, the first time the app opens in a session. A phone that puts
 * the page away and reloads it whole on return is returning, not arriving, and gets the page
 * at once. Storage can refuse (private browsing); then every load is an arrival, which is no
 * worse than before.
 */
export function hasArrived(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SESSION_KEY) !== null;
  } catch {
    return false;
  }
}

export function rememberArrival(): void {
  try {
    sessionStorage.setItem(INTRO_SESSION_KEY, 'arrived');
  } catch {
    // Nothing to do: next time is an arrival again.
  }
}

/** Whether the reader has asked for less motion: then every arrival happens at once. */
export function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}
