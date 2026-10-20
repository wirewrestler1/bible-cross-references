import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import {
  DATASET_SCHEMA_VERSION,
  type CrossReferencesFile,
  type ImportNotice,
} from '../../../src/core/datasets/formats.ts';
import type { CrossReferenceSourceId } from '../../../src/core/datasets/ids.ts';
import { linkKindId, type LinkKind } from '../../../src/core/datasets/link-kinds.ts';
import { getCrossReferenceSourceManifest } from '../../../src/cross-references/registry.ts';
import { buildCrossReferenceColumns, linkKey, type VerseLink } from './cross-reference-columns.ts';
import { createNotice } from './notices.ts';

/**
 * Merges several cross-reference datasets into one, which is what the app loads: it reads one
 * source, so every kind of link has to travel in the same file, each carrying its kind.
 *
 * The files are taken in order, and a link two of them share (same source verse, same target
 * range) is kept from the first that has it: the Treasury's votes before a curated confidence,
 * the curated list before the Swedish apparatus, and the computed links last of all. The
 * provenance recorded is the first file's — the one pinned download among them — and a notice
 * lists every part with what it contributed, so the file still says where it came from.
 */
export function mergeCrossReferenceFiles(
  sourceId: CrossReferenceSourceId,
  parts: readonly CrossReferencesFile[],
): CrossReferencesFile {
  const [first] = parts;
  if (first === undefined) {
    throw new Error(`${sourceId}: nothing to merge.`);
  }
  const versification = CANONICAL_VERSIFICATION;
  const manifest = getCrossReferenceSourceManifest(sourceId);
  const links: VerseLink[] = [];
  const seen = new Set<string>();
  const contributed: string[] = [];
  const notices: ImportNotice[] = [];
  let sourceRowCount = 0;
  for (const part of parts) {
    sourceRowCount += part.sourceRowCount;
    let kept = 0;
    let dropped = 0;
    const { offsets, targetStart, targetEnd, votes, kinds } = part.links;
    for (let verse = 0; verse < versification.verseCount; verse += 1) {
      for (let id = offsets[verse] ?? 0; id < (offsets[verse + 1] ?? 0); id += 1) {
        const link: VerseLink = {
          from: verse,
          targetStart: targetStart[id] ?? 0,
          targetEnd: targetEnd[id] ?? 0,
          votes: votes[id] ?? 0,
          kind: (kinds[id] ?? 0) as LinkKind,
        };
        const key = linkKey(link);
        if (seen.has(key)) {
          dropped += 1;
          continue;
        }
        seen.add(key);
        links.push(link);
        kept += 1;
      }
    }
    const kind = linkKindId(kinds[0] ?? 0);
    contributed.push(
      `${part.sourceId} (${kind}): ${String(kept)} links` +
        (dropped > 0 ? `, ${String(dropped)} already present from an earlier part` : ''),
    );
    for (const notice of part.notices) {
      notices.push({ ...notice, message: `${part.sourceId}: ${notice.message}` });
    }
  }
  return {
    format: 'cross-references',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: versification.id,
    provenance: first.provenance,
    notices: [
      createNotice('info', 'Merged from these sources, in order of precedence.', contributed),
      ...notices,
    ],
    sourceId,
    sourceRowCount,
    license: manifest.license,
    attribution: manifest.attribution,
    links: buildCrossReferenceColumns(links, versification),
  };
}
