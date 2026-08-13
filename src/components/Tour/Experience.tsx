'use client';

import { useEffect, useRef, useState } from 'react';
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

  return <StopOverlay stop={state.stop} progress={state.stop ? progress : 0} />;
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

    return () => {
      unsubscribe();
      engine.destroy();
      engineRef.current = null;
      setInteractions(null);
    };
  }, [reduced]);

  if (reduced) return <StaticTour />;

  const seek = (t: number) => engineRef.current?.seekToTime(t);

  return (
    <>
      <section ref={sectionRef} className="relative" style={{ height: '220svh' }}>
        <HeroStage>
          <div data-video-layer className="absolute inset-0 z-0" />
          <StopLayer interactions={interactions} state={state} />
          <TourHud state={state} onSeek={seek} />
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
