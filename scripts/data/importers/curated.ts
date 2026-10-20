import type { CrossReferencesFile, DatasetProvenance } from '../../../src/core/datasets/formats.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { importVerseLinkRows } from './verse-link-rows.ts';

/**
 * The weights the curated list may use, and what they mean: a quotation or unmistakable
 * allusion, a probable allusion recognised in the standard indexes, or a thematic parallel.
 * Chosen so that the app's default threshold (4) keeps the first two and the Filters menu can
 * bring in the third.
 */
export const CURATED_WEIGHTS: Readonly<Record<'quotation' | 'allusion' | 'parallel', number>> = {
  quotation: 10,
  allusion: 5,
  parallel: 2,
};

/**
 * Importer for `data/curated/deuterocanon-cross-references.tsv`, the hand-compiled links into
 * and out of the deuterocanon. Same shape as OpenBible's file with `Weight` for `Votes`, and
 * held to a stricter standard: an unknown verse, a weight off the scale, a duplicate row or a
 * link to its own verse stops the build, so the file is corrected rather than silently trimmed.
 */
export function importCuratedCrossReferences(
  text: string,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importVerseLinkRows(text, {
    sourceId: 'curated',
    kind: LINK_KINDS.curated,
    column: 'Weight',
    allowedValues: new Set(Object.values(CURATED_WEIGHTS)),
    strict: true,
    provenance,
  });
}
