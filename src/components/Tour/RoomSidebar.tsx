'use client';

import { useEffect, useRef, useState } from 'react';
import { CHAPTER_VIEWS, Space } from '@/lib/tour';
import { LiquidGlass } from '@/components/GlassPanel/LiquidGlass';
import type { InteractionManager, TourState } from '@/tour/InteractionManager';
import { RailProgress } from './RailProgress';

/**
 * The room index.
 *
 * Collapsed it is a narrow rail of chapter marks; on hover or keyboard focus it
 * opens into the full list of rooms. Selecting one jumps the walk straight
 * there, so a visitor who came to see the gym does not have to walk the house
 * to reach it.
 *
 * Open state is lifted out through `onOpenChange` so the room card can step
 * aside while the rail is out. It changes on enter and leave only — never on
 * pointer movement — so hovering across the list costs two renders, not sixty
 * a second.
 *
 * The list scrolls without a scrollbar: `.quiet-scroll` hides it and fades the
 * list out at both ends instead.
 */

/** Rooms worth listing: passages and title cards are not destinations. */
function destinations(spaces: Space[]): Space[] {
  return spaces.filter(
    (s) =>
      !s.isPassage && s.category !== 'title' && s.category !== 'outro' && s.category !== 'montage',
  );
}

export function RoomSidebar({
  state,
  onSeek,
  onOpenChange,
  interactions,
  marks,
}: {
  state: TourState;
  onSeek: (time: number) => void;
  onOpenChange?: (open: boolean) => void;
  interactions: InteractionManager | null;
  /** Chapter start positions as fractions of the walk. */
  marks: number[];
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const visible = state.phase === 'tour' || state.phase === 'opening';
  const activeId = state.space?.id;
  const isOpen = open || pinned;

  useEffect(() => {
    onOpenChange?.(isOpen && visible);
  }, [isOpen, visible, onOpenChange]);

  return (
    <div
      className={[
        'pointer-events-none fixed top-1/2 left-3 z-50 -translate-y-1/2 sm:left-5',
        'transition-all duration-700 ease-[var(--ease-cinema)]',
        visible ? 'translate-x-0' : '-translate-x-6',
      ].join(' ')}
    >
      <LiquidGlass
        as="nav"
        /* The rail fades itself — an ancestor opacity would strip its blur. */
        appear={visible ? 1 : 0}
        appearMs={700}
        radius={26}
        beads="fine"
        variant="soft"
        aria-label="Rooms"
        // On the rail itself, which is the element that actually receives
        // pointer events — the wrapper is pointer-events-none.
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocusCapture={() => setOpen(true)}
        onBlurCapture={(e: React.FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
        }}
        className={[
          'pointer-events-auto overflow-hidden',
          'transition-[width] duration-[550ms] ease-[var(--ease-cinema)]',
          // Plain arbitrary values only. Tailwind does not emit a class for
          // w-[min(286px,68vw)], which left the rail silently stuck at 62px.
          isOpen ? 'w-[296px] max-w-[70vw]' : 'w-[70px]',
        ].join(' ')}
        contentClassName="py-3"
      >
        {/* Touch devices have no hover, so give them a real control. */}
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          aria-expanded={isOpen}
          aria-label="Toggle room list"
          className="mb-1 flex w-full items-center gap-3 py-2 pr-4 pl-6 text-left"
        >
          <span aria-hidden className="flex w-[30px] shrink-0 flex-col gap-[3px]">
            <span className="h-px w-4 bg-linen/70" />
            <span className="h-px w-3 bg-linen/50" />
            <span className="h-px w-5 bg-linen/60" />
          </span>
          <span
            className="tracked truncate text-[8.5px] whitespace-nowrap text-ash/70 transition-opacity duration-500"
            style={{ opacity: isOpen ? 1 : 0 }}
          >
            Rooms
          </span>
        </button>

      {/* The thread spans exactly the list, because it is the list's scrollbar
          as well as the walk's progress. */}
      <div className="relative">
        <RailProgress
          interactions={interactions}
          marks={marks}
          expanded={isOpen}
          scrollRef={scrollRef}
        />

        <div
          ref={scrollRef}
          /* Lenis owns the page's wheel. `data-lenis-prevent` hands it back to
             this element, so the pointer being over the rail scrolls the room
             list and leaves the walk exactly where it was. `overscroll-contain`
             stops the page taking over again when the list hits an end. */
          data-lenis-prevent
          className="quiet-scroll max-h-[58vh] overflow-x-hidden overflow-y-auto overscroll-contain pb-1"
        >
          {CHAPTER_VIEWS.map((chapter) => {
            const rooms = destinations(chapter.spaces);
            if (!rooms.length) return null;
            const inChapter = chapter.id === state.chapter?.id;

            return (
              <div key={chapter.id} className="mt-1">
                {/* Collapsed: a mark per chapter. Expanded: its name. */}
                <div className="flex items-center gap-3 py-1.5 pr-4 pl-6">
                  <span
                    aria-hidden
                    className={[
                      'block h-px shrink-0 transition-all duration-500',
                      inChapter ? 'w-[30px] bg-champagne' : 'w-[18px] bg-linen/25',
                    ].join(' ')}
                  />
                  <span
                    className="tracked truncate text-[8px] whitespace-nowrap text-ash/60 transition-opacity duration-500"
                    style={{ opacity: isOpen ? 1 : 0 }}
                  >
                    {chapter.name}
                  </span>
                </div>

                <ul>
                  {rooms.map((room) => {
                    const active = room.id === activeId;
                    return (
                      <li key={room.id}>
                        <button
                          type="button"
                          onClick={() => onSeek(room.start + Math.min(0.8, room.duration * 0.2))}
                          className={[
                            'flex w-full items-center gap-3 py-[5px] pr-4 pl-6 text-left transition-colors duration-300',
                            active ? 'text-linen' : 'text-bone/55 hover:text-linen/90',
                          ].join(' ')}
                        >
                          <span aria-hidden className="grid w-[30px] shrink-0 place-items-center">
                            <span
                              className={[
                                'block rounded-full transition-all duration-400',
                                active
                                  ? 'size-[7px] bg-champagne shadow-[0_0_10px_2px_rgb(255_243_207/0.45)]'
                                  : 'size-[3px] bg-linen/35',
                              ].join(' ')}
                            />
                          </span>
                          <span
                            className="truncate text-[11.5px] whitespace-nowrap transition-opacity duration-500"
                            style={{ opacity: isOpen ? 1 : 0 }}
                          >
                            {room.name}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
      </LiquidGlass>
    </div>
  );
}
