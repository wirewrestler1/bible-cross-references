import type { CrossReferencesFile, DatasetProvenance } from '../../../src/core/datasets/formats.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import { importVerseLinkRows } from './verse-link-rows.ts';

/**
 * Importer for `data/computed/deuterocanon-similarity.tsv`, the links
 * `scripts/data/compute-similarity.ts` writes: the same rows as the curated list, with the
 * weight the cosine score times ten, so the app's threshold means the same across kinds. Held
 * to the same strict standard, since the script writes clean rows and anything else would be a
 * hand edit gone wrong.
 */
export const COMPUTED_WEIGHTS: ReadonlySet<number> = new Set(
  Array.from({ length: 10 }, (_, i) => i + 1),
);

export function importComputedCrossReferences(
  text: string,
  provenance: Omit<DatasetProvenance, 'snapshotDate'>,
): CrossReferencesFile {
  return importVerseLinkRows(text, {
    sourceId: 'computed',
    kind: LINK_KINDS.computed,
    column: 'Weight',
    allowedValues: COMPUTED_WEIGHTS,
    strict: true,
    provenance,
  });
}
