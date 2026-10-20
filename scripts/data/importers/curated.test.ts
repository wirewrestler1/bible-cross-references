import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isDeuterocanonical } from '../../../src/core/bible/books.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { PROVENANCE, verseIndex } from '../../../src/test-utils/fixtures.ts';
import { CURATED_FILE } from '../datasets.ts';
import { REPO_ROOT } from '../lib/paths.ts';
import { CURATED_WEIGHTS, importCuratedCrossReferences } from './curated.ts';

const HEADER = 'From Verse\tTo Verse\tWeight\t# CC BY 4.0 2026-10-19';
const importRows = (...rows: string[]) =>
  importCuratedCrossReferences([HEADER, ...rows, ''].join('\n'), PROVENANCE);

describe('the committed list', () => {
  const file = importCuratedCrossReferences(
    readFileSync(resolve(REPO_ROOT, CURATED_FILE), 'utf8'),
    PROVENANCE,
  );

  it('builds, with every link touching the deuterocanon', () => {
    expect(file.sourceRowCount).toBeGreaterThan(300);
    expect(file.links.votes).toHaveLength(file.sourceRowCount);
    const touches = (verse: number) => isDeuterocanonical(CANONICAL_VERSIFICATION.bookAt(verse).id);
    for (let verse = 0; verse < CANONICAL_VERSIFICATION.verseCount; verse += 1) {
      const first = file.links.offsets[verse] ?? 0;
      const last = file.links.offsets[verse + 1] ?? 0;
      for (let id = first; id < last; id += 1) {
        expect(touches(verse) || touches(file.links.targetStart[id] ?? -1), String(id)).toBe(true);
      }
    }
  });

  it('uses only the three weights', () => {
    expect(new Set(file.links.votes)).toEqual(new Set(Object.values(CURATED_WEIGHTS)));
  });

  it('carries the edition date and the licence', () => {
    expect(file.provenance.snapshotDate).toBe('2026-10-19');
    expect(file.license?.name).toBe('CC BY 4.0');
    expect(file.notices).toEqual([]);
  });
});

describe('importCuratedCrossReferences', () => {
  it('reads a row into a link under the source verse', () => {
    const file = importRows('Matt.7.12\tTob.4.15\t10');
    const from = verseIndex('Matt', 7, 12);
    expect(file.links.offsets[from + 1]).toBe((file.links.offsets[from] ?? 0) + 1);
    expect(file.links.targetStart[0]).toBe(verseIndex('Tob', 4, 15));
    expect(file.sourceId).toBe('curated');
  });

  it.each([
    ['an unknown book', 'Matt.7.12\tTobit.4.15\t10', /unknown verse "Tobit.4.15"/],
    ['a verse the chapter does not reach', 'Matt.7.12\tTob.4.99\t10', /unknown verse "Tob.4.99"/],
    ['a weight off the scale', 'Matt.7.12\tTob.4.15\t7', /weight 7 is not one of 10, 5, 2/],
    ['a link to its own verse', 'Tob.4.15\tTob.4.14-Tob.4.16\t5', /links to itself/],
    ['a duplicate row', 'Matt.7.12\tTob.4.15\t10\nMatt.7.12\tTob.4.15\t5', /duplicate row/],
    ['a reversed range', 'Matt.7.12\tTob.4.16-Tob.4.15\t10', /reversed range/],
    ['a malformed row', 'Matt.7.12\tTob.4.15', /malformed row/],
  ])('refuses %s', (_name, rows, message) => {
    expect(() => importRows(rows)).toThrow(message);
  });

  it('refuses a file with another header', () => {
    expect(() =>
      importCuratedCrossReferences(
        'From Verse\tTo Verse\tVotes\nMatt.7.12\tTob.4.15\t10',
        PROVENANCE,
      ),
    ).toThrow(/unexpected header/);
  });
});
