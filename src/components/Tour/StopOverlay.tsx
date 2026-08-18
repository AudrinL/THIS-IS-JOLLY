'use client';

import { useState } from 'react';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { ResolvedStop } from '@/tour/Timeline';
import { pad2 } from '@/lib/format';

/**
 * What appears while the camera holds in a room.
 *
 * Every point in the room is marked at once, and the room is read as one
 * picture: three marks, three names, all of it there the moment the walk stops.
 * Nothing arrives, nothing leaves, nothing takes its turn.
 *
 * ---------------------------------------------------------------------------
 * Why it is not a sequence any more
 * ---------------------------------------------------------------------------
 * Cycling one feature at a time was a way of keeping cards from landing on top
 * of each other — three glass panes in one frame will always collide somewhere.
 * Once the panes went and the labels became plain type, the reason went with
 * them: names set in small caps on a leader line take a fraction of the room and
 * can all coexist.
 *
 * What that buys is the difference between being shown a room and looking at
 * one. A sequence sets the pace and the order; the visitor waits through it, and
 * scrubbing back to re-read something means finding the right part of the hold.
 * All at once, the frame is a plan you read in whatever order you like — and the
 * hold can be shorter, because nobody is waiting their turn.
 *
 * The panel below carries the sentence for whichever mark is pointed at. One
 * pane, mounted once for the whole dwell, its text swapping inside it.
 *
 * Entrances are staggered by a fraction of the dwell and derived from `progress`
 * rather than animated, so the marks come in one after another as the room
 * arrives and go back out in reverse when the visitor scrubs backwards.
 */

/** Dwell fraction the first mark lands on, and the gap between the rest. */
const MARK_START = 0.08;
const MARK_STAGGER = 0.05;
const MARK_FADE = 0.12;

/**
 * Where the room panel sits, in frame percentages, so labels can get out of its
 * way. Generous rather than exact: the panel's width depends on its text and on
 * whether the room rail is open, and a label that clears it by too much costs
 * nothing while one that clears it by too little is a collision.
 */
const PANEL = { x0: 38, x1: 82, y0: 64 };

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function StopOverlay({
  stop,
  progress,
}: {
  stop: ResolvedStop | null;
  progress: number;
}) {
  /**
   * The mark the visitor is pointing at, or null.
   *
   * Nothing resets it, because nothing has to: the caller keys this component on
   * the room, so leaving one takes the state with it. That matters more than it
   * looks — a mark unmounting under the cursor never fires a leave, so a hold
   * carried across rooms would open a sentence nobody is pointing at.
   */
  const [heldIndex, setHeld] = useState<number | null>(null);

  if (!stop) return null;

  const entering = Math.min(1, progress / 0.16);
  const leaving = clamp((progress - 0.88) / 0.12, 0, 1);
  const presence = Math.max(0, entering - leaving);

  const count = stop.hotspots.length;
  const held = heldIndex === null ? null : stop.hotspots[heldIndex];

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
          const isHeld = i === heldIndex;
          /* Each mark arrives on its own beat, and leaves with the room. */
          const arrival = clamp((progress - (MARK_START + i * MARK_STAGGER)) / MARK_FADE, 0, 1);
          const appear = presence * arrival;

          /*
           * Labels sit beside the point, on the side with more frame. Low in the
           * picture they would run into the room panel, so there they go above
           * the point instead, on a short vertical leader.
           */
          const flipX = spot.x > 55;
          const labelSpan = flipX ? [spot.x - 11, spot.x] : [spot.x, spot.x + 11];
          const clashes =
            spot.y > PANEL.y0 && labelSpan[1] > PANEL.x0 && labelSpan[0] < PANEL.x1;

          return (
            <div
              key={spot.id}
              className="absolute"
              style={{ left: `${spot.x}%`, top: `${spot.y}%`, opacity: appear }}
            >
              {/*
                The mark, and the thing you point at. Its hit area is far larger
                than the dot — a 9px target would be a game of skill — but it is
                only live once the room has actually arrived.
              */}
              <button
                type="button"
                aria-label={`${spot.label}. ${spot.text}`}
                aria-pressed={isHeld}
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
                  'rounded-full',
                  presence > 0.5 ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none',
                ].join(' ')}
              >
                <span
                  aria-hidden
                  className="block rounded-full bg-champagne transition-all duration-300 ease-[var(--ease-cinema)]"
                  style={{
                    width: isHeld ? 9 : 5,
                    height: isHeld ? 9 : 5,
                    boxShadow: isHeld ? '0 0 14px 3px rgb(255 243 207 / 0.45)' : 'none',
                  }}
                />
                {/* One ring as the mark lands, and again when it is pointed at. */}
                <span
                  aria-hidden
                  className="absolute top-1/2 left-1/2 size-[9px] rounded-full border border-champagne/60"
                  style={{
                    transform: `translate(-50%,-50%) scale(${1 + (1 - arrival) * 2.4})`,
                    opacity: arrival < 1 ? arrival * (1 - arrival) * 3 : 0,
                  }}
                />
              </button>

              {/*
                Leader and label. Plain type over the film — the shadow is what
                keeps it legible against a lit wall, and it costs nothing to
                composite.
              */}
              <div
                aria-hidden
                className={[
                  'absolute flex items-center gap-2 transition-opacity duration-300',
                  clashes ? 'flex-col' : '',
                ].join(' ')}
                style={
                  clashes
                    ? {
                        bottom: 10,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        opacity: isHeld ? 1 : 0.72,
                      }
                    : {
                        top: '50%',
                        [flipX ? 'right' : 'left']: 10,
                        transform: 'translateY(-50%)',
                        flexDirection: flipX ? 'row-reverse' : 'row',
                        opacity: isHeld ? 1 : 0.72,
                      }
                }
              >
                <span
                  className={
                    clashes
                      ? 'block w-px bg-gradient-to-t from-champagne/70 to-champagne/20'
                      : 'block h-px bg-gradient-to-r from-champagne/70 to-champagne/20'
                  }
                  style={clashes ? { height: 16 } : { width: 22 }}
                />
                <span
                  className="tracked text-[8px] whitespace-nowrap transition-colors duration-300"
                  style={{
                    color: isHeld ? 'var(--color-champagne)' : 'var(--color-linen)',
                    textShadow: '0 1px 14px rgb(5 7 12 / 0.95), 0 0 3px rgb(5 7 12 / 0.8)',
                  }}
                >
                  {spot.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/*
        The room, and whatever is being pointed at in it. One pane, mounted once
        for the whole dwell. Offset so it clears the room rail on the left.
      */}
      <div
        className="absolute inset-x-0 bottom-[12%] flex justify-center pr-5 pl-[86px] lg:pr-10 lg:pl-[330px]"
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
            <span className="text-[9px] text-ash/60 tabular-nums">{pad2(count)} marked</span>
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
            Whichever mark is being pointed at. Height is reserved rather than
            measured, so the panel never changes size as the text swaps under it —
            a pane that resized every time the cursor moved would draw the eye
            away from the room. Keyed on the point so the fade replays.
          */}
          <div className="mt-3 border-t border-linen/10 pt-3">
            <div key={held?.id ?? 'idle'} className="fade-line min-h-[3.4rem]">
              {held ? (
                <>
                  <div className="tracked text-[7.5px] text-champagne/85">{held.label}</div>
                  <p className="mt-1.5 text-[12px] leading-snug text-linen/90">{held.text}</p>
                </>
              ) : (
                <p className="text-[11.5px] leading-snug text-ash/60">
                  Choose a mark to read it.
                </p>
              )}
            </div>
          </div>
        </LiquidGlass>
      </div>
    </div>
  );
}
