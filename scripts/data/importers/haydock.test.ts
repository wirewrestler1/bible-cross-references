import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { PROVENANCE } from '../../../src/test-utils/fixtures.ts';
import { HAYDOCK_FILE } from '../datasets.ts';
import { REPO_ROOT } from '../lib/paths.ts';
import { importHaydockCrossReferences } from './haydock.ts';
import { HAYDOCK_SOURCE_BOOKS, HAYDOCK_WEIGHT } from './haydock-notes.ts';

describe('the committed Haydock references', () => {
  const file = importHaydockCrossReferences(
    readFileSync(resolve(REPO_ROOT, HAYDOCK_FILE), 'utf8'),
    PROVENANCE,
  );

  it('builds, every link from a verse of Wisdom, Baruch or Maccabees', () => {
    expect(file.sourceRowCount).toBeGreaterThan(300);
    expect(file.links.votes).toHaveLength(file.sourceRowCount);
    const sources = new Set(HAYDOCK_SOURCE_BOOKS.map(({ book }) => book));
    for (let verse = 0; verse < CANONICAL_VERSIFICATION.verseCount; verse += 1) {
      const first = file.links.offsets[verse] ?? 0;
      const last = file.links.offsets[verse + 1] ?? 0;
      if (last > first) {
        expect(sources.has(CANONICAL_VERSIFICATION.bookAt(verse).id)).toBe(true);
      }
    }
  });

  it('weights every link alike, at the default floor', () => {
    expect(new Set(file.links.votes)).toEqual(new Set([HAYDOCK_WEIGHT]));
    expect(file.notices).toEqual([]);
  });

  it('is public domain', () => {
    expect(file.license?.publicDomain).toBe(true);
  });
});

describe('importHaydockCrossReferences', () => {
  it('refuses a weight off the scale', () => {
    expect(() =>
      importHaydockCrossReferences(
        'From Verse\tTo Verse\tWeight\t# 2026-10-21\nWis.1.1\tProv.1.1\t7\n',
        PROVENANCE,
      ),
    ).toThrow(/7/);
  });
});
