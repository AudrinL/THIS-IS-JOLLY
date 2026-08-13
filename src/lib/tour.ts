/**
 * Typed access to tour-map.json.
 *
 * tour-map.json is the single source of truth for the whole experience:
 * timings, chapter structure, room names, colours and scroll positions all
 * come from here. Nothing in the UI hardcodes a room name or a timestamp.
 */
import raw from '@/data/tour-map.json';

export type Environment = 'interior' | 'exterior';
export type Level = 'grounds' | 'lower' | 'ground' | 'upper' | 'aerial';
export type TransitionIn = 'open' | 'cut' | 'continuous';
export type BoundaryPrecision = 'cut' | 'approx';

export interface Space {
  id: string;
  index: number;
  slug: string;
  name: string;
  chapterId: string;
  start: number;
  end: number;
  duration: number;
  midpoint: number;
  scrollStart: number;
  scrollEnd: number;
  posterTime: number;
  boundaryPrecision: BoundaryPrecision;
  transitionIn: TransitionIn;
  environment: Environment;
  level: Level;
  category: string;
  isPassage: boolean;
  /** Text burned into the video itself. When set, the UI must not draw its own label. */
  onScreenLabel: string | null;
  avgColor: string;
  accentColor: string;
  visualElements: string[];
}

export interface Chapter {
  id: string;
  name: string;
  start: number;
  end: number;
  scrollStart: number;
  scrollEnd: number;
  spaceIds: string[];
}

export interface Caption {
  text: string;
  start: number;
  end: number;
  spaceId: string;
  burnedIn: boolean;
  position: string;
}

export interface TourMap {
  $schema: string;
  version: string;
  generated: string;
  source: {
    file: string;
    container: string;
    codec: string;
    duration: number;
    fps: number;
    width: number;
    height: number;
    aspect: string;
    audio: boolean;
  };
  property: { title: string; styleNotes: string; levels: Level[] };
  analysis: {
    spaceCount: number;
    chapterCount: number;
    hardCuts: number;
    continuousTakes: { start: number; end: number }[];
    boundaryMethod: string;
    note: string;
  };
  chapters: Chapter[];
  spaces: Space[];
  captions: Caption[];
  /** Hard cut timestamps, frame accurate. */
  cuts: number[];
}

export const tour = raw as unknown as TourMap;

/**
 * Chapters deliberately left out of the walkthrough.
 *
 * The tour opens on the Ground Floor rather than the exterior approach. The
 * data is left untouched — this is a presentation decision, so it lives here
 * and can be reversed by emptying the set.
 */
export const EXCLUDED_CHAPTER_IDS = new Set<string>(['c1']);

/** Everything in the file, including excluded chapters. */
export const ALL_CHAPTERS = tour.chapters;
export const ALL_SPACES = tour.spaces;

/** What the tour actually walks through. */
export const CHAPTERS = ALL_CHAPTERS.filter((c) => !EXCLUDED_CHAPTER_IDS.has(c.id));
export const SPACES = ALL_SPACES.filter((s) => !EXCLUDED_CHAPTER_IDS.has(s.chapterId));

export const CAPTIONS = tour.captions.filter((c) => {
  const space = ALL_SPACES.find((s) => s.id === c.spaceId);
  return space ? !EXCLUDED_CHAPTER_IDS.has(space.chapterId) : true;
});
export const CUTS = tour.cuts;

/** Where the walk begins and ends, in the master's own timeline. */
export const TOUR_START = CHAPTERS[0].start;
export const TOUR_END = CHAPTERS[CHAPTERS.length - 1].end;
export const TOUR_DURATION = TOUR_END - TOUR_START;

/** The walkthrough's length — what the interface should quote. */
export const DURATION = TOUR_DURATION;

/**
 * Position in the encoded file set (1-based).
 *
 * Deliberately indexes the *full* chapter list: the media on disk is named for
 * the original numbering, so dropping a chapter must not rename anything.
 */
export function chapterFileNumber(chapter: Chapter): number {
  return ALL_CHAPTERS.indexOf(chapter) + 1;
}

/** Position as shown to the visitor, after exclusions. */
export function chapterNumber(chapter: Chapter): number {
  return CHAPTERS.indexOf(chapter) + 1;
}

export function chapterById(id: string): Chapter | undefined {
  return CHAPTERS.find((c) => c.id === id);
}

export function spaceById(id: string): Space | undefined {
  return SPACES.find((s) => s.id === id);
}

/** Chapter containing a given tour time, clamped to the walk's own range. */
export function chapterAt(time: number): Chapter {
  for (const c of CHAPTERS) {
    if (time >= c.start && time < c.end) return c;
  }
  return time < TOUR_START ? CHAPTERS[0] : CHAPTERS[CHAPTERS.length - 1];
}

/** Global tour time -> time within that chapter's own video file. */
export function localTime(time: number, chapter: Chapter): number {
  return Math.max(0, Math.min(chapter.end - chapter.start, time - chapter.start));
}

/** Scroll progress (0..1) -> time in the master's timeline. */
export function timeAtProgress(progress: number): number {
  return TOUR_START + Math.max(0, Math.min(1, progress)) * TOUR_DURATION;
}

/** Time in the master's timeline -> seconds elapsed in the walk. */
export function elapsed(time: number): number {
  return Math.max(0, Math.min(TOUR_DURATION, time - TOUR_START));
}

/**
 * Spaces worth surfacing a contextual panel for.
 *
 * Passages and very short beats are skipped — the architecture should carry the
 * frame, not the interface. Spaces whose label is already burned into the video
 * are skipped too, so we never print a caption twice on screen.
 */
export function isNarratable(space: Space): boolean {
  return (
    !space.isPassage &&
    space.duration >= 4 &&
    space.onScreenLabel === null &&
    space.category !== 'title' &&
    space.category !== 'outro' &&
    space.category !== 'montage'
  );
}

export const NARRATABLE = SPACES.filter(isNarratable);

/** Chapters annotated with the derived values the UI needs. */
export const CHAPTER_VIEWS = CHAPTERS.map((c, i) => ({
  ...c,
  number: i + 1,
  spaces: c.spaceIds.map((id) => spaceById(id)!).filter(Boolean),
  duration: c.end - c.start,
}));

export type ChapterView = (typeof CHAPTER_VIEWS)[number];
