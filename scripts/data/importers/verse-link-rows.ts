import { parseOsisId, type VerseIndex } from '../../../src/core/bible/verse-ref.ts';
import { CANONICAL_VERSIFICATION } from '../../../src/core/bible/versification.ts';
import {
  DATASET_SCHEMA_VERSION,
  type CrossReferencesFile,
  type DatasetProvenance,
  type ImportNotice,
} from '../../../src/core/datasets/formats.ts';
import type { CrossReferenceSourceId } from '../../../src/core/datasets/ids.ts';
import type { LinkKind } from '../../../src/core/datasets/link-kinds.ts';
import { getCrossReferenceSourceManifest } from '../../../src/cross-references/registry.ts';
import {
  buildCrossReferenceColumns,
  linkKey,
  type VerseLink,
} from '../lib/cross-reference-columns.ts';
import { stripByteOrderMark } from '../lib/files.ts';
import { createNotice } from '../lib/notices.ts';

/**
 * Importer for the tab-separated verse-link files: OpenBible.info's
 * `cross_references.txt`, and the curated and computed lists this repository keeps in the same
 * shape (`From Verse<TAB>To Verse<TAB>Votes|Weight`, then one link per row, as in
 * `Gen.1.1<TAB>Rom.1.19-Rom.1.20<TAB>59`). Sources are single verses; targets are a verse or an
 * inclusive range.
 *
 * The third column is whatever the source says it is — community votes for OpenBible, which
 * may be negative, a confidence for the curated list — and the options say which, and which
 * values are allowed. OpenBible's file has a few things a compiled file never should (verse ids
 * outside the KJV numbering, and duplicate rows), which are repaired and reported; a file
 * written by hand for this repository is held to a stricter standard and refused outright, so
 * that a wrong address is fixed in the file rather than quietly dropped at build time.
 */
export interface VerseLinkRowsOptions {
  readonly sourceId: CrossReferenceSourceId;
  /** The kind every link of this file is (see `link-kinds.ts`). */
  readonly kind: LinkKind;
  /** The third column's name in the header, which is also what it means. */
  readonly column: 'Votes' | 'Weight';
  /** Verse ids the source uses that this versification does not have, and where they go. */
  readonly remaps?: ReadonlyMap<string, string>;
  /** The values the third column may hold; anything else is an error. Any integer if absent. */
  readonly allowedValues?: ReadonlySet<number>;
  /** Refuse a duplicate row or a link to its own verse, instead of dropping it with a notice. */
  readonly strict: boolean;
  readonly provenance: Omit<DatasetProvenance, 'snapshotDate'>;
}

const SNAPSHOT_DATE_PATTERN = /\b(\d{4}-\d{2}-\d{2})\b/;

export function importVerseLinkRows(
  text: string,
  options: VerseLinkRowsOptions,
): CrossReferencesFile {
  const {
    sourceId,
    kind,
    column,
    remaps = new Map<string, string>(),
    allowedValues,
    strict,
  } = options;
  const manifest = getCrossReferenceSourceManifest(sourceId);
  const name = manifest.name;
  const versification = CANONICAL_VERSIFICATION;
  const headerPrefix = `From Verse\tTo Verse\t${column}`;
  const [header = '', ...rows] = stripByteOrderMark(text).split(/\r?\n/);
  if (!header.startsWith(headerPrefix)) {
    throw new Error(`${name}: unexpected header "${header.slice(0, 80)}".`);
  }
  const snapshotDate = SNAPSHOT_DATE_PATTERN.exec(header)?.[1] ?? null;

  const remapped: string[] = [];
  const resolveVerse = (osisId: string, lineNumber: number): VerseIndex => {
    const remappedId = remaps.get(osisId);
    if (remappedId !== undefined) {
      remapped.push(`line ${String(lineNumber)}: ${osisId} → ${remappedId}`);
    }
    const ref = parseOsisId(remappedId ?? osisId);
    const index = ref && versification.indexOf(ref);
    if (index === undefined) {
      throw new Error(`${name} line ${String(lineNumber)}: unknown verse "${osisId}".`);
    }
    return index;
  };

  const links: VerseLink[] = [];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const selfLinks: string[] = [];
  let sourceRowCount = 0;
  rows.forEach((row, offset) => {
    if (row.trim() === '') {
      return;
    }
    sourceRowCount += 1;
    const lineNumber = offset + 2;
    const fields = row.split('\t');
    const [fromId = '', targetId = '', valueText = ''] = fields;
    const [targetStartId = '', targetEndId = targetStartId, ...extraRangeParts] =
      targetId.split('-');
    const value = Number(valueText);
    if (fields.length !== 3 || extraRangeParts.length > 0 || !Number.isInteger(value)) {
      throw new Error(`${name} line ${String(lineNumber)}: malformed row "${row}".`);
    }
    if (allowedValues !== undefined && !allowedValues.has(value)) {
      throw new Error(
        `${name} line ${String(lineNumber)}: ${column.toLowerCase()} ${String(value)} is not one ` +
          `of ${[...allowedValues].join(', ')}.`,
      );
    }

    const link: VerseLink = {
      from: resolveVerse(fromId, lineNumber),
      targetStart: resolveVerse(targetStartId, lineNumber),
      targetEnd: resolveVerse(targetEndId, lineNumber),
      votes: value,
      kind,
    };
    if (link.targetStart > link.targetEnd) {
      throw new Error(`${name} line ${String(lineNumber)}: reversed range "${targetId}".`);
    }
    if (link.targetStart <= link.from && link.from <= link.targetEnd) {
      if (strict) {
        throw new Error(`${name} line ${String(lineNumber)}: ${fromId} links to itself.`);
      }
      selfLinks.push(`line ${String(lineNumber)}: ${fromId} → ${targetId}`);
    }
    const key = linkKey(link);
    if (seen.has(key)) {
      if (strict) {
        throw new Error(
          `${name} line ${String(lineNumber)}: duplicate row ${fromId} → ${targetId}.`,
        );
      }
      duplicates.push(`line ${String(lineNumber)}: ${fromId} → ${targetId}`);
      return;
    }
    seen.add(key);
    links.push(link);
  });

  const notices: ImportNotice[] = [];
  if (snapshotDate === null) {
    notices.push(createNotice('warning', 'The header has no snapshot date.', [header]));
  }
  if (remapped.length > 0) {
    notices.push(
      createNotice(
        'info',
        'Verse IDs remapped to the KJV versification (3 John 1:15 is part of 1:14 there).',
        remapped,
      ),
    );
  }
  if (duplicates.length > 0) {
    notices.push(createNotice('warning', 'Duplicate rows dropped (first kept).', duplicates));
  }
  if (selfLinks.length > 0) {
    notices.push(
      createNotice('info', 'Links whose target range contains their own source verse.', selfLinks),
    );
  }

  return {
    format: 'cross-references',
    schemaVersion: DATASET_SCHEMA_VERSION,
    versification: versification.id,
    provenance: { ...options.provenance, snapshotDate },
    notices,
    sourceId,
    sourceRowCount,
    // The credit travels in the file: it is served on its own at a stable URL and kept on
    // readers' devices by the offline cache, so a copy that travels without the app should still
    // say whose data it is and under what licence.
    license: manifest.license,
    attribution: manifest.attribution,
    links: buildCrossReferenceColumns(links, versification),
  };
}
