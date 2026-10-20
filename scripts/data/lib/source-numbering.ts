import type { TranslationId } from '../../../src/core/datasets/ids.ts';
import type { DefectiveTranslationId } from './source-defects.ts';

/**
 * Where an eBible edition files a verse under a different number from the one this app keys it
 * to, and the empty lines it leaves where the number it does not use would be.
 *
 * The World English Bible is the one case so far. It follows the critical text in placing the
 * doxology of Romans (16:25–27 in the KJV) at the end of chapter 14, as 14:24–26, and writes an
 * empty line at 16:25 where the KJV's doxology starts. The three verses are the same words
 * either way; the app keys them to the KJV's numbers, so a cross-reference to Romans 16:25
 * lands on them. The empty line is a placeholder, and the import refuses it if it ever carries
 * text, since that would be a verse this list filed somewhere else.
 *
 * Keyed by translation, so adding one asks the question rather than inheriting an answer.
 */
export interface SourceNumbering {
  /** Verse ids in the source → verse ids here. */
  readonly remaps: ReadonlyMap<string, string>;
  /** Verse ids the source writes as empty lines because it files the verse elsewhere. */
  readonly placeholders: ReadonlySet<string>;
}

const AS_KEYED: SourceNumbering = { remaps: new Map(), placeholders: new Set() };

function isListed(id: TranslationId): id is DefectiveTranslationId {
  return id in SOURCE_NUMBERING;
}

/** The edition's numbering, or none for a translation the list does not know (the BSB). */
export function numberingFor(id: TranslationId): SourceNumbering {
  return isListed(id) ? SOURCE_NUMBERING[id] : AS_KEYED;
}

export const SOURCE_NUMBERING: Readonly<Record<DefectiveTranslationId, SourceNumbering>> = {
  web: {
    remaps: new Map([
      ['Rom.14.24', 'Rom.16.25'],
      ['Rom.14.25', 'Rom.16.26'],
      ['Rom.14.26', 'Rom.16.27'],
    ]),
    placeholders: new Set(['Rom.16.25']),
  },
  kjv: AS_KEYED,
  blivre: AS_KEYED,
  luther1912: AS_KEYED,
  riveduta1927: AS_KEYED,
  vbl: AS_KEYED,
};
