import { chapterPassageOf, versePassage, type Passage } from '../../core/bible/passage.ts';
import type { GenreId } from '../../core/bible/genres.ts';
import type { VerseIndexRange, Versification } from '../../core/bible/versification.ts';
import type { BookNames } from '../../i18n/books/types.ts';
import { attachGestures, type GesturePoint, type PreviewInput } from '../shared/gestures.ts';
import { prefersReducedMotion } from '../../shared/lib/arrival.ts';
import { animate, FrameScheduler, MAX_PIXEL_RATIO, spring } from '../shared/frames.ts';
import type { ArcInstances } from './arc-instances.ts';
import {
  alongOfPoint,
  alongToVerse,
  computeArcLayout,
  pixelsPerVerse,
  type ArcLayout,
} from './arc-layout.ts';
import { ArcScene } from './arc-scene.ts';
import {
  fullView,
  interpolateView,
  panView,
  revealRange,
  zoomView,
  type AxisView,
} from './axis-view.ts';
import { paintAxis, paintPulse } from './axis-painter.ts';

export interface ArcHover {
  readonly passage: Passage;
  /** Pointer position in stage coordinates, for placing a tooltip. */
  readonly x: number;
  readonly y: number;
  /** A mouse, or a finger, whose tooltip must stay clear of the finger. */
  readonly input: PreviewInput;
}

/** One link shown from outside the diagram (e.g. pointed at in the details panel). */
export interface ArcPreview {
  /** The link's arc. */
  readonly links: ArcInstances;
  /** The passage it points to, marked on the axis as a whole. */
  readonly passage: VerseIndexRange;
}

export interface ArcsControllerOptions {
  /** Receives pointer, wheel and keyboard input; should be focusable. */
  readonly container: HTMLElement;
  readonly glCanvas: HTMLCanvasElement;
  readonly overlayCanvas: HTMLCanvasElement;
  /** Whether the visit is arriving: then the axis sweeps in and the arcs unfold when first shown. */
  readonly arrival: boolean;
  readonly versification: Versification;
  /** Book and genre names for the axis; replaced when the reader changes language. */
  readonly names: BookNames;
  readonly genreNames: Readonly<Record<GenreId, string>>;
  readonly onHover: (hover: ArcHover | null) => void;
  readonly onSelect: (passage: Passage) => void;
  readonly onClear: () => void;
}

/** Below this many pixels per verse, pointing picks whole chapters instead of single verses. */
const VERSE_PICK_PIXELS = 4;
const KEYBOARD_PAN_SHARE = 0.15;
const KEYBOARD_ZOOM = 1.6;

/**
 * Accumulated light at which the glow saturates. The densest regions hold roughly one arc in 250
 * of the visible ones, so the ceiling follows the link count and any filter looks balanced.
 */
export function glowCeiling(arcCount: number): number {
  return Math.max(arcCount / 320, 16);
}

/** The arrival: the axis sweeps in over this long, and the arcs grow out of it over the next. */
const AXIS_SWEEP_MS = 1400;
const INTRO_MS = 2400;
/** The arcs start growing this long after the axis starts sweeping. */
const INTRO_DELAY_MS = 500;
/** A view that comes back into view grows its arcs again, briefly. */
const RETURN_MS = 700;
/** How long the focused links take to grow out of a touched passage, in ms. */
const BLOOM_MS = 550;
/** How long the ring that marks a landing takes to spread and fade, in ms. */
const PULSE_MS = 700;
/** How long the axis takes to settle on a new window, in ms (on a spring, see frames.ts). */
const MOVE_MS = 650;

/**
 * A finger put down this close to the axis line, or on its labels, previews at once: the axis
 * works like an index strip. Elsewhere a finger previews after a hold, since a drag pans.
 */
const AXIS_STRIP_REACH_PX = 16;
/**
 * While a finger previews within this distance of an end of the axis, the view keeps panning that
 * way, faster the closer it gets, so a zoomed-in reader can scrub past the edge.
 */
const EDGE_PAN_ZONE_PX = 44;
/** Top edge-panning speed, in pixels per second. */
const EDGE_PAN_MAX_SPEED = 900;

/**
 * Drives the arc diagram imperatively (no React re-renders on every wheel tick): it owns the
 * WebGL scene, the 2D overlay, the visible window, and all input handling.
 */
export class ArcsController {
  readonly #options: ArcsControllerOptions;
  readonly #scene: ArcScene;
  readonly #overlay: CanvasRenderingContext2D;
  readonly #scheduler: FrameScheduler;
  readonly #detachGestures: () => void;
  #layout: ArcLayout = computeArcLayout(0, 0);
  #view: AxisView;
  #names: BookNames;
  #genreNames: Readonly<Record<GenreId, string>>;
  #focus: VerseIndexRange | null = null;
  #hover: VerseIndexRange | null = null;
  #linkPreview: ArcPreview | null = null;
  /** Where a finger previews, while it does; drives edge panning. */
  #touchPreview: GesturePoint | null = null;
  #edgePanFrame: number | null = null;
  #edgePanTime: number | null = null;
  #linksOfRange: (range: VerseIndexRange) => ArcInstances | null = () => null;
  #cancelAnimation: (() => void) | null = null;
  /** The intro that grows the first links from their sources; runs once, when they arrive. */
  #intro: 'pending' | 'running' | 'done' = 'pending';
  #cancelIntro: (() => void) | null = null;
  #cancelSweep: (() => void) | null = null;
  #introTimer: ReturnType<typeof setTimeout> | undefined;
  /** How much of the axis has swept in, 0–1: the books light up from Genesis to Revelation. */
  #axisReveal = 1;
  /** The focused links growing out of their passage, while they do. */
  #cancelBloom: (() => void) | null = null;
  /** The ring spreading from a landing, while it does: where, and how far along. */
  #pulse: { readonly range: VerseIndexRange; progress: number } | null = null;
  #cancelPulse: (() => void) | null = null;
  /** Hidden (another view is shown), it draws nothing; the intro waits until it's shown. */
  #active = true;
  #hasLinks = false;
  /**
   * Whether the canvases have been shrunk to a pixel because nothing can see them: the page is
   * in the background, or another view is in front. The layout is kept so they come back at
   * their size.
   */
  #asleep = false;

  constructor(options: ArcsControllerOptions) {
    this.#options = options;
    this.#scene = new ArcScene(options.glCanvas);
    const overlay = options.overlayCanvas.getContext('2d');
    if (!overlay) {
      throw new Error('Canvas 2D is not available.');
    }
    this.#overlay = overlay;
    this.#view = fullView(options.versification.verseCount);
    this.#names = options.names;
    this.#genreNames = options.genreNames;
    this.#scheduler = new FrameScheduler(() => {
      this.#draw();
    });
    this.#detachGestures = attachGestures(options.container, {
      onPan: (dx, dy) => {
        this.#panByPixels(this.#layout.orientation === 'horizontal' ? dx : dy);
      },
      onZoom: (factor, center) => {
        this.#zoomAt(factor, center);
      },
      onHover: (point, input) => {
        this.#preview(point, input);
      },
      onLeave: () => {
        this.#endPreview();
      },
      previewsAt: (point) => this.#isOnAxisStrip(point),
      onTap: (point) => {
        const passage = this.#passageAt(point);
        if (passage) {
          options.onSelect(passage);
        }
      },
      onDoubleTap: (point) => {
        this.#animateZoom(3, point);
      },
    });
    options.container.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('visibilitychange', this.#onVisibilityChange);
  }

  setSize(width: number, height: number): void {
    this.#layout = computeArcLayout(width, height);
    this.#scene.setLayout(this.#layout);
    if (!this.#asleep) {
      this.#applySize();
    }
    this.#scheduler.request();
  }

  /** Gives the canvases the layout's size, at the device's pixel ratio. */
  #applySize(): void {
    const { width, height } = this.#layout;
    this.#scene.setSize(width, height);
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const canvas = this.#options.overlayCanvas;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    this.#overlay.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  /**
   * Nothing can see the canvases: the page went to the background, or another view is in
   * front. They shrink to a pixel, so the GPU gets back the screen-sized buffers behind them —
   * what a phone weighs when it decides whether a page it is not showing may stay in memory, and
   * so whether the reader finds it as they left it or watches it load again. Everything else
   * (the links, the window, the focus) stays, and `#wake` has it drawn again in one frame.
   */
  #sleep(): void {
    if (this.#asleep) {
      return;
    }
    this.#asleep = true;
    this.#scene.sleep();
    const canvas = this.#options.overlayCanvas;
    canvas.width = 1;
    canvas.height = 1;
  }

  #wake(): void {
    if (!this.#asleep) {
      return;
    }
    this.#asleep = false;
    this.#applySize();
    this.#scheduler.request();
  }

  readonly #onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      this.#sleep();
    } else if (this.#active) {
      this.#wake();
    }
  };

  /** All links to draw as the glowing background. The first ones grow in (see `#playIntro`). */
  setLinks(instances: ArcInstances): void {
    this.#scene.setLinks(instances, glowCeiling(instances.count));
    this.#hasLinks = instances.count > 0;
    if (this.#intro === 'pending' && this.#hasLinks && this.#active) {
      this.#playIntro();
    }
    this.#scheduler.request();
  }

  /** How to find the (filtered) links of a verse range, for focus and hover highlights. */
  setLinkResolver(resolver: (range: VerseIndexRange) => ArcInstances | null): void {
    this.#linksOfRange = resolver;
    this.#scene.setFocus(this.#focus && resolver(this.#focus));
    this.#scene.setHover(this.#hover && resolver(this.#hover));
    this.#scheduler.request();
  }

  setFocus(range: VerseIndexRange | null): void {
    const changed = range?.start !== this.#focus?.start || range?.end !== this.#focus?.end;
    this.#focus = range;
    this.#scene.setFocus(range && this.#linksOfRange(range));
    this.#scene.setDimmed(range !== null);
    if (range && changed) {
      this.#animateTo(
        revealRange(this.#view, range.start, range.end + 1, this.#options.versification.verseCount),
      );
      this.#land(range);
    }
    this.#scheduler.request();
  }

  /**
   * Arriving on a passage: its links grow out of it, and a ring spreads from it on the axis, so
   * the eye finds where it landed. Readers who prefer reduced motion see the links at once.
   */
  #land(range: VerseIndexRange): void {
    this.#cancelBloom?.();
    this.#cancelPulse?.();
    if (prefersReducedMotion()) {
      this.#scene.setFocusReveal(1);
      this.#pulse = null;
      return;
    }
    this.#scene.setFocusReveal(0);
    this.#cancelBloom = animate(BLOOM_MS, (progress) => {
      this.#scene.setFocusReveal(progress);
      this.#scheduler.request();
    });
    const pulse = { range, progress: 0 };
    this.#pulse = pulse;
    this.#cancelPulse = animate(PULSE_MS, (progress) => {
      pulse.progress = progress;
      if (progress >= 1) {
        this.#pulse = null;
      }
      this.#scheduler.request();
    });
  }

  /** Shows one link and the whole passage it points to, over the focus (which stays as is). */
  setPreview(preview: ArcPreview | null): void {
    this.#linkPreview = preview;
    this.#scene.setPreview(preview?.links ?? null);
    this.#scheduler.request();
  }

  resetView(): void {
    this.#animateTo(fullView(this.#options.versification.verseCount));
  }

  dispose(): void {
    this.#cancelAnimation?.();
    this.#cancelIntro?.();
    this.#cancelSweep?.();
    clearTimeout(this.#introTimer);
    this.#cancelBloom?.();
    this.#cancelPulse?.();
    this.#stopEdgePan();
    this.#scheduler.dispose();
    this.#detachGestures();
    this.#options.container.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    this.#scene.dispose();
  }

  /**
   * The arrival: the axis lights up book by book from Genesis to Revelation, and as it goes
   * every arc grows from its source verse to its target while the glow fades in — the whole
   * Bible's connections unfolding over a few seconds, continuing the loading screen's arcs of
   * light. Once per visit (the host decides; see `arrival` in Explorer.tsx), and not at all for
   * readers who prefer reduced motion.
   */
  #playIntro(): void {
    if (prefersReducedMotion() || !this.#options.arrival) {
      this.#intro = 'done';
      return;
    }
    this.#intro = 'running';
    this.#axisReveal = 0;
    this.#scene.setReveal(0);
    this.#cancelSweep = animate(AXIS_SWEEP_MS, (progress) => {
      this.#axisReveal = progress;
      this.#scheduler.request();
    });
    this.#introTimer = setTimeout(() => {
      this.#cancelIntro = animate(
        INTRO_MS,
        (progress) => {
          this.#scene.setReveal(progress);
          if (progress >= 1) {
            this.#intro = 'done';
            this.#cancelIntro = null;
          }
          this.#scheduler.request();
        },
        spring,
      );
    }, INTRO_DELAY_MS);
  }

  /** Coming back into view, the arcs grow out again, briefly: the screen's own small arrival. */
  #playReturn(): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.#cancelIntro?.();
    this.#scene.setReveal(0);
    this.#cancelIntro = animate(RETURN_MS, (progress) => {
      this.#scene.setReveal(progress);
      if (progress >= 1) {
        this.#cancelIntro = null;
      }
      this.#scheduler.request();
    });
  }

  /** The axis is lettered, so a change of language repaints it. */
  setNames(names: BookNames, genreNames: Readonly<Record<GenreId, string>>): void {
    this.#names = names;
    this.#genreNames = genreNames;
    this.#draw();
  }

  /**
   * Shown or hidden; drawing resumes (and the intro starts) when it's shown. Hidden behind the
   * other view, the canvases sleep like a background page's.
   */
  setActive(active: boolean): void {
    this.#active = active;
    if (active) {
      if (document.visibilityState !== 'hidden') {
        this.#wake();
      }
      if (this.#intro === 'pending' && this.#hasLinks) {
        this.#playIntro();
      } else if (this.#intro === 'done' && this.#hasLinks) {
        this.#playReturn();
      }
      this.#scheduler.request();
    } else {
      this.#sleep();
    }
  }

  #draw(): void {
    if (this.#asleep || !this.#active || this.#layout.width === 0 || this.#layout.height === 0) {
      return;
    }
    this.#scene.setView(this.#view);
    this.#scene.render();
    paintAxis(this.#overlay, {
      layout: this.#layout,
      view: this.#view,
      versification: this.#options.versification,
      names: this.#names,
      genreNames: this.#genreNames,
      focus: this.#focus,
      hover: this.#hover,
      passage: this.#linkPreview?.passage ?? null,
      reveal: this.#axisReveal,
    });
    if (this.#pulse) {
      paintPulse(this.#overlay, this.#layout, this.#view, this.#pulse.range, this.#pulse.progress);
    }
  }

  #verseAt(point: GesturePoint): number | null {
    const along = alongOfPoint(this.#layout, point);
    if (along < this.#layout.axisStart || along > this.#layout.axisEnd) {
      return null;
    }
    const verse = Math.floor(alongToVerse(this.#layout, this.#view, along));
    return Math.min(Math.max(verse, 0), this.#options.versification.verseCount - 1);
  }

  #passageAt(point: GesturePoint): Passage | null {
    const verse = this.#verseAt(point);
    if (verse === null) {
      return null;
    }
    return pixelsPerVerse(this.#layout, this.#view) < VERSE_PICK_PIXELS
      ? chapterPassageOf(verse, this.#options.versification)
      : versePassage(verse);
  }

  #preview(point: GesturePoint, input: PreviewInput): void {
    this.#hoverAt(point, input);
    if (input === 'touch') {
      this.#touchPreview = point;
      this.#updateEdgePan();
    }
  }

  #endPreview(): void {
    this.#touchPreview = null;
    this.#stopEdgePan();
    this.#setHover(null);
    this.#options.onHover(null);
  }

  #hoverAt(point: GesturePoint, input: PreviewInput): void {
    // A finger past an end of the axis keeps previewing its first or last passage.
    const passage = this.#passageAt(input === 'touch' ? this.#clampToAxis(point) : point);
    this.#setHover(passage && this.#rangeOf(passage));
    this.#options.onHover(passage ? { passage, x: point.x, y: point.y, input } : null);
  }

  #clampToAxis(point: GesturePoint): GesturePoint {
    const { orientation, axisStart, axisEnd } = this.#layout;
    const clamp = (along: number) => Math.min(Math.max(along, axisStart), axisEnd - 0.5);
    return orientation === 'horizontal'
      ? { x: clamp(point.x), y: point.y }
      : { x: point.x, y: clamp(point.y) };
  }

  /** The axis line and its labels: below it when horizontal, left of it when vertical. */
  #isOnAxisStrip(point: GesturePoint): boolean {
    const { orientation, baseline } = this.#layout;
    return orientation === 'horizontal'
      ? point.y >= baseline - AXIS_STRIP_REACH_PX
      : point.x <= baseline + AXIS_STRIP_REACH_PX;
  }

  /** Signed edge-panning speed for a finger at `point`: positive pans toward later verses. */
  #edgePanSpeed(point: GesturePoint): number {
    const { axisStart, axisEnd } = this.#layout;
    const along = alongOfPoint(this.#layout, point);
    const depth = (distanceInside: number) =>
      Math.min(Math.max(1 - distanceInside / EDGE_PAN_ZONE_PX, 0), 1) ** 2;
    return EDGE_PAN_MAX_SPEED * (depth(axisEnd - along) - depth(along - axisStart));
  }

  #updateEdgePan(): void {
    const point = this.#touchPreview;
    if (point && this.#edgePanFrame === null && this.#edgePanSpeed(point) !== 0) {
      this.#edgePanFrame = requestAnimationFrame(this.#edgePanStep);
    }
  }

  readonly #edgePanStep = (time: number): void => {
    this.#edgePanFrame = null;
    const point = this.#touchPreview;
    const speed = point ? this.#edgePanSpeed(point) : 0;
    if (!point || speed === 0) {
      this.#edgePanTime = null;
      return;
    }
    const last = this.#edgePanTime ?? time;
    const before = this.#view;
    // Capped, so a stalled frame never jumps the view.
    this.#panByPixels((-speed * Math.min(time - last, 50)) / 1000);
    this.#hoverAt(point, 'touch');
    if (time !== last && this.#view.start === before.start) {
      this.#edgePanTime = null; // Reached the end of the Bible: nothing left to pan to.
      return;
    }
    this.#edgePanTime = time;
    this.#edgePanFrame = requestAnimationFrame(this.#edgePanStep);
  };

  #stopEdgePan(): void {
    if (this.#edgePanFrame !== null) {
      cancelAnimationFrame(this.#edgePanFrame);
    }
    this.#edgePanFrame = null;
    this.#edgePanTime = null;
  }

  #setHover(range: VerseIndexRange | null): void {
    if (range?.start === this.#hover?.start && range?.end === this.#hover?.end) {
      return;
    }
    this.#hover = range;
    this.#scene.setHover(range && this.#linksOfRange(range));
    this.#scheduler.request();
  }

  #rangeOf(passage: Passage): VerseIndexRange {
    if (passage.kind === 'verse') {
      return { start: passage.verse, end: passage.verse };
    }
    const range = this.#options.versification.chapterRange(passage.book, passage.chapter);
    return range ?? { start: 0, end: 0 };
  }

  #panByPixels(deltaAlong: number): void {
    this.#cancelAnimation?.();
    const deltaVerses = -deltaAlong / pixelsPerVerse(this.#layout, this.#view);
    this.#view = panView(this.#view, deltaVerses, this.#options.versification.verseCount);
    this.#scheduler.request();
  }

  #zoomAt(factor: number, point: GesturePoint): void {
    this.#cancelAnimation?.();
    const anchor = alongToVerse(this.#layout, this.#view, alongOfPoint(this.#layout, point));
    this.#view = zoomView(this.#view, factor, anchor, this.#options.versification.verseCount);
    this.#scheduler.request();
  }

  #animateZoom(factor: number, point: GesturePoint): void {
    const anchor = alongToVerse(this.#layout, this.#view, alongOfPoint(this.#layout, point));
    this.#animateTo(zoomView(this.#view, factor, anchor, this.#options.versification.verseCount));
  }

  #animateTo(target: AxisView): void {
    this.#cancelAnimation?.();
    const from = this.#view;
    if (prefersReducedMotion()) {
      this.#view = target;
      this.#scheduler.request();
      return;
    }
    this.#cancelAnimation = animate(
      MOVE_MS,
      (progress) => {
        this.#view = interpolateView(from, target, progress);
        this.#scheduler.request();
      },
      spring,
    );
  }

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    const total = this.#options.versification.verseCount;
    const span = this.#view.end - this.#view.start;
    const center: GesturePoint = { x: this.#layout.width / 2, y: this.#layout.height / 2 };
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        this.#animateTo(panView(this.#view, -span * KEYBOARD_PAN_SHARE, total));
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        this.#animateTo(panView(this.#view, span * KEYBOARD_PAN_SHARE, total));
        break;
      case '+':
      case '=':
        this.#animateZoom(KEYBOARD_ZOOM, center);
        break;
      case '-':
      case '_':
        this.#animateZoom(1 / KEYBOARD_ZOOM, center);
        break;
      case '0':
        this.resetView();
        break;
      case 'Escape':
        this.#options.onClear();
        break;
      default:
        return;
    }
    event.preventDefault();
  };
}
