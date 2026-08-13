import { Chapter, CHAPTERS, chapterAt, localTime } from '@/lib/tour';
import { chapterVideoUrl, pickResolution, Resolution } from '@/lib/media';

/**
 * Owns the <video> elements and turns a tour time into a rendered frame.
 *
 * One element per chapter, stacked. Only a small window around the current
 * chapter ever has a `src`, so the visitor never downloads the far end of the
 * house before walking to it.
 *
 * Nothing here touches React. Seeking happens on rAF against a target the
 * scroll layer writes, which keeps the work off the scroll handler and lets a
 * burst of scroll events collapse into a single seek.
 */

/** How many chapters ahead to start fetching. One is enough and stays cheap. */
const LOOKAHEAD = 1;

export interface VideoControllerOptions {
  container: HTMLElement;
  resolution?: Resolution;
  onChapterChange?: (chapter: Chapter) => void;
  onReadyChange?: (ready: boolean) => void;
}

export class VideoController {
  private container: HTMLElement;
  private resolution: Resolution;
  /** Set only when a caller explicitly pinned a rendition. */
  private pinned?: Resolution;
  private videos = new Map<string, HTMLVideoElement>();
  private active: Chapter | null = null;
  private targetTime = 0;
  private appliedTime = -1;
  private raf = 0;
  private primed = false;
  private destroyed = false;
  private onChapterChange?: (c: Chapter) => void;
  private onReadyChange?: (r: boolean) => void;
  private ready = false;

  constructor(opts: VideoControllerOptions) {
    this.container = opts.container;
    this.pinned = opts.resolution;
    this.resolution = opts.resolution ?? 720;
    this.onChapterChange = opts.onChapterChange;
    this.onReadyChange = opts.onReadyChange;

    for (const chapter of CHAPTERS) this.createElement(chapter);
    this.setActive(CHAPTERS[0]);

    // Choose the rendition a frame late. Measuring the viewport during mount can
    // catch a container that has not settled yet, which would pin the whole tour
    // to the wrong tier for the rest of the session.
    requestAnimationFrame(() => {
      if (this.destroyed) return;
      this.resolution = this.pinned ?? pickResolution();
      this.ensureLoaded(CHAPTERS[0]);
      this.ensureLoaded(CHAPTERS[Math.min(LOOKAHEAD, CHAPTERS.length - 1)]);
    });

    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  /**
   * Re-check the rendition after a resize. Only chapters that are not on screen
   * are dropped, so an upgrade never interrupts the frame being watched.
   */
  refreshResolution() {
    if (this.pinned) return;
    const next = pickResolution();
    if (next === this.resolution) return;
    this.resolution = next;
    for (const chapter of CHAPTERS) {
      if (chapter.id !== this.active?.id) this.unload(chapter);
    }
    if (this.active) {
      const index = CHAPTERS.indexOf(this.active);
      for (let i = index + 1; i <= index + LOOKAHEAD && i < CHAPTERS.length; i++) {
        this.ensureLoaded(CHAPTERS[i]);
      }
    }
  }

  private createElement(chapter: Chapter) {
    const el = document.createElement('video');
    el.muted = true;
    el.defaultMuted = true;
    el.playsInline = true;
    el.preload = 'none';
    el.loop = false;
    el.setAttribute('aria-hidden', 'true');
    el.setAttribute('data-chapter', chapter.id);
    el.className =
      'absolute inset-0 size-full object-cover opacity-0 transition-opacity duration-200';
    // Frames are painted by seeking, never by playing.
    el.style.pointerEvents = 'none';
    this.container.appendChild(el);
    this.videos.set(chapter.id, el);
  }

  private ensureLoaded(chapter: Chapter) {
    const el = this.videos.get(chapter.id);
    if (!el || el.src) return;
    el.preload = 'auto';
    el.src = chapterVideoUrl(chapter, this.resolution);
    el.load();
  }

  /** Drop a chapter's buffer when the visitor has walked well past it. */
  private unload(chapter: Chapter) {
    const el = this.videos.get(chapter.id);
    if (!el || !el.src) return;
    el.removeAttribute('src');
    el.load();
  }

  private setActive(chapter: Chapter) {
    if (this.active?.id === chapter.id) return;
    const previous = this.active;
    this.active = chapter;

    for (const [id, el] of this.videos) {
      el.style.opacity = id === chapter.id ? '1' : '0';
    }

    const index = CHAPTERS.indexOf(chapter);
    for (let i = index; i <= index + LOOKAHEAD && i < CHAPTERS.length; i++) {
      this.ensureLoaded(CHAPTERS[i]);
    }
    // keep one behind for backward scrolling, discard the rest
    for (let i = 0; i < CHAPTERS.length; i++) {
      if (i < index - 1 || i > index + LOOKAHEAD) this.unload(CHAPTERS[i]);
    }

    if (previous) this.onChapterChange?.(chapter);
    else this.onChapterChange?.(chapter);
  }

  /**
   * iOS will not paint a seeked frame until the element has played once, and
   * play() is only permitted inside a user gesture. Call this from the first
   * pointer or wheel event.
   */
  prime() {
    if (this.primed) return;
    this.primed = true;
    for (const el of this.videos.values()) {
      if (!el.src) continue;
      const p = el.play();
      if (p && typeof p.then === 'function') {
        p.then(() => el.pause()).catch(() => {});
      } else {
        el.pause();
      }
    }
  }

  /** Called by the scroll layer. Cheap: stores a number. */
  setTime(time: number) {
    this.targetTime = Math.max(0, time);
  }

  get currentChapter(): Chapter | null {
    return this.active;
  }

  get element(): HTMLVideoElement | null {
    return this.active ? (this.videos.get(this.active.id) ?? null) : null;
  }

  /** 0..1 buffered fraction of the active chapter, for the loading state. */
  bufferedFraction(): number {
    const el = this.element;
    if (!el || !el.duration || !el.buffered.length) return 0;
    let total = 0;
    for (let i = 0; i < el.buffered.length; i++) {
      total += el.buffered.end(i) - el.buffered.start(i);
    }
    return Math.min(1, total / el.duration);
  }

  private loop() {
    if (this.destroyed) return;

    const chapter = chapterAt(this.targetTime);
    if (chapter.id !== this.active?.id) this.setActive(chapter);

    const el = this.videos.get(chapter.id);
    if (el && el.readyState >= 1) {
      const want = localTime(this.targetTime, chapter);
      // Only seek on a real change. Sub-frame deltas are invisible and a wasted
      // seek costs a decode.
      if (Math.abs(want - this.appliedTime) > 1 / 60) {
        if (!el.seeking) {
          el.currentTime = want;
          this.appliedTime = want;
        }
      }
      if (!this.ready) {
        this.ready = true;
        this.onReadyChange?.(true);
      }
    }

    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    for (const el of this.videos.values()) {
      el.removeAttribute('src');
      el.load();
      el.remove();
    }
    this.videos.clear();
  }
}
