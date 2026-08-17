'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTER_VIEWS, TOUR_DURATION, elapsed, spaceAt, Space } from '@/lib/tour';
import { spacePosterUrl } from '@/lib/media';
import { clock, pad2 } from '@/lib/format';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { TourState } from '@/tour/InteractionManager';

/**
 * The tour's own interface: chapter, current space, and a rail of chapter marks.
 *
 * It fades in only once the frame has opened, and stays out of the centre of the
 * image. The rail is the one piece of persistent chrome — it tells the visitor
 * where they are in the house without a scrollbar.
 *
 * The progress line is also the way through the house: hovering it looks ahead
 * to the room under the cursor, and pressing takes the walk there. A line of
 * light that turns out to be a control is worth more than a second navigation
 * element on top of the film, and it is the gesture people already expect from
 * anything that looks like a playhead.
 */

/** How long the pointer must settle before a room's still is fetched. */
const PREVIEW_SETTLE_MS = 140;

export function TourHud({
  state,
  onSeek,
  onScrub,
  timeAt,
}: {
  state: TourState;
  onSeek: (time: number) => void;
  /** Fraction of the walk, and whether the pointer is still down. */
  onScrub?: (progress: number, dragging: boolean) => void;
  /**
   * Fraction of the walk -> time. Comes from the engine because the walk's
   * scroll is not linear in the film: more than half of it is spent holding
   * still at the stops, so mapping the bar by the film's own clock would name a
   * room several rooms away from where a press actually lands.
   */
  timeAt: (progress: number) => number;
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

      <Scrubber progress={state.progress} onScrub={onScrub} timeAt={timeAt} />
    </div>
  );
}

/**
 * Progress. Inset from the edges and tapered at both ends so it reads as a line
 * of light lying on the image rather than a browser chrome element stuck to the
 * bottom of the window.
 *
 * Its own component because it owns pointer state that changes at pointer rate,
 * and none of the HUD around it should re-render for a cursor moving along a
 * line.
 */
function Scrubber({
  progress,
  onScrub,
  timeAt,
}: {
  progress: number;
  onScrub?: (progress: number, dragging: boolean) => void;
  timeAt: (progress: number) => number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const settle = useRef<number | undefined>(undefined);
  /** Where the pointer is on the track, 0..1, or null when it is elsewhere. */
  const [hover, setHover] = useState<number | null>(null);
  /** The room under the pointer, held back until the cursor settles. */
  const [preview, setPreview] = useState<Space | null>(null);

  const fractionAt = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  /* Looking ahead costs a still per room, so it waits for the pointer to mean
     it. Sweeping the length of the bar fetches nothing. */
  const schedulePreview = useCallback(
    (fraction: number) => {
      window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => {
        setPreview(spaceAt(timeAt(fraction)));
      }, PREVIEW_SETTLE_MS);
    },
    [timeAt],
  );

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const f = fractionAt(e.clientX);
    setHover(f);
    schedulePreview(f);
    if (dragging.current) onScrub?.(f, true);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = fractionAt(e.clientX);
    setHover(f);
    onScrub?.(f, true);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onScrub?.(fractionAt(e.clientX), false);
  };

  const onPointerLeave = () => {
    window.clearTimeout(settle.current);
    setHover(null);
    setPreview(null);
  };

  const pct = Math.min(100, Math.max(0, progress * 100));
  const hoverPct = hover === null ? 0 : hover * 100;

  return (
    <div
      /* The hit area is the strip along the bottom of the frame, not the
         hairline itself — a 1px target is not a control. */
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={onPointerLeave}
      className="pointer-events-auto absolute inset-x-0 bottom-0 flex h-9 cursor-pointer items-end justify-center px-10 pb-3"
      /* Reported rather than operated: the keyboard route through the house is
         the arrow keys, handled for the whole walk rather than for this strip. */
      role="progressbar"
      aria-label="Position in the walkthrough"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div ref={trackRef} className="relative w-full max-w-[52rem]">
        {/* The room ahead. Sits above the line, follows the cursor along it. */}
        {preview && hover !== null && (
          <div
            className="pointer-events-none absolute bottom-4 -translate-x-1/2"
            style={{ left: `${hoverPct}%` }}
          >
            <LiquidGlass radius={14} variant="soft" beads="none" contentClassName="p-1.5">
              <div className="w-[8.5rem]">
                <img
                  src={spacePosterUrl(preview, 'jpg')}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full rounded-[9px] object-cover opacity-90"
                />
                <div className="flex items-baseline justify-between gap-2 px-1 pt-1.5 pb-0.5">
                  <span className="truncate text-[10.5px] text-linen/90">{preview.name}</span>
                  <span className="text-[9px] text-ash/60 tabular-nums">
                    {clock(elapsed(preview.start))}
                  </span>
                </div>
              </div>
            </LiquidGlass>
          </div>
        )}

        <div className="relative h-px w-full overflow-hidden rounded-full">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-linen/18 to-transparent" />
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-champagne/0 via-champagne/80 to-champagne"
            style={{ width: `${pct}%` }}
          />
          {/* where a press would land */}
          {hover !== null && (
            <div
              className="absolute inset-y-0 w-px bg-linen/70"
              style={{ left: `${hoverPct}%` }}
            />
          )}
        </div>

        {/* the travelling head, lifted out of the clipped track so it can glow */}
        <div
          className="absolute top-1/2 rounded-full bg-champagne shadow-[0_0_8px_2px_rgb(255_243_207/0.5)] transition-[width,height] duration-300"
          style={{
            left: `${pct}%`,
            width: hover === null ? 3 : 5,
            height: hover === null ? 3 : 5,
            transform: 'translate(-50%,-50%)',
          }}
        />
      </div>
    </div>
  );
}
