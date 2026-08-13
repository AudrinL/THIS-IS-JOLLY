'use client';

import { tour, CHAPTER_VIEWS, SPACES, TOUR_DURATION } from '@/lib/tour';
import { clock } from '@/lib/format';
import { HeroOverlay } from './HeroOverlay';

/**
 * The stage is a single sticky viewport that never unmounts.
 *
 * The hero frame and the tour video are the same element. The frame now starts
 * full-bleed — no inset, no radius — so the architecture meets the edge of the
 * viewport exactly as in the reference; the insets remain as custom properties
 * so the opening timeline still has something to drive if they are ever
 * reintroduced.
 *
 * They are declared here so the hero renders correctly before any JavaScript runs.
 */
export function HeroStage({ children }: { children?: React.ReactNode }) {
  return (
    <div
      data-stage
      className="grain sticky top-0 h-svh w-full overflow-hidden bg-void"
      style={
        {
          '--frame-inset-x': '0px',
          '--frame-inset-top': '0px',
          '--frame-inset-bottom': '0px',
          '--frame-radius': '0px',
        } as React.CSSProperties
      }
    >
      {/* Metadata rail, now set over the top of the full-bleed image. */}
      <MetaRail />

      {/* The frame. */}
      <div
        data-frame
        className="absolute inset-0 z-20"
        style={{
          paddingLeft: 'var(--frame-inset-x)',
          paddingRight: 'var(--frame-inset-x)',
          paddingTop: 'var(--frame-inset-top)',
          paddingBottom: 'var(--frame-inset-bottom)',
        }}
      >
        <div
          data-frame-inner
          className="relative size-full overflow-hidden bg-night"
          style={{ borderRadius: 'var(--frame-radius)' }}
        >
          {/* Poster: the first thing painted, and the only thing needed for a
              complete first impression. 30 KB of AVIF. */}
          <picture>
            <img
              data-hero-poster
              src="/media/posters/hero.png"
              alt="A contemporary white hillside villa at dusk, lit from within, seen from the air"
              fetchPriority="high"
              decoding="async"
              /* Sits above the video layer so the hero shows its chosen frame,
                 not whatever the first chapter happens to start on. It fades out
                 as the frame opens, handing over to the video underneath. */
              className="absolute inset-0 z-5 size-full object-cover"
            />
          </picture>

          {/* the tour video mounts here */}
          {children}

          {/* Grading: lift the corners into shadow and push a warm glow up from
              the base, matching the LED cove lighting throughout the house. */}
          <div
            aria-hidden
            className="absolute inset-0 z-10 bg-[radial-gradient(120%_100%_at_50%_35%,transparent_35%,rgb(5_7_12/0.55)_100%)]"
          />
          <div aria-hidden className="cove absolute inset-x-0 bottom-0 z-10 h-1/2" />

          <HeroOverlay />
        </div>
      </div>
    </div>
  );
}

/** Small caps metadata, all of it read from tour-map.json. */
function MetaRail() {
  const items: [string, string][] = [
    ['Walkthrough', clock(TOUR_DURATION)],
    ['Chapters', String(CHAPTER_VIEWS.length)],
    ['Spaces', String(SPACES.length)],
    ['Captured', 'After dark'],
  ];

  return (
    <div
      data-hero-meta
      className="absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-6 px-6 py-5 sm:px-10 lg:px-12"
    >
      <span className="tracked text-[9px] text-bone/50">
        {tour.property.title}
      </span>
      <div className="flex items-center gap-6 sm:gap-10">
        {items.map(([label, value]) => (
          <div key={label} className="hidden text-right sm:block">
            <div className="tracked text-[8.5px] text-ash/70">{label}</div>
            <div className="mt-1 text-[11px] text-linen/80">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
