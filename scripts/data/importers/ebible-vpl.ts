import { DEUTEROCANONICAL_BOOKS, type BookId } from '../../../src/core/bible/books.ts';
import { toOsisId, type VerseIndex } from '../../../src/core/bible/verse-ref.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import { getTranslationManifest } from '../../../src/translations/registry.ts';
import {
  DATASET_SCHEMA_VERSION,
  type DatasetProvenance,
  type ImportNotice,
  type TranslationTextFile,
} from '../../../src/core/datasets/formats.ts';
import type { TranslationId } from '../../../src/core/datasets/ids.ts';
import { BOOK_CODES } from './ebible-book-codes.ts';

export { BOOK_CODES, DEUTEROCANON_BOOK_CODES, PROTESTANT_BOOK_CODES } from './ebible-book-codes.ts';
import { stripByteOrderMark } from '../lib/files.ts';
import { createNotice } from '../lib/notices.ts';
import { omittedVerseNotices } from '../lib/omitted-verses.ts';
import { defectsFor } from '../lib/source-defects.ts';

/**
 * Importer for eBible.org's verse-per-line editions (`<id>_vpl.zip` → `<id>_vpl.txt`), which every
 * translation there is published in: one line per verse, `<BOOK> <chapter>:<verse> <text>`, text
 * only (eBible strips notes, headings and paragraph formatting from these files).
 *
 * Books are named with the three-letter codes BibleWorks uses, listed below in canonical order.
 */

const BOOK_IDS_BY_CODE: ReadonlyMap<string, BookId> = new Map(
  Object.entries(BOOK_CODES).map(([id, code]) => [code, id as BookId]),
);

const VERSE_LINE_PATTERN = /^(\S+) (\d+):(\d+) ?(.*)$/;

/**
 * Books eBible publishes that the Orthodox canon does not have, skipped by name rather than by
 * being unknown: an unknown code still stops the build, because it may be a book mis-coded.
 */
const BOOKS_OUTSIDE_THE_CANON: ReadonlyMap<string, string> = new Map([['4ES', '2 Esdras']]);

/**
 * The number the source edition gives a verse, where that differs from the KJV number this file
 * is keyed to.
 *
 * eBible publishes every translation against one numbering and leaves the edition's own number in
 * the text. It writes it two ways, and both are in texts this app ships:
 *
 *     GEN 32:1 [32:2] Jakob aber zog seinen Weg…            the Lutherbibel 1912, 358 times
 *     JON 1:17 (H2-1) E l’Eterno fece venire un gran pesce…  the Riveduta 1927, 229 times
 *
 * `H` and `G` name the Hebrew and Greek numbering the edition follows. Hebrew Bibles close
 * Genesis 31, Numbers 29, 1 Samuel 23 and Jonah 1 a verse earlier than the KJV does, so from
 * there on the two numberings disagree. Where the remapping merged two of the edition's verses
 * into one KJV verse, the number marks the join mid-sentence instead of opening the verse.
 *
 * It is the editor's note rather than the translator's words, and every verse here is already
 * shown under its KJV number, so a second number disagreeing with it inline would only mislead.
 *
 * Replaced with a space rather than removed: a marker is space-delimited everywhere it has been
 * seen, but one that ever sits between two words would otherwise weld them together, and
 * `cleanVerseText` collapses the doubled space immediately afterwards.
 */
const SOURCE_VERSE_NUMBER = /\[\d+(?::\d+|[ab])\]|\([HG]\d+-\d+\)/g;

/**
 * Anything still in brackets afterwards that reads like a number rather than like words.
 *
 * It catches a *near* miss, and only that. The assumption is that a marker holds no space while
 * a translator's aside does — so `[was]`, `[filho]` and the Versión Biblia Libre's
 * `(también de 4.500 codos)` pass, while `[32:2]`, `(H2-1)` and a bare `[12]` stop the build.
 * `{32:2}`, `(H 2-1)` and a bare `32:2` would all go through, and a chapter heading in running
 * prose has no bracket at all, so nothing here would see one.
 *
 * It is worth having because the two notations are close cousins and a third is likely to be
 * another. It is not a general check for editorial material, and there is no such check: what
 * found the chapter headings in the Riveduta was reading the text. `source-defects.ts` carries
 * what reading it turned up.
 *
 * Two patterns, each refusing its own delimiter inside itself, so every pair is weighed on its
 * own. One pattern that accepted either delimiter — `/[[(]([^\])]{0,12})[\])]/` — scanned left
 * to right without overlapping, so an earlier `(` paired with a later `]`: in `(siehe [12])` the
 * match was `(siehe [12]`, whose inner text holds a space and is waved through, and the `[12]`
 * the scan was looking for was consumed on the way past and never examined.
 */
const BRACKETED = [/\[([^[\]]{0,12})\]/g, /\(([^()]{0,12})\)/g];

function editorialNumbersIn(text: string): string[] {
  return BRACKETED.flatMap((pattern) =>
    [...text.matchAll(pattern)]
      .filter(([, inner = '']) => {
        // A pair holding a number and no space is a marker a rule above did not know. A pair
        // holding nothing at all is what a nested marker leaves behind — `[[32:2]]` becomes
        // `[ ]` — and is just as much a thing no translator wrote.
        const empty = inner.trim() === '';
        return empty || (/\d/.test(inner) && !/\s/.test(inner));
      })
      .map(([group]) => group),
  );
}

/**
 * Pilcrows start a paragraph in these editions and the app has no place for them, so they go.
 *
 * Square brackets stay. They are not typography: they mark words the translators supplied rather
 * than found in the Greek or Hebrew — the convention printed Bibles set in italics, and in the
 * source they are an explicit `\added` element. Dropping them would present a translator's own
 * additions as original text, in 45.8% of the KJV and 15.6% of the Bíblia Livre, so every copy
 * this build distributes keeps them exactly where the translators put them.
 */
function cleanVerseText(text: string): string {
  return (
    text
      .replace(/¶\s*/g, '')
      // Colon spacing. Some editions set a psalm's superscription against its first words with no
      // space at all, and others leave the space on the wrong side of the colon. Both read as
      // mistakes, and neither is about the wording: the colon keeps its place, only the space
      // moves. Letters only, so `:)` — which the KJV uses forty times — is left exactly as it is.
      .replace(/\s+:/g, ': ')
      .replace(/:(?=\p{L})/gu, ': ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

export function importEbibleVerseLines(
  text: string,
  translationId: TranslationId,
  provenance: DatasetProvenance,
): TranslationTextFile {
  // The credit travels in the file: it is served on its own and kept on readers' devices.
  const manifest = getTranslationManifest(translationId);
  const versification = CANONICAL_VERSIFICATION;
  const verses = new Array<string | undefined>(versification.verseCount).fill(undefined);
  /** Verses the edition numbers differently, whose own number was taken out of the text. */
  const renumbered: VerseIndex[] = [];
  const defects = defectsFor(translationId);
  /** Verses an entry in `source-defects.ts` took something out of. */
  const corrected: VerseIndex[] = [];
  /** Lines of books outside the canon, by the book's name. */
  const skipped = new Map<string, number>();

  stripByteOrderMark(text)
    .split(/\r?\n/)
    .forEach((line, offset) => {
      if (line.trim() === '') {
        return;
      }
      const lineNumber = offset + 1;
      const match = VERSE_LINE_PATTERN.exec(line);
      if (!match) {
        throw new Error(
          `${translationId} line ${lineNumber}: unrecognized format: "${line.slice(0, 80)}".`,
        );
      }
      const [, code = '', chapter = '', verse = '', verseText = ''] = match;
      const outside = BOOKS_OUTSIDE_THE_CANON.get(code);
      if (outside !== undefined) {
        skipped.set(outside, (skipped.get(outside) ?? 0) + 1);
        return;
      }
      const book = BOOK_IDS_BY_CODE.get(code);
      if (book === undefined) {
        throw new Error(`${translationId} line ${lineNumber}: unknown book code "${code}".`);
      }
      const ref = { book, chapter: Number(chapter), verse: Number(verse) };
      const index = versification.indexOf(ref);
      if (index === undefined) {
        // Translations that number verses differently (e.g. the World English Bible moves the
        // doxology of Romans) need a mapping before they can be added.
        throw new Error(
          `${translationId} line ${lineNumber}: ${toOsisId(ref)} is not in the KJV versification.`,
        );
      }
      if (verses[index] !== undefined) {
        throw new Error(`${translationId} line ${lineNumber}: duplicate verse ${toOsisId(ref)}.`);
      }
      const osisId = toOsisId(ref);
      const defect = defects.get(osisId);
      let sourceText = verseText;
      if (defect !== undefined && sourceText.includes(defect.remove)) {
        sourceText = sourceText.replaceAll(defect.remove, '');
        corrected.push(index);
      }
      const withoutSourceNumber = sourceText.replace(SOURCE_VERSE_NUMBER, ' ');
      if (withoutSourceNumber !== sourceText) {
        renumbered.push(index);
      }
      const leftOver = editorialNumbersIn(withoutSourceNumber);
      if (leftOver.length > 0) {
        throw new Error(
          `${translationId} line ${lineNumber}: ${toOsisId(ref)} still carries ` +
            `${leftOver.join(', ')} after the edition's own verse numbers were taken out. ` +
            `If that is the editor's numbering in a notation this importer does not know, add ` +
            `it to SOURCE_VERSE_NUMBER; if it is part of the translation, widen BRACKETED so it ` +
            `is not mistaken for a number.`,
        );
      }
      const cleaned = cleanVerseText(withoutSourceNumber);
      if (cleaned === '' && withoutSourceNumber !== sourceText) {
        // Only where a verse number is what emptied it. That verse would otherwise reach the
        // blank-verse check and be reported as one the manuscripts omit, sending the reader
        // after a numbering fault in a translation that has none. A verse emptied by anything
        // else — a line holding nothing but a pilcrow — really is blank, and that check is
        // right about it.
        throw new Error(
          `${translationId} line ${lineNumber}: ${osisId} was emptied by this import — its ` +
            `whole text, "${verseText.slice(0, 60)}", was taken for the edition's own verse ` +
            `number.`,
        );
      }
      verses[index] = cleaned;
    });

  // A correction that matched nothing is the one way this list can lie: a `remove` string with
  // a typo in it never applies, the defect ships, and the entry reads as though it had been
  // handled. The pin cannot catch that — it guards the source, and this is a mistake in the
  // list. Every verse is required to be present, so a defect's verse was certainly visited;
  // if it was not corrected, the text it names is not there.
  if (corrected.length !== defects.size) {
    const applied = new Set(corrected.map((index) => toOsisId(versification.refAt(index))));
    const unapplied = [...defects.keys()].filter((osisId) => !applied.has(osisId));
    throw new Error(
      `${translationId}: ${String(unapplied.length)} correction(s) in source-defects.ts matched ` +
        `nothing (${unapplied.join(', ')}). Either the text to remove is mistyped, or the ` +
        `upstream file has been fixed and the entry should go.`,
    );
  }

  // The deuterocanon: a translation either carries all of it or none of it, and its manifest
  // says which. A file that disagrees with its manifest is refused, so a text that gained the
  // books upstream is noticed rather than silently shipped without them (or, the other way,
  // shipped with its deuterocanon blank and reported as omitted verses).
  const absentBooks = DEUTEROCANONICAL_BOOKS.filter((book) => {
    const range = versification.bookRange(book.id);
    const present = verses.slice(range.start, range.end + 1).some((text) => text !== undefined);
    if (present && !manifest.deuterocanon) {
      throw new Error(
        `${translationId}: the file carries ${book.name}, but the translation's manifest says ` +
          `it has no deuterocanon. If it has gained the books, set \`deuterocanon: true\` and ` +
          `grant the gaps its numbering leaves in OMISSIONS_ALLOWED.`,
      );
    }
    if (!present && manifest.deuterocanon) {
      throw new Error(
        `${translationId}: ${book.name} is missing, but the translation's manifest says it ` +
          `carries the deuterocanon.`,
      );
    }
    return !present;
  });
  const absent = new Uint8Array(versification.verseCount);
  for (const book of absentBooks) {
    const range = versification.bookRange(book.id);
    absent.fill(1, range.start, range.end + 1);
  }

  const missing: VerseIndex[] = [];
  const complete = verses.map((verseText, index) => {
    if (verseText === undefined && absent[index] !== 1) {
      missing.push(index);
    }
    return verseText ?? '';
  });
  const osisIdAt = (index: VerseIndex) => toOsisId(versification.refAt(index));
  if (missing.length > 0) {
    throw new Error(
      `${translationId}: ${missing.length} verses are missing, ` +
        `e.g. ${missing.slice(0, 5).map(osisIdAt).join(', ')}.`,
    );
  }

  // No notice for the books the translation lacks: its manifest already says so, and the
  // verses are left empty rather than reported as omitted.
  const notices: ImportNotice[] = [];
  for (const [name, count] of skipped) {
    notices.push(
      createNotice(
        'info',
        `${name} is in the source but not in the canon here, so its ${String(count)} verses were left out.`,
        [name],
      ),
    );
  }
  if (corrected.length > 0) {
    notices.push(
      createNotice(
        'info',
        'Text that is not the translation’s, taken out of these verses: see ' +
          'scripts/data/lib/source-defects.ts for what was removed from each and why.',
        corrected.map(osisIdAt),
      ),
    );
  }
  if (renumbered.length > 0) {
    notices.push(
      createNotice(
        'info',
        'The edition numbers these verses differently from the KJV numbering used here, and ' +
          'its own number has been removed from the text.',
        renumbered.map(osisIdAt),
      ),
    );
  }
  notices.push(
    ...omittedVerseNotices(
      translationId,
      complete.flatMap((verseText, index) =>
        verseText === '' && absent[index] !== 1 ? [osisIdAt(index)] : [],
      ),
    ),
  );
  return {
    format: 'translation-text',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: versification.id,
    provenance,
    license: manifest.license,
    attribution: manifest.attribution,
    notices,
    translationId,
    verses: complete,
  };
}
