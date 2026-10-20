/**
 * What kind of thing a cross-reference is, which says how much to trust it and how the app
 * draws it. Stored per link as the ordinal in this list, so the order is part of the file
 * format and a new kind goes at the end.
 */
export const LINK_KIND_IDS = ['tsk', 'imported', 'curated', 'computed'] as const;
export type LinkKindId = (typeof LINK_KIND_IDS)[number];

/** The ordinal written in a dataset's `kinds` column. */
export type LinkKind = 0 | 1 | 2 | 3;

export const LINK_KINDS: Readonly<Record<LinkKindId, LinkKind>> = {
  /** The Treasury of Scripture Knowledge as OpenBible.info publishes it, ranked by votes. */
  tsk: 0,
  /** A printed apparatus of parallel passages imported whole (the Swedish Bible of 1917). */
  imported: 1,
  /** Compiled for this app, each link weighted by how sure the connection is. */
  curated: 2,
  /** Found by comparing the words of the verses; alike in wording, not necessarily related. */
  computed: 3,
};

export function linkKindId(kind: number): LinkKindId {
  const id = LINK_KIND_IDS[kind];
  if (id === undefined) {
    throw new RangeError(`Unknown link kind: ${String(kind)}`);
  }
  return id;
}

export function isLinkKindId(value: string): value is LinkKindId {
  return LINK_KIND_IDS.some((id) => id === value);
}
