/** Largest device pixel ratio rendered; higher ratios cost fill rate for no visible gain. */
export const MAX_PIXEL_RATIO = 2;

/**
 * Coalesces render requests into at most one frame, so the scene is drawn only when something
 * changed (no continuous render loop draining phone batteries).
 */
export class FrameScheduler {
  readonly #render: () => void;
  #frame: number | null = null;

  constructor(render: () => void) {
    this.#render = render;
  }

  request(): void {
    this.#frame ??= requestAnimationFrame(() => {
      this.#frame = null;
      this.#render();
    });
  }

  dispose(): void {
    if (this.#frame !== null) {
      cancelAnimationFrame(this.#frame);
      this.#frame = null;
    }
  }
}

/** A curve from 0 to 1 over a time from 0 to 1. */
export type Easing = (linear: number) => number;

/** Quick to start, gentle to stop. */
export const easeOut: Easing = (linear) => 1 - (1 - linear) ** 3;

/**
 * A critically damped spring: it sets off at once and comes to rest without overshooting, the
 * motion of a thing with weight rather than of a value on a timer. Scaled so it ends at exactly
 * 1, which the formula on its own only approaches.
 */
const SPRING_TENSION = 7;
const SPRING_END = 1 - (1 + SPRING_TENSION) * Math.exp(-SPRING_TENSION);
export const spring: Easing = (linear) =>
  linear >= 1
    ? 1
    : (1 - (1 + SPRING_TENSION * linear) * Math.exp(-SPRING_TENSION * linear)) / SPRING_END;

/** Runs `onFrame(progress)` along `easing` over `durationMs`; returns a cancel function. */
export function animate(
  durationMs: number,
  onFrame: (progress: number) => void,
  easing: Easing = easeOut,
): () => void {
  const start = performance.now();
  let frame = requestAnimationFrame(function step(now) {
    // A frame's timestamp can precede the start (it is the frame's, not the call's): hold at 0.
    const linear = Math.min(Math.max((now - start) / durationMs, 0), 1);
    onFrame(easing(linear));
    if (linear < 1) {
      frame = requestAnimationFrame(step);
    }
  });
  return () => {
    cancelAnimationFrame(frame);
  };
}
