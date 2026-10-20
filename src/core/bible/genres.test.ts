import { describe, expect, it } from 'vitest';
import { BOOKS } from './books.ts';
import { GENRES, getBookGenre, getGenre, getGenreBooks } from './genres.ts';

describe('getGenre', () => {
  it('finds a genre by id and refuses one it does not have', () => {
    expect(getGenre('deuterocanon').id).toBe('deuterocanon');
    expect(() => getGenre('apocrypha' as never)).toThrow(RangeError);
  });
});

describe('GENRES', () => {
  it('has the 10 standard groups and the deuterocanon, with the expected book counts', () => {
    expect(GENRES.map((genre) => [genre.id, getGenreBooks(genre.id).length])).toEqual([
      ['law', 5],
      ['history', 12],
      ['poetry', 5],
      ['major-prophets', 5],
      ['minor-prophets', 12],
      ['deuterocanon', 14],
      ['gospels', 4],
      ['acts', 1],
      ['pauline-epistles', 13],
      ['general-epistles', 8],
      ['revelation', 1],
    ]);
  });

  it('covers every book exactly once, in contiguous canonical runs', () => {
    const ordinals = BOOKS.map((book) => getBookGenre(book.id).ordinal);
    expect(ordinals).toEqual([...ordinals].sort((a, b) => a - b));
    expect(new Set(ordinals).size).toBe(GENRES.length);
  });

  it('keeps every book in its own testament', () => {
    for (const book of BOOKS) {
      expect(getBookGenre(book.id).testament).toBe(book.testament);
    }
  });

  it('classifies Hebrews with the General Epistles', () => {
    expect(getBookGenre('Heb').id).toBe('general-epistles');
  });
});
