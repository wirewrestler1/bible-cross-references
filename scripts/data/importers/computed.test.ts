import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDeuterocanonical } from '../../../src/core/bible/books.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { PROVENANCE } from '../../../src/test-utils/fixtures.ts';
import { COMPUTED_FILE } from '../datasets.ts';
import { REPO_ROOT } from '../lib/paths.ts';
import { COMPUTED_WEIGHTS, importComputedCrossReferences } from './computed.ts';

describe('the committed similarity links', () => {
  const file = importComputedCrossReferences(
    readFileSync(resolve(REPO_ROOT, COMPUTED_FILE), 'utf8'),
    PROVENANCE,
  );

  it('builds, every link from a verse of the deuterocanon to a single verse', () => {
    expect(file.sourceRowCount).toBeGreaterThan(1000);
    expect(file.links.votes).toHaveLength(file.sourceRowCount);
    for (let verse = 0; verse < CANONICAL_VERSIFICATION.verseCount; verse += 1) {
      const first = file.links.offsets[verse] ?? 0;
      const last = file.links.offsets[verse + 1] ?? 0;
      if (last > first) {
        expect(isDeuterocanonical(CANONICAL_VERSIFICATION.bookAt(verse).id)).toBe(true);
      }
      for (let id = first; id < last; id += 1) {
        expect(file.links.targetEnd[id]).toBe(file.links.targetStart[id]);
      }
    }
  });

  it('weights every link on the ten-point scale, from the chosen floor up', () => {
    for (const weight of file.links.votes) {
      expect(COMPUTED_WEIGHTS.has(weight)).toBe(true);
      expect(weight).toBeGreaterThanOrEqual(5);
    }
  });

  it('is dedicated to the public domain', () => {
    expect(file.license?.name).toBe('CC0 1.0');
    expect(file.notices).toEqual([]);
  });
});

describe('importComputedCrossReferences', () => {
  it('refuses a weight off the scale', () => {
    expect(() =>
      importComputedCrossReferences(
        'From Verse\tTo Verse\tWeight\t# 2026-10-19\nSir.1.1\tProv.1.1\t11\n',
        PROVENANCE,
      ),
    ).toThrow(/weight 11 is not one of/);
  });
});
