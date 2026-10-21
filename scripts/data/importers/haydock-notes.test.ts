import { describe, expect, it } from 'vitest';
import {
  buildHaydockRows,
  fromRoman,
  mapVulgatePsalm,
  parseHaydockPage,
  referencesIn,
  toAppRef,
  type HaydockPage,
} from './haydock-notes.ts';

const PAGE = `
<p class="wp-block-paragraph"><strong>Wisdom vii.</strong></p>
<p class="wp-block-paragraph"><strong>Notes &amp; Commentary:</strong></p>
<p class="wp-block-paragraph"><strong>Ver. 1.</strong>&nbsp;<em>Myself.</em>&nbsp;Solomon acquired wisdom.</p>
<p class="wp-block-paragraph"><strong>Ver. 7.</strong>&nbsp;<em>Wherefore,</em>&nbsp;I asked for wisdom, 3 Kings ix. 10. (Calmet) &#8212; In Proverbs viii. 10., &amp;c. See chap. vi. 25., and ver. 1. (St. Ambrose, Abr. ii. 7.)</p>
<p class="wp-block-paragraph"><strong>Ver. 26.</strong>&nbsp;<em>Brightness.</em>&nbsp;Hebrews i. 3., and Psalm cxviii. 105-106.</p>
<p class="wp-block-paragraph">Bible Text &amp; Cross-references:</p>
<p class="wp-block-paragraph">The excellence of wisdom.</p>
<p class="wp-block-paragraph">1 I myself also am a mortal man.</p>
<p class="wp-block-paragraph">30 For after this cometh night.</p>
`;

describe('reading a Haydock page', () => {
  it('finds the notes by verse and the last verse of the Douay text', () => {
    const page = parseHaydockPage(PAGE);
    expect(page.verseCount).toBe(30);
    expect(page.notes.map((note) => note.verse)).toEqual([1, 7, 26]);
    expect(page.notes[1]?.text).toContain('3 Kings ix. 10.');
  });

  it('reads the references a note names, in the Douay’s books, and nothing else', () => {
    const page = parseHaydockPage(PAGE);
    const refs = referencesIn(page.notes[1]?.text ?? '', { book: 'Wis', chapter: 7 });
    expect(refs).toEqual([
      { book: '1Kgs', chapter: 9, verse: 10, verseEnd: 10 },
      { book: 'Prov', chapter: 8, verse: 10, verseEnd: 10 },
      { book: 'Wis', chapter: 6, verse: 25, verseEnd: 25 },
      { book: 'Wis', chapter: 7, verse: 1, verseEnd: 1 },
    ]);
  });

  it('reads Roman numerals', () => {
    expect(fromRoman('xxiv')).toBe(24);
    expect(fromRoman('cxviii')).toBe(118);
    expect(fromRoman('abc')).toBeUndefined();
  });
});

describe('placing a Douay reference', () => {
  it('renumbers the Psalms from the Vulgate to the Hebrew, titles allowed for', () => {
    // Psalm 22 of the Vulgate is Psalm 23; its title is verse 1 there.
    expect(mapVulgatePsalm(22, 2)).toEqual({ book: 'Ps', chapter: 23, verse: 1 });
    expect(mapVulgatePsalm(22, 1)).toBeUndefined();
    // Psalm 118 (Vulgate) is 119, which has no title.
    expect(mapVulgatePsalm(118, 105)).toEqual({ book: 'Ps', chapter: 119, verse: 105 });
    // Vulgate 9 is Hebrew 9 and 10; 113 is 114 and 115; 146 and 147 are both 147.
    expect(mapVulgatePsalm(9, 22)).toEqual({ book: 'Ps', chapter: 10, verse: 1 });
    expect(mapVulgatePsalm(113, 9)).toEqual({ book: 'Ps', chapter: 115, verse: 1 });
    expect(mapVulgatePsalm(147, 1)).toEqual({ book: 'Ps', chapter: 147, verse: 12 });
    expect(mapVulgatePsalm(50, 3)).toEqual({ book: 'Ps', chapter: 51, verse: 1 });
    expect(mapVulgatePsalm(150, 6)).toEqual({ book: 'Ps', chapter: 150, verse: 6 });
    expect(mapVulgatePsalm(113, 3)).toEqual({ book: 'Ps', chapter: 114, verse: 3 });
    expect(mapVulgatePsalm(114, 5)).toEqual({ book: 'Ps', chapter: 116, verse: 5 });
    expect(mapVulgatePsalm(115, 1)).toEqual({ book: 'Ps', chapter: 116, verse: 10 });
    expect(mapVulgatePsalm(120, 2)).toEqual({ book: 'Ps', chapter: 121, verse: 1 });
    expect(mapVulgatePsalm(146, 1)).toEqual({ book: 'Ps', chapter: 147, verse: 1 });
  });

  it('sends the Greek parts of Daniel to Greek Daniel and skips the Vulgate’s Esther', () => {
    expect(toAppRef('Dan', 3, 10)).toEqual({ book: 'Dan', chapter: 3, verse: 10 });
    expect(toAppRef('Dan', 3, 50)).toEqual({ book: 'DanGr', chapter: 3, verse: 50 });
    expect(toAppRef('Dan', 3, 95)).toEqual({ book: 'Dan', chapter: 3, verse: 28 });
    expect(toAppRef('Dan', 13, 2)).toEqual({ book: 'DanGr', chapter: 13, verse: 2 });
    expect(toAppRef('Esth', 13, 9)).toBeUndefined();
    expect(toAppRef('Esth', 4, 16)).toEqual({ book: 'Esth', chapter: 4, verse: 16 });
  });

  it('drops the chapters whose verse numbering is known to differ', () => {
    expect(toAppRef('Exod', 8, 1)).toBeUndefined();
    expect(toAppRef('Exod', 20, 1)).toEqual({ book: 'Exod', chapter: 20, verse: 1 });
  });
});

describe('building the rows', () => {
  it('drops what it cannot place safely, and counts it', () => {
    const pages = new Map<string, HaydockPage>([
      [
        'Wis.7',
        {
          verseCount: 30,
          notes: [
            {
              verse: 2,
              text:
                'Pr&#233;sumere. Tobias iv. 7., Exodus viii. 1., Esther xiii. 9., Psalm cl. 7., ' +
                'and Proverbs viii. 10-6.',
            },
          ],
        },
      ],
    ]);
    const report = buildHaydockRows(pages);
    expect(report.rows).toEqual([]);
    expect(report.references).toBe(4);
    expect(report.dropped).toBe(4);
  });

  it('links each note’s verse to the passages it names, once, and skips misnumbered chapters', () => {
    const pages = new Map<string, HaydockPage>([
      ['Wis.7', parseHaydockPage(PAGE)],
      ['Wis.8', { verseCount: 99, notes: [{ verse: 1, text: 'See Genesis i. 1.' }] }],
    ]);
    const report = buildHaydockRows(pages);
    expect(report.rows).toEqual([
      'Wis.7.7\t1Kgs.9.10\t4',
      'Wis.7.7\tProv.8.10\t4',
      'Wis.7.7\tWis.6.25\t4',
      'Wis.7.7\tWis.7.1\t4',
      'Wis.7.26\tHeb.1.3\t4',
      'Wis.7.26\tPs.119.105-Ps.119.106\t4',
    ]);
    expect(report.skippedChapters).toEqual(['Wis.8 (Douay 99, app 21)']);
    expect(report.references).toBe(6);
    expect(report.dropped).toBe(0);
  });
});
