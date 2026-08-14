import { SPACES, Space, RANGES, TOUR_END } from '@/lib/tour';
import { STOPS, StopDefinition } from '@/data/stops';

/**
 * The scroll-to-time map.
 *
 * A straight linear mapping makes the whole house feel like one unbroken dolly
 * shot. Instead the timeline is cut into alternating segments:
 *
 *   motion  scroll advances the video
 *   dwell   scroll advances, the video does not — the camera holds on a frame
 *           while the room explains itself
 *
 * Both consume scroll distance, so the visitor is always just scrolling. The
 * hold is produced by the mapping, not by intercepting or blocking the scroll,
 * which is what keeps it from feeling like the page has seized.
 */

export interface MotionSegment {
  kind: 'motion';
  fromTime: number;
  toTime: number;
  px: number;
}

export interface DwellSegment {
  kind: 'dwell';
  atTime: number;
  px: number;
  stop: ResolvedStop;
}

export type Segment = MotionSegment | DwellSegment;

export interface ResolvedStop extends StopDefinition {
  space: Space;
  /** Where the camera holds, in the master's timeline. */
  time: number;
}

export interface Resolved {
  segments: Segment[];
  totalPx: number;
  stops: ResolvedStop[];
}

/** Scroll distance spent on one second of moving film. */
export interface TimelineOptions {
  pxPerSecond: number;
  /** Scroll distance spent on one second of dwelling. */
  dwellPxPerSecond: number;
}

/**
 * Resolve stop definitions against the tour data and lay out the segments.
 *
 * Stops are authored against space slugs, so if a space is excluded or the
 * metadata changes, an unmatched stop is dropped rather than throwing.
 *
 * Motion is laid out one included range at a time. An excluded chapter in the
 * middle of the film leaves a gap in the master timeline, and no scroll distance
 * is spent crossing it — the walk steps straight from one range to the next.
 */
export function buildTimeline(opts: TimelineOptions): Resolved {
  const bySlug = new Map(SPACES.map((s) => [s.slug, s]));

  const candidates: ResolvedStop[] = STOPS.flatMap((def) => {
    const space = bySlug.get(def.slug);
    if (!space) return [];
    // Hold a little past the room's midpoint — by then the camera has usually
    // settled and the frame is representative.
    const time = Math.min(space.end - 0.35, space.start + space.duration * (def.at ?? 0.55));
    return [{ ...def, space, time }];
  }).sort((a, b) => a.time - b.time);

  const segments: Segment[] = [];
  const stops: ResolvedStop[] = [];

  for (const range of RANGES) {
    let cursor = range.start;

    for (const stop of candidates) {
      if (stop.time <= range.start || stop.time >= range.end) continue;
      stops.push(stop);
      if (stop.time > cursor) {
        segments.push({
          kind: 'motion',
          fromTime: cursor,
          toTime: stop.time,
          px: (stop.time - cursor) * opts.pxPerSecond,
        });
      }
      segments.push({
        kind: 'dwell',
        atTime: stop.time,
        px: stop.hold * opts.dwellPxPerSecond,
        stop,
      });
      cursor = stop.time;
    }

    if (cursor < range.end) {
      segments.push({
        kind: 'motion',
        fromTime: cursor,
        toTime: range.end,
        px: (range.end - cursor) * opts.pxPerSecond,
      });
    }
  }

  const totalPx = segments.reduce((sum, s) => sum + s.px, 0);
  return { segments, totalPx, stops };
}

export interface Sample {
  time: number;
  /** The stop being held on, or null while moving. */
  stop: ResolvedStop | null;
  /** 0..1 through the current dwell — drives the hotspots in and out. */
  dwellProgress: number;
}

/** Map progress across the tour portion (0..1) to a time and dwell state. */
export function sample(resolved: Resolved, progress: number): Sample {
  const target = Math.max(0, Math.min(1, progress)) * resolved.totalPx;
  let acc = 0;

  for (const seg of resolved.segments) {
    if (target <= acc + seg.px || seg === resolved.segments[resolved.segments.length - 1]) {
      const local = seg.px > 0 ? (target - acc) / seg.px : 0;
      const t = Math.max(0, Math.min(1, local));
      if (seg.kind === 'motion') {
        return {
          time: seg.fromTime + t * (seg.toTime - seg.fromTime),
          stop: null,
          dwellProgress: 0,
        };
      }
      return { time: seg.atTime, stop: seg.stop, dwellProgress: t };
    }
    acc += seg.px;
  }

  return { time: TOUR_END, stop: null, dwellProgress: 0 };
}

/** Progress (0..1) that lands on a given time — used by the sidebar and rail. */
export function progressAtTime(resolved: Resolved, time: number): number {
  let acc = 0;
  for (const seg of resolved.segments) {
    if (seg.kind === 'motion') {
      if (time <= seg.toTime) {
        const span = seg.toTime - seg.fromTime;
        const local = span > 0 ? (time - seg.fromTime) / span : 0;
        return (acc + Math.max(0, Math.min(1, local)) * seg.px) / resolved.totalPx;
      }
    } else if (time < seg.atTime) {
      return acc / resolved.totalPx;
    }
    acc += seg.px;
  }
  return 1;
}
