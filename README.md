# This Is Jolly

A cinematic house tour. The site is not a page *about* the house — scrolling
moves the camera through it.

```
editorial hero  →  the frame opens  →  scroll drives video.currentTime
```

The hero card and the tour are the same DOM element. As you scroll, its inset
and corner radius fall to zero, so the editorial frame becomes the cinema rather
than being replaced by it.

## Running it

```bash
npm run dev
```

Then `npm run lint`, `npm run typecheck`, `npm run build`.

## Source of truth

`tour-map.json` drives everything: chapter boundaries, 40 spaces, timings,
poster times, per-space accent colours, and the copy in the contextual panels.
No component hardcodes a room name or a timestamp. Replace the file and the site
re-describes itself.

The master video (`THIS IS JOLLY.webm`, VP9 2560×1440, 59.94 fps, 338.54 s, no
audio) is archival. Nothing in the pipeline writes to it.

### Excluded chapters

The walk opens on the Ground Floor, not the exterior approach. Chapter `c1`
(*Arrival*, 0–33.38 s) is listed in `EXCLUDED_CHAPTER_IDS` in `src/lib/tour.ts`.
`tour-map.json` is untouched — emptying that set restores the chapter.

The distinction that matters: `chapterFileNumber()` indexes the **full** chapter
list and is what builds media URLs, so `chapter-02.mp4` keeps its name on disk.
`chapterNumber()` indexes the **included** list and is what the visitor sees. The
encoded media never needs renaming when a chapter is dropped.

## Architecture

```
src/
  lib/tour.ts          typed access to tour-map.json, time ↔ chapter maths
  lib/media.ts         every media URL in the app resolves here
  tour/
    TourEngine.ts      phases, scroll → time, the opening timeline
    ScrollController.ts Lenis + ScrollTrigger on one clock
    VideoController.ts  seven <video> elements, windowed loading, rAF seeking
    SegmentResolver.ts  time → space, with a cursor rather than a scan
    InteractionManager.ts publishes to React only when something visible changes
  data/stops.ts        the one authored layer: hotspot copy and coordinates
  tour/Timeline.ts     non-linear scroll -> time, with dwell segments
  components/
    Hero/              the frame, overlay and metadata rail
    Tour/              Experience (wiring), TourHud, RoomSidebar, StopOverlay,
                       StaticTour (reduced motion)
    GlassPanel/        LiquidGlass material, GlassFilters, the space panel
    Footer/            chapter index and property facts
```

### Liquid glass

`LiquidGlass` composites a blurred body, a body tint and a lit rim — one
material on every device, at `--lg-blur: 11px`.

Rim displacement (`.lg-edge`, driven by the SVG `feDisplacementMap` in
`GlassFilters`) and droplet beading (`.lg-bead`) are **switched off**. They were
originally dropped on phones only, to save compositing cost, and that
stripped-back version simply looked better: over bright interiors the displaced
edge band smeared what was behind it, and the droplet texture added noise to
already-noisy low-light footage. An even blur with a lit rim reads as a cleaner
pane. It is also cheaper everywhere.

Everything is still in place — deleting the `.lg-edge, .lg-bead { display: none }`
rule in `globals.css` brings the fuller material back.

Padding and layout go on `contentClassName`, since children sit inside
`.lg-content` above the material layers.

The material is deliberately **static**: no pointer tracking, no highlight
following the cursor, no diagonal sheen. Glass in front of the architecture
should read as a fixed object, not something that lights up under the mouse.

Two traps, both of which failed silently:

- Do not hand-write `-webkit-backdrop-filter`. Lightning CSS drops the standard
  property when you do, which breaks Firefox.
- Do not use nested CSS functions in arbitrary Tailwind values —
  `w-[min(286px,68vw)]` is never emitted, and the rail simply stayed collapsed.
  Use `w-[286px] max-w-[68vw]`.

### Pause and explain

`Timeline.ts` cuts the walk into alternating **motion** and **dwell** segments.
Both consume scroll distance, so the visitor is always simply scrolling — but
during a dwell the video time is pinned while hotspots stagger in over the
frame. Nothing intercepts or blocks the scroll, which is what stops it feeling
like the page has seized. Scrolling back up plays the explanation in reverse.

Stops are authored in `src/data/stops.ts` against space slugs, with hotspot
`x`/`y` as percentages of the frame, placed against the exact frame each stop
holds on. Changing a stop's `at` moves the held frame and invalidates its
coordinates.

Dwell progress updates every frame, so it travels on its own subscription
(`subscribeDwell`) that only the hotspot layer listens to — the main state
channel still publishes only on identity changes.

**One hotspot is expanded at a time.** The dwell is divided into a slot per
feature and the room explains itself one thing at a time; the inactive points
stay on frame as small marks. Fading them all in together put cards on top of
each other wherever two features sat close in frame.

### The rail's progress thread

`RailProgress` draws down the inner edge of the room rail and carries two
readings on one axis — legitimately, because both are the house in order:

| | |
|---|---|
| fill + head | where the walk currently is |
| notches | chapter boundaries |
| thumb | which stretch of the list is on screen |

It is also the list's real scrollbar: the thumb is draggable and the track is
clickable.

The notches come from `engine.progressAtTourTime()`, not from raw time —
because dwell segments consume scroll, a chapter does not begin where linear
time would put it.

Progress changes continuously, so like dwell it has its own channel
(`subscribeProgress`, 0.0015 threshold) and the component is isolated: it
re-renders alone while the thirty room rows beside it do not.

### Wheel ownership over the rail

The room list carries `data-lenis-prevent`. Lenis walks the composed path of
each wheel event and bails out when it finds that attribute, so a pointer over
the rail scrolls the list and leaves the walk exactly where it was;
`overscroll-contain` stops the page taking over when the list hits an end.
Moving off the rail restores normal page scrolling with no state to reset.

Do not reimplement this with `preventDefault` on a wheel handler — Lenis is
already the page's scroller, and fighting it produces a stutter at the boundary.

### Layout ownership of the left edge

`RoomSidebar` lifts its open state out through `onOpenChange` so `SpacePanel`
can step aside — the room card clears the collapsed rail at rest and moves to
`left-[322px]` while the rail is out, so the two never stack. On phones the card
yields entirely, since an open rail leaves no room beside it.

### Why it stays smooth

- **Scroll never re-renders React.** The engine writes a target time; a rAF loop
  seeks the video. React is told only when the chapter, space or panel changes —
  roughly forty times across the whole tour instead of tens of thousands.
- **Keyframe every 0.5 s.** The single most important encoding decision.
  Measured median seek latency: **11.9 ms**, p90 17.8 ms — inside one 60 fps
  frame. With default keyframe spacing this scrub stutters badly.
- **Windowed chapter loading.** Only the current chapter, one ahead and one
  behind ever hold a `src`. Walking into the guest wing does not mean having
  downloaded the spa.
- **Lenis runs on the GSAP ticker**, so smoothing and scrubbing share one clock.

## Media pipeline

Encoding runs in Google Colab, not locally — see
[`scripts/README-media-pipeline.md`](scripts/README-media-pipeline.md) and the
ready-made notebook `scripts/THIS_IS_JOLLY_pipeline.ipynb`.

Output: `chapter-01..07.mp4` at 720/1080/1440, one poster per space, all cut
frame-exact at the boundaries in `tour-map.json`.

Local helpers:

- `scripts/posters.ps1` — regenerate the 40 space stills
- `scripts/proxies.ps1` — tiny 360p chapter proxies for development
- `scripts/upload-r2.mjs` — push `processed/` to Cloudflare R2

## Deployment

Media never enters the git repo or the deployment bundle. Set:

```
NEXT_PUBLIC_MEDIA_BASE=https://media.your-domain.com
```

and drop `NEXT_PUBLIC_FORCE_RESOLUTION` from `.env.local` so the client picks a
rendition from viewport, DPR, core count and Save-Data.

## Accessibility

`prefers-reduced-motion` gets a different presentation, not a broken one: the
same house as an editorial sequence of stills, chapter by chapter, with no
pinning, no scroll hijacking and no video.
