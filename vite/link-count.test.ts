import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { mergedLinkCount } from './link-count.ts';
import { ROOT_DIR } from './site.ts';

describe('the link count the loading screen promises', () => {
  it('is what the last data build recorded', () => {
    const lock = JSON.parse(
      readFileSync(resolve(ROOT_DIR, 'data/datasets.lock.json'), 'utf8'),
    ) as Record<string, { shape?: Record<string, number> }>;
    const recorded = Object.entries(lock).find(
      ([path, entry]) => path.includes('cross-references') && entry.shape?.['links'] !== undefined,
    );
    expect(recorded).toBeDefined();
    expect(mergedLinkCount()).toBeGreaterThan(0);
    expect(Object.values(lock).map((entry) => entry.shape?.['links'])).toContain(mergedLinkCount());
  });

  it('is zero on a fresh clone, before the first data build', () => {
    expect(mergedLinkCount(tmpdir())).toBe(0);
  });
});
