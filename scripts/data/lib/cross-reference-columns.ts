import type { VerseIndex } from '../../../src/core/bible/verse-ref.ts';
import type { Versification } from '../../../src/core/bible/versification.ts';
import type { CrossReferenceColumns } from '../../../src/core/datasets/formats.ts';

/** One link as an importer collects it, before the columns are laid out. */
export interface VerseLink {
  readonly from: VerseIndex;
  readonly targetStart: VerseIndex;
  readonly targetEnd: VerseIndex;
  /** Community votes for OpenBible; a confidence or similarity weight for the other sources. */
  readonly votes: number;
}

/** Source verse first, then the best-supported link, then the target's position. */
export function compareLinks(a: VerseLink, b: VerseLink): number {
  return (
    a.from - b.from ||
    b.votes - a.votes ||
    a.targetStart - b.targetStart ||
    a.targetEnd - b.targetEnd
  );
}

/** The key two links are the same by: one source verse to one target range. */
export function linkKey(link: Pick<VerseLink, 'from' | 'targetStart' | 'targetEnd'>): string {
  return `${String(link.from)}:${String(link.targetStart)}:${String(link.targetEnd)}`;
}

/**
 * Lays links out in the compressed-sparse-row layout the dataset files use: sorted by source
 * verse, with `offsets[v]` to `offsets[v + 1] - 1` the links of verse `v`. The input is sorted
 * in place.
 */
export function buildCrossReferenceColumns(
  links: VerseLink[],
  versification: Versification,
): CrossReferenceColumns {
  links.sort(compareLinks);
  const offsets = new Array<number>(versification.verseCount + 1).fill(0);
  for (const link of links) {
    offsets[link.from + 1] = (offsets[link.from + 1] ?? 0) + 1;
  }
  for (let verse = 0; verse < versification.verseCount; verse += 1) {
    offsets[verse + 1] = (offsets[verse + 1] ?? 0) + (offsets[verse] ?? 0);
  }
  return {
    offsets,
    targetStart: links.map((link) => link.targetStart),
    targetEnd: links.map((link) => link.targetEnd),
    votes: links.map((link) => link.votes),
  };
}
