import type { VerseIndexRange } from '../../../core/bible/versification.ts';
import { elementAt } from '../../../core/lib/array.ts';
import type { Connection } from '../connections.ts';
import { GENRE_HEX } from '../palette.ts';
import styles from './PassageCard.module.css';

/** The drawing's size in its own units; it scales to the card's width. */
const WIDTH = 320;
const HEIGHT = 64;
const INSET = 10;
const BASELINE = HEIGHT - 10;
/** The tallest arc: a link across the whole canon flattens to this rather than leaving the box. */
const MAX_RISE = BASELINE - 6;
/** More arcs than this and the drawing is a blur; the strongest are kept. */
const MAX_ARCS = 240;

/**
 * The passage's own links, drawn small: the whole canon as a line, the passage as a point of
 * gold on it, and each link as an arc to where it lands, in the colour of the genre there. A
 * piece of the big picture that the card carries with it, so the sheet on a phone shows at its
 * lowest height where the passage reaches.
 */
export function MiniArcs({
  connections,
  here,
  verseCount,
  verseGenres,
  label,
}: {
  readonly connections: readonly Connection[];
  readonly here: VerseIndexRange;
  readonly verseCount: number;
  readonly verseGenres: Uint8Array;
  readonly label: string;
}) {
  const x = (verse: number) => INSET + (verse / verseCount) * (WIDTH - 2 * INSET);
  const from = x(here.start);
  const to = x(here.end + 1);
  const kept = connections.toSorted((a, b) => b.link.votes - a.link.votes).slice(0, MAX_ARCS);
  // Each arc rises with its span, short links a little more than a true semicircle would; then
  // the whole set is scaled so its tallest arc reaches the top, so a verse whose links all stay
  // in its own book fills the box as well as one that reaches across the canon.
  const spans = kept.map((connection) => {
    const here = x(connection.here + 0.5);
    const there = x((connection.otherStart + connection.otherEnd + 1) / 2);
    // Always drawn left to right: an arc swept the other way would bend below the line.
    const a = Math.min(here, there);
    const b = Math.max(here, there);
    const share = (b - a) / (WIDTH - 2 * INSET);
    return { a, b, rise: Math.max(4, MAX_RISE * Math.sqrt(share)) };
  });
  const tallest = Math.max(1, ...spans.map((span) => span.rise));
  const scale = Math.max(1, MAX_RISE / tallest);
  const drawn = kept.map((connection, index) => {
    const span = spans[index] ?? { a: 0, b: 0, rise: 0 };
    const radius = (span.b - span.a) / 2;
    const rise = Math.min(span.rise * scale, MAX_RISE);
    const genre = elementAt(verseGenres, connection.otherStart);
    return {
      key: `${String(connection.link.id)}-${connection.direction}`,
      d: `M ${span.a.toFixed(1)} ${String(BASELINE)} A ${radius.toFixed(1)} ${rise.toFixed(1)} 0 0 1 ${span.b.toFixed(1)} ${String(BASELINE)}`,
      color: GENRE_HEX[genre] ?? '#ffffff',
      opacity: 0.35 + (0.5 * Math.min(connection.link.votes, 10)) / 10,
    };
  });
  return (
    <svg
      className={styles.mini}
      viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <line x1={INSET} x2={WIDTH - INSET} y1={BASELINE} y2={BASELINE} className={styles.miniAxis} />
      {drawn.map((arc) => (
        <path
          key={arc.key}
          d={arc.d}
          fill="none"
          stroke={arc.color}
          strokeWidth="0.8"
          opacity={arc.opacity}
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <rect
        x={from - 1}
        y={BASELINE - 3}
        width={Math.max(to - from, 2) + 1}
        height="6"
        rx="1"
        className={styles.miniHere}
      />
    </svg>
  );
}
