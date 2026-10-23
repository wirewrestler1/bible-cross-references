import { describe, expect, it } from 'vitest';
import type { BookId } from '../../../src/core/bible/books.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { PROVENANCE, verseIndex } from '../../../src/test-utils/fixtures.ts';
import { createZTextModule } from '../lib/ztext-module.ts';
import {
  FRENCH_NOTES_WEIGHT,
  importCramponCrossReferences,
  importGlaireCrossReferences,
  placeFrenchRef,
} from './french-notes.ts';

/** Verses of a chapter, `count` of them, the first carrying the notes given. */
function chapter(book: string, number: number, count: number, notes: string[] = []): string[] {
  return [
    `<chapter osisID="${book}.${String(number)}"/>`,
    `Premier verset${notes.map((note) => `<note>${note}</note>`).join('')}`,
    ...Array.from({ length: count - 1 }, (_, i) => `Verset ${String(i + 2)}`),
  ];
}

const cite = (ref: string) => `Voir <reference osisRef="${ref}">${ref}</reference>`;

describe('placing a reference by the module’s scheme', () => {
  const counts = new Map([
    ['Wis.1', 16], // As this app numbers it.
    ['Wis.2', 25], // As the Douay does: through the hand-aligned table.
    ['Wis.3', 99], // As neither does.
    ['Sir.1', 30],
  ]);

  it('takes a chapter numbered like this app’s as it is, and one numbered like the Douay through the table', () => {
    expect(placeFrenchRef('Wis', 1, 5, 'vulgate', counts)).toEqual({
      book: 'Wis',
      chapter: 1,
      verse: 5,
    });
    expect(placeFrenchRef('Wis', 2, 25, 'vulgate', counts)).toEqual({
      book: 'Wis',
      chapter: 2,
      verse: 24,
    });
    expect(placeFrenchRef('Wis', 3, 1, 'vulgate', counts)).toBeUndefined();
    expect(placeFrenchRef('Wis', 2, 25, 'catholic', counts)).toBeUndefined();
  });

  it('renumbers the Psalms by scheme: the Vulgate’s numbers, or the Hebrew’s with titles counted', () => {
    expect(placeFrenchRef('Ps', 32, 6, 'vulgate', counts)).toEqual({
      book: 'Ps',
      chapter: 33,
      verse: 6,
    });
    expect(placeFrenchRef('Ps', 33, 6, 'catholic', counts)).toEqual({
      book: 'Ps',
      chapter: 33,
      verse: 6,
    });
    expect(placeFrenchRef('Ps', 51, 12, 'catholic', counts)).toEqual({
      book: 'Ps',
      chapter: 51,
      verse: 10,
    });
    expect(placeFrenchRef('Ps', 3, 1, 'catholic', counts)).toBeUndefined();
  });

  it('leaves out what has no safe place: the Vulgate’s Tobit, Judith and Sirach, Esther’s additions, unknown books', () => {
    expect(placeFrenchRef('Sir', 1, 1, 'vulgate', counts)).toBeUndefined();
    expect(placeFrenchRef('Sir', 1, 1, 'catholic', counts)).toEqual({
      book: 'Sir',
      chapter: 1,
      verse: 1,
    });
    expect(placeFrenchRef('Esth', 13, 9, 'catholic', counts)).toBeUndefined();
    expect(placeFrenchRef('Dan', 3, 50, 'vulgate', counts)).toEqual({
      book: 'DanGr',
      chapter: 3,
      verse: 50,
    });
    expect(placeFrenchRef('Dan', 3, 10, 'catholic', counts)).toEqual({
      book: 'Dan',
      chapter: 3,
      verse: 10,
    });
    expect(placeFrenchRef('Dan', 3, 95, 'catholic', counts)).toEqual({
      book: 'Dan',
      chapter: 3,
      verse: 28,
    });
    expect(placeFrenchRef('Dan', 13, 2, 'vulgate', counts)).toEqual({
      book: 'DanGr',
      chapter: 13,
      verse: 2,
    });
    // A chapter the module does not have at all cannot be checked, so it is not placed.
    expect(placeFrenchRef('Wis', 19, 1, 'catholic', counts)).toBeUndefined();
    expect(placeFrenchRef('EpLao', 1, 1, 'vulgate', counts)).toBeUndefined();
    expect(placeFrenchRef('Exod', 8, 1, 'vulgate', counts)).toBeUndefined();
    expect(placeFrenchRef('Exod', 8, 1, 'catholic', counts)).toEqual({
      book: 'Exod',
      chapter: 8,
      verse: 1,
    });
  });
});

describe('importing the French notes', () => {
  const archive = createZTextModule(
    {
      ot: [
        '<div type="book" osisID="Gen"/>',
        ...chapter('Gen', 1, 3, [cite('Wis.1.1'), cite('Exod.20.1')]),
        '<div type="book" osisID="Wis"/>',
        ...chapter('Wis', 1, 16, [
          cite('Ps.32.6') + cite('Gen.1.1-Gen.1.2') + cite('Wis.1.1') + cite('Tob.1.1'),
        ]),
        ...chapter('Wis', 2, 25, [cite('Prov.8.22')]),
        ...chapter('Wis', 3, 99, [cite('Prov.8.22')]),
        '<div type="book" osisID="Sir"/>',
        ...chapter('Sir', 1, 30, [cite('Prov.1.7')]),
      ],
      nt: ['<div type="book" osisID="Matt"/>', ...chapter('Matt', 1, 2, [cite('Wis.2.25')])],
    },
    'modules/texts/ztext4/frevulgglaire',
    'zText4',
  );

  it('links a note’s verse to every passage it cites that touches the deuterocanon, placed by the Vulgate scheme', () => {
    const file = importGlaireCrossReferences(archive, PROVENANCE);
    const linksOf = (book: BookId, c: number, v: number) => {
      const at = verseIndex(book, c, v);
      const first = file.links.offsets[at] ?? 0;
      const last = file.links.offsets[at + 1] ?? 0;
      return Array.from({ length: last - first }, (_, i) => [
        file.links.targetStart[first + i],
        file.links.targetEnd[first + i],
      ]);
    };
    // Genesis 1:1 cites Wisdom (kept) and Exodus (not the deuterocanon: left out).
    expect(linksOf('Gen', 1, 1)).toEqual([[verseIndex('Wis', 1, 1), verseIndex('Wis', 1, 1)]]);
    // Wisdom 1:1: a range; the Vulgate's Psalm 32 is Psalm 33; its own verse and Tobit left
    // out. Links are kept in the order of their targets.
    expect(linksOf('Wis', 1, 1)).toEqual([
      [verseIndex('Gen', 1, 1), verseIndex('Gen', 1, 2)],
      [verseIndex('Ps', 33, 6), verseIndex('Ps', 33, 6)],
    ]);
    // Wisdom 2 is numbered as the Douay numbers it: placed through the table. Wisdom 3 is not.
    expect(linksOf('Wis', 2, 1)).toEqual([[verseIndex('Prov', 8, 22), verseIndex('Prov', 8, 22)]]);
    expect(linksOf('Wis', 3, 1)).toEqual([]);
    // Matthew's citation of the Douay's Wisdom 2:25 lands on 2:24; Sirach is left out whole.
    expect(linksOf('Matt', 1, 1)).toEqual([[verseIndex('Wis', 2, 24), verseIndex('Wis', 2, 24)]]);
    expect(linksOf('Sir', 1, 1)).toEqual([]);
    expect(new Set(file.links.votes)).toEqual(new Set([FRENCH_NOTES_WEIGHT]));
    expect(file.sourceId).toBe('glaire');
    expect(file.sourceRowCount).toBe(9);
    expect(file.notices.map((notice) => notice.level)).toEqual(['info', 'warning']);
    expect(file.notices[0]?.examples).toEqual(['Wis.3']);
  });

  it('reads a zText module by the Catholic scheme too', () => {
    const crampon = createZTextModule(
      {
        ot: ['<div type="book" osisID="Sir"/>', ...chapter('Sir', 1, 30, [cite('Ps.33.6')])],
        nt: ['<div type="book" osisID="Matt"/>', ...chapter('Matt', 1, 2)],
      },
      'modules/texts/ztext/frecrampon',
    );
    const file = importCramponCrossReferences(crampon, PROVENANCE);
    expect(file.sourceId).toBe('crampon');
    expect([...file.links.targetStart]).toEqual([verseIndex('Ps', 33, 6)]);
    expect(file.links.offsets[verseIndex('Sir', 1, 1) + 1]).toBe(1);
  });

  it('reports a citation it cannot read, and goes on', () => {
    const odd = createZTextModule(
      {
        ot: [
          '<div type="book" osisID="Sir"/>',
          ...chapter('Sir', 1, 30, [
            '<reference osisRef="Ps.33">Ps. xxxiii</reference>' + cite('Prov.1.7'),
          ]),
        ],
        nt: [],
      },
      'modules/texts/ztext/frecrampon',
    );
    const file = importCramponCrossReferences(odd, PROVENANCE);
    expect([...file.links.targetStart]).toEqual([verseIndex('Prov', 1, 7)]);
    expect(file.notices.map((notice) => notice.level)).toEqual(['warning']);
    expect(file.notices[0]?.examples).toEqual(['Sir.1.1: Ps.33']);
  });

  it('refuses a module with no verses', () => {
    const empty = createZTextModule({ ot: [], nt: [] }, 'modules/texts/ztext/frecrampon');
    expect(() => importCramponCrossReferences(empty, PROVENANCE)).toThrow(/no verses/);
  });

  it('refuses a module with no citations touching the deuterocanon', () => {
    const empty = createZTextModule(
      { ot: ['<div type="book" osisID="Gen"/>', ...chapter('Gen', 1, 2)], nt: [] },
      'modules/texts/ztext/frecrampon',
    );
    expect(() => importCramponCrossReferences(empty, PROVENANCE)).toThrow(/no citations/);
    expect(CANONICAL_VERSIFICATION.verseCount).toBeGreaterThan(0);
  });
});
