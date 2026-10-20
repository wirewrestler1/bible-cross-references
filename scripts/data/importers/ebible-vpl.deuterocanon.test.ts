import { describe, expect, it, vi } from 'vitest';
import { PROTESTANT_BOOKS } from '../../../src/core/bible/books.ts';
import { KJV_CHAPTER_VERSE_COUNTS } from '../../../src/core/bible/kjv-versification.ts';
import { PROVENANCE } from '../../../src/test-utils/fixtures.ts';
import type * as Registry from '../../../src/translations/registry.ts';
import { BOOK_CODES, importEbibleVerseLines } from './ebible-vpl.ts';

// A manifest that claims the deuterocanon, for a translation whose fixture file lacks it. No
// bundled translation is in that state (the one with the books also has them in its file), so
// the registry is patched for this file alone.
vi.mock('../../../src/translations/registry.ts', async (importOriginal) => {
  const original = await importOriginal<typeof Registry>();
  return {
    ...original,
    getTranslationManifest: (id: Parameters<typeof original.getTranslationManifest>[0]) => ({
      ...original.getTranslationManifest(id),
      deuterocanon: true,
    }),
  };
});

function sixtySixBooks(): string {
  return PROTESTANT_BOOKS.flatMap((book) =>
    KJV_CHAPTER_VERSE_COUNTS[book.id].flatMap((verseCount, chapterOffset) =>
      Array.from({ length: verseCount }, (_, verseOffset) => {
        const reference = `${BOOK_CODES[book.id]} ${String(chapterOffset + 1)}:${String(verseOffset + 1)}`;
        return `${reference} Text of ${reference}.`;
      }),
    ),
  ).join('\n');
}

describe('a translation whose manifest claims the deuterocanon', () => {
  it('refuses a file that does not carry it', () => {
    expect(() => importEbibleVerseLines(sixtySixBooks(), 'kjv', PROVENANCE)).toThrow(
      /1 Esdras is missing, but the translation's manifest says it carries the deuterocanon/,
    );
  });
});
