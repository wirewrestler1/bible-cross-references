import type { CrossReferenceSourceId } from '../core/datasets/ids.ts';
import type { CrossReferenceSourceManifest } from './source-manifest.ts';

const CROSS_REFERENCE_SOURCES: Readonly<
  Record<CrossReferenceSourceId, CrossReferenceSourceManifest>
> = {
  orthodox: {
    id: 'orthodox',
    name: 'Cross-references of the Orthodox canon',
    description:
      'Every source merged into one dataset, each link carrying its kind: OpenBible.info’s ' +
      'Treasury links across the 66 books, the Swedish Bible 1917’s apparatus, the curated ' +
      'deuterocanon links and the computed similarity links. Where two sources share a link ' +
      'the Treasury’s is kept, then the curated, then the Swedish, then the computed.',
    // The strictest licence among the parts: OpenBible's and the curated list's CC BY 4.0.
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution:
      'Cross-reference data: OpenBible.info (CC BY 4.0), largely from the public-domain ' +
      'Treasury of Scripture Knowledge; the apparatus of the Swedish Bible 1917 (public ' +
      'domain, CrossWire’s Swe1917 module); curated deuterocanon cross-references © 2026 ' +
      'Andrew Battaglia (CC BY 4.0); and similarity links computed from the World English ' +
      'Bible (CC0). Modified: re-indexed to this app’s verse numbering and merged.',
    homepage: 'https://github.com/wirewrestler1/bible-cross-references',
    versification: 'kjv-dc',
    enabledByDefault: true,
  },
  openbible: {
    id: 'openbible',
    name: 'OpenBible.info Cross References',
    description:
      'About 345,000 cross-references, drawn mostly from the public-domain Treasury of ' +
      'Scripture Knowledge and ranked by community votes.',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution:
      'Cross-reference data: OpenBible.info (CC BY 4.0), largely from the public-domain ' +
      'Treasury of Scripture Knowledge. Modified: re-indexed to KJV verse numbering.',
    homepage: 'https://www.openbible.info/labs/cross-references/',
    versification: 'kjv-dc',
    enabledByDefault: false,
  },
  swe1917: {
    id: 'swe1917',
    name: 'Swedish Bible 1917 cross-references',
    description:
      'The parallel-passage apparatus of the Swedish Bible of 1917 with its Apocrypha of 1921, ' +
      'from CrossWire’s Swe1917 module: about 11,000 references, some 2,800 of them into or ' +
      'out of the deuterocanon, where no other open compilation reaches.',
    license: {
      name: 'Public domain',
      url: 'https://crosswire.org/sword/modules/ModInfo.jsp?modName=Swe1917',
      publicDomain: true,
    },
    attribution:
      'Cross-reference data: the apparatus of the Swedish Bible 1917 (Apocrypha 1921), public ' +
      'domain, from CrossWire’s Swe1917 module (v2.0.1, text by Projekt Runeberg). Modified: ' +
      're-indexed to this app’s verse numbering; references into chapters the edition numbers ' +
      'differently are left out.',
    homepage: 'https://crosswire.org/sword/modules/ModInfo.jsp?modName=Swe1917',
    versification: 'kjv-dc',
    enabledByDefault: false,
  },
  curated: {
    id: 'curated',
    name: 'Curated deuterocanon cross-references',
    description:
      'About 1,200 links compiled for this app: New Testament quotations and allusions to ' +
      'the deuterocanon, the deuterocanon’s own retellings and quotations of the Old Testament, ' +
      'and the parallels between the deuterocanonical books. Each is weighted 10 (quotation or ' +
      'unmistakable allusion), 5 (probable allusion) or 2 (thematic parallel), and every ' +
      'address was checked against the World English Bible.',
    license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
    attribution:
      'Cross-reference data: curated deuterocanon cross-references, © 2026 Andrew Battaglia, ' +
      'licensed under CC BY 4.0.',
    homepage: 'https://github.com/wirewrestler1/bible-cross-references',
    versification: 'kjv-dc',
    enabledByDefault: false,
  },
  computed: {
    id: 'computed',
    name: 'Computed similarity links',
    description:
      'About 8,000 links from the verses of the deuterocanon to the verses whose words are most ' +
      'like theirs, found by TF-IDF cosine similarity over the World English Bible (the best ' +
      'five per verse scoring at least 0.5, less any link the other sources already have). The ' +
      'weight is the score times ten. A computed link says the words are alike, not that the ' +
      'passages are related.',
    license: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
    attribution:
      'Cross-reference data: similarity links computed from the World English Bible by ' +
      'scripts/data/compute-similarity.ts, dedicated to the public domain (CC0).',
    homepage: 'https://github.com/wirewrestler1/bible-cross-references',
    versification: 'kjv-dc',
    enabledByDefault: false,
  },
};

export const CROSS_REFERENCE_SOURCE_MANIFESTS: readonly CrossReferenceSourceManifest[] =
  Object.values(CROSS_REFERENCE_SOURCES);

/** The manifest for a cross-reference source, by id. */
export function getCrossReferenceSourceManifest(
  id: CrossReferenceSourceId,
): CrossReferenceSourceManifest {
  return CROSS_REFERENCE_SOURCES[id];
}
