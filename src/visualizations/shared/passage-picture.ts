import type { Passage } from '../../core/bible/passage.ts';
import type { VerseIndexRange } from '../../core/bible/versification.ts';
import type { Connection } from './connections.ts';
import type { VizData } from './viz-data.ts';

/**
 * What a passage's card hands the picture at its top: a small piece of a visualization's own
 * drawing, given by the host (see `Visualization.PassagePicture`), so the card can carry the
 * arcs' picture in every view without the shared code knowing the arcs.
 */
export interface PassagePictureProps {
  readonly data: VizData;
  /** The passage's own links, out and in. */
  readonly connections: readonly Connection[];
  readonly here: VerseIndexRange;
  readonly label: string;
  /** A connection pointed at, in the picture or the list: both show it, and so does the host. */
  readonly pointed: Connection | null;
  readonly onPoint: (connection: Connection | null) => void;
  readonly onSelect: (passage: Passage) => void;
}
