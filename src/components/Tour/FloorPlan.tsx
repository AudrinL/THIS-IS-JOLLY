'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Door,
  Fixture,
  PLAN_LEVELS,
  PlanArea,
  PlanLevel,
  Rect,
  Wall,
  areaOrder,
  areaStart,
  cameraAt,
  locate,
} from '@/data/floorplan';
import type { InteractionManager, TourState } from '@/tour/InteractionManager';

/**
 * The plan, lower right.
 *
 * A drawn floor plan with the visitor's own position and heading on it, so
 * anyone three minutes into a six-minute walk can see where in the house they
 * are without opening anything. The geometry, the camera route and the caveat
 * that goes with them all live in floorplan.ts — this draws what is there.
 *
 * What makes it read as a plan rather than as a diagram of boxes: walls are
 * drawn from authored segments at two weights, so a doorway is a real gap
 * rather than a patch; glazing is a double line and a balustrade is a dashed
 * one; and fixtures sit at a lighter weight than the walls, which is the
 * hierarchy every architectural plan uses and most of why one is legible at a
 * glance. Rooms draw no walls of their own — on the ground floor four of them
 * share a single undivided volume, and outlining each would build partitions
 * the house does not have.
 *
 * The marker never goes through React. Film time arrives on its own channel at
 * about twenty updates a second and the handler writes a transform straight
 * onto one <g>, so the plan moves continuously while this component renders
 * only when the room changes — a few dozen times across the whole walk.
 *
 * Nothing here is a tab stop. Every room on this plan is already a real button
 * in the room rail on the left, and a second identical set of stops would only
 * put thirty tab presses between the visitor and the page.
 */

export function FloorPlan({
  state,
  interactions,
  onSeek,
}: {
  state: TourState;
  interactions: InteractionManager | null;
  onSeek: (time: number) => void;
}) {
  const here = locate(state.space?.id);
  const walked = here ? areaOrder(here.area) : -1;
  const visible = state.phase === 'tour';

  /*
   * The plate follows the walk, but a visitor who taps another floor keeps it
   * until the walk crosses a storey itself — at which point their pick is stale
   * and the plan goes back to answering the question it is there for. The pick
   * remembers which plate it was made against rather than being cleared by an
   * effect, so it resolves during render and there is never a frame showing the
   * floor the visitor has just left.
   */
  const followed = here?.level ?? null;
  const [picked, setPicked] = useState<{ id: string; against?: string } | null>(null);
  const live = picked && picked.against === followed?.id ? picked.id : followed?.id;
  const level = PLAN_LEVELS.find((l) => l.id === live) ?? PLAN_LEVELS[0];
  const showing = level.id === followed?.id;

  return (
    <div
      aria-hidden
      className={[
        /*
          Aligned to the hero overlay's own padding — p-5 / sm:p-8 / lg:p-10 —
          and lifted clear of the bottom of the viewport, where the scrubber
          strip and the right-hand time readout already sit.
        */
        'pointer-events-none fixed z-40',
        'right-5 bottom-[76px] sm:right-8 sm:bottom-[88px] lg:right-10 lg:bottom-[96px]',
        'transition-all duration-700 ease-[var(--ease-cinema)]',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
      ].join(' ')}
    >
      <div className="w-[186px] sm:w-[220px]">
        <Plate level={level} here={here?.area} walked={walked} showing={showing} onSeek={onSeek}>
          <Marker interactions={interactions} levelId={level.id} showing={showing} />
        </Plate>

        {/*
          Naming the lit room, and saying plainly what the drawing is. The
          second half never changes and it is not decoration — the house is real
          and this drawing is not, and the visitor is entitled to know which of
          the two they are looking at.
        */}
        <p className="mt-1.5 text-right text-[9.5px] leading-tight">
          <span className="text-linen/80">{here?.area.label ?? level.name}</span>
          <span className="text-ash/55"> · schematic</span>
        </p>

        <div className="mt-1 flex justify-end gap-1">
          {PLAN_LEVELS.map((l) => (
            <button
              key={l.id}
              type="button"
              tabIndex={-1}
              onClick={() => setPicked({ id: l.id, against: followed?.id })}
              className={[
                'pointer-events-auto rounded-full px-1.5 py-0.5 text-[7px] tracking-[0.14em] uppercase',
                'transition-colors duration-300',
                l.id === level.id ? 'bg-linen/12 text-linen/80' : 'text-ash/50 hover:text-linen/70',
              ].join(' ')}
            >
              {/* The full name does not fit at this size, and the plate below is
                  already saying which floor this is. */}
              {l.id === 'lower' ? 'Lower' : l.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ plate */

const PAD = 3;

function Plate({
  level,
  here,
  walked,
  showing,
  onSeek,
  children,
}: {
  level: PlanLevel;
  here?: PlanArea;
  walked: number;
  showing: boolean;
  onSeek: (time: number) => void;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${level.w + PAD * 2} ${level.h + PAD * 2}`}
      className="w-full"
      style={{ filter: 'drop-shadow(0 2px 10px rgb(5 7 12 / 0.6))' }}
    >
      {/* The ground the plan sits on, so it reads against the film behind it. */}
      <rect
        x={-PAD}
        y={-PAD}
        width={level.w + PAD * 2}
        height={level.h + PAD * 2}
        rx={3}
        className="fill-void/55"
      />

      {/* Area fills: how far through the house the walk has got. */}
      {level.areas.map((area) => {
        const on = showing && here?.id === area.id;
        const seen = walked >= 0 && areaOrder(area) < walked;
        return area.rects.map((r, i) => (
          <rect
            key={`${area.id}-${i}`}
            x={r.x}
            y={r.y}
            width={r.w}
            height={r.h}
            className={[
              'transition-all duration-700 ease-[var(--ease-cinema)]',
              on
                ? 'fill-champagne/25'
                : seen
                  ? area.passage
                    ? 'fill-linen/6'
                    : 'fill-linen/12'
                  : area.exterior
                    ? 'fill-linen/[0.03]'
                    : 'fill-transparent',
            ].join(' ')}
          />
        ));
      })}

      {/* Outdoors gets a dashed site edge — it has no walls to draw. */}
      {level.areas
        .filter((a) => a.exterior)
        .flatMap((a) =>
          a.rects.map((r, i) => (
            <rect
              key={`${a.id}-site-${i}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill="none"
              className="stroke-linen/14"
              strokeWidth={0.4}
              strokeDasharray="2.4 2"
            />
          )),
        )}

      {level.voids.map((v, i) => (
        <VoidHatch key={i} rect={v} />
      ))}

      {level.fixtures.map((f, i) => (
        <FixtureShape key={i} fixture={f} />
      ))}

      {level.walls.map((w, i) => (
        <WallLine key={i} wall={w} />
      ))}

      {level.doors.map((d, i) => (
        <DoorSwing key={i} door={d} />
      ))}

      {/*
        Hit targets, invisible and last, so a click lands on the room rather
        than on whichever wall or fixture is drawn over it.
      */}
      <g className="pointer-events-auto">
        {level.areas.map((area) => {
          const t = areaStart(area);
          if (t === null) return null;
          return area.rects.map((r, i) => (
            <rect
              key={`${area.id}-hit-${i}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill="transparent"
              className="cursor-pointer"
              onClick={() => onSeek(t)}
            />
          ));
        })}
      </g>

      {children}
    </svg>
  );
}

/* ------------------------------------------------------------------ parts */

function WallLine({ wall: w }: { wall: Wall }) {
  const common = { x1: w.x1, y1: w.y1, x2: w.x2, y2: w.y2, strokeLinecap: 'butt' as const };

  if (w.kind === 'glazing') {
    // A wall you can see through: two thin lines with a gap, offset across the
    // wall's own thickness so it sits where the solid wall would have been.
    const dx = w.y1 === w.y2 ? 0 : 0.55;
    const dy = w.x1 === w.x2 ? 0 : 0.55;
    return (
      <g className="stroke-linen/60" strokeWidth={0.35}>
        <line x1={w.x1 - dx} y1={w.y1 - dy} x2={w.x2 - dx} y2={w.y2 - dy} />
        <line x1={w.x1 + dx} y1={w.y1 + dy} x2={w.x2 + dx} y2={w.y2 + dy} />
      </g>
    );
  }

  if (w.kind === 'balustrade') {
    return <line {...common} className="stroke-linen/30" strokeWidth={0.4} strokeDasharray="1.6 1.4" />;
  }

  return (
    <line
      {...common}
      className={w.kind === 'exterior' ? 'stroke-linen/75' : 'stroke-linen/45'}
      strokeWidth={w.kind === 'exterior' ? 1.5 : 0.9}
    />
  );
}

/** A leaf on its hinge and the quarter circle it sweeps — how a plan draws it. */
function DoorSwing({ door: d }: { door: Door }) {
  const s = d.swing;
  const r = d.len;
  return (
    <g className="stroke-linen/40" fill="none" strokeWidth={0.35}>
      {d.dir === 'h' ? (
        <>
          <line x1={d.x} y1={d.y} x2={d.x} y2={d.y + r * s} />
          <path d={`M ${d.x} ${d.y + r * s} A ${r} ${r} 0 0 ${s > 0 ? 0 : 1} ${d.x + r} ${d.y}`} />
        </>
      ) : (
        <>
          <line x1={d.x} y1={d.y} x2={d.x + r * s} y2={d.y} />
          <path d={`M ${d.x + r * s} ${d.y} A ${r} ${r} 0 0 ${s > 0 ? 1 : 0} ${d.x} ${d.y + r}`} />
        </>
      )}
    </g>
  );
}

/** Double height: hatched, the way a plan shows a hole in its own floor. */
function VoidHatch({ rect: v }: { rect: Rect }) {
  const lines = [];
  for (let o = -v.h; o < v.w; o += 3.4) {
    lines.push(
      <line
        key={o}
        x1={Math.max(v.x, v.x + o)}
        y1={v.y + Math.max(0, -o)}
        x2={Math.min(v.x + v.w, v.x + o + v.h)}
        y2={v.y + Math.min(v.h, v.w - o)}
      />,
    );
  }
  return (
    <g className="stroke-linen/10" strokeWidth={0.3}>
      {lines}
    </g>
  );
}

/**
 * Furniture, structure and ground.
 *
 * All of it lighter than the walls. A plan works because the eye reads the
 * heavy lines first and the contents second, and a bed drawn as boldly as the
 * wall behind it collapses that ordering immediately.
 */
function FixtureShape({ fixture: f }: { fixture: Fixture }) {
  switch (f.kind) {
    case 'block':
      return (
        <rect
          x={f.x}
          y={f.y}
          width={f.w}
          height={f.h}
          rx={0.6}
          className="fill-linen/8 stroke-linen/30"
          strokeWidth={0.32}
        />
      );

    case 'thin':
      return <rect x={f.x} y={f.y} width={f.w} height={f.h} className="fill-linen/22" />;

    case 'round':
      return (
        <ellipse
          cx={f.x + f.w / 2}
          cy={f.y + f.h / 2}
          rx={f.w / 2}
          ry={f.h / 2}
          className="fill-linen/6 stroke-linen/30"
          strokeWidth={0.32}
        />
      );

    case 'screen':
      return <rect x={f.x} y={f.y - 0.35} width={f.w} height={0.7} className="fill-linen/45" />;

    case 'water':
      return (
        <rect
          x={f.x}
          y={f.y}
          width={f.w}
          height={f.h}
          rx={1}
          className="fill-pool/30 stroke-pool/55"
          strokeWidth={0.4}
        />
      );

    case 'planting': {
      // A stipple on a fixed lattice rather than at random, so the plate is
      // identical on the server and in the browser.
      const dots = [];
      for (let x = f.x + 1.5; x < f.x + f.w; x += 3.2) {
        for (let y = f.y + 1.5; y < f.y + f.h; y += 3.2) {
          const j = ((x * 7 + y * 13) % 5) * 0.22;
          dots.push(<circle key={`${x}-${y}`} cx={x + j} cy={y + j} r={0.55} />);
        }
      }
      return <g className="fill-linen/14">{dots}</g>;
    }

    case 'treads': {
      const n = f.n ?? 10;
      const lines = [];
      for (let i = 1; i < n; i++) {
        const t = i / n;
        lines.push(
          f.dir === 'v' ? (
            <line key={i} x1={f.x} y1={f.y + f.h * t} x2={f.x + f.w} y2={f.y + f.h * t} />
          ) : (
            <line key={i} x1={f.x + f.w * t} y1={f.y} x2={f.x + f.w * t} y2={f.y + f.h} />
          ),
        );
      }
      return (
        <g>
          <rect
            x={f.x}
            y={f.y}
            width={f.w}
            height={f.h}
            className="fill-linen/5 stroke-linen/30"
            strokeWidth={0.32}
          />
          <g className="stroke-linen/28" strokeWidth={0.28}>
            {lines}
          </g>
        </g>
      );
    }

    case 'rows': {
      const n = f.n ?? 6;
      const gap = 0.7;
      const cell = (f.w - gap * (n - 1)) / n;
      return (
        <g className="fill-linen/10 stroke-linen/26" strokeWidth={0.26}>
          {Array.from({ length: n }, (_, i) => (
            <rect key={i} x={f.x + i * (cell + gap)} y={f.y} width={cell} height={f.h} rx={0.4} />
          ))}
        </g>
      );
    }
  }
}

/* ---------------------------------------------------------------- marker */

/**
 * The visitor, on the plan.
 *
 * A dot and the cone it is looking down — the reading a game minimap uses, and
 * for the same reason: position alone leaves you guessing which way you face,
 * and in a house that is most of what you want to know.
 *
 * This is the only thing on the page that moves every frame, so it is the only
 * thing written imperatively. The subscription writes a transform onto the
 * group and never touches state.
 */
function Marker({
  interactions,
  levelId,
  showing,
}: {
  interactions: InteractionManager | null;
  levelId: string;
  showing: boolean;
}) {
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!interactions || !showing) return;
    const el = group.current;
    if (!el) return;

    return interactions.subscribeCamera((time) => {
      const fix = cameraAt(time);
      // A fix on another storey is not drawn here: the marker belongs to the
      // plate the walk is on, and leaving it behind would put the visitor in
      // the wrong room on the wrong floor.
      if (!fix || fix.levelId !== levelId) {
        el.style.opacity = '0';
        return;
      }
      el.style.opacity = '1';
      el.setAttribute('transform', `translate(${fix.x} ${fix.y}) rotate(${fix.heading})`);
    });
  }, [interactions, levelId, showing]);

  if (!showing) return null;

  return (
    <g ref={group} style={{ opacity: 0 }}>
      <defs>
        <radialGradient id="plan-cone">
          <stop offset="0%" stopColor="rgb(255 243 207)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="rgb(255 243 207)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M 0 0 L -7.2 -12.4 A 14.3 14.3 0 0 1 7.2 -12.4 Z" fill="url(#plan-cone)" />
      <circle r={2.6} className="fill-champagne/25" />
      <circle
        r={1.35}
        className="fill-champagne"
        style={{ filter: 'drop-shadow(0 0 1.6px rgb(255 243 207))' }}
      />
    </g>
  );
}
