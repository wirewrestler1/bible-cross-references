import { describe, expect, it } from 'vitest';
import { parseReference } from './reference-parse.ts';
import { CANONICAL_VERSIFICATION } from './versification.ts';
import { enBooks } from '../../i18n/books/en.ts';
import { deBooks } from '../../i18n/books/de.ts';
import { ptBooks } from '../../i18n/books/pt.ts';

const parse = (input: string) => parseReference(input, CANONICAL_VERSIFICATION, enBooks);

describe('parseReference', () => {
  it.each([
    ['John 3:16', { book: 'John', chapter: 3, verse: 16 }],
    ['jn 3 16', { book: 'John', chapter: 3, verse: 16 }],
    ['john3:16', { book: 'John', chapter: 3, verse: 16 }],
    ['1 Cor 13:4', { book: '1Cor', chapter: 13, verse: 4 }],
    ['1co13.4', { book: '1Cor', chapter: 13, verse: 4 }],
    ['Gen.1.1', { book: 'Gen', chapter: 1, verse: 1 }],
    ['Song of Solomon 2:1', { book: 'Song', chapter: 2, verse: 1 }],
    ['  II Kings 2 : 11 ', { book: '2Kgs', chapter: 2, verse: 11 }],
    ['Ps 23', { book: 'Ps', chapter: 23, verse: undefined }],
    ['4 Macc 18:24', { book: '4Macc', chapter: 18, verse: 24 }],
    ['IV Maccabees 1:1', { book: '4Macc', chapter: 1, verse: 1 }],
    ['Sirach 24:1', { book: 'Sir', chapter: 24, verse: 1 }],
    ['Ecclesiasticus 24', { book: 'Sir', chapter: 24, verse: undefined }],
    // Psalm 151 is its own book, but a reader cites it as a psalm.
    ['Psalm 151:1', { book: 'AddPs', chapter: 1, verse: 1 }],
    ['Ps 151', { book: 'AddPs', chapter: 1, verse: undefined }],
    // Sections of Greek Daniel and Baruch that are cited as books of their own.
    ['Susanna 1:5', { book: 'DanGr', chapter: 13, verse: 5 }],
    ['Bel 1', { book: 'DanGr', chapter: 14, verse: undefined }],
    ['Song of the Three 1:29', { book: 'DanGr', chapter: 3, verse: 29 }],
    ['Letter of Jeremiah 1:3', { book: 'Bar', chapter: 6, verse: 3 }],
  ])('parses %j', (input, reference) => {
    expect(parse(input)).toEqual({ ok: true, reference });
  });

  it.each([
    ['', { kind: 'unreadable' }],
    ['John 3:16-18', { kind: 'unreadable' }],
    ['Hezekiah 1:1', { kind: 'unknown-book', query: 'Hezekiah' }],
    [
      'Jo 1:1',
      {
        kind: 'ambiguous-book',
        query: 'Jo',
        candidates: ['Josh', 'Job', 'Joel', 'Jonah', 'John'],
      },
    ],
    ['Genesis 51:1', { kind: 'no-such-chapter', book: 'Gen', chapters: 50 }],
    ['Psalms 23:7', { kind: 'no-such-verse', book: 'Ps', chapter: 23, verses: 6 }],
    ['John 3:0', { kind: 'no-such-verse', book: 'John', chapter: 3, verses: 36 }],
    ['Psalm 152', { kind: 'no-such-chapter', book: 'Ps', chapters: 150 }],
    // Susanna is one chapter (the thirteenth of Greek Daniel).
    ['Susanna 2:1', { kind: 'no-such-chapter', book: 'DanGr', chapters: 1 }],
  ])('rejects %j', (input, error) => {
    expect(parse(input)).toEqual({ ok: false, error });
  });

  it('reads a qualifier in parentheses, which several catalogues use for the Greek books', () => {
    expect(parseReference('Ester (griechisch) 1:1', CANONICAL_VERSIFICATION, deBooks)).toEqual({
      ok: true,
      reference: { book: 'EsthGr', chapter: 1, verse: 1 },
    });
    expect(parseReference('Daniel griechisch 13:1', CANONICAL_VERSIFICATION, deBooks)).toEqual({
      ok: true,
      reference: { book: 'DanGr', chapter: 13, verse: 1 },
    });
  });

  it('reads a reference written with accents, which is how Portuguese is typed', () => {
    for (const input of ['Gênesis 1:1', 'genesis 1:1', 'Êxodo 3:14', 'João 3:16', 'Jó 1:1']) {
      expect(parseReference(input, CANONICAL_VERSIFICATION, ptBooks).ok).toBe(true);
    }
  });

  it('reads Jo as João and Jó as Job, which is the difference the accent makes', () => {
    const book = (input: string) => {
      const result = parseReference(input, CANONICAL_VERSIFICATION, ptBooks);
      return result.ok ? result.reference.book : result.error.kind;
    };
    expect(book('Jo 3:16')).toBe('John');
    expect(book('Jó 1:1')).toBe('Job');
  });
});
