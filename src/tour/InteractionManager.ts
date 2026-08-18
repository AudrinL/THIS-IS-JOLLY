import { Chapter, Space } from '@/lib/tour';
import type { ChapterIntro, ResolvedStop } from './Timeline';

export type Phase = 'hero' | 'opening' | 'tour';

export interface TourState {
  phase: Phase;
  /** 0..1 across the tour portion only. */
  progress: number;
  time: number;
  chapter: Chapter | null;
  space: Space | null;
  /** The space a glass panel should describe, or null for none. */
  panel: Space | null;
  /** The stop currently being annotated, or null between them. */
  stop: ResolvedStop | null;
  /** The chapter announcing itself, or null when no title card is on screen. */
  intro: ChapterIntro | null;
}

/**
 * Decides what the interface is allowed to show, and tells React only when the
 * answer actually changes.
 *
 * The scroll layer runs at 60fps; React must not. Everything here is compared
 * before it is published, so a component re-renders on the order of forty times
 * across the whole tour rather than tens of thousands.
 */
export class InteractionManager {
  private state: TourState = {
    phase: 'hero',
    progress: 0,
    time: 0,
    chapter: null,
    space: null,
    panel: null,
    stop: null,
    intro: null,
  };
  private listeners = new Set<(s: TourState) => void>();

  /**
   * Dwell progress gets its own channel.
   *
   * It changes every frame during a hold, so publishing it through the main
   * state would re-render the entire tour subtree sixty times a second. Only
   * the hotspot layer subscribes here, and only meaningful deltas are sent.
   */
  private dwellListeners = new Set<(p: number) => void>();
  private lastDwell = -1;

  /**
   * Chapter title cards, likewise: the card's own fade is driven by where the
   * walk sits inside its window, so only the title layer subscribes.
   */
  private introListeners = new Set<(p: number) => void>();
  private lastIntro = -1;

  /**
   * Overall progress, on the same principle: it changes continuously, so only
   * the rail's progress track listens, and only past a threshold.
   */
  private progressListeners = new Set<(p: number) => void>();
  private lastProgress = -1;

  /**
   * Film time, for the one thing that needs to move between rooms rather than
   * at them: the marker on the plan.
   *
   * Every other channel here exists to stop React re-rendering. This one exists
   * because the plan has to move smoothly and React must still not re-render —
   * so the subscriber writes a transform straight onto the SVG and never calls
   * setState at all. The threshold is a twentieth of a second of film, which is
   * finer than the marker can be seen to move and far coarser than the sixty
   * updates a second the scroll layer would otherwise deliver.
   */
  private cameraListeners = new Set<(time: number) => void>();
  private lastCameraTime = -1;

  subscribe(fn: (s: TourState) => void): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  getState(): TourState {
    return this.state;
  }

  subscribeDwell(fn: (p: number) => void): () => void {
    this.dwellListeners.add(fn);
    return () => this.dwellListeners.delete(fn);
  }

  setDwell(progress: number) {
    if (Math.abs(progress - this.lastDwell) < 0.005) return;
    this.lastDwell = progress;
    for (const fn of this.dwellListeners) fn(progress);
  }

  subscribeIntro(fn: (p: number) => void): () => void {
    this.introListeners.add(fn);
    return () => this.introListeners.delete(fn);
  }

  setIntro(progress: number) {
    if (Math.abs(progress - this.lastIntro) < 0.005) return;
    this.lastIntro = progress;
    for (const fn of this.introListeners) fn(progress);
  }

  subscribeProgress(fn: (p: number) => void): () => void {
    this.progressListeners.add(fn);
    fn(this.lastProgress < 0 ? 0 : this.lastProgress);
    return () => this.progressListeners.delete(fn);
  }

  setProgress(progress: number) {
    if (Math.abs(progress - this.lastProgress) < 0.0015) return;
    this.lastProgress = progress;
    for (const fn of this.progressListeners) fn(progress);
  }

  subscribeCamera(fn: (time: number) => void): () => void {
    this.cameraListeners.add(fn);
    if (this.lastCameraTime >= 0) fn(this.lastCameraTime);
    return () => this.cameraListeners.delete(fn);
  }

  setCamera(time: number) {
    if (Math.abs(time - this.lastCameraTime) < 0.05) return;
    this.lastCameraTime = time;
    for (const fn of this.cameraListeners) fn(time);
  }

  /** Publishes only when a field the UI renders has changed. */
  update(next: Partial<TourState>) {
    const prev = this.state;
    const merged = { ...prev, ...next };

    const changed =
      merged.phase !== prev.phase ||
      merged.chapter?.id !== prev.chapter?.id ||
      merged.space?.id !== prev.space?.id ||
      merged.panel?.id !== prev.panel?.id ||
      merged.stop?.slug !== prev.stop?.slug ||
      merged.intro?.chapter.id !== prev.intro?.chapter.id;

    this.state = merged;
    if (changed) for (const fn of this.listeners) fn(merged);
  }

  destroy() {
    this.listeners.clear();
    this.cameraListeners.clear();
    this.dwellListeners.clear();
    this.introListeners.clear();
    this.progressListeners.clear();
  }
}
