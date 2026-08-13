'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { InteractionManager } from '@/tour/InteractionManager';

/**
 * Progress through the house, drawn down the inner edge of the room rail — and
 * the room list's scrollbar.
 *
 * The two readings share one axis honestly, because both are the house in
 * order, start to finish:
 *
 *   fill + head   where the walk currently is
 *   notches       chapter boundaries
 *   thumb         which stretch of the list is on screen
 *
 * The thumb is draggable and the track is clickable, so it behaves like a real
 * scrollbar rather than a decoration that happens to move.
 *
 * Isolated on purpose. Both progress and scroll change continuously, so this
 * subscribes on its own and re-renders alone — the thirty room rows beside it
 * never do.
 */
export function RailProgress({
  interactions,
  marks,
  expanded,
  scrollRef,
}: {
  interactions: InteractionManager | null;
  /** Chapter start positions as fractions of the walk. */
  marks: number[];
  expanded: boolean;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [progress, setProgress] = useState(0);
  const [thumb, setThumb] = useState<{ top: number; size: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const frame = useRef(0);

  useEffect(() => {
    if (!interactions) return;
    return interactions.subscribeProgress(setProgress);
  }, [interactions]);

  /* --- keep the thumb in step with the list ---------------------------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const measure = () => {
      frame.current = 0;
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight <= clientHeight + 1) return setThumb(null);
      setThumb({
        top: (scrollTop / scrollHeight) * 100,
        size: (clientHeight / scrollHeight) * 100,
      });
    };
    const onScroll = () => {
      if (frame.current) return;
      frame.current = requestAnimationFrame(measure);
    };

    measure();
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      ro.disconnect();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [scrollRef, expanded]);

  /* --- dragging the track scrolls the list ----------------------------- */
  const scrollToPointer = useCallback(
    (clientY: number) => {
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track) return;
      const r = track.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (clientY - r.top) / r.height));
      const max = el.scrollHeight - el.clientHeight;
      // Centre the visible window on the pointer rather than putting its top
      // there, which is what makes a scrollbar feel like it tracks the cursor.
      el.scrollTop = Math.min(max, Math.max(0, fraction * el.scrollHeight - el.clientHeight / 2));
    },
    [scrollRef],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!thumb) return;
      dragging.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      scrollToPointer(e.clientY);
    },
    [scrollToPointer, thumb],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging.current) return;
      scrollToPointer(e.clientY);
    },
    [scrollToPointer],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const pct = Math.min(100, Math.max(0, progress * 100));

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      className={`absolute inset-y-1 left-[4px] z-10 w-[16px] ${
        // Only grabbable once the rail is open and the thumb is actually
        // visible — dragging an invisible list would be a trap.
        thumb && expanded ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'
      }`}
    >
      <div aria-hidden className="absolute inset-y-0 left-[7px] w-[3px]">
        {/* unlit track, faded out at both ends */}
        <div className="absolute inset-0 left-[1px] w-px rounded-full bg-gradient-to-b from-transparent via-linen/15 to-transparent" />

        {/* the visible window of the list */}
        {thumb && (
          <div
            className="absolute -left-[1.5px] w-[6px] rounded-full bg-linen/12 transition-opacity duration-500"
            style={{
              top: `${thumb.top}%`,
              height: `${thumb.size}%`,
              opacity: expanded ? 1 : 0,
            }}
          />
        )}

        {/* distance travelled */}
        <div
          className="absolute top-0 left-[1px] w-px rounded-full bg-gradient-to-b from-champagne/10 via-champagne/70 to-champagne"
          style={{ height: `${pct}%`, boxShadow: '0 0 6px 0 rgb(255 243 207 / 0.35)' }}
        />

        {/* chapter notches */}
        {marks.map((m, i) => (
          <span
            key={i}
            className="absolute left-0 h-px w-[3px] rounded-full transition-colors duration-500"
            style={{
              top: `${Math.min(100, Math.max(0, m * 100))}%`,
              background: progress >= m ? 'rgb(255 243 207 / 0.55)' : 'rgb(242 233 216 / 0.2)',
            }}
          />
        ))}

        {/* the head */}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-champagne"
          style={{
            top: `${pct}%`,
            width: 5,
            height: 5,
            boxShadow: '0 0 10px 2px rgb(255 243 207 / 0.55)',
          }}
        />

        {/* a soft halo that only shows while the rail is open */}
        <span
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-champagne/35 transition-opacity duration-500"
          style={{
            top: `${pct}%`,
            width: 13,
            height: 13,
            opacity: expanded ? 1 : 0,
          }}
        />
      </div>
    </div>
  );
}
