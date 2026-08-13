'use client';

import { tour, CHAPTER_VIEWS, SPACES, TOUR_DURATION } from '@/lib/tour';
import { clock } from '@/lib/format';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';

/**
 * Everything drawn on top of the hero frame.
 *
 * Art direction: the two references were bright, pastel-dusk compositions. This
 * film is shot entirely after dark, so the same ideas are translated into night —
 * an inset architectural frame, wide-tracked display type, a restrained glass
 * navigation pill, and small editorial metadata set at the margins. The wordmark
 * is deliberately wide-tracked to echo the title card burned into the film itself.
 *
 * Every number here is read from tour-map.json. Nothing is hardcoded.
 */

const NAV = ['Tour', 'Chapters', 'Property', 'Enquire'];

export function HeroOverlay() {
  const spaces = SPACES.length;
  const chapters = CHAPTER_VIEWS.length;
  const levels = tour.property.levels.length;

  return (
    <div
      data-hero-ui
      className="pointer-events-none absolute inset-0 z-30 flex flex-col justify-between p-5 sm:p-8 lg:p-10"
    >
      {/* ---- top: glass nav pill -------------------------------------- */}
      <header className="flex items-start justify-between gap-4">
        <LiquidGlass
          variant="soft"
          radius={999}
          beads="none"
          className="pointer-events-auto"
          contentClassName="flex items-center gap-1 px-2 py-2"
        >
          <span className="grid size-9 place-items-center rounded-full bg-linen/95 text-[13px] font-semibold text-void">
            J
          </span>
          <nav className="hidden items-center md:flex">
            {NAV.map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="tracked-tight rounded-full px-4 py-2 text-[10px] text-linen/70 transition-colors duration-300 hover:text-linen"
              >
                {item}
              </a>
            ))}
          </nav>
        </LiquidGlass>

        <LiquidGlass variant="soft" radius={999} beads="none" className="pointer-events-auto">
          <a
            href="#tour"
            className="tracked-tight group flex items-center gap-3 py-2 pr-2 pl-5 text-[10px] text-linen transition-colors duration-300 hover:text-champagne"
          >
            <span className="hidden sm:inline">Enter the house</span>
            <span className="sm:hidden">Enter</span>
            <span className="grid size-8 place-items-center rounded-full bg-linen text-void transition-transform duration-500 ease-[var(--ease-cinema)] group-hover:rotate-45">
              <Arrow />
            </span>
          </a>
        </LiquidGlass>
      </header>

      {/* ---- middle: the wordmark ------------------------------------- */}
      <div className="relative flex flex-1 items-center">
        <div className="w-full">
          <h1
            data-hero-wordmark
            /* tracking tightens on narrow screens so the wordmark still fits on
               one line at 320px without shrinking the type into insignificance */
            className="text-center font-light text-linen/90 uppercase tracking-[0.14em] sm:tracking-[0.26em] lg:tracking-[0.42em]"
            style={{ fontSize: 'clamp(1.5rem, 7vw, 7.5rem)', lineHeight: 1 }}
          >
            <span className="[text-shadow:0_2px_40px_rgb(0_0_0/0.55)]">
              {tour.property.title}
            </span>
          </h1>

          {/* editorial margin notes, set small and quiet */}
          <div className="mx-auto mt-10 hidden max-w-5xl justify-between gap-20 px-6 lg:flex">
            <p className="max-w-[19ch] text-[12.5px] leading-relaxed text-bone/60">
              One continuous walk through a contemporary hillside villa, shot
              after dark.
            </p>
            <p className="max-w-[19ch] text-right text-[12.5px] leading-relaxed text-bone/60">
              {chapters} chapters. {spaces} spaces. {levels} levels, from the
              grounds to the roof.
            </p>
          </div>
        </div>
      </div>

      {/* ---- bottom: tagline, stats, scroll cue ------------------------ */}
      <footer className="flex items-end justify-between gap-6">
        <div>
          <p
            className="max-w-[15ch] text-balance text-[clamp(1rem,2vw,1.5rem)] leading-[1.15] text-linen"
            style={{ fontFamily: 'var(--font-editorial)' }}
          >
            Scroll to move through the house.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              data-scroll-cue
              className="block h-8 w-px bg-gradient-to-b from-transparent via-champagne/70 to-transparent"
            />
            <span className="tracked text-[9px] text-bone/50">Begin</span>
          </div>
        </div>

        {/* two panels only — the architecture stays the subject */}
        <div className="hidden gap-3 sm:flex">
          <Stat value={String(spaces)} label="spaces mapped, frame by frame" />
          <Stat value={clock(TOUR_DURATION)} label="of unbroken walkthrough" />
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <LiquidGlass
      radius={20}
      beads="large"
      className="pointer-events-auto w-[9.5rem]"
      contentClassName="p-4"
    >
      <div className="text-[1.7rem] leading-none font-light text-linen">{value}</div>
      <div className="mt-2 text-[10.5px] leading-snug text-bone/55">{label}</div>
    </LiquidGlass>
  );
}

function Arrow() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M2.5 9.5L9.5 2.5M9.5 2.5H4M9.5 2.5V8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
