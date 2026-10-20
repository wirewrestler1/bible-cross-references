import { foldBookName, lookupBook } from './book-lookup.ts';
import { BOOKS, type Book, type BookId } from './books.ts';
import type { BookNames } from '../../i18n/books/types.ts';
import type { Versification } from './versification.ts';

/**
 * What the search box offers as a reader types: the books whose names begin the way the typing
 * does, then the chapters of the book they picked, then the verses of the chapter. Each item
 * carries the text that choosing it puts in the box, so the reader taps their way to a verse
 * instead of spelling it out — on a phone above all.
 */
export type ReferenceSuggestion =
  | {
      readonly kind: 'book';
      readonly book: BookId;
      /** The book's name in the reader's language. */
      readonly label: string;
      /** What the box holds once this is chosen: the name and a space, ready for a chapter. */
      readonly completion: string;
    }
  | {
      readonly kind: 'chapter';
      readonly book: BookId;
      readonly chapter: number;
      readonly label: string;
      /** The reference and a colon, ready for a verse. */
      readonly completion: string;
    }
  | {
      readonly kind: 'verse';
      readonly book: BookId;
      readonly chapter: number;
      readonly verse: number;
      readonly label: string;
      /** The whole reference: choosing it goes there. */
      readonly completion: string;
    };

export interface ReferenceSuggestions {
  /** Which part of a reference the reader is on. */
  readonly stage: 'book' | 'chapter' | 'verse';
  /** The book, once the typing names one and only one. */
  readonly book: BookId | null;
  /** The chapter, once typed in full and followed by a separator. */
  readonly chapter: number | null;
  readonly items: readonly ReferenceSuggestion[];
}

/** How many books are offered at most: a list, not a catalogue. */
const BOOK_LIMIT = 8;

/**
 * The parser's shape loosened for text still being typed: the numbers may be missing or
 * half-typed, and a separator may stand with nothing after it yet.
 */
const TYPING_PATTERN =
  /^(?<book>(?:[1-4][º°ª]?[\s.-]*)?[\p{L}\p{M}][\p{L}\p{M}\s.'’‘ʼ()-]*?)\s*(?<chapter>\d*)(?:\s*(?<separator>[:.,\s])\s*(?<verse>\d*))?$/iu;

/** The name a reference is written with, which is the plain name for most books. */
function referenceName(book: Book, names: BookNames): string {
  const localized = names[book.id];
  return localized.referenceName ?? localized.name;
}

/** Every spelling a book answers to, folded, with the name's words after a leading numeral. */
function spellingsOf(book: Book, names: BookNames): readonly string[] {
  const localized = names[book.id];
  const name = localized.name;
  const spellings = [
    name,
    localized.referenceName ?? name,
    localized.abbreviation ?? book.id,
    book.id,
    ...localized.aliases,
    // "kings" should find 1 Kings and 2 Kings: the name without its numeral.
    name.replace(/^[1-4][º°ª]?[\s.-]*/u, ''),
  ];
  return [...new Set(spellings.map(foldBookName))].filter((spelling) => spelling !== '');
}

/** How well a book answers a folded query: 0 not at all, higher is better. */
function bookScore(book: Book, query: string, names: BookNames): number {
  const spellings = spellingsOf(book, names);
  const name = foldBookName(names[book.id].name);
  if (spellings.includes(query)) {
    return 3;
  }
  if (name.startsWith(query)) {
    return 2;
  }
  return spellings.some((spelling) => spelling.startsWith(query)) ? 1 : 0;
}

function suggestBooks(query: string, names: BookNames): readonly ReferenceSuggestion[] {
  const folded = foldBookName(query);
  if (folded === '') {
    return [];
  }
  return BOOKS.map((book, order) => ({ book, order, score: bookScore(book, folded, names) }))
    .filter(({ score }) => score > 0)
    .toSorted((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, BOOK_LIMIT)
    .map(({ book }) => ({
      kind: 'book',
      book: book.id,
      label: names[book.id].name,
      completion: `${referenceName(book, names)} `,
    }));
}

/** The numbers 1 to `count` that begin with what was typed (all of them for nothing typed). */
function numbersStartingWith(count: number, typed: string): number[] {
  const numbers: number[] = [];
  for (let n = 1; n <= count; n += 1) {
    if (String(n).startsWith(typed)) {
      numbers.push(n);
    }
  }
  return numbers;
}

/**
 * What to offer for `typed`, or `null` when there is nothing to say: the box is empty, or holds
 * something no reference starts with.
 */
export function suggestReferences(
  typed: string,
  versification: Versification,
  names: BookNames,
): ReferenceSuggestions | null {
  const match = TYPING_PATTERN.exec(typed.trimStart());
  if (!match?.groups) {
    return null;
  }
  const {
    book: bookQuery = '',
    chapter: chapterText = '',
    separator,
    verse: verseText = '',
  } = match.groups;
  const found = lookupBook(bookQuery.trim(), names);
  // The book is settled once numbers follow it, or once the reader has left it with a space.
  const pastBook = chapterText !== '' || separator !== undefined || /\s$/u.test(typed);
  if (found.kind !== 'found' || !pastBook) {
    const items = suggestBooks(bookQuery, names);
    return items.length === 0 ? null : { stage: 'book', book: null, chapter: null, items };
  }
  const book = found.book;
  const name = referenceName(book, names);
  const chapters = versification.chapterCountOf(book.id);
  const chapter = Number(chapterText);
  const verses = chapterText === '' ? undefined : versification.verseCountOf(book.id, chapter);
  if (separator === undefined || verses === undefined) {
    const items = numbersStartingWith(chapters, chapterText).map((n): ReferenceSuggestion => ({
      kind: 'chapter',
      book: book.id,
      chapter: n,
      label: String(n),
      completion: `${name} ${String(n)}:`,
    }));
    return items.length === 0 ? null : { stage: 'chapter', book: book.id, chapter: null, items };
  }
  const items = numbersStartingWith(verses, verseText).map((n): ReferenceSuggestion => ({
    kind: 'verse',
    book: book.id,
    chapter,
    verse: n,
    label: String(n),
    completion: `${name} ${String(chapter)}:${String(n)}`,
  }));
  return items.length === 0 ? null : { stage: 'verse', book: book.id, chapter, items };
}
