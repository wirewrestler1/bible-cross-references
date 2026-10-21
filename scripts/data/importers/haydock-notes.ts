import { isBookId, type BookId } from '../../../src/core/bible/books.ts';
import type { VerseRef } from '../../../src/core/bible/verse-ref.ts';
import {
  CANONICAL_CHAPTER_VERSE_COUNTS,
  CANONICAL_VERSIFICATION,
} from '../../../src/core/bible/versification.ts';

/**
 * Reads the scripture references out of Haydock's Catholic Bible Commentary (1859, public
 * domain) as haydockcommentary.com serves it, one page per chapter: the "Ver. N." notes of a
 * chapter name the passages the note compares, in the Douay-Rheims' own words and numbering
 * ("Proverbs viii. 22.", "3 Kings ix. 10.", "chap. vi. 25.", "ver. 16"). Each becomes a link
 * from the noted verse to the passage named.
 *
 * Only the deuterocanonical books whose Vulgate numbering agrees with the Greek numbering this
 * app uses are read as sources: Wisdom, Baruch and 1–2 Maccabees. Tobit and Judith are a
 * different text in the Vulgate, and Sirach is numbered differently in nearly every chapter;
 * references into those three are dropped too. A chapter whose Douay verse count differs from
 * the app's is skipped whole, as the Swedish importer does, rather than placed a verse away.
 * The Psalms are renumbered from the Vulgate's (Septuagint) numbering to the Hebrew numbering
 * and their titles, which the Vulgate counts as verses, are allowed for; the Greek parts of
 * Daniel go to Greek Daniel; references into the chapters where the Vulgate's verse numbering
 * is known to differ from the English Bible's are dropped rather than risked.
 */

/** The books read as sources: this app's id, the site's slug, and the chapter count. */
export const HAYDOCK_SOURCE_BOOKS: readonly {
  readonly book: BookId;
  readonly slug: string;
  readonly chapters: number;
}[] = [
  { book: 'Wis', slug: 'wisdom', chapters: 19 },
  { book: 'Bar', slug: 'baruch', chapters: 6 },
  { book: '1Macc', slug: '1-machabees', chapters: 16 },
  { book: '2Macc', slug: '2-machabees', chapters: 15 },
];

/** The weight every link carries: a reference in a printed commentary, no votes. */
export const HAYDOCK_WEIGHT = 4;

/** The Douay-Rheims' names, as Haydock abbreviates or spells them, to this app's book ids. */
const DOUAY_BOOKS: ReadonlyMap<string, BookId | 'dropped'> = new Map<string, BookId | 'dropped'>([
  ['genesis', 'Gen'],
  ['exodus', 'Exod'],
  ['leviticus', 'Lev'],
  ['numbers', 'Num'],
  ['deuteronomy', 'Deut'],
  ['josue', 'Josh'],
  ['joshua', 'Josh'],
  ['judges', 'Judg'],
  ['ruth', 'Ruth'],
  ['1 kings', '1Sam'],
  ['2 kings', '2Sam'],
  ['3 kings', '1Kgs'],
  ['4 kings', '2Kgs'],
  ['1 paralipomenon', '1Chr'],
  ['2 paralipomenon', '2Chr'],
  ['1 esdras', 'Ezra'],
  ['2 esdras', 'Neh'],
  ['3 esdras', 'dropped'],
  ['4 esdras', 'dropped'],
  ['tobias', 'dropped'],
  ['judith', 'dropped'],
  ['esther', 'Esth'],
  ['job', 'Job'],
  ['psalm', 'Ps'],
  ['psalms', 'Ps'],
  ['proverbs', 'Prov'],
  ['ecclesiastes', 'Eccl'],
  ['canticles', 'Song'],
  ['canticle of canticles', 'Song'],
  ['wisdom', 'Wis'],
  ['ecclesiasticus', 'dropped'],
  ['isaias', 'Isa'],
  ['jeremias', 'Jer'],
  ['lamentations', 'Lam'],
  ['baruch', 'Bar'],
  ['ezechiel', 'Ezek'],
  ['daniel', 'Dan'],
  ['osee', 'Hos'],
  ['joel', 'Joel'],
  ['amos', 'Amos'],
  ['abdias', 'Obad'],
  ['jonas', 'Jonah'],
  ['micheas', 'Mic'],
  ['nahum', 'Nah'],
  ['habacuc', 'Hab'],
  ['sophonias', 'Zeph'],
  ['aggeus', 'Hag'],
  ['zacharias', 'Zech'],
  ['malachias', 'Mal'],
  ['1 machabees', '1Macc'],
  ['2 machabees', '2Macc'],
  ['matthew', 'Matt'],
  ['mark', 'Mark'],
  ['luke', 'Luke'],
  ['john', 'John'],
  ['acts', 'Acts'],
  ['romans', 'Rom'],
  ['1 corinthians', '1Cor'],
  ['2 corinthians', '2Cor'],
  ['galatians', 'Gal'],
  ['ephesians', 'Eph'],
  ['philippians', 'Phil'],
  ['colossians', 'Col'],
  ['1 thessalonians', '1Thess'],
  ['2 thessalonians', '2Thess'],
  ['1 timothy', '1Tim'],
  ['2 timothy', '2Tim'],
  ['titus', 'Titus'],
  ['philemon', 'Phlm'],
  ['hebrews', 'Heb'],
  ['james', 'Jas'],
  ['1 peter', '1Pet'],
  ['2 peter', '2Pet'],
  ['1 john', '1John'],
  ['2 john', '2John'],
  ['3 john', '3John'],
  ['jude', 'Jude'],
  ['apocalypse', 'Rev'],
]);

/**
 * Chapters where the Vulgate's verse numbering (which follows the Hebrew) is known to differ
 * from the English Bible's, as `Book.chapter`: a reference into one would land a verse or more
 * away from its words, so it is dropped. Both neighbours of each seam are listed, since a
 * reference may fall on either side of it.
 */
const SHIFTED_CHAPTERS: ReadonlySet<string> = new Set(
  [
    ['Gen', [31, 32]],
    ['Exod', [7, 8, 21, 22]],
    ['Lev', [5, 6]],
    ['Num', [16, 17, 25, 26, 29, 30]],
    ['Deut', [12, 13, 22, 23, 28, 29]],
    ['Josh', [21]],
    ['1Sam', [20, 21, 23, 24]],
    ['2Sam', [18, 19]],
    ['1Kgs', [4, 5, 20, 21, 22]],
    ['2Kgs', [11, 12]],
    ['1Chr', [5, 6, 12]],
    ['2Chr', [1, 2, 13, 14]],
    ['Neh', [3, 4, 7, 9, 10]],
    ['Job', [40, 41]],
    ['Eccl', [4, 5]],
    ['Song', [1, 6, 7]],
    ['Isa', [8, 9, 63, 64]],
    ['Jer', [8, 9]],
    ['Ezek', [20, 21]],
    ['Dan', [5, 6]],
    ['Hos', [1, 2, 11, 12, 13, 14]],
    ['Joel', [2, 3]],
    ['Jonah', [1, 2]],
    ['Mic', [4, 5]],
    ['Nah', [1, 2]],
    ['Zech', [1, 2]],
    ['Mal', [3, 4]],
  ].flatMap(([book, chapters]) =>
    (chapters as number[]).map((chapter) => `${String(book)}.${String(chapter)}`),
  ),
);

/** Psalms (Hebrew numbering) with no title, which the Vulgate would otherwise count as verse 1. */
const UNTITLED_PSALMS: ReadonlySet<number> = new Set([
  1, 2, 10, 33, 43, 71, 91, 93, 94, 95, 96, 97, 99, 104, 105, 106, 107, 111, 112, 113, 114, 115,
  116, 117, 118, 119, 135, 136, 137, 146, 147, 148, 149, 150,
]);
/** Psalms whose title takes two verses of the Vulgate's numbering. */
const TWO_VERSE_TITLES: ReadonlySet<number> = new Set([51, 52, 54, 60]);

/**
 * A Vulgate psalm and verse (Septuagint numbering, titles counted as verses) as the English
 * Bible numbers them, or nothing for a reference to a title.
 */
export function mapVulgatePsalm(psalm: number, verse: number): VerseRef | undefined {
  let hebrew: number;
  let hebrewVerse = verse;
  if (psalm <= 8 || psalm >= 148) {
    hebrew = psalm;
  } else if (psalm === 9) {
    hebrew = verse <= 21 ? 9 : 10;
    hebrewVerse = verse <= 21 ? verse : verse - 21;
  } else if (psalm <= 112) {
    hebrew = psalm + 1;
  } else if (psalm === 113) {
    hebrew = verse <= 8 ? 114 : 115;
    hebrewVerse = verse <= 8 ? verse : verse - 8;
  } else if (psalm === 114) {
    hebrew = 116;
  } else if (psalm === 115) {
    hebrew = 116;
    hebrewVerse = verse + 9;
  } else if (psalm <= 145) {
    hebrew = psalm + 1;
  } else if (psalm === 146) {
    hebrew = 147;
  } else {
    hebrew = 147;
    hebrewVerse = verse + 11;
  }
  const titleVerses = UNTITLED_PSALMS.has(hebrew) ? 0 : TWO_VERSE_TITLES.has(hebrew) ? 2 : 1;
  const english = hebrewVerse - titleVerses;
  return english >= 1 ? { book: 'Ps', chapter: hebrew, verse: english } : undefined;
}

/** A Douay reference as this app's verse, or nothing where it cannot be placed safely. */
export function toAppRef(book: BookId, chapter: number, verse: number): VerseRef | undefined {
  if (book === 'Ps') {
    return mapVulgatePsalm(chapter, verse);
  }
  if (book === 'Dan') {
    if (chapter === 3) {
      if (verse <= 23) return { book: 'Dan', chapter: 3, verse };
      if (verse <= 90) return { book: 'DanGr', chapter: 3, verse };
      return { book: 'Dan', chapter: 3, verse: verse - 67 };
    }
    if (chapter === 13 || chapter === 14) {
      return { book: 'DanGr', chapter, verse };
    }
  }
  if (book === 'Esth' && (chapter > 10 || (chapter === 10 && verse > 3))) {
    return undefined; // The Vulgate's additions, numbered as chapters 10:4–16:24.
  }
  if (SHIFTED_CHAPTERS.has(`${book}.${String(chapter)}`)) {
    return undefined;
  }
  return { book, chapter, verse };
}

const ROMAN: Readonly<Record<string, number>> = { i: 1, v: 5, x: 10, l: 50, c: 100 };

/** A lower-case Roman numeral as a number, or nothing for anything else. */
export function fromRoman(text: string): number | undefined {
  let total = 0;
  let previous = 0;
  for (let at = text.length - 1; at >= 0; at -= 1) {
    const letter = text.charAt(at);
    const value = ROMAN[letter];
    if (value === undefined) return undefined;
    total += value < previous ? -value : value;
    previous = Math.max(previous, value);
  }
  return total > 0 ? total : undefined;
}

/** A reference found in a note: the Douay book, chapter and verse (or range) it names. */
export interface DouayReference {
  readonly book: BookId | 'dropped';
  readonly chapter: number;
  readonly verse: number;
  readonly verseEnd: number;
}

const BOOK_NAMES = [...DOUAY_BOOKS.keys()].sort((a, b) => b.length - a.length);
const BOOK_PATTERN = BOOK_NAMES.map((name) => name.replace(/ /g, '\\s+')).join('|');
/** "Proverbs viii. 22.", "3 Kings ix. 10, 11.", "Psalm cxviii. 105-106." */
const NAMED = new RegExp(
  `\\b(${BOOK_PATTERN})\\s+([ivxlc]+)\\.\\s*(\\d+)(?:\\s*[-–]\\s*(\\d+))?`,
  'gi',
);
/** "chap. vi. 25." — a chapter of the book the note is in. */
const SAME_BOOK = /\bchap\.\s*([ivxlc]+)\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/gi;
/** "ver. 16" — a verse of the chapter the note is in ("Ver. 16." opens a note and is not one). */
const SAME_CHAPTER = /\bver\.\s*(\d+)(?:\s*[-–]\s*(\d+))?/g;

/** Every scripture reference written in a note, in the Douay's own books and numbering. */
export function referencesIn(
  note: string,
  here: { readonly book: BookId; readonly chapter: number },
): DouayReference[] {
  const found: DouayReference[] = [];
  const add = (
    book: BookId | 'dropped',
    chapter: number | undefined,
    verse: string,
    end?: string,
  ) => {
    if (chapter === undefined) return;
    const from = Number(verse);
    const to = end === undefined ? from : Number(end);
    if (from >= 1 && to >= from && to - from <= 40) {
      found.push({ book, chapter, verse: from, verseEnd: to });
    }
  };
  for (const match of note.matchAll(NAMED)) {
    const name = (match[1] ?? '').toLowerCase().replace(/\s+/g, ' ');
    const book = DOUAY_BOOKS.get(name);
    if (book !== undefined)
      add(book, fromRoman((match[2] ?? '').toLowerCase()), match[3] ?? '', match[4]);
  }
  for (const match of note.matchAll(SAME_BOOK)) {
    add(here.book, fromRoman((match[1] ?? '').toLowerCase()), match[2] ?? '', match[3]);
  }
  for (const match of note.matchAll(SAME_CHAPTER)) {
    add(here.book, here.chapter, match[1] ?? '', match[2]);
  }
  return found;
}

/** What a chapter's page yields: the notes by verse, and how far the Douay chapter runs. */
export interface HaydockPage {
  readonly verseCount: number;
  readonly notes: readonly { readonly verse: number; readonly text: string }[];
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&#8212;|&mdash;/g, '—')
    .replace(/&#8220;|&#8221;|&quot;/g, '"')
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

/** Reads a chapter's page: the "Ver. N." notes, and the last verse number of its Bible text. */
export function parseHaydockPage(html: string): HaydockPage {
  const paragraphs = [...html.matchAll(/<p class="wp-block-paragraph">([\s\S]*?)<\/p>/g)].map(
    (match) => decodeEntities((match[1] ?? '').replace(/<[^>]+>/g, ' ')),
  );
  const notes: { verse: number; text: string }[] = [];
  let verseCount = 0;
  let inText = false;
  for (const paragraph of paragraphs) {
    if (paragraph.startsWith('Bible Text')) {
      inText = true;
      continue;
    }
    if (inText) {
      const verse = /^(\d+)\s/.exec(paragraph);
      if (verse) verseCount = Math.max(verseCount, Number(verse[1]));
      continue;
    }
    const note = /^Ver\.\s*(\d+)/.exec(paragraph);
    if (note) notes.push({ verse: Number(note[1]), text: paragraph });
  }
  return { verseCount, notes };
}

/** A link row, `From Verse<TAB>To Verse<TAB>Weight`, with the ids the row files use. */
export interface HaydockReport {
  readonly rows: readonly string[];
  readonly references: number;
  readonly skippedChapters: readonly string[];
  readonly dropped: number;
}

function osisOf(ref: VerseRef): string {
  return `${ref.book}.${String(ref.chapter)}.${String(ref.verse)}`;
}

/**
 * Turns the pages of the source books into link rows: each note's references, placed in this
 * app's numbering, from the note's verse; duplicates and links to the verse itself left out.
 */
export function buildHaydockRows(
  pages: ReadonlyMap<string, HaydockPage>, // keyed `Book.chapter`
): HaydockReport {
  const versification = CANONICAL_VERSIFICATION;
  const rows: string[] = [];
  const seen = new Set<string>();
  const skippedChapters: string[] = [];
  let references = 0;
  let dropped = 0;
  for (const { book, chapters } of HAYDOCK_SOURCE_BOOKS) {
    for (let chapter = 1; chapter <= chapters; chapter += 1) {
      const key = `${book}.${String(chapter)}`;
      const page = pages.get(key);
      if (page === undefined) continue;
      const expected = CANONICAL_CHAPTER_VERSE_COUNTS[book][chapter - 1];
      if (expected !== page.verseCount) {
        skippedChapters.push(`${key} (Douay ${String(page.verseCount)}, app ${String(expected)})`);
        continue;
      }
      for (const note of page.notes) {
        const from: VerseRef = { book, chapter, verse: note.verse };
        if (versification.indexOf(from) === undefined) continue;
        for (const reference of referencesIn(note.text, { book, chapter })) {
          references += 1;
          if (reference.book === 'dropped' || !isBookId(reference.book)) {
            dropped += 1;
            continue;
          }
          const start = toAppRef(reference.book, reference.chapter, reference.verse);
          const end = toAppRef(reference.book, reference.chapter, reference.verseEnd);
          if (start?.book !== end?.book || start === undefined || end === undefined) {
            dropped += 1;
            continue;
          }
          const startIndex = versification.indexOf(start);
          const endIndex = versification.indexOf(end);
          if (startIndex === undefined || endIndex === undefined || endIndex < startIndex) {
            dropped += 1;
            continue;
          }
          const target =
            start.verse === end.verse ? osisOf(start) : `${osisOf(start)}-${osisOf(end)}`;
          const row = `${osisOf(from)}\t${target}\t${String(HAYDOCK_WEIGHT)}`;
          const fromIndex = versification.indexOf(from) ?? -1;
          if (fromIndex >= startIndex && fromIndex <= endIndex) continue; // Its own verse.
          if (seen.has(row)) continue;
          seen.add(row);
          rows.push(row);
        }
      }
    }
  }
  return { rows, references, skippedChapters, dropped };
}
