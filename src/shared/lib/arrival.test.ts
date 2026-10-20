import { afterEach, describe, expect, it, vi } from 'vitest';

import { prefersReducedMotion } from './arrival.ts';

describe('reduced motion', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads the preference, and assumes none where it cannot ask', () => {
    const matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList);
    vi.stubGlobal('matchMedia', matchMedia);
    expect(prefersReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    vi.stubGlobal('matchMedia', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
