'use client';

import { CHAPTER_VIEWS, TOUR_DURATION, elapsed } from '@/lib/tour';
import { clock, pad2 } from '@/lib/format';
import type { TourState } from '@/tour/InteractionManager';

/**
 * The tour's own interface: chapter, current space, and a rail of chapter marks.
 *
 * It fades in only once the frame has opened, and stays out of the centre of the
 * image. The rail is the one piece of persistent chrome — it tells the visitor
 * where they are in the house without a scrollbar.
 */
export function TourHud({
  state,
  onSeek,
}: {
  state: TourState;
  onSeek: (time: number) => void;
}) {
  const visible = state.phase === 'tour';
  const chapter = state.chapter;
  const number = chapter ? CHAPTER_VIEWS.findIndex((c) => c.id === chapter.id) + 1 : 0;

  return (
    <div
      className={[
        'absolute inset-0 z-40 transition-opacity duration-700 ease-[var(--ease-cinema)]',
        visible ? 'opacity-100' : 'pointer-events-none opacity-0',
      ].join(' ')}
    >
      {/* chapter, lower left */}
      <div className="pointer-events-none absolute bottom-6 left-5 sm:bottom-8 sm:left-10">
        <div className="tracked text-[8.5px] text-ash/70">
          Chapter {pad2(number)} / {pad2(CHAPTER_VIEWS.length)}
        </div>
        <div className="mt-1.5 text-[15px] text-linen/90">{chapter?.name ?? ''}</div>
      </div>

      {/* space + time, lower right */}
      <div className="pointer-events-none absolute right-5 bottom-6 text-right sm:right-10 sm:bottom-8">
        <div className="text-[13px] text-linen/70">{state.space?.name ?? ''}</div>
        <div className="tracked mt-1.5 text-[8.5px] text-ash/60 tabular-nums">
          {clock(elapsed(state.time))} / {clock(TOUR_DURATION)}
        </div>
      </div>

      {/* chapter rail, right edge — vertical on desktop only */}
      <nav
        aria-label="Chapters"
        className="absolute top-1/2 right-4 hidden -translate-y-1/2 flex-col gap-2 lg:flex"
      >
        {CHAPTER_VIEWS.map((c) => {
          const active = c.id === chapter?.id;
          return (
            <button
              key={c.id}
              onClick={() => onSeek(c.start + 0.4)}
              className="group pointer-events-auto flex items-center justify-end gap-2.5 py-1"
              title={c.name}
            >
              <span
                className={[
                  'text-[10px] whitespace-nowrap transition-all duration-500',
                  active
                    ? 'text-linen/90 opacity-100'
                    : 'text-bone/60 opacity-0 group-hover:opacity-100',
                ].join(' ')}
              >
                {c.name}
              </span>
              <span
                className={[
                  'block h-px transition-all duration-500 ease-[var(--ease-cinema)]',
                  active ? 'w-7 bg-champagne' : 'w-3.5 bg-linen/30 group-hover:w-5',
                ].join(' ')}
              />
            </button>
          );
        })}
      </nav>

      {/*
        Progress. Inset from the edges and tapered at both ends so it reads as a
        line of light lying on the image rather than a browser chrome element
        stuck to the bottom of the window.
      */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-10">
        <div className="relative h-px w-full max-w-[52rem] overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-linen/18 to-transparent" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-champagne/0 via-champagne/80 to-champagne"
            style={{ width: `${Math.min(100, state.progress * 100)}%` }}
          />
          {/* the travelling head */}
          <div
            className="absolute top-1/2 size-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne shadow-[0_0_8px_2px_rgb(255_243_207/0.5)]"
            style={{ left: `${Math.min(100, state.progress * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
