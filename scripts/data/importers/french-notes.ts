import { isBookId, isDeuterocanonical } from '../../../src/core/bible/books.ts';
import type { VerseRef } from '../../../src/core/bible/verse-ref.ts';
import {
  CANONICAL_CHAPTER_VERSE_COUNTS,
  CANONICAL_VERSIFICATION,
} from '../../../src/core/bible/versification.ts';
import {
  DATASET_SCHEMA_VERSION,
  type CrossReferencesFile,
  type DatasetProvenance,
  type ImportNotice,
} from '../../../src/core/datasets/formats.ts';
import type { CrossReferenceSourceId } from '../../../src/core/datasets/ids.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { getCrossReferenceSourceManifest } from '../../../src/cross-references/registry.ts';
import {
  buildCrossReferenceColumns,
  linkKey,
  type VerseLink,
} from '../lib/cross-reference-columns.ts';
import { createNotice } from '../lib/notices.ts';
import { chapterVerseCounts, readZTextVerses } from '../lib/ztext-reader.ts';
import {
  DOUAY_RENUMBERING,
  DOUAY_VERSE_COUNTS,
  mapVulgatePsalm,
  psalmTitleVerses,
  renumberDouay,
  SHIFTED_CHAPTERS,
} from './haydock-notes.ts';

/**
 * Importer for the scripture citations in the notes of two French Catholic Bibles that
 * CrossWire carries as public-domain modules: Glaire's translation of the Vulgate with
 * Vigouroux's notes (`FreVulgGlaire`, 1902) and Crampon's Bible (`FreCrampon`, 1923). Their
 * notes compare passages across the whole Bible, the deuterocanon included — "Tobie 1,2 : Voir
 * 4 Rois, 17, 3" — and each citation is tagged with an OSIS reference, so a note's verse links
 * to every passage it names. Only links that touch the deuterocanon are kept: the notes on the
 * 66 books are a commentary's, not an apparatus of parallels, and the Treasury already covers
 * that ground.
 *
 * Glaire follows the Vulgate's numbering throughout, Crampon a Catholic scheme close to the
 * Greek one this app uses; each is placed by its own rule (`scheme`), and a chapter whose verse
 * count disagrees with the app's — and, for Glaire, with the hand-aligned Douay tables — is
 * skipped whole rather than placed a verse away. Tobit and Judith are left out of the Vulgate
 * scheme altogether (a different text), as is Sirach (numbered differently in nearly every
 * chapter); every reference is validated against this app's versification.
 */
export interface FrenchNotesOptions {
  readonly sourceId: Extract<CrossReferenceSourceId, 'glaire' | 'crampon'>;
  readonly modulePath: string;
  readonly driver: 'zText' | 'zText4';
  /** How the module numbers its verses: the Vulgate's way, or a Catholic scheme near the Greek. */
  readonly scheme: 'vulgate' | 'catholic';
  readonly provenance: Omit<DatasetProvenance, 'snapshotDate'>;
}

/** The weight every link carries: a citation in a printed commentary, no votes. */
export const FRENCH_NOTES_WEIGHT = 4;

/** Books both schemes leave out: a different text, a numbering with no safe map, or not ours. */
const DROPPED_VULGATE_BOOKS: ReadonlySet<string> = new Set(['Tob', 'Jdt', 'Sir']);

/**
 * A module reference as this app's verse, or nothing where it cannot be placed safely. The
 * chapter's verse count in the module decides whether its numbering is the app's own (used as
 * is), the Douay's (renumbered through the hand-aligned tables) or neither (left out).
 */
export function placeFrenchRef(
  book: string,
  chapter: number,
  verse: number,
  scheme: 'vulgate' | 'catholic',
  moduleCounts: ReadonlyMap<string, number>,
): VerseRef | undefined {
  if (!isBookId(book)) {
    return undefined;
  }
  const key = `${book}.${String(chapter)}`;
  if (book === 'Ps') {
    if (scheme === 'vulgate') {
      return mapVulgatePsalm(chapter, verse);
    }
    const english = verse - psalmTitleVerses(chapter);
    return english >= 1 ? { book: 'Ps', chapter, verse: english } : undefined;
  }
  if (book === 'Dan') {
    if (chapter === 3) {
      if (verse <= 23) return { book: 'Dan', chapter: 3, verse };
      if (verse <= 90) return { book: 'DanGr', chapter: 3, verse };
      return { book: 'Dan', chapter: 3, verse: verse - 67 };
    }
    if (chapter === 13 || chapter === 14) {
      return { book: 'DanGr', chapter, verse };
    }
  }
  if (book === 'Esth' && (chapter > 10 || (chapter === 10 && verse > 3))) {
    return undefined; // The additions, numbered as chapters 10:4–16:24 in both schemes.
  }
  if (scheme === 'vulgate' && SHIFTED_CHAPTERS.has(key)) {
    return undefined;
  }
  if (scheme === 'vulgate' && DROPPED_VULGATE_BOOKS.has(book)) {
    return undefined;
  }
  if (isDeuterocanonical(book)) {
    const expected = CANONICAL_CHAPTER_VERSE_COUNTS[book][chapter - 1];
    const inModule = moduleCounts.get(key);
    if (expected === undefined || inModule === undefined) {
      return undefined;
    }
    if (inModule === expected) {
      return { book, chapter, verse };
    }
    if (scheme === 'vulgate' && inModule === DOUAY_VERSE_COUNTS[key] && key in DOUAY_RENUMBERING) {
      const renumbered = renumberDouay(book, chapter, verse);
      return renumbered === undefined ? undefined : { book, chapter, verse: renumbered };
    }
    return undefined;
  }
  return { book, chapter, verse };
}

const OSIS_REF_PART = /^([1-4]?[A-Za-z]+)\.(\d+)\.(\d+)$/;

export function importFrenchNotes(
  archive: Uint8Array,
  options: FrenchNotesOptions,
): CrossReferencesFile {
  const { sourceId, modulePath, driver, scheme, provenance } = options;
  const manifest = getCrossReferenceSourceManifest(sourceId);
  const versification = CANONICAL_VERSIFICATION;
  const verses = readZTextVerses(archive, modulePath, driver);
  if (verses.length === 0) {
    throw new Error(`${sourceId}: the module has no verses.`);
  }
  const moduleCounts = chapterVerseCounts(verses);

  const links: VerseLink[] = [];
  const seen = new Set<string>();
  const unplaced: string[] = [];
  const malformed: string[] = [];
  const skippedChapters = new Set<string>();
  let citations = 0;

  const place = (
    book: string,
    chapter: number,
    verse: number,
    label: string,
  ): number | undefined => {
    const ref = placeFrenchRef(book, chapter, verse, scheme, moduleCounts);
    const index = ref && versification.indexOf(ref);
    if (index === undefined) {
      if (isBookId(book) && isDeuterocanonical(book) && !DROPPED_VULGATE_BOOKS.has(book)) {
        skippedChapters.add(`${book}.${String(chapter)}`);
      } else {
        unplaced.push(label);
      }
    }
    return index;
  };

  for (const moduleVerse of verses) {
    const notes = [...moduleVerse.text.matchAll(/<note[^>]*>([\s\S]*?)<\/note>/g)];
    if (notes.length === 0) continue;
    const sourceLabel = `${moduleVerse.book}.${String(moduleVerse.chapter)}.${String(moduleVerse.verse)}`;
    const sourceIsDeuterocanonical =
      isBookId(moduleVerse.book) && isDeuterocanonical(moduleVerse.book);
    for (const note of notes) {
      for (const reference of (note[1] ?? '').matchAll(/<reference[^>]*osisRef="([^"]+)"/g)) {
        for (const target of (reference[1] ?? '').split(/\s+/).filter((part) => part !== '')) {
          const [startText = '', endText = startText, ...rest] = target.split('-');
          const startMatch = OSIS_REF_PART.exec(startText);
          const endMatch = OSIS_REF_PART.exec(endText);
          if (!startMatch || !endMatch || rest.length > 0) {
            malformed.push(`${sourceLabel}: ${target}`);
            continue;
          }
          const [, startBook = '', startChapter = '', startVerse = ''] = startMatch;
          const [, endBook = '', endChapter = '', endVerse = ''] = endMatch;
          const targetIsDeuterocanonical = isBookId(startBook) && isDeuterocanonical(startBook);
          if (!sourceIsDeuterocanonical && !targetIsDeuterocanonical) {
            continue; // The notes on the 66 books, about the 66 books: not this app's gap.
          }
          citations += 1;
          const from = place(moduleVerse.book, moduleVerse.chapter, moduleVerse.verse, sourceLabel);
          if (from === undefined) {
            continue;
          }
          const label = `${sourceLabel} → ${target}`;
          const targetStart = place(startBook, Number(startChapter), Number(startVerse), label);
          const targetEnd =
            targetStart === undefined
              ? undefined
              : place(endBook, Number(endChapter), Number(endVerse), label);
          if (targetStart === undefined || targetEnd === undefined || targetStart > targetEnd) {
            continue;
          }
          if (targetStart <= from && from <= targetEnd) {
            continue; // A citation of the verse's own passage says nothing about where it connects.
          }
          const link: VerseLink = {
            from,
            targetStart,
            targetEnd,
            votes: FRENCH_NOTES_WEIGHT,
            kind: LINK_KINDS.french,
          };
          const key = linkKey(link);
          if (!seen.has(key)) {
            seen.add(key);
            links.push(link);
          }
        }
      }
    }
  }

  if (links.length === 0) {
    throw new Error(`${sourceId}: no citations touching the deuterocanon were found.`);
  }

  const notices: ImportNotice[] = [];
  if (skippedChapters.size > 0) {
    notices.push(
      createNotice(
        'info',
        'Chapters of the deuterocanon the edition numbers differently from the numbering used ' +
          'here, with no hand-made map; every citation touching one is left out rather than ' +
          'placed a verse away from its words.',
        [...skippedChapters].toSorted(),
      ),
    );
  }
  if (unplaced.length > 0) {
    notices.push(
      createNotice(
        'warning',
        'Citations of verses this versification does not have, or of books left out, left out.',
        unplaced,
      ),
    );
  }
  if (malformed.length > 0) {
    notices.push(createNotice('warning', 'Citations that could not be read, left out.', malformed));
  }

  return {
    format: 'cross-references',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: versification.id,
    provenance: { ...provenance, snapshotDate: null },
    notices,
    sourceId,
    // A row of the raw source here is one citation touching the deuterocanon.
    sourceRowCount: citations,
    license: manifest.license,
    attribution: manifest.attribution,
    links: buildCrossReferenceColumns(links, versification),
  };
}

export function importGlaireCrossReferences(
  archive: Uint8Array,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importFrenchNotes(archive, {
    sourceId: 'glaire',
    modulePath: 'modules/texts/ztext4/frevulgglaire',
    driver: 'zText4',
    scheme: 'vulgate',
    provenance,
  });
}

export function importCramponCrossReferences(
  archive: Uint8Array,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importFrenchNotes(archive, {
    sourceId: 'crampon',
    modulePath: 'modules/texts/ztext/frecrampon',
    driver: 'zText',
    scheme: 'catholic',
    provenance,
  });
}
