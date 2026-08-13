'use client';

import { tour, CHAPTER_VIEWS, SPACES, TOUR_DURATION } from '@/lib/tour';
import { clock } from '@/lib/format';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';

/**
 * Everything drawn on top of the hero frame.
 *
 * The layout follows the reference: a glass navigation pill top left, a call to
 * action top right, two short editorial notes set into the upper margins, the
 * wordmark drawn enormous across the width, and the bottom edge carrying the
 * tagline, a second call to action and a stack of figures.
 *
 * The reference is a bright pastel-dusk composition; this film is shot entirely
 * after dark, so the same structure is translated into night — the type is set
 * in linen rather than white, and the wordmark is kept translucent so the
 * architecture reads through it.
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
      className="pointer-events-none absolute inset-0 z-30 flex flex-col p-5 sm:p-8 lg:p-10"
    >
      {/* ---- top: glass nav pill, call to action ---------------------- */}
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

        <Cta label="Enter the house" short="Enter" />
      </header>

      {/* ---- upper margins: two editorial notes ------------------------ */}
      <div
        data-hero-meta
        className="mt-7 flex items-start justify-between gap-10 sm:mt-9"
      >
        <p className="max-w-[21ch] text-[12.5px] leading-relaxed text-bone/65">
          One continuous walk through a contemporary hillside villa, shot after
          dark.
        </p>
        <p className="hidden max-w-[19ch] text-right text-[12.5px] leading-relaxed text-bone/65 sm:block">
          {chapters} chapters, {levels} levels, from the grounds to the roof.
        </p>
      </div>

      {/* ---- the wordmark ---------------------------------------------- */}
      <Wordmark />

      <div className="flex-1" />

      {/* ---- bottom: tagline, call to action, figures ------------------ */}
      <footer className="flex items-end justify-between gap-6">
        <div data-hero-text>
          <p
            className="max-w-[15ch] text-balance text-[clamp(1rem,2vw,1.5rem)] leading-[1.15] text-linen"
            style={{ fontFamily: 'var(--font-editorial)' }}
          >
            Closer to the house, closer to the light.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              data-scroll-cue
              className="block h-8 w-px bg-gradient-to-b from-transparent via-champagne/70 to-transparent"
            />
            <span className="tracked text-[9px] text-bone/50">Begin</span>
          </div>
        </div>

        {/* the reference repeats its call to action at the foot of the frame */}
        <div className="hidden flex-1 justify-center pb-1 lg:flex">
          <Cta label="Begin the tour" short="Begin" size="large" />
        </div>

        {/* two figures, stacked — the architecture stays the subject */}
        <div className="hidden flex-col gap-3 sm:flex">
          <Stat value={String(spaces)} label="spaces mapped, frame by frame" />
          <Stat value={clock(TOUR_DURATION)} label="of unbroken walkthrough" />
        </div>
      </footer>
    </div>
  );
}

/**
 * The wordmark, set as wide as the frame allows.
 *
 * Drawn in SVG rather than as HTML text so it spans the full width at every
 * viewport: `textLength` fixes the advance width to the viewBox, and the
 * viewBox scales to whatever space it is given, so the word touches both
 * margins on a phone and on a wide display without a single breakpoint.
 */
function Wordmark() {
  const title = 'JOLLY';

  return (
    <div data-hero-wordmark className="mt-8 w-full sm:mt-10">
      <svg
        viewBox="0 0 1000 230"
        className="w-full"
        role="img"
        aria-label={tour.property.title}
      >
        <text
          x="500"
          y="196"
          textAnchor="middle"
          textLength="985"
          lengthAdjust="spacingAndGlyphs"
          fontSize="230"
          fontWeight="300"
          fill="rgb(242 233 216 / 0.34)"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </text>
      </svg>
    </div>
  );
}

function Cta({
  label,
  short,
  size = 'small',
}: {
  label: string;
  short: string;
  size?: 'small' | 'large';
}) {
  const large = size === 'large';

  return (
    <LiquidGlass variant="soft" radius={999} beads="none" className="pointer-events-auto">
      <a
        href="#tour"
        className={`tracked-tight group flex items-center gap-3 text-linen transition-colors duration-300 hover:text-champagne ${
          large ? 'py-2.5 pr-2.5 pl-6 text-[11px]' : 'py-2 pr-2 pl-5 text-[10px]'
        }`}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">{short}</span>
        <span
          className={`grid place-items-center rounded-full bg-linen text-void transition-transform duration-500 ease-[var(--ease-cinema)] group-hover:rotate-45 ${
            large ? 'size-9' : 'size-8'
          }`}
        >
          <Arrow />
        </span>
      </a>
    </LiquidGlass>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <LiquidGlass
      radius={20}
      beads="large"
      className="pointer-events-auto w-[11.5rem]"
      contentClassName="p-4"
    >
      <div className="text-[1.9rem] leading-none font-light text-linen">{value}</div>
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
