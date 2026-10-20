import type { VerseIndex } from '../core/bible/verse-ref.ts';
import type { Translation } from './translation.ts';

/** The words to put in a verse's place when the translation has none for it. */
export interface VerseNotes {
  /** The translation omits the verse (it is absent from the earliest manuscripts). */
  readonly omitted: (abbreviation: string) => string;
  /** The translation does not carry the verse's book at all. */
  readonly notInTranslation: (abbreviation: string) => string;
}

/** A verse's text, or a note in its place where the translation leaves the verse out. */
export function verseTextOrNote(
  translation: Translation,
  verse: VerseIndex,
  notes: VerseNotes,
): string {
  const text = translation.verseText(verse);
  if (text !== '') {
    return text;
  }
  const { abbreviation } = translation.manifest;
  return translation.isAbsent(verse)
    ? notes.notInTranslation(abbreviation)
    : notes.omitted(abbreviation);
}
