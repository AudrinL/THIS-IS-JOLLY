'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CHAPTER_VIEWS, Space, TOUR_DURATION, elapsed, spaceAt } from '@/lib/tour';
import { clock, pad2 } from '@/lib/format';
import { coverGeometry, focalFor, toViewport } from '@/lib/frame';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { InteractionManager, TourState } from '@/tour/InteractionManager';
import type { ResolvedStop } from '@/tour/Timeline';
import { PlanView } from './FloorPlan';

/**
 * The tour's interface on a phone.
 *
 * The desktop chrome is five things arranged around the film: a rail on the
 * left, a plan on the right, a room card, a stop card and a HUD in the corners.
 * A phone has no corners to speak of — the film fills the screen and the thumb
 * lives along its bottom edge — so all five fold into one bar there, and the
 * two that need space (the room index and the plan) open upward as sheets.
 *
 * What stays the same is everything under it: the engine, the film, the
 * timeline, the stops. This is a different arrangement of the same content,
 * not a different tour.
 *
 * ---------------------------------------------------------------------------
 * The crop
 * ---------------------------------------------------------------------------
 * The film is 16:9 and the screen is roughly 9:19, so `object-cover` shows the
 * middle third of every frame. Two things follow. Hotspot coordinates are
 * percentages of the film, and have to be mapped through the crop before they
 * mean anything on screen (`lib/frame`). And a room's features are often not
 * in the middle third — so while a stop is on screen, the stage pans the crop
 * to centre the marks, the way a phone user would drag the picture to see
 * what is being pointed at. The pan is a CSS transition on `object-position`,
 * driven from one custom property on the stage.
 */

type Sheet = 'none' | 'rooms' | 'plan';

/** Rooms worth listing: passages and title cards are not destinations. */
function destinations(spaces: Space[]): Space[] {
  return spaces.filter(
    (s) =>
      !s.isPassage && s.category !== 'title' && s.category !== 'outro' && s.category !== 'montage',
  );
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The stage's size, which is the viewport's — it is `h-svh w-full`. */
function useStageSize(): { w: number; h: number } {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    if (!stage) return;
    const apply = () => setSize({ w: stage.clientWidth, h: stage.clientHeight });
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(stage);
    return () => ro.disconnect();
  }, []);
  return size;
}

export function MobileChrome({
  state,
  interactions,
  onSeek,
  onScrub,
  timeAt,
}: {
  state: TourState;
  interactions: InteractionManager | null;
  onSeek: (time: number) => void;
  onScrub: (progress: number, dragging: boolean) => void;
  timeAt: (progress: number) => number;
}) {
  const [sheetState, setSheet] = useState<Sheet>('none');
  /**
   * The mark being read, shared by the marks on the film and the card. It
   * remembers which room it was chosen in, so leaving the room drops it during
   * render — there is never a frame with another room's mark lit.
   */
  const [heldState, setHeldState] = useState<{ i: number | null; slug?: string }>({ i: null });
  const size = useStageSize();
  const inTour = state.phase === 'tour';
  const chapter = state.chapter;
  const number = chapter ? CHAPTER_VIEWS.findIndex((c) => c.id === chapter.id) + 1 : 0;

  /*
   * The pan. While a stop is on screen the crop centres its marks; otherwise
   * it sits in the middle of the frame. Written to the stage as a custom
   * property so the <video> elements — which React never touches — pick it up
   * through one rule in globals.css.
   */
  const focal = (() => {
    if (!state.stop || !size.w) return 0.5;
    const xs = state.stop.hotspots.map((h) => h.x);
    const centre = xs.reduce((a, b) => a + b, 0) / xs.length;
    return focalFor(size.w, size.h, centre);
  })();

  useEffect(() => {
    const stage = document.querySelector<HTMLElement>('[data-stage]');
    if (!stage) return;
    stage.style.setProperty('--focal-x', `${(focal * 100).toFixed(2)}%`);
    return () => {
      stage.style.removeProperty('--focal-x');
    };
  }, [focal]);

  const stopSlug = state.stop?.slug;
  const held = heldState.slug === stopSlug ? heldState.i : null;
  const setHeld = (i: number | null) => setHeldState({ i, slug: stopSlug });

  // A sheet has no business staying open once the visitor has left the tour.
  const sheet: Sheet = inTour ? sheetState : 'none';

  const seekAndClose = (t: number) => {
    setSheet('none');
    onSeek(t);
  };

  return (
    <>
      {/* ---- marks on the film, while a room holds ------------------------ */}
      <StopMarks
        stop={state.stop}
        interactions={interactions}
        size={size}
        focal={focal}
        held={held}
        setHeld={setHeld}
      />

      {/* ---- the bar --------------------------------------------------------- */}
      <div
        className={[
          'absolute inset-x-0 bottom-0 z-40 flex flex-col',
          'transition-opacity duration-700 ease-[var(--ease-cinema)]',
          inTour ? 'opacity-100' : 'pointer-events-none opacity-0',
        ].join(' ')}
      >
        <StopCard stop={state.stop} interactions={interactions} held={held} setHeld={setHeld} />

        <div className="relative pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Shade behind the readout, so the type holds over a lit room. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-16 bottom-0 bg-gradient-to-t from-void/80 via-void/40 to-transparent"
          />

          <div className="relative flex items-end justify-between gap-3 px-4 pb-2">
            <div className="min-w-0">
              <div className="tracked truncate text-[8px] whitespace-nowrap text-ash/70">
                Chapter {pad2(number)}
                <span className="mx-2 text-ash/40">·</span>
                {chapter?.name ?? ''}
              </div>
              <div className="mt-1 truncate text-[17px] leading-tight text-linen">
                {state.space?.name ?? ''}
              </div>
              <div className="tracked mt-1 text-[8px] text-ash/60 tabular-nums">
                {clock(elapsed(state.time))} / {clock(TOUR_DURATION)}
              </div>
            </div>

            <div className="flex shrink-0 gap-2">
              <BarButton
                label="Rooms"
                active={sheet === 'rooms'}
                onClick={() => setSheet((s) => (s === 'rooms' ? 'none' : 'rooms'))}
              >
                <RoomsIcon />
              </BarButton>
              <BarButton
                label="Plan"
                active={sheet === 'plan'}
                onClick={() => setSheet((s) => (s === 'plan' ? 'none' : 'plan'))}
              >
                <PlanIcon />
              </BarButton>
            </div>
          </div>

          <TouchScrubber progress={state.progress} onScrub={onScrub} timeAt={timeAt} />
        </div>
      </div>

      {/* ---- sheets ---------------------------------------------------------- */}
      <div
        className={[
          'absolute inset-0 z-50 transition-opacity duration-500 ease-[var(--ease-cinema)]',
          sheet === 'none' ? 'pointer-events-none opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        {/* The scrim is the close control. */}
        <button
          type="button"
          aria-label="Close"
          onClick={() => setSheet('none')}
          className="absolute inset-0 bg-void/55"
        />

        <div
          className={[
            'absolute inset-x-2 bottom-2 transition-transform duration-500 ease-[var(--ease-cinema)]',
            sheet === 'none' ? 'translate-y-6' : 'translate-y-0',
          ].join(' ')}
        >
          <LiquidGlass
            radius={26}
            beads="fine"
            appear={sheet === 'none' ? 0 : 1}
            appearMs={450}
            contentClassName="pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="tracked text-[9px] text-ash/70">
                {sheet === 'plan' ? 'The plan' : 'The rooms'}
              </span>
              <button
                type="button"
                onClick={() => setSheet('none')}
                className="tracked-tight rounded-full px-3 py-1.5 text-[9px] text-linen/70"
              >
                Close
              </button>
            </div>

            {sheet === 'rooms' && (
              <RoomList state={state} onSeek={seekAndClose} />
            )}
            {sheet === 'plan' && (
              <div className="px-5 pt-1 pb-2">
                <PlanView
                  state={state}
                  interactions={interactions}
                  onSeek={seekAndClose}
                  className="w-full"
                  large
                />
              </div>
            )}
          </LiquidGlass>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- the bar */

function BarButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <LiquidGlass variant="soft" radius={999} beads="none" className="pointer-events-auto">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={[
          'grid size-11 place-items-center rounded-full transition-colors duration-300',
          active ? 'text-champagne' : 'text-linen/85',
        ].join(' ')}
      >
        {children}
      </button>
    </LiquidGlass>
  );
}

function RoomsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M2 4h12M2 8h9M2 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PlanIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2.5 3.5h11v9h-11zM7 3.5v5M7 8.5h6.5M2.5 8.5H5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Progress, full width, with a strip tall enough for a thumb. Dragging it
 * scrubs the walk and names the room under the thumb; there is no hover, so
 * there is no preview until the thumb is down.
 */
function TouchScrubber({
  progress,
  onScrub,
  timeAt,
}: {
  progress: number;
  onScrub: (progress: number, dragging: boolean) => void;
  timeAt: (progress: number) => number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [held, setHeld] = useState<{ f: number; space: Space | null } | null>(null);

  const fractionAt = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const r = track.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const f = fractionAt(e.clientX);
    setHeld({ f, space: spaceAt(timeAt(f)) });
    onScrub(f, true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const f = fractionAt(e.clientX);
    setHeld({ f, space: spaceAt(timeAt(f)) });
    onScrub(f, true);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setHeld(null);
    onScrub(fractionAt(e.clientX), false);
  };

  const pct = clamp(progress * 100, 0, 100);

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      /* Lenis must not see this strip: a drag along it is a scrub, not a
         scroll, and the strip is the one place a horizontal thumb is expected. */
      data-lenis-prevent
      className="pointer-events-auto relative flex h-10 touch-none items-center px-4"
      role="progressbar"
      aria-label="Position in the walkthrough"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div ref={trackRef} className="relative w-full">
        {held?.space && (
          <div
            className="pointer-events-none absolute bottom-5 -translate-x-1/2"
            style={{ left: `${clamp(held.f * 100, 12, 88)}%` }}
          >
            <LiquidGlass radius={12} variant="soft" beads="none" contentClassName="px-3 py-1.5">
              <span className="text-[11px] whitespace-nowrap text-linen/90">
                {held.space.name}
              </span>
            </LiquidGlass>
          </div>
        )}

        <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-linen/15">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-champagne/40 to-champagne"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div
          className="absolute top-1/2 rounded-full bg-champagne shadow-[0_0_8px_2px_rgb(255_243_207/0.5)] transition-[width,height] duration-200"
          style={{
            left: `${pct}%`,
            width: held ? 12 : 6,
            height: held ? 12 : 6,
            transform: 'translate(-50%,-50%)',
          }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- rooms */

function RoomList({ state, onSeek }: { state: TourState; onSeek: (t: number) => void }) {
  const activeId = state.space?.id;
  const listRef = useRef<HTMLDivElement>(null);

  /* Open on the room the visitor is in, not on the top of the house. The
     list is scrolled directly rather than with scrollIntoView, which would
     also try to bring the list into view by scrolling the page — and the
     page is Lenis's. */
  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>('[data-active="true"]');
    if (!list || !el) return;
    list.scrollTop = el.offsetTop - list.clientHeight / 2 + el.offsetHeight / 2;
  }, []);

  return (
    <div
      ref={listRef}
      data-lenis-prevent
      className="quiet-scroll max-h-[62svh] overflow-y-auto overscroll-contain px-2 pb-1"
    >
      {CHAPTER_VIEWS.map((chapter) => {
        const rooms = destinations(chapter.spaces);
        if (!rooms.length) return null;
        const inChapter = chapter.id === state.chapter?.id;
        return (
          <section key={chapter.id} className="mt-2">
            <button
              type="button"
              onClick={() => onSeek(chapter.start + 0.4)}
              className="flex w-full items-center gap-3 px-3 py-2 text-left"
            >
              <span
                aria-hidden
                className={[
                  'block h-px shrink-0 transition-all duration-500',
                  inChapter ? 'w-7 bg-champagne' : 'w-4 bg-linen/25',
                ].join(' ')}
              />
              <span className="tracked text-[8.5px] text-ash/70">{chapter.name}</span>
            </button>
            <ul>
              {rooms.map((room) => {
                const active = room.id === activeId;
                return (
                  <li key={room.id}>
                    <button
                      type="button"
                      data-active={active}
                      onClick={() => onSeek(room.start + Math.min(0.8, room.duration * 0.2))}
                      className={[
                        'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors duration-300',
                        active ? 'bg-linen/8 text-linen' : 'text-bone/70 active:bg-linen/6',
                      ].join(' ')}
                    >
                      <span aria-hidden className="grid w-4 shrink-0 place-items-center">
                        <span
                          className={[
                            'block rounded-full',
                            active
                              ? 'size-2 bg-champagne shadow-[0_0_10px_2px_rgb(255_243_207/0.45)]'
                              : 'size-[3px] bg-linen/35',
                          ].join(' ')}
                        />
                      </span>
                      <span className="flex-1 truncate text-[14px]">{room.name}</span>
                      <span className="text-[9px] text-ash/55 tabular-nums">
                        {clock(elapsed(room.start))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- stops */

/**
 * Dwell progress, on its own channel so only the stop pieces re-render.
 * Subscribed for as long as the chrome is mounted, not just while a stop is on
 * screen: the engine publishes a stop's first dwell value in the same frame it
 * publishes the stop, and a subscription made in response would miss it.
 */
function useDwell(interactions: InteractionManager | null, active: boolean): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!interactions) return;
    return interactions.subscribeDwell(setProgress);
  }, [interactions]);
  return active ? progress : 0;
}

function presenceOf(progress: number): number {
  const entering = Math.min(1, progress / 0.16);
  const leaving = clamp((progress - 0.88) / 0.12, 0, 1);
  return Math.max(0, entering - leaving);
}

/**
 * Numbered marks on the film. The numbers are the link to the card below:
 * a phone has no hover to reveal a label beside a dot, so the dot says which
 * line of the card it is, and either can be tapped.
 */
function StopMarks({
  stop,
  interactions,
  size,
  focal,
  held,
  setHeld,
}: {
  stop: ResolvedStop | null;
  interactions: InteractionManager | null;
  size: { w: number; h: number };
  focal: number;
  held: number | null;
  setHeld: (i: number | null) => void;
}) {
  const progress = useDwell(interactions, Boolean(stop));

  if (!stop || !size.w) return null;
  const presence = presenceOf(progress);
  const g = coverGeometry(size.w, size.h, focal);

  return (
    <div className="pointer-events-none absolute inset-0 z-45">
      <div className="drift absolute inset-0">
        {stop.hotspots.map((spot, i) => {
          const p = toViewport(g, spot.x, spot.y);
          // Off the crop even after the pan: the card still lists it.
          if (p.x < 4 || p.x > 96 || p.y < 8 || p.y > 55) return null;
          const arrival = clamp((progress - (0.08 + i * 0.05)) / 0.12, 0, 1);
          const isHeld = held === i;
          return (
            <button
              key={spot.id}
              type="button"
              aria-label={spot.label}
              onClick={() => setHeld(held === i ? null : i)}
              className={[
                'absolute grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full',
                'transition-[left,top] duration-[900ms] ease-[var(--ease-cinema)]',
                presence > 0.5 ? 'pointer-events-auto' : 'pointer-events-none',
              ].join(' ')}
              style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: presence * arrival }}
            >
              <span
                className={[
                  'grid place-items-center rounded-full border text-[10px] tabular-nums transition-all duration-300',
                  isHeld
                    ? 'size-7 border-champagne bg-champagne text-void shadow-[0_0_14px_3px_rgb(255_243_207/0.45)]'
                    : 'size-6 border-champagne/80 bg-void/55 text-linen backdrop-blur-sm',
                ].join(' ')}
              >
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The room, read from the bottom of the screen. Title, a line about the room,
 * then the marks as a row of numbered chips; the chosen one opens its sentence
 * underneath. Height is reserved for the sentence so the bar beneath does not
 * jump as the visitor reads.
 */
function StopCard({
  stop,
  interactions,
  held,
  setHeld,
}: {
  stop: ResolvedStop | null;
  interactions: InteractionManager | null;
  held: number | null;
  setHeld: (i: number | null) => void;
}) {
  const progress = useDwell(interactions, Boolean(stop));
  if (!stop) return null;

  const presence = presenceOf(progress);
  const current = held === null ? null : stop.hotspots[held];

  return (
    <div
      className="px-3 pb-2"
      style={{
        transform: `translateY(${(1 - presence) * 12}px)`,
        pointerEvents: presence > 0.5 ? 'auto' : 'none',
      }}
    >
      <LiquidGlass appear={presence} radius={22} beads="large" contentClassName="px-4 pt-3.5 pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <span className="tracked text-[8px] text-ash/70">{stop.space.category}</span>
          <span className="text-[9px] text-ash/60 tabular-nums">{pad2(stop.hotspots.length)} marked</span>
        </div>
        <h3
          className="mt-1.5 text-[1.35rem] leading-[1.1] text-linen"
          style={{ fontFamily: 'var(--font-editorial)' }}
        >
          {stop.title}
        </h3>
        <p className="mt-1.5 text-[12px] leading-snug text-bone/70">{stop.blurb}</p>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          {stop.hotspots.map((spot, i) => {
            const on = held === i;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => setHeld(on ? null : i)}
                aria-pressed={on}
                className={[
                  'flex shrink-0 items-center gap-2 rounded-full border py-1.5 pr-3 pl-1.5 text-[10.5px] transition-colors duration-300',
                  on
                    ? 'border-champagne/70 bg-champagne/12 text-champagne'
                    : 'border-linen/15 text-linen/80',
                ].join(' ')}
              >
                <span
                  className={[
                    'grid size-5 place-items-center rounded-full text-[9px] tabular-nums',
                    on ? 'bg-champagne text-void' : 'bg-linen/12 text-linen/80',
                  ].join(' ')}
                >
                  {i + 1}
                </span>
                {spot.label}
              </button>
            );
          })}
        </div>

        <div key={current?.id ?? 'idle'} className="fade-line mt-2.5 min-h-[2.6rem]">
          {current ? (
            <p className="text-[12px] leading-snug text-linen/90">{current.text}</p>
          ) : (
            <p className="text-[11px] leading-snug text-ash/60">Tap a number to read it.</p>
          )}
        </div>
      </LiquidGlass>
    </div>
  );
}
