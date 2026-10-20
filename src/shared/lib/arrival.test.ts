import { afterEach, describe, expect, it, vi } from 'vitest';

import { hasArrived, prefersReducedMotion, rememberArrival } from './arrival.ts';
import { INTRO_SESSION_KEY } from './preference-keys.ts';

describe('the arrival', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('is new until remembered, then over for the rest of the visit', () => {
    expect(hasArrived()).toBe(false);
    rememberArrival();
    expect(hasArrived()).toBe(true);
    expect(sessionStorage.getItem(INTRO_SESSION_KEY)).toBe('arrived');
  });

  it('treats a visit whose storage refuses as a new arrival every time', () => {
    const refuse = () => {
      throw new Error('private');
    };
    vi.stubGlobal('sessionStorage', { getItem: refuse, setItem: refuse });
    expect(() => {
      rememberArrival();
    }).not.toThrow();
    expect(hasArrived()).toBe(false);
  });

  it('reads the reduced-motion preference, and assumes none where it cannot ask', () => {
    const matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    vi.stubGlobal('matchMedia', matchMedia);
    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
