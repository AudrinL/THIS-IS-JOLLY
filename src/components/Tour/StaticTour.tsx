'use client';

import { CHAPTER_VIEWS, tour, TOUR_DURATION, elapsed } from '@/lib/tour';
import { spacePosterUrl } from '@/lib/media';
import { clock } from '@/lib/format';
import { HeroOverlay } from '@/components/Hero/HeroOverlay';

/**
 * What a visitor sees when they have asked for reduced motion.
 *
 * Not a degraded version of the tour — a different, quieter form of the same
 * content. The house is presented chapter by chapter as an editorial sequence of
 * stills, using the same posters and the same copy from tour-map.json. No
 * scroll hijacking, no pinning, no video scrubbing.
 */
export function StaticTour() {
  return (
    <div className="relative">
      <section className="grain relative h-svh w-full overflow-hidden bg-void">
        {/* Wrapped, as in HeroStage: the poster is a plain file rather than a
            responsive set, and <picture> keeps it out of next/image's remit. */}
        <picture>
          <img
            src="/media/posters/hero.png"
            alt="A contemporary white hillside villa at night, lit from within, seen from the air"
            className="absolute inset-0 size-full object-cover opacity-80"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-b from-void/60 via-transparent to-void" />
        <HeroOverlay />
      </section>

      <div className="mx-auto max-w-5xl px-6 py-24 sm:px-10">
        <p
          className="max-w-[34ch] text-[clamp(1.4rem,3.4vw,2.4rem)] leading-[1.2] text-linen"
          style={{ fontFamily: 'var(--font-editorial)' }}
        >
          {tour.property.title} in {CHAPTER_VIEWS.length} chapters, {clock(TOUR_DURATION)} of
          walkthrough presented as stills.
        </p>

        {CHAPTER_VIEWS.map((chapter, i) => (
          <section key={chapter.id} className="mt-24">
            <header className="flex items-baseline gap-4 border-b border-linen/10 pb-4">
              <span className="tracked text-[9px] text-ash/70">
                {String(i + 1).padStart(2, '0')}
              </span>
              <h2 className="text-[1.5rem] text-linen">{chapter.name}</h2>
              <span className="ml-auto text-[11px] text-ash/60 tabular-nums">
                {clock(elapsed(chapter.start))}–{clock(elapsed(chapter.end))}
              </span>
            </header>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {chapter.spaces
                .filter((s) => !s.isPassage)
                .map((space) => (
                  <figure key={space.id}>
                    <picture>
                      <source srcSet={spacePosterUrl(space, 'avif')} type="image/avif" />
                      <img
                        src={spacePosterUrl(space, 'jpg')}
                        alt={space.visualElements[0] ?? space.name}
                        loading="lazy"
                        decoding="async"
                        className="aspect-video w-full rounded-xl object-cover"
                      />
                    </picture>
                    <figcaption className="mt-3">
                      <div className="text-[13px] text-linen/90">{space.name}</div>
                      <ul className="mt-2 space-y-1">
                        {space.visualElements.slice(0, 2).map((v) => (
                          <li key={v} className="text-[11.5px] leading-snug text-bone/60">
                            {v}
                          </li>
                        ))}
                      </ul>
                    </figcaption>
                  </figure>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
