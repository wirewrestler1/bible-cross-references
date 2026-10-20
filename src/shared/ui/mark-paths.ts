/**
 * The mark: three arcs rising from a baseline, a cross above them. The arcs are the cross-
 * references; together they make a dome, and the cross on it says whose dome. One source for
 * the favicon (`public/favicon.svg`, kept in step by a test), the page's first frame
 * (`vite/first-frame.ts`) and the header's wordmark (`Mark.tsx`).
 */
export const MARK_VIEWBOX = '0 0 32 32';

export const MARK_PATHS = {
  /** From the outermost in: these draw themselves on the loading frame. */
  arcs: [
    'M3.5 19.5a12.5 12.5 0 0 1 25 0',
    'M8.5 19.5a7.5 7.5 0 0 1 15 0',
    'M12.5 19.5a3.5 3.5 0 0 1 7 0',
  ],
  baseline: 'M3 24h26',
  cross: ['M16 2v4.5', 'M13.75 3.75h4.5'],
} as const;

/** Every stroke of the mark, in drawing order. */
export const MARK_STROKES: readonly string[] = [
  ...MARK_PATHS.arcs,
  MARK_PATHS.baseline,
  ...MARK_PATHS.cross,
];
