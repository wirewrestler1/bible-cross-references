import { describe, expect, it } from 'vitest';
import { getLocale } from '../../i18n/registry.ts';
import { suggestReferences } from './reference-suggest.ts';
import { CANONICAL_VERSIFICATION } from './versification.ts';

const names = getLocale('en').books;
const suggest = (typed: string) => suggestReferences(typed, CANONICAL_VERSIFICATION, names);
const labels = (typed: string) => suggest(typed)?.items.map((item) => item.label) ?? [];

describe('suggesting a reference while it is typed', () => {
  it('has nothing to say for an empty box, or for text no book starts with', () => {
    expect(suggest('')).toBeNull();
    expect(suggest('   ')).toBeNull();
    expect(suggest('xyzzy')).toBeNull();
    expect(suggest('42')).toBeNull();
  });

  it('offers the books whose names begin the way the typing does, in canonical order', () => {
    expect(labels('Ge')).toEqual(['Genesis']);
    expect(labels('j')).toEqual([
      'Joshua',
      'Judges',
      'Job',
      'Jeremiah',
      'Joel',
      'Jonah',
      'Judith',
      'John',
    ]);
    expect(suggest('j')?.stage).toBe('book');
  });

  it('puts a book whose name is exactly what was typed first, before longer names', () => {
    expect(labels('John')[0]).toBe('John');
    expect(labels('john')).toEqual(['John', '1 John', '2 John', '3 John']);
  });

  it('finds a numbered book by the words after its numeral, and by an abbreviation', () => {
    expect(labels('kings')).toEqual(['1 Kings', '2 Kings']);
    expect(labels('macc')).toEqual(['1 Maccabees', '2 Maccabees', '3 Maccabees', '4 Maccabees']);
    expect(labels('Ps')).toContain('Psalms');
    expect(labels('sir')).toContain('Sirach');
  });

  it('ignores accents and case, the way a phone keyboard types', () => {
    expect(labels('GENESIS')).toEqual(['Genesis']);
    expect(labels('gênesis')).toEqual(['Genesis']);
  });

  it('completes a book with its citing name and a space, ready for the chapter', () => {
    const [psalms] = suggest('Psal')?.items ?? [];
    expect(psalms).toMatchObject({
      kind: 'book',
      book: 'Ps',
      label: 'Psalms',
      completion: 'Psalm ',
    });
    expect(suggest('Gen')?.items[0]).toMatchObject({ completion: 'Genesis ' });
  });

  it('moves on to the chapters once the book is left with a space, or a number begins', () => {
    const spaced = suggest('Genesis ');
    expect(spaced?.stage).toBe('chapter');
    expect(spaced?.book).toBe('Gen');
    expect(spaced?.items).toHaveLength(50);
    expect(spaced?.items[0]).toMatchObject({
      kind: 'chapter',
      chapter: 1,
      completion: 'Genesis 1:',
    });

    const typed = suggest('Gen 2');
    expect(typed?.stage).toBe('chapter');
    expect(typed?.items.map((item) => item.label)).toEqual([
      '2',
      '20',
      '21',
      '22',
      '23',
      '24',
      '25',
      '26',
      '27',
      '28',
      '29',
    ]);
  });

  it('stays on the books while the name could still be more than one', () => {
    expect(suggest('Jo')?.stage).toBe('book');
    expect(suggest('Jo ')?.stage).toBe('book');
  });

  it('moves on to the verses once a chapter is followed by a separator', () => {
    const verses = suggest('Genesis 2:');
    expect(verses?.stage).toBe('verse');
    expect(verses?.chapter).toBe(2);
    expect(verses?.items).toHaveLength(25);
    expect(verses?.items[0]).toMatchObject({ kind: 'verse', verse: 1, completion: 'Genesis 2:1' });
    expect(suggest('Genesis 2.1')?.items.map((item) => item.label)).toEqual([
      '1',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
    ]);
    expect(suggest('Gen 2 1')?.stage).toBe('verse');
  });

  it('reads a psalm by its citing name, and the deuterocanon by its own', () => {
    expect(suggest('Psalm 23:')?.items).toHaveLength(6);
    expect(suggest('Sirach 24:')?.book).toBe('Sir');
  });

  it('offers nothing past the last chapter or verse', () => {
    expect(suggest('Genesis 51')).toBeNull();
    expect(suggest('Genesis 2:26')).toBeNull();
    expect(suggest('Genesis 99:')).toBeNull();
  });
});
