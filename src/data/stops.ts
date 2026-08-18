/**
 * The annotated frames.
 *
 * This is the one authored layer in the project. tour-map.json knows where the
 * rooms are and what is in them, but not *where in the frame* a thing sits — so
 * hotspot coordinates were placed by eye against the exact frame each stop holds
 * on. `x`/`y` are percentages of the video frame, which is object-cover, so they
 * track the image across viewport sizes.
 *
 * `at` is the fraction through the space where the camera holds; changing it
 * moves the held frame and would invalidate the coordinates below.
 * `hold` is in seconds of film, centred on that frame, over which the
 * annotation fades up and back out. The walk no longer stops for it, so `hold`
 * now buys travel rather than stillness: widen it and the marks drift off the
 * features they point at, because the camera keeps moving underneath them.
 *
 * How many of these there should be is a question the film answers, not a
 * budget to spend. Every stop is the frame asking to be read instead of
 * watched, so a stop has to be worth interrupting the walk for; every hotspot
 * after the third is the room repeating itself. A pass that annotated sixteen rooms with four points each read as
 * being handed a leaflet in every doorway — the house stopped being the subject.
 * Eleven rooms, three points each: the walk keeps moving, and the frames that do
 * hold are the ones with something in them worth pointing at.
 */

export interface Hotspot {
  id: string;
  label: string;
  text: string;
  /** Percentage across the frame. */
  x: number;
  /** Percentage down the frame. */
  y: number;
}

export interface StopDefinition {
  /** Space slug from tour-map.json. */
  slug: string;
  /** Fraction through the space to hold on. Default 0.55. */
  at?: number;
  /** Seconds of film the annotation lives over, centred on the held frame. */
  hold: number;
  /** Headline shown while the camera holds. */
  title: string;
  blurb: string;
  hotspots: Hotspot[];
}

export const STOPS: StopDefinition[] = [
  {
    slug: 'dining-great-room',
    at: 0.55,
    hold: 2.8,
    title: 'Dining & Great Room',
    blurb: 'The double-height volume the rest of the ground floor is arranged around.',
    hotspots: [
      {
        id: 'chandelier',
        label: 'Halo chandeliers',
        text: 'Sculptural rings suspended in the void, stacked one above the other.',
        x: 24,
        y: 13,
      },
      {
        id: 'table',
        label: 'Dining table',
        text: 'Long table under the rings, set with high-backed black and white chairs.',
        x: 13,
        y: 70,
      },
      {
        id: 'shelving',
        label: 'Display shelving',
        text: 'Built-in white niches holding curated objets, lit from within.',
        x: 26,
        y: 50,
      },
    ],
  },
  {
    slug: 'living-room',
    at: 0.55,
    hold: 2.8,
    title: 'Living Room',
    blurb: 'A double-height volume held between the shelving wall and the glazing.',
    hotspots: [
      {
        id: 'sofa',
        label: 'Sectional',
        text: 'Deep white sectional wrapping the room, stacked with graphite cushions.',
        x: 42,
        y: 72,
      },
      {
        id: 'shelving',
        label: 'Display wall',
        text: 'Built-in niches lit from within, running the full height of the wall.',
        x: 25,
        y: 39,
      },
      {
        id: 'glazing',
        label: 'Full-height glazing',
        text: 'Sheer curtains softening the black-framed glass behind them.',
        x: 56,
        y: 34,
      },
    ],
  },
  {
    slug: 'dry-kitchen',
    at: 0.55,
    hold: 2.8,
    title: 'Dry Kitchen',
    blurb: 'Handleless cabinetry under a crystal drop, with the island as the room’s centre.',
    hotspots: [
      {
        id: 'chandelier',
        label: 'Crystal drop',
        text: 'A rectangular cascade of crystal rods set into the ceiling recess.',
        x: 16,
        y: 26,
      },
      {
        id: 'island',
        label: 'Island',
        text: 'Full-slab island in matching white, doubling as the prep and serving surface.',
        x: 33,
        y: 80,
      },
      {
        id: 'appliances',
        label: 'Integrated column',
        text: 'Tall stainless refrigeration flush with the cabinetry run.',
        x: 82,
        y: 64,
      },
    ],
  },
  {
    slug: 'feature-staircase',
    at: 0.55,
    hold: 2.8,
    title: 'Feature Staircase',
    blurb: 'The vertical spine of the house, lit tread by tread.',
    hotspots: [
      {
        id: 'stair',
        label: 'Lit treads',
        text: 'Every riser washed by a concealed LED strip, the balustrade left frameless.',
        x: 49,
        y: 56,
      },
      {
        id: 'wine',
        label: 'Wine display',
        text: 'Backlit bottle wall built into the return of the staircase.',
        x: 26,
        y: 62,
      },
      {
        id: 'glazing',
        label: 'Gridded glazing',
        text: 'Black-framed glass running the full height of the stairwell.',
        x: 78,
        y: 52,
      },
    ],
  },
  {
    slug: 'master-bedroom',
    at: 0.55,
    hold: 2.8,
    title: 'Master Bedroom',
    blurb: 'Quiet, curtained, and turned toward the view.',
    hotspots: [
      {
        id: 'console',
        label: 'Media wall',
        text: 'Screen set above a low white console spanning the wall.',
        x: 27,
        y: 55,
      },
      {
        id: 'curtains',
        label: 'Full-height curtains',
        text: 'Floor-to-ceiling drapery closing the room off from the terrace.',
        x: 78,
        y: 60,
      },
      {
        id: 'chair',
        label: 'Reading chair',
        text: 'A single upholstered chair kept in the corner by the glazing.',
        x: 48,
        y: 73,
      },
    ],
  },
  {
    slug: 'walk-in-closet',
    at: 0.55,
    hold: 3.0,
    title: 'Walk-In Closet',
    blurb: 'A boutique in its own right — the longest single space in the house.',
    hotspots: [
      {
        id: 'cabinets',
        label: 'Glass cabinetry',
        text: 'Glass-fronted cases lit along every shelf, running the length of the room.',
        x: 26,
        y: 56,
      },
      {
        id: 'rail',
        label: 'Hanging runs',
        text: 'Open rails with a lit pelmet above each garment run.',
        x: 84,
        y: 53,
      },
      {
        id: 'plinth',
        label: 'Centre plinth',
        text: 'A sculptural piece anchoring the middle of the gallery.',
        x: 51,
        y: 50,
      },
    ],
  },
  {
    slug: 'games-room',
    at: 0.55,
    hold: 2.8,
    title: 'Games Room',
    blurb: 'The last room before the terrace, with the pool glowing through the glass.',
    hotspots: [
      {
        id: 'table',
        label: 'Pool table',
        text: 'Full-size table racked and ready, centred under a single flush light.',
        /* Held up the felt rather than centred on it: the label for a point this
           low flips above the mark, and from 78 it would land on the panel. */
        x: 40,
        y: 75,
      },
      {
        id: 'joinery',
        label: 'Display joinery',
        text: 'Glass-fronted wall units in white and brass, with the drinks cabinet set in black.',
        x: 78,
        y: 40,
      },
      {
        id: 'doors',
        label: 'Terrace doors',
        text: 'Sliding glass onto the deck, the lap pool lit blue directly beyond.',
        x: 17,
        y: 52,
      },
    ],
  },
  {
    slug: 'movie-theater',
    at: 0.55,
    hold: 2.8,
    title: 'Movie Theater',
    blurb: 'A sealed room under a starlit ceiling.',
    hotspots: [
      {
        id: 'seats',
        label: 'Recliners',
        text: 'Paired leather recliners on a raised platform, each with its own headrest.',
        x: 52,
        y: 74,
      },
      {
        id: 'screen',
        label: 'Screen',
        text: 'Screen recessed into the front wall, flanked by acoustic panelling.',
        x: 49,
        y: 47,
      },
      {
        id: 'ceiling',
        label: 'Starlight ceiling',
        text: 'Fibre-optic points set into a black ceiling field.',
        x: 46,
        y: 14,
      },
    ],
  },
  {
    slug: 'pool-terrace-night',
    at: 0.55,
    hold: 2.8,
    title: 'Pool Terrace',
    blurb: 'Straight out of the theatre door onto the lit deck.',
    hotspots: [
      {
        id: 'pool',
        label: 'Lap pool',
        text: 'Full-length pool lit electric blue, edged flush with the white tile.',
        x: 33,
        y: 74,
      },
      {
        id: 'facade',
        label: 'Glazed facade',
        text: 'The house reading as a lantern end to end along the deck.',
        x: 80,
        y: 28,
      },
      {
        id: 'wall',
        label: 'Wall washers',
        text: 'Sculpted uplights grazing the boundary wall the whole length of the terrace.',
        x: 16,
        y: 43,
      },
    ],
  },
  {
    slug: 'gym',
    at: 0.55,
    hold: 2.8,
    title: 'Gym',
    blurb: 'A full cardio floor set against the glazing, washed in colour.',
    hotspots: [
      {
        id: 'cardio',
        label: 'Cardio row',
        text: 'Bikes and treadmills lined along the glass, facing the city.',
        x: 25,
        y: 74,
      },
      {
        id: 'cove',
        label: 'Coloured cove',
        text: 'Ceiling cove running the length of the room, tuned to a warm red.',
        x: 30,
        y: 15,
      },
      {
        id: 'stair',
        label: 'Glazed entry',
        text: 'Glass doors and a short stair connecting back to the terrace.',
        x: 84,
        y: 60,
      },
    ],
  },
  {
    slug: 'hair-salon',
    at: 0.55,
    hold: 2.8,
    title: 'Hair Salon',
    blurb: 'A working salon built into the house, finished entirely in white.',
    hotspots: [
      {
        id: 'script',
        label: 'Wall script',
        text: '“In White, Beauty Finds Its Jolly” lettered across the panelling in gold.',
        x: 51,
        y: 50,
      },
      {
        id: 'chair',
        label: 'Salon chair',
        text: 'A single white chair, channel-stitched, facing the styling wall.',
        x: 20,
        y: 74,
      },
      {
        id: 'counter',
        label: 'Styling counter',
        text: 'Counter with the extraction plate and basin built in flush.',
        /* On the near edge of the counter rather than its face, for the same
           reason as the pool table: 84 puts the label on the panel. */
        x: 66,
        y: 76,
      },
    ],
  },
];
