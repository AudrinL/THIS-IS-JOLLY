'use client';

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
