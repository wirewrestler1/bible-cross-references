import { BOOKS, type BookId } from '../../core/bible/books.ts';
import { GENRES, getBookGenre, getGenreBooks } from '../../core/bible/genres.ts';
import type { GenreId } from '../../core/bible/genres.ts';
import type { VerseIndexRange, Versification } from '../../core/bible/versification.ts';
import type { BookNames } from '../../i18n/books/types.ts';
import { elementAt } from '../../core/lib/array.ts';
import { GENRE_HEX } from '../shared/palette.ts';
import { verseToAlong, type ArcLayout } from './arc-layout.ts';
import type { AxisView } from './axis-view.ts';

export interface AxisPaint {
  readonly layout: ArcLayout;
  readonly view: AxisView;
  readonly versification: Versification;
  /** Book and genre names in the reader's language: the axis is read, not only looked at. */
  readonly names: BookNames;
  readonly genreNames: Readonly<Record<GenreId, string>>;
  readonly focus: VerseIndexRange | null;
  readonly hover: VerseIndexRange | null;
  /** A passage a previewed link points to: a band quieter than hover's, under the focus. */
  readonly passage: VerseIndexRange | null;
  /** How much of the axis has arrived, 0–1, from its start; 1 (or absent) is the whole of it. */
  readonly reveal?: number;
  /**
   * Books to name whatever their room (by their abbreviations, each as near its place as the
   * last allows): the ones a passage reaches, on a small picture where few names would fit.
   */
  readonly marked?: ReadonlySet<BookId>;
}

const TEXT = '#e8e6df';
const MUTED = 'rgb(232 230 223 / 0.55)';
/** The focus: the one warm light on the axis, the colour of the mark. */
const FOCUS = '#f1b24a';
/** The axis itself is barely there; the books are the light along it. */
const AXIS = 'rgb(232 230 223 / 0.14)';
const BAR_OFFSET = 3;
const BAR_THICKNESS = 6;
/** How far a book's light spreads past its bar, in px. */
const BAR_GLOW = 6;
const LABEL_FONT = '500 10.5px system-ui, -apple-system, "Segoe UI", sans-serif';
const GENRE_FONT = '600 10px system-ui, -apple-system, "Segoe UI", sans-serif';

/**
 * Fills a rectangle given in along/across coordinates. "Across" values grow away from the arcs:
 * downward when the axis is horizontal, leftward (mirrored around the axis) when it is vertical.
 */
function fillAlong(
  context: CanvasRenderingContext2D,
  layout: ArcLayout,
  alongFrom: number,
  alongTo: number,
  acrossFrom: number,
  acrossTo: number,
): void {
  if (layout.orientation === 'horizontal') {
    context.fillRect(alongFrom, acrossFrom, alongTo - alongFrom, acrossTo - acrossFrom);
    return;
  }
  const mirroredLeft = 2 * layout.baseline - acrossTo;
  context.fillRect(mirroredLeft, alongFrom, acrossTo - acrossFrom, alongTo - alongFrom);
}

/**
 * Paints the axis overlay: genre-colored book bars, chapter ticks, labels that fit, the hover and
 * focus markers, and an overview strip with the visible window when zoomed in.
 */
export function paintAxis(context: CanvasRenderingContext2D, paint: AxisPaint): void {
  const { layout, view, versification } = paint;
  context.clearRect(0, 0, layout.width, layout.height);
  const along = (verse: number) => verseToAlong(layout, view, verse);
  const visible = (from: number, to: number) => to >= layout.axisStart && from <= layout.axisEnd;
  const clampAlong = (value: number) => Math.min(Math.max(value, layout.axisStart), layout.axisEnd);
  const barFrom = layout.baseline + BAR_OFFSET;
  const barTo = barFrom + BAR_THICKNESS;
  // Arriving: only the part of the axis up to here has lit, with a bright edge at the front.
  const reveal = paint.reveal ?? 1;
  const lit = layout.axisStart + (layout.axisEnd - layout.axisStart) * reveal;

  // Axis line.
  context.fillStyle = AXIS;
  fillAlong(context, layout, layout.axisStart, lit, layout.baseline, layout.baseline + 1);

  // The books, as light along the axis: each bar casts a little of its colour around it, and
  // alternate books of a genre are dimmer so neighbours stay distinguishable.
  for (const book of BOOKS) {
    const range = versification.bookRange(book.id);
    const from = along(range.start);
    const to = along(range.end + 1);
    if (!visible(from, to) || from > lit) continue;
    const gap = to - from > 4 ? 1 : 0;
    const color = elementAt(GENRE_HEX, getBookGenre(book.id).ordinal);
    context.globalAlpha = book.ordinal % 2 === 0 ? 0.95 : 0.7;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = BAR_GLOW;
    fillAlong(
      context,
      layout,
      clampAlong(from) + gap,
      Math.min(clampAlong(to) - gap, lit),
      barFrom,
      barTo,
    );
  }
  context.shadowBlur = 0;
  context.globalAlpha = 1;
  if (reveal < 1) {
    // The front of the sweep: a point of the mark's gold, with a glow.
    context.fillStyle = FOCUS;
    context.shadowColor = FOCUS;
    context.shadowBlur = 16;
    fillAlong(context, layout, lit - 2, lit + 2, barFrom - 3, barTo + 3);
    context.shadowBlur = 0;
    context.globalAlpha = reveal;
  }

  // Chapters, as faint points under the books, once they are wide enough to tell apart.
  const chapterPixels = ((layout.axisEnd - layout.axisStart) / (view.end - view.start)) * 26;
  if (chapterPixels > 10) {
    context.fillStyle = MUTED;
    for (const book of BOOKS) {
      for (let chapter = 1; chapter <= versification.chapterCountOf(book.id); chapter += 1) {
        const start = versification.chapterRange(book.id, chapter)?.start ?? 0;
        const position = along(start);
        if (position >= layout.axisStart && position <= layout.axisEnd) {
          fillAlong(context, layout, position, position + 1.5, barTo + 2, barTo + 3.5);
        }
      }
    }
  }

  const highlight = (range: VerseIndexRange | null, color: string, width: number, glow: number) => {
    if (!range) return;
    const from = along(range.start);
    const to = along(range.end + 1);
    if (!visible(from, to)) return;
    context.fillStyle = color;
    context.shadowColor = color;
    context.shadowBlur = glow;
    const center = (clampAlong(from) + clampAlong(to)) / 2;
    const half = Math.max((clampAlong(to) - clampAlong(from)) / 2, width);
    fillAlong(context, layout, center - half, center + half, barFrom - 2, barTo + 2);
    context.shadowBlur = 0;
  };
  highlight(paint.passage, 'rgb(232 230 223 / 0.3)', 1.5, 0);
  highlight(paint.hover, 'rgb(232 230 223 / 0.5)', 1.5, 4);
  // The focus glows warm: the one light on the axis that is not a genre's.
  highlight(paint.focus, FOCUS, 2, 14);

  paintBookLabels(context, paint, along);
  if (layout.orientation === 'horizontal') {
    paintGenreLabels(context, paint, along);
  }
  paintOverview(context, paint);
  context.globalAlpha = 1;
}

function paintBookLabels(
  context: CanvasRenderingContext2D,
  { layout, versification, names, focus, hover, passage, marked }: AxisPaint,
  along: (verse: number) => number,
): void {
  const horizontal = layout.orientation === 'horizontal';
  const labelOffset = BAR_OFFSET + BAR_THICKNESS;
  // Vertical axis: labels sit left of the bar, in the band between the stage edge and the axis.
  const sideRoom = layout.baseline - labelOffset - 8;
  context.font = LABEL_FONT;
  context.letterSpacing = '0.02em';
  context.textBaseline = 'middle';
  context.textAlign = horizontal ? 'center' : 'right';
  const touches = (range: VerseIndexRange | null, start: number, end: number) =>
    range !== null && range.start <= end && range.end >= start;
  // Marked books are named first, in the canon's order, each pushed right of the last name
  // when its own place is taken; the rest are named only where they fit between them.
  const taken: { from: number; to: number }[] = [];
  const free = (from: number, to: number) =>
    taken.every((span) => to + 4 < span.from || from - 4 > span.to);
  let lastMarkedRight = Number.NEGATIVE_INFINITY;

  for (const book of BOOKS) {
    const range = versification.bookRange(book.id);
    const from = Math.max(along(range.start), layout.axisStart);
    const to = Math.min(along(range.end + 1), layout.axisEnd);
    const room = to - from;
    if (room <= 0) continue;
    const short = names[book.id].abbreviation ?? book.id;
    const candidates = [names[book.id].name, short];
    const isMarked = marked?.has(book.id) ?? false;
    let label: string | undefined;
    let center = (from + to) / 2;
    if (isMarked && horizontal) {
      label = candidates.find((text) => context.measureText(text).width + 8 <= room) ?? short;
      const width = context.measureText(label).width;
      center = Math.max(center, lastMarkedRight + width / 2 + 6);
      if (center + width / 2 > layout.axisEnd) continue;
      lastMarkedRight = center + width / 2;
      taken.push({ from: center - width / 2, to: lastMarkedRight });
    } else {
      label = horizontal
        ? candidates.find((text) => context.measureText(text).width + 8 <= room)
        : room >= 12
          ? candidates.find((text) => context.measureText(text).width <= sideRoom)
          : undefined;
      if (label === undefined) continue;
      const width = context.measureText(label).width;
      if (horizontal && !free(center - width / 2, center + width / 2)) continue;
    }
    const isActive =
      isMarked ||
      touches(focus, range.start, range.end) ||
      touches(hover, range.start, range.end) ||
      touches(passage, range.start, range.end);
    context.fillStyle = isActive ? TEXT : MUTED;
    if (horizontal) {
      context.fillText(label, center, layout.baseline + labelOffset + 12);
    } else {
      context.fillText(label, layout.baseline - labelOffset - 5, center);
    }
  }
}

function paintGenreLabels(
  context: CanvasRenderingContext2D,
  { layout, versification, genreNames }: AxisPaint,
  along: (verse: number) => number,
): void {
  context.font = GENRE_FONT;
  context.letterSpacing = '0.08em';
  context.textAlign = 'center';
  const y = layout.baseline + BAR_OFFSET + BAR_THICKNESS + 32;
  for (const genre of GENRES) {
    const books = getGenreBooks(genre.id);
    const first = books[0];
    const last = books.at(-1);
    if (!first || !last) continue;
    const from = Math.max(along(versification.bookRange(first).start), layout.axisStart);
    const to = Math.min(along(versification.bookRange(last).end + 1), layout.axisEnd);
    const label = genreNames[genre.id].toUpperCase();
    if (to - from < context.measureText(label).width + 16) continue;
    const center = (from + to) / 2;
    const textWidth = context.measureText(label).width;
    context.fillStyle = elementAt(GENRE_HEX, genre.ordinal);
    context.fillRect(center - textWidth / 2 - 12, y - 1, 8, 2);
    context.fillStyle = MUTED;
    context.fillText(label, center + 2, y);
  }
}

function paintOverview(
  context: CanvasRenderingContext2D,
  { layout, view, versification }: AxisPaint,
): void {
  const total = versification.verseCount;
  if (view.end - view.start >= total - 0.5) return;
  const horizontal = layout.orientation === 'horizontal';
  const length = horizontal ? layout.width - 64 : layout.height - 64;
  const offset = 32;
  const position = (verse: number) => offset + (verse / total) * length;
  for (const genre of GENRES) {
    const books = getGenreBooks(genre.id);
    const first = books[0];
    const last = books.at(-1);
    if (!first || !last) continue;
    const from = position(versification.bookRange(first).start);
    const to = position(versification.bookRange(last).end + 1);
    context.fillStyle = elementAt(GENRE_HEX, genre.ordinal);
    if (horizontal) context.fillRect(from, 6, to - from, 3);
    else context.fillRect(layout.width - 9, from, 3, to - from);
  }
  context.strokeStyle = FOCUS;
  context.lineWidth = 1;
  const from = position(view.start);
  const to = position(view.end);
  if (horizontal) context.strokeRect(from - 0.5, 2.5, Math.max(to - from, 3) + 1, 10);
  else context.strokeRect(layout.width - 13.5, from - 0.5, 10, Math.max(to - from, 3) + 1);
}

/**
 * A ring that spreads from a passage on the axis and fades as it goes: the moment a reader
 * lands somewhere, so the eye finds it among the arcs. `progress` runs from 0 to 1.
 */
export function paintPulse(
  context: CanvasRenderingContext2D,
  layout: ArcLayout,
  view: AxisView,
  range: VerseIndexRange,
  progress: number,
): void {
  const from = verseToAlong(layout, view, range.start);
  const to = verseToAlong(layout, view, range.end + 1);
  const along = Math.min(Math.max((from + to) / 2, layout.axisStart), layout.axisEnd);
  const across = layout.baseline + BAR_OFFSET + BAR_THICKNESS / 2;
  const [x, y] =
    layout.orientation === 'horizontal' ? [along, across] : [2 * layout.baseline - across, along];
  const radius = 6 + 34 * progress;
  context.save();
  context.globalAlpha = (1 - progress) * 0.8;
  context.strokeStyle = FOCUS;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}
