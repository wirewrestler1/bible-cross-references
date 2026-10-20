/**
 * The visible window of the verse axis, in continuous verse-index units: verse `v` occupies
 * `[v, v + 1)`. Zooming and panning always keep the window inside `[0, total]`.
 */
export interface AxisView {
  readonly start: number;
  readonly end: number;
}

/** The narrowest window, in verses, so that single verses stay comfortably wide. */
export const MIN_VIEW_SPAN = 24;

export function fullView(total: number): AxisView {
  return { start: 0, end: total };
}

export function clampView(view: AxisView, total: number, minSpan = MIN_VIEW_SPAN): AxisView {
  const span = Math.min(Math.max(view.end - view.start, Math.min(minSpan, total)), total);
  const start = Math.min(Math.max(view.start, 0), total - span);
  return { start, end: start + span };
}

/** Zooms by `factor` (> 1 zooms in) keeping the verse at `anchor` under the pointer. */
export function zoomView(view: AxisView, factor: number, anchor: number, total: number): AxisView {
  const span = view.end - view.start;
  const nextSpan = Math.min(Math.max(span / factor, MIN_VIEW_SPAN), total);
  const anchorShare = span > 0 ? (anchor - view.start) / span : 0.5;
  const start = anchor - anchorShare * nextSpan;
  return clampView({ start, end: start + nextSpan }, total);
}

export function panView(view: AxisView, deltaVerses: number, total: number): AxisView {
  return clampView({ start: view.start + deltaVerses, end: view.end + deltaVerses }, total);
}

/** Moves the window (keeping its span) so that `[start, end]` is visible, centered if needed. */
export function revealRange(view: AxisView, start: number, end: number, total: number): AxisView {
  if (start >= view.start && end <= view.end) {
    return view;
  }
  const span = view.end - view.start;
  const center = (start + end) / 2;
  return clampView({ start: center - span / 2, end: center + span / 2 }, total);
}

/** Linear interpolation between two views, for animations. */
export function interpolateView(from: AxisView, to: AxisView, progress: number): AxisView {
  return {
    start: from.start + (to.start - from.start) * progress,
    end: from.end + (to.end - from.end) * progress,
  };
}

/** Room around a fitted range, as a share of its span on each side. */
const FIT_MARGIN = 0.08;
/** A fitted window is never narrower than this many verses: a lone verse still shows its chapter. */
const FIT_MIN_SPAN = 120;

/**
 * The window that fits a range with a little room around it: a verse's reach, so its arcs are
 * large and the books they land in are named on the axis. Never narrower than a chapter or so,
 * never wider than the axis.
 */
export function fitRange(start: number, end: number, total: number): AxisView {
  const span = Math.max(end - start, FIT_MIN_SPAN);
  const center = (start + end) / 2;
  const half = (span * (1 + 2 * FIT_MARGIN)) / 2;
  return clampView({ start: center - half, end: center + half }, total);
}

/**
 * How far a passage reaches: itself and every end of its links, from the arcs' endpoints
 * (source and target positions along the axis, in verse units). A passage with no links
 * reaches only itself.
 */
export function reachOf(
  range: { readonly start: number; readonly end: number },
  endpoints: Iterable<number>,
): { readonly start: number; readonly end: number } {
  let start = range.start;
  let end = range.end + 1;
  for (const at of endpoints) {
    if (at < start) start = at;
    if (at > end) end = at;
  }
  return { start, end };
}
