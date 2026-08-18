'use client';

import { CHAPTER_VIEWS } from '@/lib/tour';
import { clock, pad2 } from '@/lib/format';
import type { ChapterIntro } from '@/tour/Timeline';

/**
 * The chapter title card.
 *
 * The HUD names the current chapter in the corner for the whole walk, which
 * answers "where am I" but never announces anything. A house tour is cut into
 * chapters, and arriving in one should feel like arriving — so each one titles
 * itself once, over its own opening frames, and then gets out of the way.
 *
 * Like the hotspots, every part of this is derived from `progress` rather than
 * animated with a transition or a keyframe. The card is a position in the film,
 * not an event: scrubbing backwards through a chapter's opening takes the title
 * back out the way it came, and a card interrupted halfway is halfway through
 * its own entrance rather than stuck mid-transition.
 *
 * The film is behind it, so nothing here draws a box. Weight comes from the
 * type and from a wash of shade that only exists while the card does.
 */

/** Progress fractions each line lands on, and how long each takes to arrive. */
const KICKER = 0.02;
const NAME = 0.07;
const RULE = 0.16;
const META = 0.24;
const FADE = 0.14;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 0 before `at`, 1 once `FADE` past it. */
const arrive = (progress: number, at: number) => clamp((progress - at) / FADE, 0, 1);

export function ChapterTitle({
  intro,
  progress,
}: {
  intro: ChapterIntro | null;
  progress: number;
}) {
  if (!intro) return null;

  const view = CHAPTER_VIEWS.find((c) => c.id === intro.chapter.id);
  if (!view) return null;

  /*
   * The card leaves faster than it arrives, and leaves as one piece rather than
   * unstaggering itself: an entrance wants an order, an exit that keeps one
   * reads as the interface dithering on the way out.
   */
  const entering = arrive(progress, 0);
  const leaving = clamp((progress - 0.82) / 0.18, 0, 1);
  const presence = Math.max(0, entering - leaving);

  if (presence <= 0) return null;

  /* A slow lift across the whole window, so the card floats free of the film
     instead of sitting on it like a caption. */
  const lift = (0.5 - progress) * 14;

  return (
    <div
      /*
       * Hidden from assistive tech on purpose: the HUD already exposes the
       * chapter as text, and a card that re-announces it every time the visitor
       * scrolls through a chapter's opening would read the house out twice.
       */
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-44 flex items-center justify-center"
    >
      {/* Shade, so the type holds over a bright room. Widest where the words are. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(78%_52%_at_50%_46%,rgb(5_7_12/0.64)_0%,transparent_75%)]"
        style={{ opacity: presence }}
      />

      <div
        className="relative px-8 text-center"
        style={{ opacity: presence, transform: `translateY(calc(-4% + ${lift}px))` }}
      >
        <div
          className="tracked text-[8.5px] text-champagne/70"
          style={{ opacity: arrive(progress, KICKER) }}
        >
          Chapter {pad2(view.number)} / {pad2(CHAPTER_VIEWS.length)}
        </div>

        <h2
          className="mt-4 text-[clamp(38px,7.8vw,84px)] leading-[1.02] text-linen"
          style={{
            fontFamily: 'var(--font-editorial)',
            opacity: arrive(progress, NAME),
            /* A breath of scale on the way in — small enough to be felt and not
               seen, and it keeps the words off a hard cut. */
            transform: `scale(${0.985 + arrive(progress, NAME) * 0.015})`,
          }}
        >
          {view.name}
        </h2>

        {/* Hairline, drawn from the middle out as the title settles. */}
        <div className="mt-6 flex justify-center">
          <span
            className="block h-px bg-linen/30"
            style={{ width: `${arrive(progress, RULE) * 116}px` }}
          />
        </div>

        <div
          className="tracked mt-5 text-[8px] text-ash/65 tabular-nums"
          style={{ opacity: arrive(progress, META) }}
        >
          {pad2(view.spaces.length)} Rooms · {clock(view.duration)}
        </div>
      </div>
    </div>
  );
}
