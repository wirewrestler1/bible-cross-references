import { BOOKS, type BookId } from '../../../core/bible/books.ts';
import type { VerseIndex } from '../../../core/bible/verse-ref.ts';
import type { Translation } from '../../../translations/translation.ts';

export interface VerseMeasure {
  readonly verse: VerseIndex;
  readonly value: number;
}

export interface TranslationStats {
  readonly verseCount: number;
  readonly textVerseCount: number;
  /** Verses the translation leaves empty (e.g. moved to footnotes), in books it carries. */
  readonly omittedVerses: readonly VerseIndex[];
  /** Books of the canon the translation does not carry at all (the deuterocanon, mostly). */
  readonly absentBooks: readonly BookId[];
  /** Books the translation carries. */
  readonly bookCount: number;
  readonly chapterCount: number;
  readonly wordCount: number;
  readonly characterCount: number;
  readonly longestVerse: VerseMeasure | undefined;
  readonly shortestVerse: VerseMeasure | undefined;
}

const WORD_PATTERN = /[\p{L}\p{N}]/u;

export function countWords(text: string): number {
  return text.split(/\s+/).filter((token) => WORD_PATTERN.test(token)).length;
}

export function computeTranslationStats(translation: Translation): TranslationStats {
  const omittedVerses: VerseIndex[] = [];
  let wordCount = 0;
  let characterCount = 0;
  let longestVerse: VerseMeasure | undefined;
  let shortestVerse: VerseMeasure | undefined;

  const absentBooks = BOOKS.filter((book) => !translation.hasBook(book.id)).map(({ id }) => id);
  let absentVerseCount = 0;
  for (let verse = 0; verse < translation.verseCount; verse += 1) {
    if (translation.isAbsent(verse)) {
      absentVerseCount += 1;
      continue;
    }
    const text = translation.verseText(verse);
    if (text === '') {
      omittedVerses.push(verse);
      continue;
    }
    const words = countWords(text);
    wordCount += words;
    characterCount += text.length;
    if (!longestVerse || words > longestVerse.value) {
      longestVerse = { verse, value: words };
    }
    if (!shortestVerse || words < shortestVerse.value) {
      shortestVerse = { verse, value: words };
    }
  }

  const { versification } = translation;
  return {
    verseCount: translation.verseCount,
    textVerseCount: translation.verseCount - absentVerseCount - omittedVerses.length,
    omittedVerses,
    absentBooks,
    bookCount: BOOKS.length - absentBooks.length,
    chapterCount: versification.chapterCount,
    wordCount,
    characterCount,
    longestVerse,
    shortestVerse,
  };
}
