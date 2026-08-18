import { SPACES, Space, RANGES, TOUR_END, CHAPTERS, Chapter } from '@/lib/tour';
import { STOPS, StopDefinition } from '@/data/stops';

/**
 * The scroll-to-time map.
 *
 * One second of film costs the same scroll everywhere, so the walk is moving
 * whenever the visitor is. This used to alternate motion with `dwell` segments
 * — stretches that consumed scroll while the video held on a single frame, so a
 * room could explain itself. The page was still scrolling underneath, but a
 * frozen frame under a turning wheel reads as the site having stalled rather
 * than as a considered pause, and no amount of easing argues the eye out of it.
 *
 * The stops survive; they are windows laid over the moving film instead of
 * holes punched in it. See `stopWindow` for what sets their width.
 */

export interface Segment {
  fromTime: number;
  toTime: number;
  px: number;
}

export interface ResolvedStop extends StopDefinition {
  space: Space;
  /** The frame the hotspot coordinates were placed against. */
  time: number;
  /** Film time over which the annotation fades up, holds, and leaves. */
  fromTime: number;
  toTime: number;
}

/** A chapter's title card: the window of film it is on screen over. */
export interface ChapterIntro {
  chapter: Chapter;
  fromTime: number;
  toTime: number;
}

export interface Resolved {
  segments: Segment[];
  totalPx: number;
  stops: ResolvedStop[];
  intros: ChapterIntro[];
}

export interface TimelineOptions {
  /** Scroll distance spent on one second of film. */
  pxPerSecond: number;
}

/**
 * How long a stop's annotation stays on screen, in seconds of film.
 *
 * `hold` used to buy stillness, and could be generous because the frame wasn't
 * going anywhere. It now buys travel: the camera keeps moving underneath, and
 * the hotspot coordinates were placed by eye against the frame at `time`, so a
 * wide window walks the marks off the features they point at. Centring on that
 * frame splits the error either side of the moment the aim is exact, and the
 * clamp keeps a window from spilling into the neighbouring room.
 */
function stopWindow(time: number, space: Space, hold: number) {
  const half = hold / 2;
  return {
    fromTime: Math.max(space.start, time - half),
    toTime: Math.min(space.end, time + half),
  };
}

/** Seconds of film a chapter's title card is on screen. */
const INTRO_SECONDS = 7;
/** A beat after the chapter's first frame, so the card doesn't land on the cut. */
const INTRO_LEAD = 0.6;
/** Clear air between a stop's annotation leaving and a title arriving. */
const INTRO_GAP = 0.4;

/**
 * Where each chapter announces itself.
 *
 * The card wants the frame to itself — a chapter title and a room's hotspots
 * competing for the same seconds is two things asking to be read at once — so
 * the window is slid past any stop it would collide with rather than layered on
 * top. Wellness & Grounds needs this: the pool terrace is annotated on the
 * chapter's opening frames, and its title lands just after those marks leave.
 *
 * A chapter with no clear stretch long enough goes without a card rather than
 * getting a clipped one.
 */
function layoutIntros(stops: ResolvedStop[]): ChapterIntro[] {
  const intros: ChapterIntro[] = [];

  for (const chapter of CHAPTERS) {
    let from = chapter.start + INTRO_LEAD;
    // Stops are time-ordered, so one forward pass settles the window: each
    // collision can only push it later, never back into a stop already cleared.
    for (const stop of stops) {
      if (stop.toTime <= from || stop.fromTime >= from + INTRO_SECONDS) continue;
      from = stop.toTime + INTRO_GAP;
    }
    if (from + INTRO_SECONDS > chapter.end) continue;
    intros.push({ chapter, fromTime: from, toTime: from + INTRO_SECONDS });
  }

  return intros;
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
    // Aim a little past the room's midpoint — by then the camera has usually
    // settled and the frame is representative.
    const time = Math.min(space.end - 0.35, space.start + space.duration * (def.at ?? 0.55));
    return [{ ...def, space, time, ...stopWindow(time, space, def.hold) }];
  }).sort((a, b) => a.time - b.time);

  const segments: Segment[] = [];
  const stops: ResolvedStop[] = [];

  for (const range of RANGES) {
    segments.push({
      fromTime: range.start,
      toTime: range.end,
      px: (range.end - range.start) * opts.pxPerSecond,
    });
    for (const stop of candidates) {
      if (stop.time > range.start && stop.time < range.end) stops.push(stop);
    }
  }

  const totalPx = segments.reduce((sum, s) => sum + s.px, 0);
  return { segments, totalPx, stops, intros: layoutIntros(stops) };
}

export interface Sample {
  time: number;
  /** The stop whose window the walk is inside, or null between them. */
  stop: ResolvedStop | null;
  /** 0..1 through that window — drives the marks in and back out. */
  dwellProgress: number;
  /** The chapter title card on screen, or null. */
  intro: ChapterIntro | null;
  /** 0..1 through the card's window. */
  introProgress: number;
}

/**
 * The stop covering a time, or null.
 *
 * Windows are clamped to their own room and rooms don't overlap, so the first
 * match is the only match; the scan is over eleven stops and runs once a frame.
 */
function stopAt(stops: ResolvedStop[], time: number): ResolvedStop | null {
  for (const stop of stops) {
    if (time >= stop.fromTime && time <= stop.toTime) return stop;
  }
  return null;
}

/** Map progress across the tour portion (0..1) to a time and stop state. */
export function sample(resolved: Resolved, progress: number): Sample {
  const target = Math.max(0, Math.min(1, progress)) * resolved.totalPx;
  let acc = 0;
  let time = TOUR_END;

  for (const seg of resolved.segments) {
    if (target <= acc + seg.px || seg === resolved.segments[resolved.segments.length - 1]) {
      const local = seg.px > 0 ? (target - acc) / seg.px : 0;
      const t = Math.max(0, Math.min(1, local));
      time = seg.fromTime + t * (seg.toTime - seg.fromTime);
      break;
    }
    acc += seg.px;
  }

  const stop = stopAt(resolved.stops, time);
  const span = stop ? stop.toTime - stop.fromTime : 0;
  const intro = resolved.intros.find((i) => time >= i.fromTime && time <= i.toTime) ?? null;

  return {
    time,
    stop,
    dwellProgress: stop && span > 0 ? (time - stop.fromTime) / span : 0,
    intro,
    introProgress: intro ? (time - intro.fromTime) / (intro.toTime - intro.fromTime) : 0,
  };
}

/** Progress (0..1) that lands on a given time — used by the sidebar and rail. */
export function progressAtTime(resolved: Resolved, time: number): number {
  let acc = 0;
  for (const seg of resolved.segments) {
    if (time <= seg.toTime) {
      const span = seg.toTime - seg.fromTime;
      const local = span > 0 ? (time - seg.fromTime) / span : 0;
      return (acc + Math.max(0, Math.min(1, local)) * seg.px) / resolved.totalPx;
    }
    acc += seg.px;
  }
  return 1;
}
