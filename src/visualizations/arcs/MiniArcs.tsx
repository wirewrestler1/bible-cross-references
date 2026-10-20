import { useEffect, useRef, useState } from 'react';
import { versePassage } from '../../core/bible/passage.ts';
import type { VerseIndexRange } from '../../core/bible/versification.ts';
import { elementAt } from '../../core/lib/array.ts';
import { prefersReducedMotion } from '../../shared/lib/arrival.ts';
import { useLocalization } from '../../i18n/use-locale.tsx';
import type { Connection } from '../shared/connections.ts';
import { animate, MAX_PIXEL_RATIO } from '../shared/frames.ts';
import { GENRE_HEX } from '../shared/palette.ts';
import type { PassagePictureProps } from '../shared/passage-picture.ts';
import { useElementSize } from '../shared/use-element-size.ts';
import { computeArcLayout, verseToAlong, type ArcLayout } from './arc-layout.ts';
import { paintAxis } from './axis-painter.ts';
import { fitRange, reachOf, type AxisView } from './axis-view.ts';
import styles from './MiniArcs.module.css';

/** More arcs than this and the picture is a blur; the strongest are kept. */
const MAX_ARCS = 240;
/** How long the arcs take to grow out of the passage when the card opens. */
const DRAW_MS = 900;
/** How near a pointer must come to an arc to point at it, in px. */
const HIT_PX = 7;

interface Arc {
  readonly connection: Connection;
  readonly center: number;
  readonly radius: number;
  readonly rise: number;
  /** Whether the arc leaves the passage toward the right. */
  readonly rightward: boolean;
  readonly color: string;
  readonly alpha: number;
}

function layoutArcs(
  connections: readonly Connection[],
  here: VerseIndexRange,
  layout: ArcLayout,
  view: AxisView,
  verseGenres: Uint8Array,
): Arc[] {
  const along = (verse: number) => verseToAlong(layout, view, verse);
  return connections
    .toSorted((a, b) => b.link.votes - a.link.votes)
    .slice(0, MAX_ARCS)
    .map((connection) => {
      const from = along(connection.here + 0.5);
      const to = along((connection.otherStart + connection.otherEnd + 1) / 2);
      const radius = Math.abs(to - from) / 2;
      return {
        connection,
        center: (from + to) / 2,
        radius,
        // As in the big picture: a semicircle, flattened into a ceiling when it would leave the box.
        rise: Math.min(radius, layout.maxArcHeight),
        rightward: to >= from,
        color: elementAt(GENRE_HEX, elementAt(verseGenres, connection.otherStart)),
        alpha: 0.4 + (0.5 * Math.min(connection.link.votes, 10)) / 10,
      };
    })
    .filter((arc) => arc.radius > 0.5 || arc.connection.here < here.start);
}

/** The arc nearest a point, if the point is close enough to count as on it. */
function arcAt(arcs: readonly Arc[], layout: ArcLayout, x: number, y: number): Arc | null {
  let best: Arc | null = null;
  let bestDistance = HIT_PX;
  for (const arc of arcs) {
    if (arc.rise < 1 || y > layout.baseline + HIT_PX) continue;
    // The nearest point of the (half) ellipse, by angle.
    const angle = Math.atan2((layout.baseline - y) / arc.rise, (x - arc.center) / arc.radius);
    const px = arc.center + arc.radius * Math.cos(angle);
    const py = layout.baseline - arc.rise * Math.sin(angle);
    const distance = Math.hypot(px - x, py - y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = arc;
    }
  }
  return best;
}

function strokeArc(
  context: CanvasRenderingContext2D,
  layout: ArcLayout,
  arc: Arc,
  progress: number,
): void {
  if (progress <= 0) return;
  // Grown from the passage's end: leftward arcs sweep from the right point, rightward from the left.
  const sweep = Math.PI * progress;
  context.beginPath();
  if (arc.rightward) {
    context.ellipse(arc.center, layout.baseline, arc.radius, arc.rise, 0, Math.PI, Math.PI + sweep);
  } else {
    context.ellipse(arc.center, layout.baseline, arc.radius, arc.rise, 0, 0, -sweep, true);
  }
  context.stroke();
}

/**
 * The passage's own links as a small piece of the big picture, drawn with the arcs' own
 * machinery: the same axis of books as light with their names, the same window (fitted to the
 * passage's reach, as the stage fits it), the same genre colours and gold focus. An arc
 * pointed at stands out here and in the list and on the stage; one pressed travels there.
 */
export function MiniArcs({
  data,
  connections,
  here,
  label,
  pointed,
  onPoint,
  onSelect,
}: PassagePictureProps) {
  const { books, locale } = useLocalization();
  const { versification, verseGenres } = data;
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = useElementSize(frameRef);
  const [hovered, setHovered] = useState<Connection | null>(null);
  // How far the arcs have grown, 0–1; a new passage starts them over.
  const revealRef = useRef(1);
  const arcsRef = useRef<{ layout: ArcLayout; arcs: Arc[] }>({
    layout: computeArcLayout(1, 1),
    arcs: [],
  });

  useEffect(() => {
    if (prefersReducedMotion()) {
      revealRef.current = 1;
      return undefined;
    }
    revealRef.current = 0;
    return animate(DRAW_MS, (progress) => {
      revealRef.current = progress;
      frameRef.current?.dispatchEvent(new Event('redraw'));
    });
  }, [connections, here.start, here.end]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !frame || !context || size.width === 0 || size.height === 0) {
      return undefined;
    }
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    canvas.width = Math.round(size.width * ratio);
    canvas.height = Math.round(size.height * ratio);
    const layout = computeArcLayout(size.width, size.height);
    const total = versification.verseCount;
    const reach = reachOf(
      here,
      connections.flatMap((connection) => [
        connection.here + 0.5,
        (connection.otherStart + connection.otherEnd + 1) / 2,
      ]),
    );
    const view = fitRange(reach.start, reach.end, total);
    const arcs = layoutArcs(connections, here, layout, view, verseGenres);
    arcsRef.current = { layout, arcs };
    const emphasized = hovered ?? pointed;
    // Named whatever their room: the passage's own book, and every book it reaches.
    const marked = new Set([
      versification.bookAt(here.start).id,
      ...connections.map((connection) => versification.bookAt(connection.otherStart).id),
    ]);
    const otherOf = (connection: Connection | null): VerseIndexRange | null =>
      connection && { start: connection.otherStart, end: connection.otherEnd };

    const draw = () => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      paintAxis(context, {
        layout,
        view,
        versification,
        names: books,
        genreNames: locale.genres,
        focus: here,
        hover: otherOf(hovered),
        passage: otherOf(pointed),
        marked,
      });
      const reveal = revealRef.current;
      context.lineCap = 'round';
      for (const arc of arcs) {
        if (arc.connection === emphasized) continue;
        context.globalAlpha = emphasized ? arc.alpha * 0.35 : arc.alpha;
        context.strokeStyle = arc.color;
        context.lineWidth = 1;
        strokeArc(context, layout, arc, reveal);
      }
      const front = arcs.find((arc) => arc.connection === emphasized);
      if (front) {
        context.globalAlpha = 1;
        context.strokeStyle = front.color;
        context.lineWidth = 2;
        context.shadowColor = front.color;
        context.shadowBlur = 10;
        strokeArc(context, layout, front, 1);
        context.shadowBlur = 0;
      }
      context.globalAlpha = 1;
    };
    draw();
    frame.addEventListener('redraw', draw);
    return () => {
      frame.removeEventListener('redraw', draw);
    };
  }, [size, connections, here, hovered, pointed, versification, verseGenres, books, locale]);

  const point = (connection: Connection | null) => {
    setHovered(connection);
    onPoint(connection);
  };
  const under = (event: React.MouseEvent<HTMLCanvasElement>): Arc | null => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const { layout, arcs } = arcsRef.current;
    return arcAt(arcs, layout, event.clientX - bounds.left, event.clientY - bounds.top);
  };

  return (
    <div ref={frameRef} className={styles.frame}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={label}
        data-pointing={hovered !== null || undefined}
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const arc = under(event);
          const connection = arc?.connection ?? null;
          if (connection !== hovered) point(connection);
        }}
        onPointerLeave={() => {
          if (hovered !== null) point(null);
        }}
        onClick={(event) => {
          const arc = under(event);
          if (arc) {
            onSelect(versePassage(arc.connection.otherStart));
          }
        }}
      />
    </div>
  );
}
