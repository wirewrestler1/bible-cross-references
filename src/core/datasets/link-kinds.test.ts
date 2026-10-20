import { describe, expect, it } from 'vitest';
import { LINK_KIND_IDS, LINK_KINDS, linkKindId } from './link-kinds.ts';

describe('link kinds', () => {
  it('number the ids in order, and read back', () => {
    for (const id of LINK_KIND_IDS) {
      expect(linkKindId(LINK_KINDS[id])).toBe(id);
    }
  });

  it('refuse a number the dataset does not use', () => {
    expect(() => linkKindId(LINK_KIND_IDS.length)).toThrow(RangeError);
  });
});
