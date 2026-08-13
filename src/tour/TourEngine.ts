import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { chapterAt } from '@/lib/tour';
import { ScrollController } from './ScrollController';
import { VideoController } from './VideoController';
import { SegmentResolver } from './SegmentResolver';
import { InteractionManager, TourState } from './InteractionManager';
import { buildTimeline, progressAtTime, Resolved, sample } from './Timeline';

/** Scroll distance, in pixels, spent on one second of film. */
const PX_PER_SECOND_DESKTOP = 46;
const PX_PER_SECOND_TOUCH = 30;

/** Scroll distance spent on one second of dwelling at a stop. */
const DWELL_PX_PER_SECOND_DESKTOP = 190;
const DWELL_PX_PER_SECOND_TOUCH = 130;

/** Viewport heights held on the hero before anything begins to move. */
const HERO_HOLD_VH = 1.0;
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
   * The timeline is rebuilt here because both budgets depend on the pointer
   * type, which can change when a hybrid device switches modes.
   */
  private applyHeight() {
    const touch = window.matchMedia('(hover: none)').matches;
    this.timeline = buildTimeline({
      pxPerSecond: this.pxPerSecond(),
      dwellPxPerSecond: touch ? DWELL_PX_PER_SECOND_TOUCH : DWELL_PX_PER_SECOND_DESKTOP,
    });
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
    // The timeline maps scroll to time non-linearly: stretches of motion
    // separated by holds where scrolling advances the explanation instead.
    const { time, stop, dwellProgress } = sample(this.timeline, timeFraction);
    this.video.setTime(time);

    const space = this.resolver.resolve(time);
    // While a stop is explaining itself, the ambient panel stays out of the way.
    const panel = phase === 'tour' && !stop ? this.resolver.narratableAt(time) : null;

    this.interactions.update({
      phase,
      progress,
      time,
      space,
      panel,
      stop: phase === 'tour' ? stop : null,
      chapter: chapterAt(time),
    });
    if (stop) this.interactions.setDwell(dwellProgress);
    this.interactions.setProgress(phase === 'tour' ? progress : 0);
  }

  /** Where a given tour time falls as a fraction of the walk, dwells included. */
  progressAtTourTime(time: number): number {
    return progressAtTime(this.timeline, time);
  }

  /** Jump the visitor to a chapter by scrolling, so the video follows naturally. */
  seekToTime(time: number) {
    const { openEnd } = this.phaseBounds();
    const vh = window.innerHeight;
    const total = this.opts.section.offsetHeight - vh;
    // Convert through the timeline so dwell segments are accounted for.
    const p = openEnd + progressAtTime(this.timeline, time) * (1 - openEnd);
    const top = this.opts.section.offsetTop + p * total;
    this.scroll.scrollTo(top);
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
    this.video.destroy();
    this.interactions.destroy();
    this.scroll.destroy();
  }
}
