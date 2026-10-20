import { describe, expect, it } from 'vitest';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import type { CrossReferencesFile } from '../../../src/core/datasets/formats.ts';
import { LINK_KINDS } from '../../../src/core/datasets/link-kinds.ts';
import {
  createCrossReferenceColumns,
  PROVENANCE,
  verseIndex,
} from '../../../src/test-utils/fixtures.ts';
import { mergeCrossReferenceFiles } from './merge-cross-references.ts';

const GEN = verseIndex('Gen', 1, 1);
const SIR = verseIndex('Sir', 24, 1);
const JOHN = verseIndex('John', 1, 1);

function part(
  sourceId: CrossReferencesFile['sourceId'],
  links: Parameters<typeof createCrossReferenceColumns>[0],
  overrides: Partial<CrossReferencesFile> = {},
): CrossReferencesFile {
  return {
    format: 'cross-references',
    schemaVersion: 2,
    versification: 'kjv-dc',
    provenance: { ...PROVENANCE, url: `https://example.org/${sourceId}` },
    notices: [],
    sourceId,
    sourceRowCount: links.length,
    links: createCrossReferenceColumns(links),
    ...overrides,
  };
}

describe('mergeCrossReferenceFiles', () => {
  it('keeps every link once, from the first part that has it, with its kind', () => {
    const merged = mergeCrossReferenceFiles('orthodox', [
      part('openbible', [{ from: GEN, to: JOHN, votes: 12, kind: LINK_KINDS.tsk }]),
      part('curated', [
        { from: GEN, to: JOHN, votes: 10, kind: LINK_KINDS.curated },
        { from: SIR, to: GEN, votes: 5, kind: LINK_KINDS.curated },
      ]),
      part('computed', [{ from: SIR, to: JOHN, votes: 6, kind: LINK_KINDS.computed }]),
    ]);
    expect(merged.sourceId).toBe('orthodox');
    expect(merged.sourceRowCount).toBe(4);
    expect(merged.links.votes).toEqual([12, 6, 5]);
    expect(merged.links.kinds).toEqual([LINK_KINDS.tsk, LINK_KINDS.computed, LINK_KINDS.curated]);
    expect(merged.links.offsets).toHaveLength(CANONICAL_VERSIFICATION.verseCount + 1);
    expect(merged.provenance.url).toBe('https://example.org/openbible');
    expect(merged.notices[0]).toMatchObject({
      level: 'info',
      examples: [
        'openbible (tsk): 1 links',
        'curated (curated): 1 links, 1 already present from an earlier part',
        'computed (computed): 1 links',
      ],
    });
  });

  it('carries the parts’ notices, each named for its part', () => {
    const notice = { level: 'info' as const, message: 'Something.', count: 1, examples: ['x'] };
    const merged = mergeCrossReferenceFiles('orthodox', [
      part('openbible', [{ from: GEN, to: JOHN }], { notices: [notice] }),
    ]);
    expect(merged.notices[1]?.message).toBe('openbible: Something.');
  });

  it('refuses nothing to merge', () => {
    expect(() => mergeCrossReferenceFiles('orthodox', [])).toThrow(/nothing to merge/);
  });
});
