/**
 * A schematic of the house, drawn as a plan, read off the film.
 *
 * This is a diagram, not a survey. No architectural drawings were used and none
 * are implied — but unlike the first pass, none of it is inferred from room
 * names either. Every wall, opening and waypoint below was read from frames of
 * the master, and the ones worth arguing about carry the timestamp that settles
 * them. Sizes are relative and readable, not measured. The interface says so
 * under every plate.
 *
 * ---------------------------------------------------------------------------
 * The mistake this file exists to not repeat
 *
 * tour-map.json records `analysis.continuousTakes`, and the walk contains four
 * of them. The longest, 33.38 -> 110.86, is a single unbroken shot through
 * seventeen spaces: the front door, the gallery, the great room, the living
 * room, under the staircase, the wine wall, into the dry kitchen, back out of
 * the dry kitchen the way it came, back across the living room, and only then
 * up the stair to the mezzanine, the master bedroom and the beauty studio.
 *
 * An earlier version of this file gave every space its own short path and let
 * the marker teleport between them. That is wrong twice over: it invents cuts
 * where the film has none, and it hides the fact that the walk doubles back,
 * which is most of what makes the house legible. The dry kitchen is a dead end.
 * So is the gym. You go in, and you come out the way you came.
 *
 * So paths are no longer per room. ROUTES holds one polyline per unbroken take,
 * every node stamped with the time it happens, and the marker reads its
 * position off the clock. Continuity is structural: there is no seam between
 * rooms at which a jump could be reintroduced. Between takes the marker does
 * jump, which is correct — the film cuts there.
 *
 * ---------------------------------------------------------------------------
 * Why rooms no longer imply walls
 *
 * The ground floor is not a grid of rooms. It is one long double-height volume
 * with the entrance at one end and the staircase at the other, full-height
 * gridded glazing down one side and lit display niches down the other. The
 * great room, the living room, the space under the stair and the wine wall are
 * areas *within* that volume, with nothing built between them. The first pass
 * drew them as nine walled boxes, which was invented.
 *
 * So `areas` — what gets lit, named and clicked — and `walls` — what is
 * actually built — are authored separately, and an area never implies a wall.
 * It is more authoring, and it is the only way a room that is not a box can be
 * drawn honestly.
 */
import { SPACES, spaceAt } from '@/lib/tour';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A named part of the plan. Areas are lit and clicked; they draw no walls. */
export interface PlanArea {
  id: string;
  /** Space ids this area stands for. */
  spaceIds: string[];
  label: string;
  /** One rect for a simple room, more for an L or a U. */
  rects: Rect[];
  /** Outdoors: a dashed site edge rather than a built room. */
  exterior?: boolean;
  /** Passed through rather than arrived at. */
  passage?: boolean;
}

/**
 * A piece of built fabric.
 *
 * Authored as segments rather than derived from the rooms, so a doorway is
 * simply where one wall stops and the next begins. `glazing` is a wall you can
 * see through, drawn as a double line; `balustrade` is the edge of a void,
 * drawn light and dashed.
 */
export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: 'exterior' | 'internal' | 'glazing' | 'balustrade';
}

/** The swing symbol drawn into a gap. A mark only — the gap is in the walls. */
export interface Door {
  x: number;
  y: number;
  len: number;
  dir: 'h' | 'v';
  swing: 1 | -1;
}

export type FixtureKind =
  | 'block' // a solid piece: bed, table, sofa, island
  | 'thin' // a run against a wall: counter, shelving, wine wall, bench
  | 'treads' // a stair, drawn as its risers
  | 'water'
  | 'planting'
  | 'rows' // repeated seats or machines
  | 'round' // chair, bath, chandelier
  | 'screen';

export interface Fixture {
  kind: FixtureKind;
  x: number;
  y: number;
  w: number;
  h: number;
  dir?: 'h' | 'v';
  n?: number;
}

export interface PlanLevel {
  id: string;
  name: string;
  /** Plates are sized to their own floor rather than to one shared grid. */
  w: number;
  h: number;
  areas: PlanArea[];
  walls: Wall[];
  doors: Door[];
  fixtures: Fixture[];
  voids: Rect[];
}

/* ------------------------------------------------------------------ ground */

/**
 * Read from 33-87s.
 *
 * In through the pivot door at 34s to a corridor with a lit glass case one side
 * and a mirrored console the other. At 44s it opens into the volume: a dining
 * table under the halo rings, against the glazing. Past it the living room
 * sectional, 48-52s. At 52s the camera turns and the staircase is there, rising
 * against the glass at the far end, with a *second*, formal dining table
 * underneath it and the backlit wine wall behind that, 53-57s. The hall and the
 * dry kitchen open off the far side, 59-71s, and the kitchen is a dead end.
 */
const GROUND: PlanLevel = {
  id: 'ground',
  name: 'Ground',
  w: 110,
  h: 64,
  voids: [],
  areas: [
    // The entry corridor is one corridor; tour-map splits it into a foyer at
    // the door end and the gallery beyond, and the film bears that out - the
    // lit cases start about a third of the way along, at 39s.
    { id: 'foyer', spaceIds: ['s06'], label: 'Entrance Foyer', rects: [{ x: 4, y: 20, w: 12, h: 14 }] },
    { id: 'gallery', spaceIds: ['s07'], label: 'Wine Gallery', rects: [{ x: 16, y: 20, w: 14, h: 14 }], passage: true },
    // The volume, in four named stretches with nothing built between them.
    { id: 'great', spaceIds: ['s08'], label: 'Dining & Great Room', rects: [{ x: 30, y: 8, w: 22, h: 36 }] },
    { id: 'living', spaceIds: ['s09', 's14'], label: 'Living Room', rects: [{ x: 52, y: 8, w: 16, h: 36 }] },
    // The flight itself, and the room underneath it. They are different things:
    // the walk eats under the stair at 53-57s and only climbs it at 77s.
    { id: 'stair', spaceIds: ['s15'], label: 'Feature Staircase', rects: [{ x: 68, y: 8, w: 18, h: 9 }] },
    { id: 'stair-hall', spaceIds: ['s10'], label: 'Dining Stair Hall', rects: [{ x: 68, y: 17, w: 18, h: 15 }] },
    { id: 'cellar', spaceIds: ['s11'], label: 'Wine Cellar Lounge', rects: [{ x: 68, y: 32, w: 18, h: 12 }] },
    { id: 'hall', spaceIds: ['s13'], label: 'Rear Hall', rects: [{ x: 86, y: 30, w: 12, h: 14 }], passage: true },
    { id: 'kitchen', spaceIds: ['s12'], label: 'Dry Kitchen', rects: [{ x: 86, y: 8, w: 22, h: 22 }] },
  ],
  walls: [
    // Envelope, with the front door left out of the west wall.
    { x1: 30, y1: 8, x2: 108, y2: 8, kind: 'exterior' },
    { x1: 108, y1: 8, x2: 108, y2: 30, kind: 'exterior' },
    { x1: 108, y1: 30, x2: 98, y2: 30, kind: 'exterior' },
    { x1: 98, y1: 30, x2: 98, y2: 44, kind: 'exterior' },
    { x1: 98, y1: 44, x2: 30, y2: 44, kind: 'exterior' },
    { x1: 30, y1: 44, x2: 30, y2: 34, kind: 'exterior' },
    { x1: 30, y1: 34, x2: 4, y2: 34, kind: 'exterior' },
    { x1: 4, y1: 34, x2: 4, y2: 30, kind: 'exterior' },
    { x1: 4, y1: 24, x2: 4, y2: 20, kind: 'exterior' },
    { x1: 4, y1: 20, x2: 30, y2: 20, kind: 'exterior' },
    { x1: 30, y1: 20, x2: 30, y2: 8, kind: 'exterior' },

    // The kitchen is sealed off the volume and reached only through the hall,
    // which is exactly why the walk has to come back out the way it went in.
    { x1: 86, y1: 8, x2: 86, y2: 30, kind: 'internal' },
    { x1: 86, y1: 30, x2: 86, y2: 34, kind: 'internal' },
    { x1: 86, y1: 40, x2: 86, y2: 44, kind: 'internal' },
    { x1: 86, y1: 30, x2: 89, y2: 30, kind: 'internal' },
    { x1: 95, y1: 30, x2: 98, y2: 30, kind: 'internal' },

    // The glazed elevation the whole volume is arranged along.
    { x1: 32, y1: 8, x2: 84, y2: 8, kind: 'glazing' },
    { x1: 90, y1: 8, x2: 104, y2: 8, kind: 'glazing' },
  ],
  doors: [
    { x: 4, y: 24, len: 6, dir: 'v', swing: 1 }, // the pivot front door, 34s
    { x: 86, y: 34, len: 6, dir: 'v', swing: -1 },
    { x: 89, y: 30, len: 6, dir: 'h', swing: 1 },
  ],
  fixtures: [
    { kind: 'thin', x: 17, y: 20.6, w: 12, h: 1.5 }, // lit glass case, 39-42s
    { kind: 'thin', x: 17, y: 31.9, w: 12, h: 1.5 }, // mirrored console opposite
    { kind: 'block', x: 36, y: 13, w: 15, h: 7 }, // dining table A
    { kind: 'round', x: 38, y: 14.5, w: 4, h: 4 }, // the halo rings above it
    { kind: 'round', x: 44, y: 14.5, w: 4, h: 4 },
    { kind: 'thin', x: 32, y: 42.3, w: 18, h: 1.6 }, // lit display niches
    { kind: 'round', x: 56, y: 24, w: 8, h: 5 }, // stone coffee table
    { kind: 'block', x: 54, y: 32, w: 16, h: 8 }, // the sectional
    { kind: 'thin', x: 54, y: 42.3, w: 12, h: 1.4 }, // media wall and fireplace
    { kind: 'treads', x: 68, y: 9, w: 17, h: 7, dir: 'h', n: 12 }, // rises on the glass
    { kind: 'block', x: 70, y: 20, w: 14, h: 7 }, // dining table B, under the stair
    { kind: 'thin', x: 70, y: 42.3, w: 14, h: 1.6 }, // the backlit wine wall
    { kind: 'thin', x: 88, y: 8.8, w: 18, h: 1.6 }, // kitchen run
    { kind: 'block', x: 90, y: 16, w: 14, h: 5 }, // island under the crystal drop
    { kind: 'thin', x: 106.4, y: 12, w: 1.6, h: 14 },
    { kind: 'thin', x: 96.4, y: 33, w: 1.6, h: 9 }, // the hall console, 59s
  ],
};

/* ------------------------------------------------------------------- upper */

/**
 * Read from 84-172s.
 *
 * The stair arrives on a landing running the length of the void, balustrade on
 * the void side, panelled wall and art on the other, 85-90s. It opens into the
 * mezzanine lounge, 91-97s, and the master bedroom is entered off that at 98s:
 * long, bed at one end, media console opposite, curtained glazing down one
 * side. The beauty studio is through the far door at 107s and is a dead end.
 *
 * After the cut at 110.86 the closet is one very long straight gallery, cases
 * both sides, walked down and back. It ends at a vanity that opens into the
 * master bathroom at 155s, and the bathroom opens back into the bedroom at
 * 161s — so closet, bathroom and bedroom are a loop, not a chain.
 */
const UPPER: PlanLevel = {
  id: 'upper',
  name: 'Upper',
  w: 100,
  h: 64,
  voids: [{ x: 14, y: 0, w: 34, h: 32 }],
  areas: [
    // tour-map calls this one room, "Upper Landing & Mezzanine Lounge", and the
    // film agrees: a single U wrapping three sides of the void.
    {
      id: 'mezzanine',
      spaceIds: ['s16', 's22'],
      label: 'Landing & Mezzanine',
      rects: [
        { x: 0, y: 0, w: 14, h: 40 },
        { x: 14, y: 32, w: 34, h: 8 },
        { x: 48, y: 0, w: 14, h: 40 },
      ],
    },
    { id: 'beauty', spaceIds: ['s18'], label: 'Beauty Studio', rects: [{ x: 0, y: 40, w: 20, h: 24 }] },
    { id: 'bedroom', spaceIds: ['s17', 's21'], label: 'Master Bedroom', rects: [{ x: 20, y: 40, w: 30, h: 24 }] },
    { id: 'bathroom', spaceIds: ['s20'], label: 'Master Bathroom', rects: [{ x: 50, y: 40, w: 24, h: 24 }] },
    { id: 'closet', spaceIds: ['s19'], label: 'Walk-In Closet', rects: [{ x: 74, y: 0, w: 26, h: 64 }] },
  ],
  walls: [
    { x1: 0, y1: 0, x2: 62, y2: 0, kind: 'exterior' },
    { x1: 62, y1: 0, x2: 62, y2: 40, kind: 'exterior' },
    { x1: 62, y1: 40, x2: 74, y2: 40, kind: 'exterior' },
    { x1: 74, y1: 40, x2: 74, y2: 0, kind: 'exterior' },
    { x1: 74, y1: 0, x2: 100, y2: 0, kind: 'exterior' },
    { x1: 100, y1: 0, x2: 100, y2: 64, kind: 'exterior' },
    { x1: 100, y1: 64, x2: 0, y2: 64, kind: 'exterior' },
    { x1: 0, y1: 64, x2: 0, y2: 0, kind: 'exterior' },

    { x1: 0, y1: 40, x2: 30, y2: 40, kind: 'internal' },
    { x1: 36, y1: 40, x2: 62, y2: 40, kind: 'internal' },
    { x1: 20, y1: 40, x2: 20, y2: 48, kind: 'internal' },
    { x1: 20, y1: 54, x2: 20, y2: 64, kind: 'internal' },
    { x1: 50, y1: 40, x2: 50, y2: 48, kind: 'internal' },
    { x1: 50, y1: 54, x2: 50, y2: 64, kind: 'internal' },
    { x1: 74, y1: 40, x2: 74, y2: 48, kind: 'internal' },
    { x1: 74, y1: 54, x2: 74, y2: 64, kind: 'internal' },

    // The gallery edges are balustrade, not wall — you look straight down into
    // the great room from all three sides, 94-96s.
    { x1: 14, y1: 0, x2: 14, y2: 32, kind: 'balustrade' },
    { x1: 14, y1: 32, x2: 48, y2: 32, kind: 'balustrade' },
    { x1: 48, y1: 0, x2: 48, y2: 32, kind: 'balustrade' },

    { x1: 22, y1: 64, x2: 48, y2: 64, kind: 'glazing' }, // the bedroom's curtained wall
    { x1: 2, y1: 0, x2: 12, y2: 0, kind: 'glazing' },
  ],
  doors: [
    { x: 30, y: 40, len: 6, dir: 'h', swing: 1 },
    { x: 20, y: 48, len: 6, dir: 'v', swing: -1 },
    { x: 50, y: 48, len: 6, dir: 'v', swing: 1 },
    { x: 74, y: 48, len: 6, dir: 'v', swing: 1 },
  ],
  fixtures: [
    { kind: 'block', x: 3, y: 14, w: 8, h: 12 }, // mezzanine seating, 92s
    { kind: 'thin', x: 1, y: 41, w: 18, h: 1.6 }, // the treatment run
    { kind: 'round', x: 6, y: 50, w: 8, h: 5 },
    { kind: 'block', x: 30, y: 56, w: 14, h: 7 }, // the bed
    { kind: 'thin', x: 22, y: 41, w: 24, h: 1.6 }, // media console opposite it
    { kind: 'round', x: 54, y: 44, w: 9, h: 5.5 }, // bath
    { kind: 'thin', x: 51, y: 61, w: 20, h: 1.7 },
    // Cases down both long sides for the whole length — this is the room.
    { kind: 'thin', x: 75.4, y: 2, w: 1.7, h: 60 },
    { kind: 'thin', x: 97, y: 2, w: 1.7, h: 60 },
    { kind: 'block', x: 84, y: 28, w: 6, h: 8 }, // the centre plinth
  ],
};

/* -------------------------------------------------------- lower & grounds */

/**
 * Read from 214-294s.
 *
 * The games room's glazing looks straight out at the lit lap pool, 214-224s, so
 * it is drawn at pool level rather than on the storey tour-map assigns it — the
 * two disagree and the film is the authority. The theatre next door is a sealed
 * box: two rows of recliners, one door, 226-238s.
 *
 * The gym is not in the house. It is a glass pavilion at the end of an outdoor
 * path along a lawn, 244-248s; the walk goes out to it, in, and back out to the
 * same path at 268s before carrying on to the salon at 270s. The same dead-end
 * shape as the dry kitchen.
 */
const LOWER: PlanLevel = {
  id: 'lower',
  name: 'Lower & Grounds',
  w: 120,
  h: 64,
  voids: [],
  areas: [
    { id: 'games', spaceIds: ['s29'], label: 'Games Room', rects: [{ x: 6, y: 4, w: 40, h: 20 }] },
    { id: 'theater', spaceIds: ['s30'], label: 'Movie Theater', rects: [{ x: 46, y: 4, w: 26, h: 20 }] },
    { id: 'terrace', spaceIds: ['s31'], label: 'Pool Terrace', rects: [{ x: 0, y: 26, w: 78, h: 14 }], exterior: true },
    { id: 'garden', spaceIds: ['s32'], label: 'Garden Walk', rects: [{ x: 78, y: 26, w: 40, h: 14 }], exterior: true, passage: true },
    { id: 'walk', spaceIds: ['s34'], label: 'Salon Approach', rects: [{ x: 4, y: 40, w: 114, h: 6 }], exterior: true, passage: true },
    { id: 'gym', spaceIds: ['s33'], label: 'Gym', rects: [{ x: 80, y: 46, w: 36, h: 16 }] },
    { id: 'salon', spaceIds: ['s35'], label: 'Hair Salon', rects: [{ x: 38, y: 46, w: 38, h: 16 }] },
    { id: 'steam', spaceIds: ['s36'], label: 'Steam Room', rects: [{ x: 4, y: 46, w: 34, h: 16 }] },
  ],
  walls: [
    // The house: games room and theatre.
    { x1: 4, y1: 2, x2: 74, y2: 2, kind: 'exterior' },
    { x1: 74, y1: 2, x2: 74, y2: 26, kind: 'exterior' },
    { x1: 74, y1: 26, x2: 46, y2: 26, kind: 'exterior' },
    { x1: 4, y1: 26, x2: 4, y2: 2, kind: 'exterior' },
    { x1: 46, y1: 2, x2: 46, y2: 12, kind: 'internal' },
    { x1: 46, y1: 18, x2: 46, y2: 26, kind: 'internal' },
    { x1: 6, y1: 26, x2: 44, y2: 26, kind: 'glazing' }, // straight onto the pool

    // The gym pavilion: glass on all four sides, 248s.
    { x1: 80, y1: 46, x2: 96, y2: 46, kind: 'glazing' },
    { x1: 102, y1: 46, x2: 116, y2: 46, kind: 'glazing' },
    { x1: 116, y1: 46, x2: 116, y2: 62, kind: 'glazing' },
    { x1: 116, y1: 62, x2: 80, y2: 62, kind: 'glazing' },
    { x1: 80, y1: 62, x2: 80, y2: 46, kind: 'glazing' },

    // Salon and steam room.
    { x1: 4, y1: 46, x2: 54, y2: 46, kind: 'exterior' },
    { x1: 60, y1: 46, x2: 76, y2: 46, kind: 'exterior' },
    { x1: 76, y1: 46, x2: 76, y2: 62, kind: 'exterior' },
    { x1: 76, y1: 62, x2: 4, y2: 62, kind: 'exterior' },
    { x1: 4, y1: 62, x2: 4, y2: 46, kind: 'exterior' },
    { x1: 38, y1: 46, x2: 38, y2: 52, kind: 'internal' },
    { x1: 38, y1: 56, x2: 38, y2: 62, kind: 'internal' },
    { x1: 62, y1: 46, x2: 74, y2: 46, kind: 'glazing' },
  ],
  doors: [
    { x: 46, y: 12, len: 6, dir: 'v', swing: 1 },
    { x: 96, y: 46, len: 6, dir: 'h', swing: 1 },
    { x: 54, y: 46, len: 6, dir: 'h', swing: -1 },
    { x: 38, y: 52, len: 4, dir: 'v', swing: 1 },
  ],
  fixtures: [
    { kind: 'water', x: 8, y: 29, w: 56, h: 8 }, // the lap pool, 240s
    { kind: 'planting', x: 80, y: 28, w: 36, h: 10 },
    { kind: 'block', x: 16, y: 10, w: 16, h: 7 }, // pool table
    { kind: 'thin', x: 8, y: 3, w: 32, h: 1.6 }, // display joinery
    { kind: 'screen', x: 50, y: 5.5, w: 18, h: 0, dir: 'h' },
    { kind: 'rows', x: 50, y: 12, w: 18, h: 4, dir: 'h', n: 4 },
    { kind: 'rows', x: 50, y: 18, w: 18, h: 4, dir: 'h', n: 4 },
    { kind: 'rows', x: 84, y: 49, w: 28, h: 4, dir: 'h', n: 6 }, // the cardio rows
    { kind: 'rows', x: 84, y: 55, w: 28, h: 4, dir: 'h', n: 6 },
    { kind: 'thin', x: 40, y: 47, w: 32, h: 1.6 }, // styling counter
    { kind: 'round', x: 52, y: 53, w: 6, h: 6 },
    { kind: 'thin', x: 6, y: 48, w: 1.6, h: 12 }, // steam bench
  ],
};

export const PLAN_LEVELS: PlanLevel[] = [GROUND, UPPER, LOWER];

/* ------------------------------------------------------------------ routes */

export interface RouteNode {
  /** Time in the master's own timeline. */
  t: number;
  x: number;
  y: number;
  levelId: string;
}

/**
 * Where the camera is, take by take.
 *
 * One entry per unbroken shot, in order. Inside an entry the marker slides
 * along the polyline on the clock, so the walk is continuous by construction
 * and the doubling-back is simply part of the line: the dry-kitchen leg runs
 * out to (92,14) and returns through the doorway it came in by, and the gym leg
 * does the same thing on the plate below.
 *
 * A change of storey is written as two nodes at the same instant, one on each
 * plate. Because no time elapses between them, nothing is ever interpolated
 * across two coordinate systems.
 */
export const ROUTES: RouteNode[][] = [
  // --- 33.38 - 110.86: front door to the beauty studio, one shot ----------
  [
    { t: 33.383, x: 1, y: 27, levelId: 'ground' }, // still outside, at the door
    { t: 36.0, x: 9, y: 27, levelId: 'ground' }, // through the pivot door
    { t: 39.0, x: 18, y: 27, levelId: 'ground' }, // level with the lit cases
    { t: 41.5, x: 24, y: 27, levelId: 'ground' },
    { t: 44.0, x: 30, y: 26, levelId: 'ground' }, // the volume opens up
    { t: 46.0, x: 42, y: 28, levelId: 'ground' }, // passing dining table A
    { t: 48.5, x: 53, y: 29, levelId: 'ground' },
    { t: 50.5, x: 60, y: 30, levelId: 'ground' }, // the sectional
    { t: 52.5, x: 69, y: 27, levelId: 'ground' }, // turns, and the stair is there
    { t: 54.5, x: 74, y: 24, levelId: 'ground' }, // under it, at dining table B
    { t: 56.5, x: 73, y: 35, levelId: 'ground' }, // along the wine wall
    { t: 58.0, x: 78, y: 39, levelId: 'ground' },
    { t: 60.0, x: 89, y: 38, levelId: 'ground' }, // into the hall, 59s
    { t: 61.5, x: 92, y: 32, levelId: 'ground' }, // and through into the kitchen
    { t: 63.5, x: 94, y: 25, levelId: 'ground' },
    { t: 65.5, x: 97, y: 19, levelId: 'ground' },
    { t: 68.0, x: 102, y: 14, levelId: 'ground' }, // the far end of the kitchen
    { t: 70.0, x: 104, y: 22, levelId: 'ground' },
    { t: 71.5, x: 93, y: 31, levelId: 'ground' }, // back out the way it came
    { t: 72.2, x: 90, y: 36, levelId: 'ground' },
    { t: 73.2, x: 86, y: 40, levelId: 'ground' }, // out of the hall at 73s
    { t: 74.0, x: 60, y: 36, levelId: 'ground' }, // straight back across the volume
    { t: 75.5, x: 56, y: 32, levelId: 'ground' },
    { t: 76.5, x: 66, y: 22, levelId: 'ground' },
    { t: 77.5, x: 70, y: 15, levelId: 'ground' }, // onto the flight
    { t: 79.5, x: 74, y: 12, levelId: 'ground' },
    { t: 82.0, x: 80, y: 11, levelId: 'ground' },
    { t: 86.9, x: 85, y: 10, levelId: 'ground' }, // the top of the flight
    // The storey changes here rather than at 83.5, where the climb visually
    // ends: the plate follows the space tour-map names, and it calls all of
    // 77-87 the staircase. Marker and plate must never disagree.
    { t: 87.0, x: 85, y: 10, levelId: 'ground' },
    { t: 87.0, x: 57, y: 5, levelId: 'upper' },
    { t: 90.0, x: 55, y: 18, levelId: 'upper' },
    { t: 92.5, x: 52, y: 31, levelId: 'upper' },
    { t: 94.0, x: 44, y: 36, levelId: 'upper' }, // along the void's third side
    { t: 96.0, x: 24, y: 35, levelId: 'upper' },
    { t: 97.5, x: 8, y: 26, levelId: 'upper' }, // the lounge
    { t: 98.5, x: 26, y: 44, levelId: 'upper' }, // in through the bedroom door
    { t: 101.0, x: 34, y: 52, levelId: 'upper' },
    { t: 104.0, x: 42, y: 57, levelId: 'upper' },
    { t: 107.0, x: 24, y: 55, levelId: 'upper' },
    { t: 108.5, x: 14, y: 52, levelId: 'upper' }, // the beauty studio, a dead end
    { t: 110.861, x: 7, y: 50, levelId: 'upper' },
  ],

  // --- 110.86 - 168.57: the closet gallery, the bathroom, the bedroom -----
  [
    { t: 110.861, x: 86, y: 4, levelId: 'upper' },
    { t: 122.0, x: 86, y: 24, levelId: 'upper' },
    { t: 133.0, x: 86, y: 48, levelId: 'upper' },
    { t: 140.0, x: 86, y: 60, levelId: 'upper' }, // the far end
    { t: 147.0, x: 86, y: 30, levelId: 'upper' }, // and back up it
    { t: 152.0, x: 86, y: 52, levelId: 'upper' },
    { t: 155.5, x: 72, y: 52, levelId: 'upper' }, // through into the bathroom
    { t: 158.0, x: 62, y: 50, levelId: 'upper' },
    { t: 161.5, x: 48, y: 52, levelId: 'upper' }, // and back into the bedroom
    { t: 165.0, x: 38, y: 55, levelId: 'upper' },
    { t: 168.569, x: 30, y: 50, levelId: 'upper' },
  ],

  // --- 168.57 - 172.44: looking down into the great room ------------------
  [
    { t: 168.569, x: 54, y: 18, levelId: 'upper' },
    { t: 172.439, x: 52, y: 30, levelId: 'upper' },
  ],

  // --- 213.60 - 226.33: the games room -----------------------------------
  [
    { t: 213.597, x: 10, y: 20, levelId: 'lower' },
    { t: 220.0, x: 26, y: 15, levelId: 'lower' },
    { t: 226.326, x: 42, y: 10, levelId: 'lower' },
  ],

  // --- 226.33 - 239.61: the theatre --------------------------------------
  [
    { t: 226.326, x: 50, y: 22, levelId: 'lower' },
    { t: 233.0, x: 58, y: 15, levelId: 'lower' },
    { t: 239.606, x: 66, y: 8, levelId: 'lower' },
  ],

  // --- 239.61 - 271.84: terrace, garden, into the gym and back out --------
  [
    { t: 239.606, x: 20, y: 34, levelId: 'lower' },
    { t: 241.6, x: 74, y: 33, levelId: 'lower' }, // along the pool
    { t: 244.0, x: 95, y: 32, levelId: 'lower' },
    { t: 246.5, x: 108, y: 36, levelId: 'lower' }, // the path down the lawn
    { t: 248.6, x: 99, y: 47, levelId: 'lower' }, // in through the gym door
    { t: 252.0, x: 90, y: 52, levelId: 'lower' },
    { t: 258.0, x: 100, y: 57, levelId: 'lower' },
    { t: 263.0, x: 110, y: 52, levelId: 'lower' },
    { t: 267.6, x: 99, y: 44, levelId: 'lower' }, // back out onto the same path
    { t: 271.838, x: 60, y: 43, levelId: 'lower' },
  ],

  // --- 271.84 - 286.40: the salon ----------------------------------------
  [
    { t: 271.838, x: 58, y: 49, levelId: 'lower' },
    { t: 279.0, x: 52, y: 55, levelId: 'lower' },
    { t: 286.403, x: 44, y: 52, levelId: 'lower' },
  ],

  // --- 286.40 - 293.91: the steam room -----------------------------------
  [
    { t: 286.403, x: 30, y: 52, levelId: 'lower' },
    { t: 293.911, x: 12, y: 55, levelId: 'lower' },
  ],
];

/* ---------------------------------------------------------------- lookups */

const ORDER = new Map<string, number>();
for (const level of PLAN_LEVELS) {
  for (const area of level.areas) {
    const indices = area.spaceIds
      .map((id) => SPACES.find((s) => s.id === id)?.index)
      .filter((i): i is number => i !== undefined);
    if (indices.length) ORDER.set(area.id, Math.min(...indices));
  }
}

export function areaOrder(area: PlanArea): number {
  return ORDER.get(area.id) ?? Number.MAX_SAFE_INTEGER;
}

const BY_SPACE = new Map<string, { level: PlanLevel; area: PlanArea }>();
for (const level of PLAN_LEVELS) {
  for (const area of level.areas) {
    for (const id of area.spaceIds) BY_SPACE.set(id, { level, area });
  }
}

/** The plate and area a space sits on, or null for a space the walk skips. */
export function locate(spaceId: string | undefined): { level: PlanLevel; area: PlanArea } | null {
  if (!spaceId) return null;
  return BY_SPACE.get(spaceId) ?? null;
}

/** The first moment of an area, for seeking to it from the plan. */
export function areaStart(area: PlanArea): number | null {
  const space = SPACES.find((s) => s.id === area.spaceIds[0]);
  if (!space) return null;
  return space.start + Math.min(0.8, space.duration * 0.2);
}

export interface CameraFix {
  levelId: string;
  x: number;
  y: number;
  /** Degrees clockwise from north, matching an SVG rotate(). */
  heading: number;
}

function bearing(a: { x: number; y: number }, b: { x: number; y: number }): number {
  if (a.x === b.x && a.y === b.y) return 0;
  return (Math.atan2(b.x - a.x, -(b.y - a.y)) * 180) / Math.PI;
}

/**
 * Where the camera is, and which way it is looking.
 *
 * Read straight off the route for the take containing this time. Heading is the
 * direction of travel rather than anything authored: the camera in this film
 * looks where it is going, and a heading that disagreed with the movement would
 * read as a bug long before it read as a detail.
 */
export function cameraAt(time: number): CameraFix | null {
  if (!locate(spaceAt(time).id)) return null;

  // The gaps between takes are a few hundredths of a second wide - authoring
  // slop, not meaning. A time inside one is clamped to the nearer take rather
  // than leaving the marker undrawn for a frame.
  let best = ROUTES[0];
  let bestGap = Infinity;
  for (const route of ROUTES) {
    const gap = Math.max(route[0].t - time, time - route[route.length - 1].t, 0);
    if (gap < bestGap) {
      bestGap = gap;
      best = route;
    }
  }

  for (const route of [best]) {
    const last = route[route.length - 1];
    if (time <= route[0].t) {
      const n = route[0];
      return { levelId: n.levelId, x: n.x, y: n.y, heading: bearing(n, route[1]) };
    }

    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i];
      const b = route[i + 1];
      if (time > b.t) continue;

      // A change of storey: two nodes at one instant. Take the second, and read
      // the heading from the leg that follows it on the new plate.
      if (a.levelId !== b.levelId) {
        const c = route[i + 2] ?? b;
        return { levelId: b.levelId, x: b.x, y: b.y, heading: bearing(b, c) };
      }

      const span = b.t - a.t;
      const k = span > 0 ? (time - a.t) / span : 0;
      return {
        levelId: a.levelId,
        x: a.x + (b.x - a.x) * k,
        y: a.y + (b.y - a.y) * k,
        heading: bearing(a, b),
      };
    }
    return {
      levelId: last.levelId,
      x: last.x,
      y: last.y,
      heading: bearing(route[route.length - 2], last),
    };
  }
  return null;
}
