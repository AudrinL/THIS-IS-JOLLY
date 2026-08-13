'use client';

import { Space } from '@/lib/tour';
import { LiquidGlass } from './LiquidGlass';

/**
 * The contextual glass panel.
 *
 * Appears only when the camera has settled inside a room worth naming, and only
 * for rooms the film does not already label itself. One panel at a time, held to
 * a corner, tinted with that space's own accent colour from tour-map.json.
 */
export function SpacePanel({
  space,
  railOpen = false,
}: {
  space: Space | null;
  railOpen?: boolean;
}) {
  const visible = Boolean(space);

  return (
    <div
      aria-live="polite"
      className={[
        'pointer-events-none absolute z-40 transition-all duration-[650ms] ease-[var(--ease-cinema)]',
        'bottom-24 sm:bottom-28',
        // Clears the collapsed rail at rest, and steps aside when it opens.
        railOpen ? 'left-[334px]' : 'left-[94px] sm:left-[108px]',
        visible ? 'translate-y-0 opacity-100 blur-0' : 'translate-y-4 opacity-0 blur-[2px]',
        // On a phone an open rail leaves no room beside it, so the card yields.
        railOpen ? 'max-sm:opacity-0' : '',
      ].join(' ')}
    >
      {space && (
        <LiquidGlass
          as="article"
          key={space.id}
          radius={24}
          beads="large"
          className="w-[min(21rem,calc(100vw-7rem))]"
          contentClassName="p-5"
          style={
            {
              // a whisper of the room's own light bleeding through the pane
              background: `radial-gradient(120% 90% at 30% 0%, ${space.accentColor}14, transparent 70%)`,
            } as React.CSSProperties
          }
        >
          <header className="flex items-baseline justify-between gap-4">
            <span className="tracked text-[8.5px] text-ash/80">{space.category}</span>
            <span className="tracked text-[8.5px] text-ash/60">{space.level}</span>
          </header>

          <h3
            className="mt-3 text-[1.4rem] leading-[1.1] text-linen"
            style={{ fontFamily: 'var(--font-editorial)' }}
          >
            {space.name}
          </h3>

          <ul className="mt-4 space-y-2">
            {space.visualElements.slice(0, 3).map((item) => (
              <li key={item} className="flex gap-2.5 text-[12px] leading-snug text-bone/70">
                <span
                  aria-hidden
                  className="mt-1.5 size-1 shrink-0 rounded-full"
                  style={{ background: space.accentColor }}
                />
                {item}
              </li>
            ))}
          </ul>
        </LiquidGlass>
      )}
    </div>
  );
}
