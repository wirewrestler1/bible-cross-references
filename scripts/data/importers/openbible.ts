import type { CrossReferencesFile, DatasetProvenance } from '../../../src/core/datasets/formats.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { importVerseLinkRows } from './verse-link-rows.ts';

/**
 * Importer for the OpenBible.info cross-reference dataset
 * (https://www.openbible.info/labs/cross-references/).
 *
 * Format: a TSV file whose header is `From Verse<TAB>To Verse<TAB>Votes<TAB>#… CC-BY <date>`,
 * followed by rows like `Gen.1.1<TAB>Rom.1.19-Rom.1.20<TAB>59`. Sources are single verses;
 * targets are a verse or an inclusive range; votes are integers and may be negative. The
 * reading is shared with the other row files (see `verse-link-rows.ts`); what is OpenBible's own
 * is the remap below and the tolerance for its few duplicate rows.
 */

/** Verse IDs used by OpenBible that do not exist in the KJV versification. */
const VERSE_REMAPS: ReadonlyMap<string, string> = new Map([
  // Some modern editions split 3 John 1:14 into verses 14 and 15; the KJV versification does not.
  ['3John.1.15', '3John.1.14'],
]);

export function importOpenBibleCrossReferences(
  text: string,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importVerseLinkRows(text, {
    sourceId: 'openbible',
    kind: LINK_KINDS.tsk,
    column: 'Votes',
    remaps: VERSE_REMAPS,
    strict: false,
    provenance,
  });
}
