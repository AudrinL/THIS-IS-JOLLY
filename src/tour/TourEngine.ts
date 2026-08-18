import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapterAt } from '@/lib/tour';
import { ScrollController } from './ScrollController';
import { VideoController } from './VideoController';
import { SegmentResolver } from './SegmentResolver';
import { InteractionManager, TourState } from './InteractionManager';
import { PointerDrift } from './PointerDrift';
import { buildTimeline, progressAtTime, Resolved, sample } from './Timeline';

/** Scroll distance, in pixels, spent on one second of film. */
const PX_PER_SECOND_DESKTOP = 46;
const PX_PER_SECOND_TOUCH = 30;

/**
 * Viewport heights held on the hero before anything begins to move. A beat,
 * not a wall: at a full viewport this swallowed the better part of ten wheel
 * notches with the frame pinned shut, and the site read as broken before it
 * read as composed.
 */
const HERO_HOLD_VH = 0.35;
/** Viewport heights over which the frame opens into full bleed. */
const OPENING_VH = 0.85;

export interface TourEngineOptions {
  /** The tall section that generates the scroll distance. */
  section: HTMLElement;
  /** The sticky viewport carrying the frame. */
  stage: HTMLElement;
  /** Where the <video> elements mount, inside the frame. */
  videoLayer: HTMLElement;
  reducedMotion: boolean;
}

/**
 * Coordinates scroll, video and interface.
 *
 * The whole experience is one sticky stage and one ScrollTrigger. Rather than
 * pinning and unpinning between a hero and a tour, a single progress value is
 * split into three phases, so the hero frame opening into the cinema is
 * literally the same animation that starts the walkthrough.
 */
export class TourEngine {
  private scroll: ScrollController;
  private video: VideoController;
  private resolver = new SegmentResolver();
  private drift: PointerDrift;
  readonly interactions = new InteractionManager();
  private trigger?: ScrollTrigger;
  private opening = gsap.timeline({ paused: true });
  private opts: TourEngineOptions;
  private primeOnce?: () => void;
  private timeline!: Resolved;

  constructor(opts: TourEngineOptions) {
    this.opts = opts;
    this.scroll = new ScrollController(opts.reducedMotion);

    this.video = new VideoController({
      container: opts.videoLayer,
      onChapterChange: (chapter) => this.interactions.update({ chapter }),
    });

    this.drift = new PointerDrift(opts.stage);

    this.applyHeight();
    this.buildOpeningTimeline();
    this.buildTrigger();

    // iOS needs one real gesture before a seek will paint.
    this.primeOnce = () => this.video.prime();
    window.addEventListener('pointerdown', this.primeOnce, { once: true });
    window.addEventListener('wheel', this.primeOnce, { once: true, passive: true });
    window.addEventListener('touchstart', this.primeOnce, { once: true, passive: true });

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
  }

  private pxPerSecond(): number {
    const touch = window.matchMedia('(hover: none)').matches;
    return touch ? PX_PER_SECOND_TOUCH : PX_PER_SECOND_DESKTOP;
  }

  /**
   * Section height = hero hold + opening + the timeline's own length.
   *
   * The timeline is rebuilt here because its budget depends on the pointer
   * type, which can change when a hybrid device switches modes.
   */
  private applyHeight() {
    this.timeline = buildTimeline({ pxPerSecond: this.pxPerSecond() });
    const vh = window.innerHeight;
    const total = vh * (HERO_HOLD_VH + OPENING_VH) + this.timeline.totalPx;
    this.opts.section.style.height = `${Math.round(total)}px`;
  }

  private phaseBounds() {
    const vh = window.innerHeight;
    const total = this.opts.section.offsetHeight - vh;
    const hold = (vh * HERO_HOLD_VH) / total;
    const opening = (vh * OPENING_VH) / total;
    return { holdEnd: hold, openEnd: hold + opening };
  }

  /**
   * The frame opening. Radius and inset fall together so the editorial card
   * becomes the viewport; the hero interface leaves slightly ahead of it so the
   * architecture is alone on screen by the time the walk begins.
   */
  private buildOpeningTimeline() {
    const stage = this.opts.stage;
    /*
     * The hero interface is faded in two halves rather than by dimming the one
     * container that holds it. Putting `opacity` on that container would make it
     * a backdrop root, and the glass inside would drop its blur — reading as
     * flat plastic — the moment the fade began. So the type fades on opacity and
     * the panes fade on their own --lg-alpha, which leaves them glass the whole
     * way out. See the note beside `.lg-tint` in globals.css.
     */
    const text = stage.querySelectorAll('[data-hero-text]');
    /* Anything inside [data-hero-persist] is exempt from the exit: the header
       is meant to stay with the visitor for the whole walk, not leave with the
       rest of the hero. */
    const panes = [...stage.querySelectorAll<HTMLElement>('[data-hero-ui] .lg')].filter(
      (pane) => !pane.closest('[data-hero-persist]'),
    );
    const meta = stage.querySelectorAll('[data-hero-meta]');
    const wordmark = stage.querySelector('[data-hero-wordmark]');
    const poster = stage.querySelector('[data-hero-poster]');

    this.opening
      .to(
        wordmark,
        { scale: 1.14, opacity: 0, filter: 'blur(6px)', ease: 'power2.in', duration: 0.5 },
        0,
      )
      .to(text, { opacity: 0, ease: 'power1.in', duration: 0.45 }, 0.05)
      .to(
        panes,
        { '--lg-alpha': 0, '--lg-blur': '0px', ease: 'power1.in', duration: 0.45 },
        0.05,
      )
      .to(meta, { opacity: 0, y: -12, ease: 'power1.in', duration: 0.4 }, 0)
      .to(
        stage,
        {
          '--frame-inset-x': '0px',
          '--frame-inset-top': '0px',
          '--frame-inset-bottom': '0px',
          '--frame-radius': '0px',
          ease: 'power2.inOut',
          duration: 1,
        },
        0,
      )
      // The poster hands over to video only once the frame is nearly open.
      .to(poster, { opacity: 0, ease: 'none', duration: 0.25 }, 0.7);
  }

  private buildTrigger() {
    this.trigger = ScrollTrigger.create({
      trigger: this.opts.section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => this.onScroll(self.progress),
    });
  }

  private onScroll(p: number) {
    const { holdEnd, openEnd } = this.phaseBounds();

    // --- phase 1: hero at rest -------------------------------------------
    if (p <= holdEnd) {
      this.opening.progress(0);
      this.publish('hero', 0);
      return;
    }

    // --- phase 2: the frame opens ----------------------------------------
    if (p < openEnd) {
      const t = (p - holdEnd) / (openEnd - holdEnd);
      this.opening.progress(t);
      // The film is held at its first frame for the whole opening. It used to
      // creep a fraction of the timeline while the frame grew, which put the
      // walk roughly two and a half seconds into the Ground Floor by the time
      // it went full bleed; the walk now begins on chapter two's first frame
      // exactly, and the first movement is the visitor's own.
      this.publish('opening', 0, 0);
      return;
    }

    // --- phase 3: the walk ------------------------------------------------
    this.opening.progress(1);
    const t = (p - openEnd) / (1 - openEnd);
    this.publish('tour', t, t);
  }

  private publish(phase: TourState['phase'], progress: number, timeFraction = progress) {
    // Scroll maps straight onto film time; the stops ride along on top of it.
    const { time, stop, dwellProgress, intro, introProgress } = sample(this.timeline, timeFraction);
    this.video.setTime(time);

    const space = this.resolver.resolve(time);
    // While a room is annotating itself or a chapter is announcing itself, the
    // ambient panel stays out of the way — one thing to read at a time.
    const panel =
      phase === 'tour' && !stop && !intro ? this.resolver.narratableAt(time) : null;

    // The frame answers the pointer while a room is being annotated, where the
    // marks give the parallax something to be measured against.
    this.drift.setStrength(phase === 'tour' && stop ? 1 : 0);

    this.interactions.update({
      phase,
      progress,
      time,
      space,
      panel,
      stop: phase === 'tour' ? stop : null,
      intro: phase === 'tour' ? intro : null,
      chapter: chapterAt(time),
    });
    if (stop) this.interactions.setDwell(dwellProgress);
    if (intro) this.interactions.setIntro(introProgress);
    this.interactions.setProgress(phase === 'tour' ? progress : 0);
    // The plan's marker rides film time directly, so it keeps moving through a
    // room rather than only at its threshold.
    this.interactions.setCamera(time);
  }

  /** Where a given tour time falls as a fraction of the walk. */
  progressAtTourTime(time: number): number {
    return progressAtTime(this.timeline, time);
  }

  /** The inverse: what a fraction of the walk lands on. Used by the scrub bar. */
  timeAtWalkProgress(progress: number): number {
    return sample(this.timeline, progress).time;
  }

  /** The frames the walk annotates, in order — for keyboard stepping. */
  get stopTimes(): number[] {
    return this.timeline.stops.map((s) => s.time);
  }

  /**
   * Jump the visitor to a chapter by scrolling, so the video follows naturally.
   *
   * `immediate` skips the glide, which is what a drag on the scrub bar wants:
   * easing toward a target that moves every frame never arrives.
   */
  seekToTime(time: number, immediate = false) {
    const { openEnd } = this.phaseBounds();
    const vh = window.innerHeight;
    const total = this.opts.section.offsetHeight - vh;
    // Convert through the timeline so excluded chapters are accounted for.
    const p = openEnd + progressAtTime(this.timeline, time) * (1 - openEnd);
    const top = this.opts.section.offsetTop + p * total;
    this.scroll.scrollTo(top, { immediate });
  }

  /** Scrub straight to a fraction of the walk. */
  seekToWalkProgress(progress: number, immediate = false) {
    const { openEnd } = this.phaseBounds();
    const vh = window.innerHeight;
    const total = this.opts.section.offsetHeight - vh;
    const p = openEnd + Math.min(1, Math.max(0, progress)) * (1 - openEnd);
    this.scroll.scrollTo(this.opts.section.offsetTop + p * total, { immediate });
  }

  private onResize() {
    this.applyHeight();
    this.video.refreshResolution();
    ScrollTrigger.refresh();
  }

  bufferedFraction() {
    return this.video.bufferedFraction();
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.primeOnce) {
      window.removeEventListener('pointerdown', this.primeOnce);
      window.removeEventListener('wheel', this.primeOnce);
      window.removeEventListener('touchstart', this.primeOnce);
    }
    this.trigger?.kill();
    this.opening.kill();
    this.drift.destroy();
    this.video.destroy();
    this.interactions.destroy();
    this.scroll.destroy();
  }
}
