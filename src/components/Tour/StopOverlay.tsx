'use client';

import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { ResolvedStop } from '@/tour/Timeline';
import { pad2 } from '@/lib/format';

/**
 * What appears while the camera holds in a room.
 *
 * Only one hotspot is ever expanded. The dwell is divided into a slot per
 * feature, so the room explains itself one thing at a time — the earlier
 * version faded them all in together and the cards landed on top of each other
 * wherever two features sat close in frame.
 *
 * The inactive points stay on screen as small marks, so you can see how many
 * things are being pointed out and which one you are on.
 *
 * `progress` runs 0..1 across the hold and is driven by scroll, so the sequence
 * is scrubbable in both directions.
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
  if (!stop) return null;

  const entering = Math.min(1, progress / 0.16);
  const leaving = clamp((progress - 0.88) / 0.12, 0, 1);
  const presence = Math.max(0, entering - leaving);

  const count = stop.hotspots.length;
  const span = (WINDOW_END - WINDOW_START) / count;
  const raw = (progress - WINDOW_START) / span;
  const activeIndex = clamp(Math.floor(raw), 0, count - 1);
  /** 0..1 within the active hotspot's own slot, for its entrance. */
  const slot = clamp(raw - activeIndex, 0, 1);
  const started = progress >= WINDOW_START;

  return (
    <div className="pointer-events-none absolute inset-0 z-45">
      {/* A touch of shade so the cards hold their contrast over a bright room. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_50%,transparent_30%,rgb(5_7_12/0.52)_100%)]"
        style={{ opacity: presence * 0.9 }}
      />

      {/* Room title. Offset so it clears the room rail on the left. */}
      <div
        className="absolute inset-x-0 bottom-[15%] flex justify-center pr-5 pl-[86px] lg:pr-10 lg:pl-[330px]"
        style={{ opacity: presence, transform: `translateY(${(1 - presence) * 14}px)` }}
      >
        <LiquidGlass
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
        </LiquidGlass>
      </div>

      {stop.hotspots.map((spot, i) => {
        const active = started && i === activeIndex;
        const dotAlpha = presence * (active ? 1 : 0.42);

        // Card sits on whichever side has room, and above or below the point
        // when it is near the top or bottom edge of the frame.
        const flipX = spot.x > 55;
        const nearTop = spot.y < 24;
        const nearBottom = spot.y > 74;

        return (
          <div
            key={spot.id}
            className="absolute"
            style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
          >
            {/* the point */}
            <span
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-opacity duration-500"
              style={{ opacity: dotAlpha }}
            >
              <span
                className="block rounded-full bg-champagne transition-all duration-500 ease-[var(--ease-cinema)]"
                style={{
                  width: active ? 9 : 5,
                  height: active ? 9 : 5,
                  boxShadow: active ? '0 0 14px 3px rgb(255 243 207 / 0.45)' : 'none',
                }}
              />
              {active && (
                <span
                  className="absolute top-1/2 left-1/2 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne/60"
                  style={{ transform: `translate(-50%,-50%) scale(${1 + slot * 2.4})`, opacity: (1 - slot) * 0.85 }}
                />
              )}
            </span>

            {/* the card — mounted only for the active point */}
            {active && (
              <div
                className="absolute"
                style={{
                  [flipX ? 'right' : 'left']: 18,
                  ...(nearTop
                    ? { top: 14 }
                    : nearBottom
                      ? { bottom: 14 }
                      : { top: '50%', transform: 'translateY(-50%)' }),
                  opacity: presence * Math.min(1, slot / 0.18),
                } as React.CSSProperties}
              >
                <LiquidGlass
                  radius={16}
                  variant="soft"
                  beads="none"
                  className="w-[14.5rem]"
                  contentClassName="px-4 py-3"
                >
                  <div className="tracked text-[7.5px] text-champagne/85">{spot.label}</div>
                  <p className="mt-1.5 text-[12px] leading-snug text-linen/90">{spot.text}</p>
                </LiquidGlass>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
