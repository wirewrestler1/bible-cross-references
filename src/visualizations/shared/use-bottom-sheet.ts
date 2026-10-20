import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/** Movement after which a touch on the sheet counts as dragging it or scrolling its content. */
const DRAG_SLOP_PX = 4;
/** How far ahead a flick carries the sheet when choosing where it settles: its speed times this. */
const FLICK_PROJECTION_MS = 180;
/** Pulled below its low point by this share of its visible height (or flicked as far), it closes. */
const CLOSE_SHARE = 0.3;

/**
 * Where the sheet rests: `peek` shows its heading and leaves the stage to the visualization,
 * `half` shows the text with the visualization still above it, `full` covers the stage.
 */
export type SheetPosition = 'peek' | 'half' | 'full';
/** How far the sheet stretches, at most, past a point it can't go beyond. */
const STRETCH_PX = 36;
/** Only the last moments of a drag set the speed of its flick. */
const VELOCITY_WINDOW_MS = 100;
/** Clicks right after a drag belong to the drag, not to the button where it ended. */
const CLICKS_AFTER_DRAG_MS = 400;
/** The closing slide's longest wait before the sheet is removed anyway. */
const CLOSE_TIMEOUT_MS = 700;

interface Drag {
  readonly startX: number;
  readonly startY: number;
  /** The sheet's offset (px below its top position) when the drag took hold of it. */
  from: number;
  /** The offset of its low (peek) point. */
  readonly lowest: number;
  /** The offset of its half-way point. */
  readonly half: number;
  /** The scrollable content under the finger, if any: it scrolls instead, where it can. */
  readonly scroller: HTMLElement | null;
  mode: 'pending' | 'sheet' | 'content';
  offset: number;
  samples: { readonly y: number; readonly time: number }[];
}

/** Rubber-banding, as on iOS: the further past the limit, the harder it pulls back. */
function stretch(distance: number): number {
  return STRETCH_PX * (1 - 1 / ((distance * 0.55) / STRETCH_PX + 1));
}

/** The sheet's current offset, mid-transition included, so a finger can catch it in flight. */
function currentOffset(sheet: HTMLElement): number {
  const { transform } = getComputedStyle(sheet);
  return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
}

/** The nearest vertically scrollable element from `target` up to `sheet`. */
function scrollerOf(target: EventTarget | null, sheet: HTMLElement): HTMLElement | null {
  for (
    let element = target instanceof Element ? target : null;
    element && element !== sheet;
    element = element.parentElement
  ) {
    if (element instanceof HTMLElement && element.scrollHeight > element.clientHeight + 1) {
      const { overflowY } = getComputedStyle(element);
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return element;
      }
    }
  }
  return null;
}

/** Pixels per ms (positive: down) over the drag's last moments. */
function velocityOf(samples: Drag['samples']): number {
  const last = samples.at(-1);
  const first = samples.find((sample) => last && last.time - sample.time <= VELOCITY_WINDOW_MS);
  return first && last && last.time > first.time
    ? (last.y - first.y) / (last.time - first.time)
    : 0;
}

/**
 * A bottom sheet with three heights — peek, half and full — that follows the finger like a native
 * one: it can be dragged by any part, its content scrolls when it should instead (full, and not
 * at the top), it settles at whichever height a flick carries it nearest to, and it closes when
 * pulled down from its lowest point (if `onClose` is given). It opens at half. Taps on the
 * handle go between half and full; a tap on the scrim brings it down from full. Without touch,
 * or on wide screens (where `space` isn't displayed), it is a plain panel.
 *
 * Positions and transitions are CSS, keyed on the container's `data-sheet` (the position),
 * `data-sheet-dragging` and `data-sheet-closing`; the peek and half heights are read from two
 * elements sized by the stylesheet, so the numbers live in one place. While dragged, the sheet
 * and the scrim are moved directly, with no re-renders.
 */
export function useBottomSheet(open: boolean, onClose: (() => void) | undefined) {
  const [position, setPosition] = useState<SheetPosition>('half');
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setPosition('half'); // A sheet always opens half-way.
    }
  }
  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const halfRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const isFull = useEffectEvent(() => position === 'full');
  const canClose = useEffectEvent(() => onClose !== undefined);
  const close = useEffectEvent(() => {
    onClose?.();
  });

  useEffect(() => {
    const container = containerRef.current;
    const sheet = sheetRef.current;
    const space = spaceRef.current;
    const peek = peekRef.current;
    const half = halfRef.current;
    const scrim = scrimRef.current;
    if (!open || !container || !sheet || !space || !peek || !half || !scrim) {
      return undefined;
    }
    let drag: Drag | null = null;
    let clicksBlockedUntil = 0;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;

    // The scrim comes with the last stretch, from half-way up to full: below that the
    // visualization stays in reach.
    const moveTo = (offset: number, halfOffset: number) => {
      sheet.style.transform = `translateY(${String(offset)}px)`;
      scrim.style.opacity = String(Math.min(Math.max(1 - offset / halfOffset, 0), 1));
    };
    /** Hands the position back to CSS, which animates to the current state's. */
    const letGo = () => {
      delete container.dataset.sheetDragging;
      sheet.style.transform = '';
      scrim.style.opacity = '';
    };
    const settle = (at: SheetPosition) => {
      flushSync(() => {
        setPosition(at);
      });
      letGo();
    };
    const slideOutAndClose = () => {
      container.dataset.sheetClosing = '';
      letGo();
      const finish = () => {
        clearTimeout(closeTimer);
        sheet.removeEventListener('transitionend', onSlidOut);
        flushSync(close);
        if (sheet.isConnected) {
          delete container.dataset.sheetClosing; // Kept open after all: slide back.
        }
      };
      const onSlidOut = (event: TransitionEvent) => {
        if (event.target === sheet && event.propertyName === 'transform') {
          finish();
        }
      };
      if (parseFloat(getComputedStyle(sheet).transitionDuration) === 0) {
        finish(); // Reduced motion: no slide to wait for.
        return;
      }
      sheet.addEventListener('transitionend', onSlidOut);
      closeTimer = setTimeout(finish, CLOSE_TIMEOUT_MS);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (drag?.mode === 'sheet') {
        return; // Another finger mid-drag: the drag carries on until every finger lifts.
      }
      drag = null;
      const touch = event.touches.item(0);
      const isSheet = space.offsetHeight > 0; // On wide screens it's a side panel.
      if (!touch || event.touches.length > 1 || !isSheet || 'sheetClosing' in container.dataset) {
        return;
      }
      drag = {
        startX: touch.clientX,
        startY: touch.clientY,
        from: 0,
        lowest: sheet.offsetHeight - peek.offsetHeight,
        half: sheet.offsetHeight - half.offsetHeight,
        scroller: scrollerOf(event.target, sheet),
        mode: 'pending',
        offset: 0,
        samples: [{ y: touch.clientY, time: event.timeStamp }],
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      const touch = event.touches.item(0);
      if (!drag || !touch || event.touches.length > 1) {
        return;
      }
      if (drag.mode === 'pending') {
        const dx = touch.clientX - drag.startX;
        const dy = touch.clientY - drag.startY;
        if (Math.hypot(dx, dy) < DRAG_SLOP_PX) {
          return;
        }
        // Content scrolls where it can: at full and moving up, or away from its top. Everything
        // else (the header, the handle, content at its top or that doesn't scroll) moves the sheet.
        const movesSheet =
          Math.abs(dy) >= Math.abs(dx) &&
          (!drag.scroller || (dy < 0 ? !isFull() : drag.scroller.scrollTop <= 0));
        if (!movesSheet) {
          drag.mode = 'content';
          return;
        }
        // From the touch's start: when moves arrive in bursts, the first one can be long.
        drag.mode = 'sheet';
        drag.from = currentOffset(sheet);
        container.dataset.sheetDragging = '';
      }
      if (drag.mode !== 'sheet') {
        return;
      }
      event.preventDefault();
      const raw = drag.from + touch.clientY - drag.startY;
      if (raw < 0) {
        drag.offset = -stretch(-raw);
      } else if (raw > drag.lowest && !canClose()) {
        drag.offset = drag.lowest + stretch(raw - drag.lowest);
      } else {
        drag.offset = raw;
      }
      moveTo(drag.offset, drag.half);
      drag.samples.push({ y: touch.clientY, time: event.timeStamp });
      if (drag.samples.length > 32) {
        drag.samples.splice(0, 16);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      const ended = drag;
      if (!ended || event.touches.length > 0) {
        return;
      }
      drag = null;
      if (ended.mode !== 'sheet') {
        return;
      }
      clicksBlockedUntil = performance.now() + CLICKS_AFTER_DRAG_MS;
      const flick = event.type === 'touchend' ? velocityOf(ended.samples) : 0;
      const projected = ended.offset + flick * FLICK_PROJECTION_MS;
      const startedLow = ended.from >= ended.lowest - 1;
      if (canClose() && startedLow && projected > ended.lowest + peek.offsetHeight * CLOSE_SHARE) {
        slideOutAndClose();
        return;
      }
      // The nearest of the three heights to where the flick would carry it.
      const stops: readonly (readonly [SheetPosition, number])[] = [
        ['full', 0],
        ['half', ended.half],
        ['peek', ended.lowest],
      ];
      const nearest = stops.reduce((best, stop) =>
        Math.abs(stop[1] - projected) < Math.abs(best[1] - projected) ? stop : best,
      );
      settle(nearest[0]);
    };

    const onClickCapture = (event: MouseEvent) => {
      if (performance.now() < clicksBlockedUntil) {
        event.stopPropagation();
        event.preventDefault();
      }
    };

    sheet.addEventListener('touchstart', onTouchStart, { passive: true });
    sheet.addEventListener('touchmove', onTouchMove, { passive: false });
    sheet.addEventListener('touchend', onTouchEnd);
    sheet.addEventListener('touchcancel', onTouchEnd);
    sheet.addEventListener('click', onClickCapture, true);
    return () => {
      clearTimeout(closeTimer);
      sheet.removeEventListener('touchstart', onTouchStart);
      sheet.removeEventListener('touchmove', onTouchMove);
      sheet.removeEventListener('touchend', onTouchEnd);
      sheet.removeEventListener('touchcancel', onTouchEnd);
      sheet.removeEventListener('click', onClickCapture, true);
      delete container.dataset.sheetClosing;
      letGo();
    };
  }, [open]);

  return {
    /** Where the sheet rests (on phones). */
    position,
    setPosition,
    containerRef,
    sheetRef,
    spaceRef,
    peekRef,
    halfRef,
    scrimRef,
  };
}
