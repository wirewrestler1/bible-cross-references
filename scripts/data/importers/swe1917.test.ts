import { describe, expect, it } from 'vitest';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { PROVENANCE, verseIndex } from '../../../src/test-utils/fixtures.ts';
import { createZTextModule } from '../lib/ztext-module.ts';
import { countSwe1917Notes, importSwe1917CrossReferences, SWE1917_WEIGHT } from './swe1917.ts';

const note = (targets: string, origin?: number) =>
  `<note type="crossReference">${
    origin === undefined
      ? ''
      : `<reference osisRef="" subType="x-origin" type="annotateRef">${String(origin)}</reference> `
  }<reference osisRef="${targets}">${targets}</reference></note>`;

/** Three chapters of Sirach, Greek Daniel's additions, and a little of the New Testament. */
function createModule(overrides: Partial<Record<'ot' | 'nt', readonly string[]>> = {}) {
  return createZTextModule({
    ot: overrides.ot ?? [
      '<milestone type="x-importer"/>',
      '<div type="book" osisID="Sir"/>',
      '<chapter n="1" osisID="Sir.1"/>',
      'Sir 1:1',
      `Sir 1:2${note('Matt.6.14 Tob.4.15')}`,
      ...Array.from({ length: 28 }, (_, i) =>
        i + 3 === 5 || i + 3 === 7 ? '' : `Sir 1:${String(i + 3)}`,
      ),
      // Chapter 2 has 18 verses here, as in the Greek.
      '<chapter n="2" osisID="Sir.2"/>',
      ...Array.from({ length: 18 }, (_, i) => `Sir 2:${String(i + 1)}`),
      // Chapter 3: 31 verses in the Greek, but this edition prints 30, so nothing touching it
      // can be placed with confidence.
      '<chapter n="3" osisID="Sir.3"/>',
      ...Array.from(
        { length: 30 },
        (_, i) => `Sir 3:${String(i + 1)}${i === 0 ? note('Gen.1.1') : ''}`,
      ),
      '<div type="book" osisID="PrAzar"/>',
      '<chapter n="1" osisID="PrAzar.1"/>',
      `PrAzar 1${note('Ps.148.1-Ps.148.14')}`,
      '<div type="book" osisID="Sus"/>',
      '<chapter n="1" osisID="Sus.1"/>',
      `Sus 1${note('Dan.1.1')}`,
      '<div type="book" osisID="EsthGr"/>',
      '<chapter n="1" osisID="EsthGr.1"/>',
      `EsthGr 1:1${note('Esth.1.1')}`,
      '<chapter n="2" osisID="EsthGr.2"/>',
      `EsthGr 2:1${note('Esth.3.13')}`,
    ],
    nt: overrides.nt ?? [
      '<div type="book" osisID="Matt"/>',
      '<chapter n="1" osisID="Matt.1"/>',
      'Matt 1:1',
      // The note knows its verse: it belongs to verse 3, wherever it sits.
      `Matt 1:2${note('Sir.1.2', 3)}`,
      'Matt 1:3',
    ],
  });
}

const importFixture = (overrides?: Partial<Record<'ot' | 'nt', readonly string[]>>) =>
  importSwe1917CrossReferences(createModule(overrides), PROVENANCE);

/** The target ranges of a verse's links, in dataset order. */
function outgoing(
  file: ReturnType<typeof importFixture>,
  from: number,
): { readonly start: number; readonly end: number }[] {
  const first = file.links.offsets[from] ?? 0;
  const last = file.links.offsets[from + 1] ?? 0;
  return Array.from({ length: last - first }, (_, i) => ({
    start: file.links.targetStart[first + i] ?? -1,
    end: file.links.targetEnd[first + i] ?? -1,
  }));
}

describe('importSwe1917CrossReferences', () => {
  it('reads each note under the verse whose entry holds it', () => {
    const file = importFixture();
    // In canonical order of the target, Tobit before Matthew.
    expect(outgoing(file, verseIndex('Sir', 1, 2)).map(({ start }) => start)).toEqual([
      verseIndex('Tob', 4, 15),
      verseIndex('Matt', 6, 14),
    ]);
    expect(file.links.votes.every((weight) => weight === SWE1917_WEIGHT)).toBe(true);
    expect(file).toMatchObject({
      format: 'cross-references',
      schemaVersion: 2,
      versification: 'kjv-dc',
      sourceId: 'swe1917',
      provenance: { ...PROVENANCE, snapshotDate: null },
    });
  });

  it('believes a note that names its own verse over its position', () => {
    const file = importFixture();
    expect(outgoing(file, verseIndex('Matt', 1, 2))).toEqual([]);
    expect(outgoing(file, verseIndex('Matt', 1, 3)).map(({ start }) => start)).toEqual([
      verseIndex('Sir', 1, 2),
    ]);
  });

  it('keeps a range as one link', () => {
    const file = importFixture();
    expect(outgoing(file, verseIndex('DanGr', 3, 24))).toEqual([
      { start: verseIndex('Ps', 148, 1), end: verseIndex('Ps', 148, 14) },
    ]);
  });

  it('maps the Greek additions onto Greek Daniel and Greek Esther', () => {
    const file = importFixture();
    const target = (book: Parameters<typeof verseIndex>[0], chapter: number, verse: number) =>
      outgoing(file, verseIndex(book, chapter, verse)).map(({ start }) => start);
    expect(target('DanGr', 13, 1)).toEqual([verseIndex('Dan', 1, 1)]);
    expect(target('EsthGr', 1, 1)).toEqual([verseIndex('Esth', 1, 1)]);
    expect(target('EsthGr', 3, 13)).toEqual([verseIndex('Esth', 3, 13)]);
  });

  it('leaves out every reference touching a chapter the edition numbers differently', () => {
    const file = importFixture();
    expect(outgoing(file, verseIndex('Sir', 3, 1))).toEqual([]);
    expect(file.notices[0]).toMatchObject({ level: 'info', examples: ['Sir.3'] });
    expect(file.notices[1]).toMatchObject({ level: 'info', count: 1, examples: ['Sir.3.1'] });
  });

  it('leaves out, and reports, a reference it cannot place', () => {
    const file = importFixture({
      nt: [
        '<div type="book" osisID="Matt"/>',
        '<chapter n="1" osisID="Matt.1"/>',
        `Matt 1:1${note('Rev.35.11 Gen..5 Gen.1.1')}`,
      ],
    });
    expect(file.links.votes).toHaveLength(7);
    expect(file.notices.map((notice) => [notice.level, notice.count])).toEqual([
      ['info', 1],
      ['info', 1],
      ['warning', 1],
      ['warning', 1],
    ]);
    expect(file.notices[2]?.examples).toEqual(['Matt.1.1 → Rev.35.11']);
    expect(file.notices[3]?.examples).toEqual(['Matt.1.1: Gen..5']);
  });

  it('drops a reference to its own verse, and a repeated one', () => {
    const file = importFixture({
      nt: [
        '<div type="book" osisID="Matt"/>',
        '<chapter n="1" osisID="Matt.1"/>',
        `Matt 1:1${note('Matt.1.1 Gen.1.1')}${note('Gen.1.1')}`,
      ],
    });
    expect(outgoing(file, verseIndex('Matt', 1, 1))).toHaveLength(1);
  });

  it('refuses a module with no notes, or no verses', () => {
    expect(() =>
      importFixture({
        ot: [],
        nt: ['<div type="book" osisID="Matt"/>', '<chapter n="1" osisID="Matt.1"/>', 'Matt 1:1'],
      }),
    ).toThrow(/no cross-reference notes/);
    expect(() => importFixture({ ot: [], nt: [] })).toThrow(/no verses/);
  });

  it('counts the notes', () => {
    expect(countSwe1917Notes(createModule())).toBe(7);
  });

  it('lays the links out in verse order with offsets over the whole canon', () => {
    const file = importFixture();
    expect(file.links.offsets).toHaveLength(CANONICAL_VERSIFICATION.verseCount + 1);
    expect(file.links.offsets.at(-1)).toBe(file.links.votes.length);
  });
});
