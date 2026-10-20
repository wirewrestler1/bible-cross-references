import { describe, expect, it } from 'vitest';
import {
  BOOKS,
  DEUTEROCANONICAL_BOOKS,
  getBook,
  getReferenceName,
  isBookId,
  isDeuterocanonical,
  PROTESTANT_BOOKS,
  type BookId,
} from './books.ts';

describe('BOOKS', () => {
  it('lists the 80 books of the Orthodox canon in order', () => {
    expect(BOOKS).toHaveLength(80);
    expect(BOOKS.filter((book) => book.testament === 'OT')).toHaveLength(53);
    expect(PROTESTANT_BOOKS).toHaveLength(66);
    expect(DEUTEROCANONICAL_BOOKS).toHaveLength(14);
    expect(DEUTEROCANONICAL_BOOKS.every((book) => book.testament === 'OT')).toBe(true);
    // One block between Malachi and Matthew.
    expect(BOOKS[39]?.id).toBe('1Esd');
    expect(BOOKS[52]?.id).toBe('4Macc');
    expect(BOOKS[53]?.id).toBe('Matt');
    expect(BOOKS.filter((book) => book.testament === 'NT')).toHaveLength(27);
    expect(BOOKS.at(0)?.id).toBe('Gen');
    expect(BOOKS.at(-1)?.id).toBe('Rev');
    expect(BOOKS.map((book) => book.ordinal)).toEqual(BOOKS.map((_, index) => index));
  });

  it('has unique IDs', () => {
    expect(new Set(BOOKS.map((book) => book.id)).size).toBe(BOOKS.length);
  });
});

describe('book helpers', () => {
  it('recognizes OSIS book IDs', () => {
    expect(isBookId('1Cor')).toBe(true);
    expect(isBookId('4Macc')).toBe(true);
    expect(isBookId('1Co')).toBe(false);
    expect(isDeuterocanonical('Sir')).toBe(true);
    expect(isDeuterocanonical('Gen')).toBe(false);
  });

  it('refuses an id it does not know', () => {
    expect(() => getBook('Nope' as BookId)).toThrow(RangeError);
  });

  it('uses the singular name when citing Psalms', () => {
    expect(getReferenceName(getBook('Ps'))).toBe('Psalm');
    expect(getReferenceName(getBook('Gen'))).toBe('Genesis');
  });
});
