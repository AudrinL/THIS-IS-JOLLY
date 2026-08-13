import { Space, SPACES, isNarratable } from '@/lib/tour';

/**
 * Resolves a tour time to the space the camera is currently in.
 *
 * Spaces are ordered and non-overlapping, so a cursor plus a short local walk
 * beats a scan: scrolling moves the time by a small delta almost every frame.
 */
export class SegmentResolver {
  private cursor = 0;

  resolve(time: number): Space {
    const n = SPACES.length;
    let i = Math.min(this.cursor, n - 1);

    while (i < n - 1 && time >= SPACES[i].end) i++;
    while (i > 0 && time < SPACES[i].start) i--;

    this.cursor = i;
    return SPACES[i];
  }

  /**
   * The space a contextual panel should describe, or null.
   *
   * Panels are held back until the camera has settled a little way into a room,
   * and released before it leaves, so the interface never argues with a
   * transition. Passages, montages and rooms whose name is already burned into
   * the film are excluded upstream by isNarratable.
   */
  narratableAt(time: number): Space | null {
    const space = this.resolve(time);
    if (!isNarratable(space)) return null;

    const settle = Math.min(1.1, space.duration * 0.22);
    const leave = Math.min(0.9, space.duration * 0.18);
    if (time < space.start + settle) return null;
    if (time > space.end - leave) return null;
    return space;
  }
}
