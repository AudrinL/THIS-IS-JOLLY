'use client';

import { useState } from 'react';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { ResolvedStop } from '@/tour/Timeline';
import { pad2 } from '@/lib/format';

/**
 * What appears while the camera holds in a room.
 *
 * One point is explained at a time. The dwell is divided into a slot per
 * feature, so the room explains itself one thing at a time rather than fading
 * every card in at once and stacking them wherever two features sit close in
 * frame.
 *
 * ---------------------------------------------------------------------------
 * Where the words go, and why they are not beside the point
 * ---------------------------------------------------------------------------
 * The first version put a glass card next to each hotspot. It read well in a
 * screenshot and badly in motion, for two reasons that turned out to be the
 * same reason.
 *
 * Cost: a card per point means mounting and unmounting a backdrop-filtered pane
 * three times per room, each one a fresh compositing layer over a video that is
 * being seeked every frame. Blurred panes over scrubbing video are the most
 * expensive thing on this page — globals.css says so at the bottom, where the
 * material was already cut back once for exactly this reason. Three of them
 * arriving and leaving inside four seconds is the stutter people report as the
 * site lagging.
 *
 * Composition: those cards also came and went in the middle of the frame, so
 * the architecture — the thing the visitor came for — spent the dwell being
 * covered up and uncovered by furniture of our own making.
 *
 * So the pane count per room is now exactly one. The room's own panel, which was
 * already on screen, grew a line at the bottom that carries the active feature's
 * name and sentence; the text swaps inside a pane that never remounts. In frame,
 * the active point keeps only what has to be in frame to do its job: the mark, a
 * hairline leader, and its label set in plain type — no blur, no pane, no layer.
 * The sentence is read below, where the room is already being read.
 *
 * `progress` runs 0..1 across the hold and is driven by scroll, so the sequence
 * is scrubbable in both directions. Pointing at any mark takes it over and holds
 * it open; releasing hands the room back to the scroll.
 */

/** The portion of the dwell spent cycling through hotspots. */
const WINDOW_START = 0.1;
const WINDOW_END = 0.86;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function StopOverlay({
  stop,
  progress,
}: {
  stop: ResolvedStop | null;
  progress: number;
}) {
  /**
   * The mark the visitor is pointing at, overriding the scroll-driven one.
   *
   * Nothing resets it, because nothing has to: the caller keys this component on
   * the room, so leaving one takes the state with it. That matters more than it
   * looks — a mark unmounting under the cursor never fires a leave, so a hold
   * carried across rooms would open a label nobody is pointing at.
   */
  const [heldIndex, setHeld] = useState<number | null>(null);

  if (!stop) return null;

  const entering = Math.min(1, progress / 0.16);
  const leaving = clamp((progress - 0.88) / 0.12, 0, 1);
  const presence = Math.max(0, entering - leaving);

  const count = stop.hotspots.length;
  const span = (WINDOW_END - WINDOW_START) / count;
  const raw = (progress - WINDOW_START) / span;
  const scrolledIndex = clamp(Math.floor(raw), 0, count - 1);
  const activeIndex = heldIndex ?? scrolledIndex;
  /** 0..1 within the active hotspot's own slot, for its entrance. */
  const slot = heldIndex === null ? clamp(raw - scrolledIndex, 0, 1) : 1;
  const started = progress >= WINDOW_START || heldIndex !== null;
  const active = stop.hotspots[activeIndex];

  return (
    <div className="pointer-events-none absolute inset-0 z-45">
      {/* A touch of shade so the panel holds its contrast over a bright room. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_30%,rgb(5_7_12/0.52)_100%)]"
        style={{ opacity: presence * 0.9 }}
      />

      {/* The marks drift with the film, so they stay on their features. */}
      <div className="drift absolute inset-0">
        {stop.hotspots.map((spot, i) => {
          const isActive = started && i === activeIndex;
          const dotAlpha = presence * (isActive ? 1 : 0.38);
          /** Label to the left of the point when the point is right of centre. */
          const flipX = spot.x > 55;

          return (
            <div
              key={spot.id}
              className="absolute"
              style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
            >
              {/*
                The mark, and the thing you point at. Its hit area is far larger
                than the dot — a 9px target would be a game of skill — but it is
                only live once the room has actually arrived.
              */}
              <button
                type="button"
                aria-label={`${spot.label}. ${spot.text}`}
                aria-pressed={isActive}
                tabIndex={presence > 0.5 ? 0 : -1}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'mouse') setHeld(i);
                }}
                onPointerLeave={(e) => {
                  if (e.pointerType === 'mouse') setHeld(null);
                }}
                /* Touch has no hover and no leave, so it toggles instead. */
                onClick={() => setHeld((v) => (v === i ? null : i))}
                onFocus={() => setHeld(i)}
                onBlur={() => setHeld(null)}
                className={[
                  'absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center',
                  'rounded-full transition-opacity duration-500',
                  presence > 0.5 ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none',
                ].join(' ')}
                style={{ opacity: dotAlpha }}
              >
                <span
                  aria-hidden
                  className="block rounded-full bg-champagne transition-all duration-500 ease-[var(--ease-cinema)]"
                  style={{
                    width: isActive ? 9 : 5,
                    height: isActive ? 9 : 5,
                    boxShadow: isActive ? '0 0 14px 3px rgb(255 243 207 / 0.45)' : 'none',
                  }}
                />
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 size-[9px] rounded-full border border-champagne/60"
                    style={{
                      transform: `translate(-50%,-50%) scale(${1 + slot * 2.4})`,
                      opacity: (1 - slot) * 0.85,
                    }}
                  />
                )}
              </button>

              {/*
                Leader and label. Plain type over the film — the shadow is what
                keeps it legible against a lit wall, and it costs nothing to
                composite. Rendered for the active point only.
              */}
              {isActive && (
                <div
                  aria-hidden
                  className="absolute top-1/2 flex -translate-y-1/2 items-center gap-2"
                  style={{
                    [flipX ? 'right' : 'left']: 10,
                    flexDirection: flipX ? 'row-reverse' : 'row',
                    opacity: presence * Math.min(1, slot / 0.2),
                    transition: 'opacity 260ms var(--ease-cinema)',
                  }}
                >
                  <span
                    className="block h-px bg-gradient-to-r from-champagne/70 to-champagne/20"
                    style={{ width: 22 }}
                  />
                  <span
                    className="tracked text-[8px] whitespace-nowrap text-linen"
                    style={{ textShadow: '0 1px 14px rgb(5 7 12 / 0.95), 0 0 3px rgb(5 7 12 / 0.8)' }}
                  >
                    {spot.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/*
        The room, and whatever it is currently pointing at. One pane, mounted
        once for the whole dwell. Offset so it clears the room rail on the left.
      */}
      <div
        className="absolute inset-x-0 bottom-[15%] flex justify-center pr-5 pl-[86px] lg:pr-10 lg:pl-[330px]"
        style={{ transform: `translateY(${(1 - presence) * 14}px)` }}
      >
        <LiquidGlass
          appear={presence}
          radius={22}
          beads="large"
          className="max-w-[30rem]"
          contentClassName="px-6 py-4"
        >
          <div className="flex items-baseline justify-between gap-6">
            <span className="tracked text-[8.5px] text-ash/70">{stop.space.category}</span>
            <span className="text-[9px] text-ash/60 tabular-nums">
              {pad2(activeIndex + 1)} / {pad2(count)}
            </span>
          </div>
          <h3
            className="mt-2 text-[1.5rem] leading-[1.1] text-linen"
            style={{ fontFamily: 'var(--font-editorial)' }}
          >
            {stop.title}
          </h3>
          <p className="mt-2 max-w-[38ch] text-[12px] leading-relaxed text-bone/70">
            {stop.blurb}
          </p>

          {/*
            The active feature. Height is reserved rather than measured, so the
            panel never changes size as the text swaps under it — a pane that
            resized three times per room would draw the eye away from the room.
            Keyed on the point so the fade replays on each change.
          */}
          <div className="mt-3 border-t border-linen/10 pt-3">
            <div key={active.id} className="fade-line min-h-[3.4rem]">
              <div className="tracked text-[7.5px] text-champagne/85">{active.label}</div>
              <p className="mt-1.5 text-[12px] leading-snug text-linen/90">{active.text}</p>
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
}
