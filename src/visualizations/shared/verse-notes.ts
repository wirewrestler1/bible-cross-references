import type { Localization } from '../../i18n/use-locale.tsx';
import type { VerseNotes } from '../../translations/verse-text.ts';

/** The notes a verse without text shows, in the reader's language. */
export function verseNotes(t: Localization['t']): VerseNotes {
  return {
    omitted: t('threads.omitted'),
    notInTranslation: t('text.notInTranslation'),
  };
}
