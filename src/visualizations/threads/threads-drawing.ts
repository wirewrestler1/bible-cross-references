import { type BookId } from '../../core/bible/books.ts';
import type { VerseIndex } from '../../core/bible/verse-ref.ts';
import type { VerseIndexRange } from '../../core/bible/versification.ts';
import { elementAt } from '../../core/lib/array.ts';
import type { Connection } from '../shared/connections.ts';
import { GENRE_HEX } from '../shared/palette.ts';
import { LINK_KINDS } from '../../core/datasets/link-kinds.ts';
import { voteWeight } from '../shared/vote-weight.ts';
import type { SpineLayout } from './spine-layout.ts';
import type { BookNames } from '../../i18n/books/types.ts';

/** Where a verse of the reading pane sits, relative to the canvas top. */
export interface VerseAnchor {
  readonly verse: VerseIndex;
  readonly y: number;
}

export interface ThreadsDrawing {
  readonly width: number;
  readonly height: number;
  /** Width of the thread area; the spine bar starts right after it. */
  readonly gutterWidth: number;
  readonly compact: boolean;
  readonly spine: SpineLayout;
  readonly anchors: readonly VerseAnchor[];
  readonly connectionsByVerse: ReadonlyMap<VerseIndex, readonly Connection[]>;
  readonly verseGenres: Uint8Array;
  /** Book names in the reader's language: the spine is read, not only looked at. */
  readonly names: BookNames;
  /** The chapter being read ("you are here" on the spine). */
  readonly chapter: VerseIndexRange;
  /** A hovered or selected verse whose threads stand out. */
  readonly emphasizedVerse: VerseIndex | null;
  /** A hovered book on the spine whose incoming threads stand out. */
  readonly emphasizedBook: BookId | null;
  /** A link pointed at in the details panel: it alone stands out. */
  readonly emphasizedLink: number | null;
  /** How far the threads have drawn themselves from the verses, 0–1; 1 (or absent) is all. */
  readonly reveal?: number;
}

const TEXT = '#e8e6df';
const MUTED = 'rgb(232 230 223 / 0.55)';
/** The chapter's own place on the spine: the one warm light, the colour of the mark. */
const HERE = '#f1b24a';
/** How far a book's light spreads past its stretch of the spine, in px. */
const SPINE_GLOW = 5;
const LABEL_FONT = '500 10px system-ui, -apple-system, "Segoe UI", sans-serif';

/** Horizontal position of the spine bar and its width. */
export function spineBar(drawing: Pick<ThreadsDrawing, 'gutterWidth' | 'compact'>): {
  readonly left: number;
  readonly width: number;
} {
  return { left: drawing.gutterWidth + 2, width: drawing.compact ? 6 : 8 };
}

/** Draws the threads from the visible verses to the spine, then the spine itself. */
export function drawThreads(context: CanvasRenderingContext2D, drawing: ThreadsDrawing): void {
  context.clearRect(0, 0, drawing.width, drawing.height);
  drawConnections(context, drawing);
  drawSpine(context, drawing);
}

function drawConnections(context: CanvasRenderingContext2D, drawing: ThreadsDrawing): void {
  const { spine, gutterWidth, emphasizedVerse, emphasizedBook, emphasizedLink } = drawing;
  const bar = spineBar(drawing);
  const hasEmphasis =
    emphasizedVerse !== null || emphasizedBook !== null || emphasizedLink !== null;
  const landsInBook = (connection: Connection) =>
    emphasizedBook !== null &&
    spine.segments.some(
      (segment) =>
        segment.book === emphasizedBook &&
        connection.otherStart >= segment.start &&
        connection.otherStart <= segment.end,
    );

  const threads: {
    y: number;
    target: number;
    color: string;
    alpha: number;
    emphasized: boolean;
    kind: number;
    order: number;
  }[] = [];
  for (const anchor of drawing.anchors) {
    for (const connection of drawing.connectionsByVerse.get(anchor.verse) ?? []) {
      const emphasized =
        emphasizedLink !== null
          ? connection.link.id === emphasizedLink
          : anchor.verse === emphasizedVerse || landsInBook(connection);
      const weight = voteWeight(connection.link.votes);
      const { kind } = connection.link;
      // A computed link says only that the words are alike, so it is drawn faint and dashed;
      // an imported apparatus link or a commentary's reference a little under the Treasury's
      // and the curated ones.
      const kindAlpha =
        kind === LINK_KINDS.computed
          ? 0.45
          : kind === LINK_KINDS.imported || kind === LINK_KINDS.haydock
            ? 0.8
            : 1;
      threads.push({
        y: anchor.y,
        target: spine.yOf((connection.otherStart + connection.otherEnd) / 2),
        color: elementAt(GENRE_HEX, elementAt(drawing.verseGenres, connection.otherStart)),
        alpha:
          (emphasized ? 0.95 : hasEmphasis ? 0.06 + 0.1 * weight : 0.18 + 0.5 * weight) *
          (emphasized ? 1 : kindAlpha),
        emphasized,
        kind,
        order: anchor.verse - drawing.chapter.start,
      });
    }
  }
  // Faint threads first, so emphasized ones are drawn on top.
  threads.sort((a, b) => Number(a.emphasized) - Number(b.emphasized));
  const bend = gutterWidth * 0.55;
  const reveal = drawing.reveal ?? 1;
  const verses = Math.max(1, drawing.chapter.end - drawing.chapter.start + 1);
  for (const thread of threads) {
    // Arriving: each thread grows from its verse toward the spine, the first verses first.
    const stagger = (thread.order / verses) * 0.5;
    const progress = Math.min(Math.max((reveal - stagger) / 0.5, 0), 1);
    if (progress <= 0) continue;
    const length = Math.hypot(bar.left, thread.target - thread.y) * 1.15;
    context.globalAlpha = thread.alpha;
    context.strokeStyle = thread.color;
    context.lineWidth = thread.emphasized ? 1.6 : thread.kind === LINK_KINDS.computed ? 0.75 : 1;
    context.setLineDash(
      progress < 1
        ? [length * progress, length]
        : thread.kind === LINK_KINDS.computed
          ? [3, 3]
          : [],
    );
    context.beginPath();
    context.moveTo(0, thread.y);
    context.bezierCurveTo(
      bend,
      thread.y,
      gutterWidth - bend,
      thread.target,
      bar.left,
      thread.target,
    );
    context.stroke();
    if (progress < 1) continue;
    // A landing tick just left of the spine bar.
    context.fillStyle = thread.color;
    context.fillRect(bar.left - 4, thread.target - 0.5, 4, 1);
  }
  context.setLineDash([]);
  context.globalAlpha = 1;
}

function drawSpine(context: CanvasRenderingContext2D, drawing: ThreadsDrawing): void {
  const { spine, compact, chapter, emphasizedBook } = drawing;
  const bar = spineBar(drawing);
  const labelX = bar.left + bar.width + 5;
  context.font = LABEL_FONT;
  context.textBaseline = 'middle';
  context.textAlign = 'left';

  // The books as light along the spine: each casts a little of its colour, alternate books of
  // a genre dimmer so neighbours stay distinguishable.
  for (const [index, segment] of spine.segments.entries()) {
    const color = elementAt(GENRE_HEX, segment.genreOrdinal);
    context.globalAlpha = index % 2 === 0 ? 0.95 : 0.7;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = SPINE_GLOW;
    context.fillRect(bar.left, segment.top, bar.width, Math.max(segment.bottom - segment.top, 0.5));
  }
  context.shadowBlur = 0;
  context.globalAlpha = 1;
  context.letterSpacing = '0.02em';

  for (const segment of spine.segments) {
    const height = segment.bottom - segment.top;
    const isHovered = segment.book === emphasizedBook;
    if (height < (compact ? 12 : 10) && !isHovered) continue;
    const localized = drawing.names[segment.book];
    const room = drawing.width - labelX - 2;
    const label = [localized.name, localized.abbreviation ?? segment.book].find(
      (text) => context.measureText(text).width <= room,
    );
    if (label === undefined) continue;
    context.fillStyle = isHovered ? TEXT : MUTED;
    context.fillText(label, labelX, (segment.top + segment.bottom) / 2);
  }

  // "You are here": a bracket of gold light around the current chapter.
  const top = spine.yOf(chapter.start) - 2;
  const bottom = Math.max(spine.yOf(chapter.end) + 2, top + 4);
  context.fillStyle = HERE;
  context.shadowColor = HERE;
  context.shadowBlur = 10;
  context.fillRect(bar.left - 3, top, 2, bottom - top);
  context.shadowBlur = 0;
  context.beginPath();
  context.moveTo(bar.left - 3, (top + bottom) / 2 - 4);
  context.lineTo(bar.left - 8, (top + bottom) / 2);
  context.lineTo(bar.left - 3, (top + bottom) / 2 + 4);
  context.fill();
}
