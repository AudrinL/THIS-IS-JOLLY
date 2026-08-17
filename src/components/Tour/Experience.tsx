'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HeroStage } from '@/components/Hero/HeroStage';
import { SpacePanel } from '@/components/GlassPanel/SpacePanel';
import { TourHud } from './TourHud';
import { RoomSidebar } from './RoomSidebar';
import { StopOverlay } from './StopOverlay';
import { CHAPTER_VIEWS } from '@/lib/tour';
import { TourEngine } from '@/tour/TourEngine';
import type { InteractionManager, TourState } from '@/tour/InteractionManager';
import { StaticTour } from './StaticTour';

const INITIAL: TourState = {
  phase: 'hero',
  progress: 0,
  time: 0,
  chapter: null,
  space: null,
  panel: null,
  stop: null,
};

function usePrefersReducedMotion(): boolean | null {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/**
 * Isolated so that dwell progress — which updates continuously while the camera
 * holds — only ever re-renders the hotspots, never the tour around them.
 */
function StopLayer({
  interactions,
  state,
}: {
  interactions: InteractionManager | null;
  state: TourState;
}) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!interactions) return;
    return interactions.subscribeDwell(setProgress);
  }, [interactions]);

  // Keyed on the room: the overlay holds which mark the visitor is pointing at,
  // and that has no meaning outside the room it was pointed at in.
  return (
    <StopOverlay
      key={state.stop?.slug ?? 'none'}
      stop={state.stop}
      progress={state.stop ? progress : 0}
    />
  );
}

export function Experience() {
  const sectionRef = useRef<HTMLElement>(null);
  const engineRef = useRef<TourEngine | null>(null);
  const [state, setState] = useState<TourState>(INITIAL);
  const [interactions, setInteractions] = useState<InteractionManager | null>(null);
  const [railOpen, setRailOpen] = useState(false);
  const [marks, setMarks] = useState<number[]>([]);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced !== false) return;

    const section = sectionRef.current;
    if (!section) return;
    const stage = section.querySelector<HTMLElement>('[data-stage]');
    const videoLayer = section.querySelector<HTMLElement>('[data-video-layer]');
    if (!stage || !videoLayer) return;

    const engine = new TourEngine({ section, stage, videoLayer, reducedMotion: false });
    engineRef.current = engine;
    setInteractions(engine.interactions);
    // Chapter positions come from the timeline, not from raw time: the dwell
    // segments mean a chapter's start is not where linear time would put it.
    setMarks(CHAPTER_VIEWS.map((c) => engine.progressAtTourTime(c.start)));
    const unsubscribe = engine.interactions.subscribe(setState);

    // Development handle. Scrolling is owned by Lenis, so a plain
    // window.scrollTo desynchronises it — this gives tooling a way in.
    if (process.env.NODE_ENV !== 'production') {
      (window as unknown as { __tour?: TourEngine }).__tour = engine;
    }

    /*
     * Walking the house from the keyboard.
     *
     * Left and right step between the rooms that stop to explain themselves,
     * which is the same set of places the walk already treats as destinations.
     * Up and down are left alone: they are how the page scrolls, and scrolling
     * is the primary control here — this is a shortcut through it, not a
     * replacement for it.
     */
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;

      const stops = engine.stopTimes;
      if (!stops.length) return;
      const here = engine.interactions.getState().time;
      /** A little slack, so a press while sitting on a stop moves off it. */
      const epsilon = 0.4;

      if (e.key === 'ArrowRight') {
        const next = stops.find((t) => t > here + epsilon);
        engine.seekToTime(next ?? stops[stops.length - 1]);
      } else if (e.key === 'ArrowLeft') {
        const previous = [...stops].reverse().find((t) => t < here - epsilon);
        engine.seekToTime(previous ?? stops[0]);
      } else if (e.key === 'Home') {
        engine.seekToTime(stops[0]);
      } else if (e.key === 'End') {
        engine.seekToTime(stops[stops.length - 1]);
      } else {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
      setInteractions(null);
    };
  }, [reduced]);

  /* Stable, because the scrubber holds it in a hover-rate callback. */
  const timeAt = useCallback(
    (progress: number) => engineRef.current?.timeAtWalkProgress(progress) ?? 0,
    [],
  );

  const scrub = useCallback((progress: number, dragging: boolean) => {
    // Dragging jumps straight there: easing toward a target that moves every
    // frame never arrives, and the film should track the finger. The release
    // glides, so the walk settles rather than stopping dead.
    engineRef.current?.seekToWalkProgress(progress, dragging);
  }, []);

  if (reduced) return <StaticTour />;

  const seek = (t: number) => engineRef.current?.seekToTime(t);

  return (
    <>
      <section ref={sectionRef} className="relative" style={{ height: '220svh' }}>
        {/* The cove at the base of the frame takes its colour from the room on
            screen — warm through the house, hard blue at the pool. */}
        <HeroStage accent={state.space?.accentColor}>
          <div data-video-layer className="drift absolute inset-0 z-0" />
          <StopLayer interactions={interactions} state={state} />
          <TourHud state={state} onSeek={seek} onScrub={scrub} timeAt={timeAt} />
          <SpacePanel space={state.panel} railOpen={railOpen} />
        </HeroStage>
      </section>

      {/* Fixed, so it lives outside the stage's overflow clipping. */}
      <RoomSidebar
        state={state}
        onSeek={seek}
        onOpenChange={setRailOpen}
        interactions={interactions}
        marks={marks}
      />
    </>
  );
}
