'use client';

import { tour, CHAPTER_VIEWS, SPACES, TOUR_DURATION } from '@/lib/tour';
import { clock } from '@/lib/format';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import { Wordmark as WordmarkSvg } from '@/components/Wordmark';

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
      {/* ---- top: glass nav pill, call to action ----------------------
          Marked to persist: everything else in the hero leaves as the frame
          opens, but the header stays on screen for the whole walk. The stage is
          sticky, so it holds its position without a second fixed element. */}
      <header data-hero-persist className="flex items-start justify-between gap-4">
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

      {/* ---- the wordmark, lifted into the night above the roofline ---- */}
      <Wordmark />

      {/* ---- upper margins: two editorial notes ------------------------ */}
      <div
        data-hero-meta
        className="mt-5 flex items-start justify-between gap-10 sm:mt-9"
      >
        {/* Full width on a phone, where it sits under the wordmark and two
            lines keep it clear of the roof; a narrow margin note beside the
            wordmark from sm up. */}
        <p className="max-w-none text-[12.5px] leading-relaxed text-bone/65 sm:max-w-[21ch]">
          One continuous walk through a contemporary hillside villa, shot after
          dark.
        </p>
        <p className="hidden max-w-[19ch] text-right text-[12.5px] leading-relaxed text-bone/65 sm:block">
          {chapters} chapters, {levels} levels, from the grounds to the roof.
        </p>
      </div>

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
 * The wordmark in the hero frame. The drawing itself lives in
 * `components/Wordmark`; what is decided here is only where it sits.
 *
 * Where it sits was measured, not guessed. Profiling the frame row by row, the
 * top fifth is flat night — mean luminance 15 of 255, almost no variance, not a
 * single bright pixel. The roofline arrives around a quarter down, and from
 * halfway the lit facade and the pool own the picture, peaking at four times the
 * luminance and ten times the detail. The word was previously set across that
 * lower half, which is why it competed with the house. It now sits in the dark
 * band above the roof, taken out of the column's flow so the editorial notes
 * flank it in the margins rather than push it down. What little of it reaches
 * the roofline is already thinned by the fade, so the architecture reads
 * through the feet of the letters instead of colliding with them.
 */
function Wordmark() {
  return (
    <h1
      data-hero-wordmark
      /* The document's one h1. The word is drawn in SVG, so the heading takes
         its accessible name from the graphic's aria-label — the page must still
         announce and index as the property, not as a nameless image.
         In flow on a phone, where the dark band is too shallow to hold the
         header, the word and a note all at once — so the note follows it down.
         Out of flow from sm up, where the notes flank it in the margins.
         `sm:w-auto` is load-bearing: the phone's `w-full` would otherwise
         over-constrain left + right + width, CSS would drop `right`, and the
         word would hang one inset to the right of centre. */
      className="pointer-events-none mt-3 w-full sm:absolute sm:inset-x-8 sm:top-[10.5%] sm:mt-0 sm:w-auto lg:inset-x-10"
    >
      {/* Held well short of the margins: at full width the glyphs had to be
          stretched half again as wide to reach both edges, which read as a
          banner rather than a wordmark. Narrower again on wide screens, so the
          notes sit clear of it on either side. */}
      <WordmarkSvg id="hero" className="mx-auto w-[72%] max-w-[40rem] sm:w-[58%]" />
    </h1>
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
