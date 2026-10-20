import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHONE_QUERY, useMediaQuery } from './use-media-query.ts';

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('answers from the window, and keeps listening for the answer to change', () => {
    const list = Object.assign(new EventTarget(), { matches: true, media: PHONE_QUERY });
    const remove = vi.spyOn(list, 'removeEventListener');
    vi.spyOn(window, 'matchMedia').mockReturnValue(list as unknown as MediaQueryList);
    const { result, unmount } = renderHook(() => useMediaQuery(PHONE_QUERY));
    expect(result.current).toBe(true);
    unmount();
    expect(remove).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('is false where the window cannot say', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery(PHONE_QUERY));
    expect(result.current).toBe(false);
  });
});
