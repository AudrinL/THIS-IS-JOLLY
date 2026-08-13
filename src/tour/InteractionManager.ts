import { Chapter, Space } from '@/lib/tour';
import type { ResolvedStop } from './Timeline';

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
  /** The stop currently being held on, or null while the camera is moving. */
  stop: ResolvedStop | null;
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
   * Overall progress, on the same principle: it changes continuously, so only
   * the rail's progress track listens, and only past a threshold.
   */
  private progressListeners = new Set<(p: number) => void>();
  private lastProgress = -1;

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

  /** Publishes only when a field the UI renders has changed. */
  update(next: Partial<TourState>) {
    const prev = this.state;
    const merged = { ...prev, ...next };

    const changed =
      merged.phase !== prev.phase ||
      merged.chapter?.id !== prev.chapter?.id ||
      merged.space?.id !== prev.space?.id ||
      merged.panel?.id !== prev.panel?.id ||
      merged.stop?.slug !== prev.stop?.slug;

    this.state = merged;
    if (changed) for (const fn of this.listeners) fn(merged);
  }

  destroy() {
    this.listeners.clear();
    this.dwellListeners.clear();
    this.progressListeners.clear();
  }
}
