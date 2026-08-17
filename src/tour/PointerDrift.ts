/**
 * The held frame breathing with the pointer.
 *
 * While the camera moves, the film supplies its own motion and this stays out of
 * the way entirely. The moment the walk stops at a room, the frame is a still —
 * and a still that answers the cursor by a few pixels reads as something you are
 * standing in front of rather than a paused video.
 *
 * The amplitude is deliberately below the threshold of "effect": eight pixels at
 * full strength, over a frame two thousand wide. You should not be able to say
 * what moved, only that the room has depth.
 *
 * Written straight to CSS custom properties on the stage, on the same rAF clock
 * as everything else. React never sees it, so nothing re-renders while it runs.
 * The hotspot layer reads the same properties, so the points stay welded to the
 * features they are pointing at.
 */

/** Peak displacement in px at full strength. */
const AMPLITUDE = 8;
/** How far the frame is scaled up, to keep its edges outside the viewport. */
const OVERSCAN = 1.014;
/** Pointer follow and strength easing, per frame at 60fps. */
const POINTER_LERP = 0.06;
const STRENGTH_LERP = 0.05;

export class PointerDrift {
  private stage: HTMLElement;
  private enabled: boolean;
  private raf = 0;

  /** Pointer position, -1..1 from the centre of the viewport. */
  private targetX = 0;
  private targetY = 0;
  private x = 0;
  private y = 0;

  /** 0 while the camera moves, 1 while it holds. */
  private targetStrength = 0;
  private strength = 0;

  constructor(stage: HTMLElement) {
    this.stage = stage;
    // No pointer to follow on touch, and this is exactly the kind of motion
    // someone asking for less of it means.
    this.enabled =
      window.matchMedia('(hover: hover)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!this.enabled) return;

    this.onPointerMove = this.onPointerMove.bind(this);
    this.loop = this.loop.bind(this);
    window.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.raf = requestAnimationFrame(this.loop);
  }

  /** Called by the engine as the walk enters and leaves a stop. */
  setStrength(value: number) {
    this.targetStrength = Math.min(1, Math.max(0, value));
  }

  private onPointerMove(e: PointerEvent) {
    this.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  private loop() {
    this.x += (this.targetX - this.x) * POINTER_LERP;
    this.y += (this.targetY - this.y) * POINTER_LERP;
    this.strength += (this.targetStrength - this.strength) * STRENGTH_LERP;

    const s = this.strength;
    const style = this.stage.style;

    /*
     * The film is only promoted to its own layer while there is drift to apply.
     * Leaving the transform on for the whole walk makes every glass pane above
     * it re-read a composited layer on each seeked frame, which is the expensive
     * half of the effect and is pure waste while the camera is moving. Below a
     * twentieth of a pixel there is nothing to see, so the class comes off and
     * the transform with it.
     */
    const drifting = s > 0.006;
    if (drifting !== this.stage.classList.contains('is-drifting')) {
      this.stage.classList.toggle('is-drifting', drifting);
    }
    if (!drifting) {
      this.raf = requestAnimationFrame(this.loop);
      return;
    }
    // Against the pointer, not with it: the frame leans away as you approach,
    // which is what parallax does when you move your head.
    style.setProperty('--drift-x', `${(-this.x * AMPLITUDE * s).toFixed(2)}px`);
    style.setProperty('--drift-y', `${(-this.y * AMPLITUDE * s).toFixed(2)}px`);
    style.setProperty('--drift-scale', (1 + (OVERSCAN - 1) * s).toFixed(4));

    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    if (!this.enabled) return;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('pointermove', this.onPointerMove);
    this.stage.classList.remove('is-drifting');
    for (const prop of ['--drift-x', '--drift-y', '--drift-scale']) {
      this.stage.style.removeProperty(prop);
    }
  }
}
