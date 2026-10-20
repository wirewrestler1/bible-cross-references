import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE_ID, KNOWN_LOCALE_IDS } from '../i18n/locale-id.ts';
import { LOCALE_TAGS } from '../i18n/locale-tags.ts';
import { defaultTranslationFor } from './default-for-locale.ts';
import { DEFAULT_TRANSLATION_ID, TRANSLATION_MANIFESTS } from './registry.ts';

describe('the Bible a language starts on', () => {
  it('is the default for the default language, not whichever English text is listed first', () => {
    expect(defaultTranslationFor(DEFAULT_LOCALE_ID)).toBe(DEFAULT_TRANSLATION_ID);
  });

  it.each(KNOWN_LOCALE_IDS)(
    '%s arrives at a Bible in its own language where there is one',
    (id) => {
      const base = LOCALE_TAGS[id].tag.toLowerCase().split('-')[0];
      const chosen = TRANSLATION_MANIFESTS.find((m) => m.id === defaultTranslationFor(id));
      expect(chosen).toBeDefined();
      const own = TRANSLATION_MANIFESTS.filter(
        (m) => m.language.toLowerCase().split('-')[0] === base,
      );
      if (id === DEFAULT_LOCALE_ID || own.length === 0) {
        expect(chosen?.id).toBe(DEFAULT_TRANSLATION_ID);
      } else {
        expect(own.map((m) => m.id)).toContain(chosen?.id);
      }
    },
  );
});
