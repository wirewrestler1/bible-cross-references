import { useEffect, useRef } from 'react';
import { BOOKS } from '../../../core/bible/books.ts';
import { getBookGenre } from '../../../core/bible/genres.ts';
import { CANONICAL_VERSIFICATION } from '../../../core/bible/versification.ts';
import { prefersReducedMotion } from '../../../shared/lib/arrival.ts';
import { Mark } from '../../../shared/ui/Mark.tsx';
import { useLocalization } from '../../../i18n/use-locale.tsx';
import { MAX_PIXEL_RATIO } from '../frames.ts';
import { GENRE_HEX } from '../palette.ts';
import styles from './LoadingArcs.module.css';

interface LoadingArcsProps {
  /** What is loading: the status line under the picture, also read by screen readers. */
  readonly label: string;
  /** Fading out over the arriving page (see `VizDataBoundary`); it takes no more input. */
  readonly leaving?: boolean;
}

/** An arc being drawn, or drawn and still glowing. */
interface Flight {
  readonly from: number;
  readonly to: number;
  readonly color: string;
  readonly born: number;
  readonly life: number;
  readonly bright: boolean;
}

/**
 * Arcs are launched faster and faster, from a few a second to a flood: the rate rises
 * exponentially from the first to the last over the ramp, which launches about `FULL` arcs
 * in all (T · (r₁ − r₀) / ln(r₁ / r₀)).
 */
const RATE_PER_S = { first: 4, last: 900 };
/** How long the picture takes to fill: a little under the hold on the screen (`HOLD_MS`). */
export const RAMP_MS = 3200;
/** After this many arcs the picture is full; it goes on sparsely so it never looks finished. */
const FULL = 520;
/** Once full, new arcs come at this rate. */
const SPARSE_PER_S = 2.4;
/** An arc's flight takes this long at the start of the ramp, and a third of it by the end. */
const LIFE_MS = { min: 700, spread: 900 };
/** One arc in this many is a bright one, drawn as a ribbon of light rather than a thread. */
const BRIGHT_EVERY = 9;
/** Pieces of the moving light along an arc, brighter toward its head. */
const HEAD_PIECES = 9;

/** The books along the axis, each as a share of its width, in its genre's colour. */
const SEGMENTS = BOOKS.map((book) => {
  const range = CANONICAL_VERSIFICATION.bookRange(book.id);
  const total = CANONICAL_VERSIFICATION.verseCount;
  return {
    from: range.start / total,
    to: (range.end + 1) / total,
    color: GENRE_HEX[getBookGenre(book.id).ordinal] ?? '#ffffff',
  };
});

/** The genre colour at a position along the axis. */
function colorAt(position: number): string {
  return (
    SEGMENTS.find((segment) => position >= segment.from && position < segment.to)?.color ??
    '#ffffff'
  );
}

/** A position along the axis, drawn so that every book gets its share of arcs. */
function somewhere(): number {
  return Math.random();
}

/** The point at `t` (0–1) along a half-ellipse from `a` to `b` on the axis. */
function arcPoint(a: number, b: number, rise: number, t: number): readonly [number, number] {
  const theta = Math.PI * (1 - t);
  const center = (a + b) / 2;
  const radius = (b - a) / 2;
  return [center + radius * Math.cos(theta), -rise * Math.sin(theta)];
}

/**
 * The waiting screen: the canon as a line of light, and arcs setting out between random
 * verses — first one at a time, then faster and faster — each drawing itself in the colour of
 * the book it lands in and staying as a thread of light, until the whole spectrum of the
 * canon's connections stands over the line. The picture never repeats and never quite settles.
 * A reader who prefers reduced motion gets the finished spectrum at once.
 */
export function LoadingArcs({ label, leaving = false }: LoadingArcsProps) {
  const { t } = useLocalization();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tracesRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const traces = tracesRef.current;
    const context = canvas?.getContext('2d');
    const traceContext = traces?.getContext('2d');
    if (!canvas || !traces || !context || !traceContext) {
      return undefined;
    }
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    for (const layer of [canvas, traces]) {
      layer.width = Math.round(width * ratio);
      layer.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    traceContext.setTransform(ratio, 0, 0, ratio, 0, 0);
    const left = width * 0.06;
    const axisWidth = width * 0.88;
    const axisY = height - 18;
    const maxRise = axisY - 10;
    const x = (position: number) => left + position * axisWidth;

    const flights: Flight[] = [];
    let launched = 0;
    let due = 0;
    let last = 0;
    let frame = 0;
    const start = performance.now();
    const still = prefersReducedMotion();

    const drawArc = (
      target: CanvasRenderingContext2D,
      flight: Flight,
      from: number,
      to: number,
      alpha: number,
      lineWidth: number,
    ) => {
      const a = Math.min(flight.from, flight.to);
      const b = Math.max(flight.from, flight.to);
      const rise = Math.min(((b - a) * axisWidth) / 2, maxRise);
      target.globalAlpha = alpha;
      target.strokeStyle = flight.color;
      target.lineWidth = lineWidth;
      target.beginPath();
      // Enough segments for the span drawn: a whole arc takes 40, a head a handful.
      const steps = Math.max(4, Math.round(40 * (to - from)));
      for (let step = 0; step <= steps; step += 1) {
        const t = from + ((to - from) * step) / steps;
        const [px, py] = arcPoint(x(a), x(b), rise, t);
        if (step === 0) target.moveTo(px, axisY + py);
        else target.lineTo(px, axisY + py);
      }
      target.stroke();
    };

    const launch = (now: number, ramp: number) => {
      const from = somewhere();
      const to = somewhere();
      const quickness = 1 - ramp * 0.67;
      flights.push({
        from,
        to,
        color: colorAt(to),
        born: now,
        life: (LIFE_MS.min + Math.random() * LIFE_MS.spread) * quickness,
        bright: launched % BRIGHT_EVERY === 0,
      });
      launched += 1;
    };

    const drawAxis = () => {
      context.globalAlpha = 1;
      for (const [index, segment] of SEGMENTS.entries()) {
        context.fillStyle = segment.color;
        context.globalAlpha = index % 2 === 0 ? 0.95 : 0.7;
        context.shadowColor = segment.color;
        context.shadowBlur = 6;
        const from = x(segment.from);
        const to = x(segment.to);
        context.fillRect(from + 0.5, axisY + 4, Math.max(to - from - 1, 0.5), 5);
      }
      context.shadowBlur = 0;
      context.globalAlpha = 1;
    };

    if (still) {
      // The finished picture, at once.
      traceContext.globalCompositeOperation = 'lighter';
      for (let i = 0; i < FULL; i += 1) {
        const from = somewhere();
        const to = somewhere();
        drawArc(
          traceContext,
          { from, to, color: colorAt(to), born: 0, life: 1, bright: false },
          0,
          1,
          0.16,
          1,
        );
      }
      context.drawImage(traces, 0, 0, width, height);
      drawAxis();
      return undefined;
    }

    traceContext.globalCompositeOperation = 'lighter';
    const step = (now: number) => {
      const elapsed = now - start;
      // Faster and faster, then sparse once the picture is full.
      const ramp = Math.min(elapsed / RAMP_MS, 1);
      const rate =
        launched < FULL
          ? RATE_PER_S.first * (RATE_PER_S.last / RATE_PER_S.first) ** ramp
          : SPARSE_PER_S;
      due += (rate * Math.min(now - (last || now), 100)) / 1000;
      last = now;
      if (launched === 0) due = 1; // The first arc goes at once.
      for (; due >= 1; due -= 1) {
        launch(now, ramp);
      }

      context.clearRect(0, 0, width, height);
      context.drawImage(traces, 0, 0, width, height);
      context.globalCompositeOperation = 'lighter';
      for (let i = flights.length - 1; i >= 0; i -= 1) {
        const flight = flights[i];
        if (!flight) continue;
        const progress = Math.min((now - flight.born) / flight.life, 1);
        const eased = 1 - (1 - progress) ** 3;
        // The head: a short run of pieces, brightest at the front (fewer on a plain thread).
        const pieces = flight.bright ? HEAD_PIECES : 4;
        for (let piece = 0; piece < pieces; piece += 1) {
          const tail = Math.max(eased - (piece + 1) * 0.045, 0);
          const head = Math.max(eased - piece * 0.045, 0);
          if (head <= tail) continue;
          const alpha = (flight.bright ? 0.9 : 0.5) * (1 - piece / pieces);
          drawArc(context, flight, tail, head, alpha, flight.bright ? 2.2 : 1.2);
        }
        if (progress >= 1) {
          // Done: it stays as a thread of light in the traces.
          drawArc(traceContext, flight, 0, 1, flight.bright ? 0.42 : 0.17, flight.bright ? 1.4 : 1);
          flights.splice(i, 1);
        }
      }
      context.globalCompositeOperation = 'source-over';
      drawAxis();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={leaving ? `${styles.loader} ${styles.leaving}` : styles.loader}
      role="status"
      aria-live="polite"
    >
      <div className={styles.stage}>
        <canvas ref={tracesRef} className={styles.hidden} aria-hidden="true" />
        <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      </div>
      <p className={styles.name}>
        <Mark className={styles.mark} />
        {t('app.name')}
      </p>
      <p className={styles.label}>{label}</p>
    </div>
  );
}
