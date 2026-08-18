import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Smooth scrolling, and the bridge between Lenis and ScrollTrigger.
 *
 * Lenis owns the scroll position; ScrollTrigger reads it. Driving Lenis from
 * GSAP's ticker rather than its own rAF keeps both on one clock, which is what
 * stops the video scrub from beating against the frame animation.
 */
export class ScrollController {
  readonly lenis: Lenis | null;
  private tickerFn?: (time: number) => void;

  constructor(private reducedMotion: boolean) {
    if (reducedMotion) {
      this.lenis = null;
      return;
    }

    this.lenis = new Lenis({
      // A glide with mass, but one that answers the first notch. Below about
      // 0.1 the lerp swallows a wheel tick whole — eight pixels on the first
      // frame, half a second to arrive — and the page reads as unresponsive
      // rather than heavy.
      lerp: 0.12,
      wheelMultiplier: 1,
      touchMultiplier: 1.4,
      smoothWheel: true,
    });

    this.lenis.on('scroll', ScrollTrigger.update);

    this.tickerFn = (time: number) => this.lenis?.raf(time * 1000);
    gsap.ticker.add(this.tickerFn);
    gsap.ticker.lagSmoothing(0);
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  scrollTo(target: number | string, opts?: { immediate?: boolean }) {
    if (this.lenis) this.lenis.scrollTo(target, { immediate: opts?.immediate });
    else if (typeof target === 'string') {
      document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  destroy() {
    if (this.tickerFn) gsap.ticker.remove(this.tickerFn);
    this.lenis?.destroy();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  }
}
