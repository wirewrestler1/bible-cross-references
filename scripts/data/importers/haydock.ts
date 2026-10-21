import type { CrossReferencesFile, DatasetProvenance } from '../../../src/core/datasets/formats.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { HAYDOCK_WEIGHT } from './haydock-notes.ts';
import { importVerseLinkRows } from './verse-link-rows.ts';

/**
 * Importer for `data/haydock/deuterocanon-cross-references.tsv`, the links
 * `scripts/data/haydock-notes.ts` reads out of Haydock's commentary (see `haydock-notes.ts`).
 * Same rows as the curated list, every link weighted alike, and held to the strict standard:
 * the script writes clean rows, so anything else is a hand edit gone wrong.
 */
export function importHaydockCrossReferences(
  text: string,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importVerseLinkRows(text, {
    sourceId: 'haydock',
    kind: LINK_KINDS.haydock,
    column: 'Weight',
    allowedValues: new Set([HAYDOCK_WEIGHT]),
    strict: true,
    provenance,
  });
}
