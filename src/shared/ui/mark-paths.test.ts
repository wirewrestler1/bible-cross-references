import { describe, expect, it } from 'vitest';
import favicon from '../../../public/favicon.svg?raw';
import { MARK_STROKES, MARK_VIEWBOX } from './mark-paths.ts';

describe('the mark', () => {
  it('is the same drawing in the favicon, which is its own file', () => {
    expect(favicon).toContain(`viewBox="${MARK_VIEWBOX}"`);
    const drawn = [...favicon.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
    expect(drawn).toEqual(MARK_STROKES);
  });
});
