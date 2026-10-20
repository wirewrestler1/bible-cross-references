import { inflateSync } from 'node:zlib';
import { isBookId, isDeuterocanonical, type BookId } from '../../../src/core/bible/books.ts';
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
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { getCrossReferenceSourceManifest } from '../../../src/cross-references/registry.ts';
import {
  buildCrossReferenceColumns,
  linkKey,
  type VerseLink,
} from '../lib/cross-reference-columns.ts';
import { extractZipEntry } from '../lib/files.ts';
import { createNotice } from '../lib/notices.ts';

const SWE1917 = getCrossReferenceSourceManifest('swe1917');

/**
 * Importer for the cross-reference apparatus of CrossWire's `Swe1917` module: the Swedish Bible
 * of 1917 with the Apocrypha of 1921, public domain, whose notes reach into Tobit, Judith,
 * Greek Esther, Wisdom, Sirach, Baruch, the Greek additions to Daniel, 1–2 Maccabees and the
 * Prayer of Manasseh — the one open compilation found that does (see data/SOURCES-RESEARCH.md).
 *
 * The module is a SWORD zText: each testament is three files under
 * `modules/texts/ztext/swe1917/`. `*.bzz` holds zlib-compressed blocks, `*.bzs` says where each
 * block is (offset, size, uncompressed size: three little-endian 32-bit integers), and `*.bzv`
 * has one ten-byte entry per verse of the module's versification (block, offset in the block,
 * size) in that versification's order, with intro entries before each book and chapter. The
 * text has no `<verse>` tags, so a verse is known by its place: the entry holding
 * `<chapter osisID="Sir.24">` is the chapter's intro, and the entries after it are its verses
 * 1, 2, 3, … until the next chapter's intro — an empty entry still counts, which is how the
 * gaps of the Greek numbering come through. A note that names its own verse, with an
 * `x-origin` reference, is believed over its position.
 *
 * Every reference is validated against this app's versification; one it cannot place is left
 * out and counted. The Swedish edition numbers some chapters of Tobit, Judith, Sirach, Wisdom
 * and 1 Maccabees differently from the Greek numbering the World English Bible uses, and a
 * reference into such a chapter would land a verse or more away from the words it means, so
 * every reference touching a chapter whose verse count disagrees with the app's is left out
 * too, and the chapters are reported. The whole apparatus is kept, the 66 books included: it is
 * one editor's set of parallel passages, and the links it shares with OpenBible.info are
 * dropped where the sources are merged, not here.
 */

const MODULE_PATH = 'modules/texts/ztext/swe1917';

/** The weight every link carries: a parallel passage in a printed apparatus, no votes. */
export const SWE1917_WEIGHT = 5;

/**
 * The module names the Greek additions as books of their own (the NRSV's way); here they are
 * chapters of Greek Daniel and verses of Greek Esther.
 *
 * The Prayer of Azariah and the Song of the Three are Greek Daniel 3:24–90, so its verse `v` is
 * 3:(v + 23); the NRSV has 68 verses to the Greek's 67, so the last is held at 3:90. Susanna and
 * Bel are chapters 13 and 14 with the same verse numbers. The module's Greek Esther has seven
 * chapters, one per addition as the 1921 edition printed them — the dream (A), the edict (B),
 * Mordecai's prayer, Esther's prayer in two parts (C), Esther before the king (D) and the
 * counter-edict (E) — while the WEB prints each addition inside the verse where the Greek has
 * it, so a whole chapter here is one verse there.
 */
function mapAddition(ref: VerseRef): VerseRef | undefined {
  const book: string = ref.book;
  switch (book) {
    case 'PrAzar':
      return { book: 'DanGr', chapter: 3, verse: Math.min(ref.verse + 23, 90) };
    case 'Sus':
      return { book: 'DanGr', chapter: 13, verse: ref.verse };
    case 'Bel':
      return { book: 'DanGr', chapter: 14, verse: ref.verse };
    case 'EsthGr': {
      const placed = ESTHER_ADDITIONS[ref.chapter];
      return placed === undefined ? undefined : { book: 'EsthGr', ...placed };
    }
    default:
      return ref;
  }
}

const ESTHER_ADDITIONS: Readonly<Record<number, { chapter: number; verse: number }>> = {
  1: { chapter: 1, verse: 1 },
  2: { chapter: 3, verse: 13 },
  3: { chapter: 4, verse: 18 },
  4: { chapter: 4, verse: 18 },
  5: { chapter: 4, verse: 18 },
  6: { chapter: 5, verse: 1 },
  7: { chapter: 8, verse: 13 },
};

/** The book ids the module uses that this app does not have as books. */
const ADDITION_BOOKS = new Set(['PrAzar', 'Sus', 'Bel']);

/** Reads a module book id and chapter/verse into a reference of this app, or nothing. */
function toRef(moduleBook: string, chapter: number, verse: number): VerseRef | undefined {
  if (ADDITION_BOOKS.has(moduleBook) || moduleBook === 'EsthGr') {
    return mapAddition({ book: moduleBook as BookId, chapter, verse });
  }
  return isBookId(moduleBook) ? { book: moduleBook, chapter, verse } : undefined;
}

/** A module verse as `Book.chapter.verse`, with the chapter's verses in the module's own order. */
interface ModuleVerse {
  readonly book: string;
  readonly chapter: number;
  readonly verse: number;
  readonly text: string;
}

const OSIS_REF_PART = /^([1-4]?[A-Za-z]+)\.(\d+)\.(\d+)$/;

/** Reads the module's verses, in order, by walking its verse index. */
function readModuleVerses(archive: Uint8Array): ModuleVerse[] {
  const verses: ModuleVerse[] = [];
  for (const part of ['ot', 'nt']) {
    const index = extractZipEntry(archive, `${MODULE_PATH}/${part}.bzs`);
    const verseIndex = extractZipEntry(archive, `${MODULE_PATH}/${part}.bzv`);
    const compressed = extractZipEntry(archive, `${MODULE_PATH}/${part}.bzz`);
    const blocks: Buffer[] = [];
    const indexView = new DataView(index.buffer, index.byteOffset, index.byteLength);
    for (let at = 0; at + 12 <= index.byteLength; at += 12) {
      const offset = indexView.getUint32(at, true);
      const size = indexView.getUint32(at + 4, true);
      blocks.push(inflateSync(compressed.subarray(offset, offset + size)));
    }
    const verseView = new DataView(verseIndex.buffer, verseIndex.byteOffset, verseIndex.byteLength);
    let book = '';
    let chapter = 0;
    let verse = 0;
    for (let at = 0; at + 10 <= verseIndex.byteLength; at += 10) {
      const block = blocks[verseView.getUint32(at, true)];
      const start = verseView.getUint32(at + 4, true);
      const size = verseView.getUint16(at + 8, true);
      const text =
        block === undefined || size === 0
          ? ''
          : block.subarray(start, start + size).toString('utf8');
      const marker = /<chapter[^>]*osisID="([1-4]?[A-Za-z]+)\.(\d+)"/.exec(text);
      if (marker) {
        book = marker[1] ?? '';
        chapter = Number(marker[2]);
        verse = 0;
        continue;
      }
      // Before the first chapter, and the entry that opens each book (`<div type="book">`),
      // are intros rather than verses, and the intro of one book sits right after the last
      // verse of the one before it.
      if (book === '' || /<div[^>]*type="book"/.test(text)) {
        continue;
      }
      verse += 1;
      verses.push({ book, chapter, verse, text });
    }
  }
  return verses;
}

/**
 * Chapters of the deuterocanon whose verse count in the module differs from this app's — the
 * Swedish edition's numbering rather than the Greek — as `Book.chapter`.
 */
function misnumberedChapters(verses: readonly ModuleVerse[]): Set<string> {
  // The last verse with text, not the number of entries: a book's intro entry follows its
  // predecessor's last chapter and would count as one verse more.
  const lastWithText = new Map<string, number>();
  for (const { book, chapter, verse, text } of verses) {
    if (text.trim() !== '') {
      lastWithText.set(`${book}.${String(chapter)}`, verse);
    }
  }
  const misnumbered = new Set<string>();
  for (const [key, last] of lastWithText) {
    const [book = '', chapterText = ''] = key.split('.');
    // Greek Esther is mapped chapter by chapter (see `ESTHER_ADDITIONS`), so its counts are
    // not expected to agree.
    if (!isBookId(book) || !isDeuterocanonical(book) || book === 'EsthGr') {
      continue;
    }
    const expected = CANONICAL_CHAPTER_VERSE_COUNTS[book][Number(chapterText) - 1];
    if (expected !== undefined && expected !== last) {
      misnumbered.add(key);
    }
  }
  return misnumbered;
}

export function importSwe1917CrossReferences(
  archive: Uint8Array,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  const versification = CANONICAL_VERSIFICATION;
  const verses = readModuleVerses(archive);
  if (verses.length === 0) {
    throw new Error('Swe1917: the module has no verses.');
  }
  const misnumbered = misnumberedChapters(verses);

  const links: VerseLink[] = [];
  const seen = new Set<string>();
  const unplaced: string[] = [];
  const skippedChapters: string[] = [];
  const malformed: string[] = [];
  let referenceCount = 0;

  const place = (ref: VerseRef | undefined, moduleId: string): number | undefined => {
    const index = ref && versification.indexOf(ref);
    if (index === undefined) {
      unplaced.push(moduleId);
    }
    return index;
  };

  for (const moduleVerse of verses) {
    for (const note of moduleVerse.text.matchAll(
      /<note type="crossReference">([\s\S]*?)<\/note>/g,
    )) {
      const body = note[1] ?? '';
      // A note may say which verse of the chapter it belongs to; that beats its position.
      const origin = /<reference[^>]*subType="x-origin"[^>]*>\s*(\d+)/.exec(body);
      const sourceVerse = origin ? Number(origin[1]) : moduleVerse.verse;
      const sourceModuleId = `${moduleVerse.book}.${String(moduleVerse.chapter)}.${String(sourceVerse)}`;
      if (misnumbered.has(`${moduleVerse.book}.${String(moduleVerse.chapter)}`)) {
        skippedChapters.push(sourceModuleId);
        continue;
      }
      const from = place(toRef(moduleVerse.book, moduleVerse.chapter, sourceVerse), sourceModuleId);
      if (from === undefined) {
        continue;
      }
      for (const reference of body.matchAll(/<reference[^>]*osisRef="([^"]+)"[^>]*>/g)) {
        for (const target of (reference[1] ?? '').split(/\s+/).filter((part) => part !== '')) {
          referenceCount += 1;
          const [startText = '', endText = startText, ...rest] = target.split('-');
          const startMatch = OSIS_REF_PART.exec(startText);
          const endMatch = OSIS_REF_PART.exec(endText);
          if (!startMatch || !endMatch || rest.length > 0) {
            malformed.push(`${sourceModuleId}: ${target}`);
            continue;
          }
          const [, startBook = '', startChapter = '', startVerse = ''] = startMatch;
          const [, endBook = '', endChapter = '', endVerse = ''] = endMatch;
          if (
            misnumbered.has(`${startBook}.${startChapter}`) ||
            misnumbered.has(`${endBook}.${endChapter}`)
          ) {
            skippedChapters.push(`${sourceModuleId} → ${target}`);
            continue;
          }
          const targetStart = place(
            toRef(startBook, Number(startChapter), Number(startVerse)),
            `${sourceModuleId} → ${target}`,
          );
          const targetEnd =
            targetStart === undefined
              ? undefined
              : place(
                  toRef(endBook, Number(endChapter), Number(endVerse)),
                  `${sourceModuleId} → ${target}`,
                );
          if (targetStart === undefined || targetEnd === undefined || targetStart > targetEnd) {
            continue;
          }
          if (targetStart <= from && from <= targetEnd) {
            // A reference to the verse's own passage says nothing about where it connects.
            continue;
          }
          const link: VerseLink = {
            from,
            targetStart,
            targetEnd,
            votes: SWE1917_WEIGHT,
            kind: LINK_KINDS.imported,
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
    throw new Error('Swe1917: no cross-reference notes were found in the module.');
  }

  const notices: ImportNotice[] = [];
  if (misnumbered.size > 0) {
    notices.push(
      createNotice(
        'info',
        'Chapters of the deuterocanon the Swedish edition numbers differently from the Greek ' +
          'numbering used here; every reference touching one is left out rather than placed a ' +
          'verse away from its words.',
        [...misnumbered].toSorted(),
      ),
    );
  }
  if (skippedChapters.length > 0) {
    notices.push(
      createNotice('info', 'References left out for touching such a chapter.', skippedChapters),
    );
  }
  if (unplaced.length > 0) {
    notices.push(
      createNotice(
        'warning',
        'References to verses this versification does not have, left out.',
        unplaced,
      ),
    );
  }
  if (malformed.length > 0) {
    notices.push(
      createNotice('warning', 'References that could not be read, left out.', malformed),
    );
  }

  return {
    format: 'cross-references',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: versification.id,
    provenance: { ...provenance, snapshotDate: null },
    notices,
    sourceId: 'swe1917',
    // A row of the raw source here is one target of one note.
    sourceRowCount: referenceCount,
    license: SWE1917.license,
    attribution: SWE1917.attribution,
    links: buildCrossReferenceColumns(links, versification),
  };
}

/** For the tests and the debug page: how many notes the module holds. */
export function countSwe1917Notes(archive: Uint8Array): number {
  return readModuleVerses(archive).reduce(
    (total, verse) => total + (verse.text.match(/<note type="crossReference">/g)?.length ?? 0),
    0,
  );
}
