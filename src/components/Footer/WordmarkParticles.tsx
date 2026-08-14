'use client';

import { useEffect, useRef } from 'react';
import { prepareWithSegments, measureNaturalWidth } from '@chenglou/pretext';
import { Wordmark } from '@/components/Wordmark';

/**
 * The footer wordmark, rendered as dust that gathers around the pointer.
 *
 * The word is drawn once into an offscreen canvas, sampled on a grid, and every
 * inked cell becomes a particle that knows where it belongs. At rest they sit
 * exactly on the glyphs, so the footer still reads "JOLLY" with nobody touching
 * it. Under the pointer they lift off and drift towards it, then spring home.
 *
 * The static SVG stays in the tree underneath. It is what renders before the
 * fonts land, what a reader with JavaScript off gets, and what stays on screen
 * for anyone who has asked for reduced motion — the canvas simply never takes
 * over in that case.
 */

/** Alpha at the top of the word, and at its feet — the same fade as the SVG mask. */
const TOP_ALPHA = 0.5;
const FOOT_ALPHA = 0.08;

/** How far the pointer reaches, as a fraction of the word's width. */
const REACH = 0.22;

/** Distinct alpha bands. Particles are grouped so each band is one fill call. */
const BANDS = 12;

interface Particle {
  /** Where it belongs. */
  hx: number;
  hy: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function WordmarkParticles() {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const svgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduced.matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bands: Particle[][] = [];
    let raf = 0;
    let disposed = false;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let reach = 0;

    /** Pointer in canvas coordinates, or null when it is nowhere near. */
    let px = 0;
    let py = 0;
    let pointer = false;

    /**
     * The family the CSS will actually use.
     *
     * next/font mints a hashed family name at build time, so the canvas font
     * string has to be read back off the DOM rather than typed out — measuring
     * against a guessed family is measuring the fallback.
     */
    function fontFamily(): string {
      return getComputedStyle(host!).fontFamily;
    }

    function build() {
      const rect = host!.getBoundingClientRect();
      if (rect.width < 1) return;

      // The canvas stands in for the SVG, so it keeps the same box: the word is
      // set across 92% of the width, as `textLength` does in the drawing.
      width = rect.width;
      height = (rect.width * 270) / 1000;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      reach = width * REACH;

      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.height = `${height}px`;

      const family = fontFamily();

      /*
       * Size the word by arithmetic rather than by trial fits.
       *
       * pretext measures the string once against the real font and hands back
       * its natural advance width; advance scales linearly with font size, so
       * one measurement gives the exact size that fills the target width. The
       * alternative — nudging fontSize and re-reading measureText, or worse,
       * rendering and calling getBoundingClientRect — costs a measurement per
       * probe and, in the DOM case, a reflow per probe, on every resize.
       */
      const PROBE = 100;
      const probeFont = `600 ${PROBE}px ${family}`;
      const natural = measureNaturalWidth(prepareWithSegments('JOLLY', probeFont));
      if (!natural) return;
      const fontSize = (width * 0.92 * PROBE) / natural;

      // Stamp the word into an offscreen buffer and read back its ink.
      const off = document.createElement('canvas');
      off.width = canvas!.width;
      off.height = canvas!.height;
      const octx = off.getContext('2d', { willReadFrequently: true });
      if (!octx) return;
      octx.scale(dpr, dpr);
      octx.font = `600 ${fontSize}px ${family}`;
      octx.textAlign = 'center';
      octx.textBaseline = 'alphabetic';
      octx.fillStyle = '#fff';
      // Baseline at 245/270 of the box, as in the SVG.
      octx.fillText('JOLLY', width / 2, height * (245 / 270));

      const data = octx.getImageData(0, 0, off.width, off.height).data;

      // Sampling step in CSS pixels, opened up on wide screens so the particle
      // count stays roughly constant rather than scaling with area.
      const step = Math.max(3, Math.round(width / 300));

      const next: Particle[][] = Array.from({ length: BANDS }, () => []);
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const sx = Math.floor(x * dpr);
          const sy = Math.floor(y * dpr);
          const alpha = data[(sy * off.width + sx) * 4 + 3];
          if (alpha < 128) continue;

          // The fade: full strength across the caps, thinning towards the feet.
          const t = Math.min(1, Math.max(0, y / height));
          const band = Math.min(BANDS - 1, Math.floor(t * BANDS));
          next[band].push({ hx: x, hy: y, x, y, vx: 0, vy: 0 });
        }
      }

      bands = next;

      // Paint the word once, synchronously. The first frame must not wait on
      // rAF: a tab that is not compositing yet would otherwise hand over from
      // the SVG to an empty canvas.
      draw();
    }

    /** Advance the physics. Returns whether anything is still in motion. */
    function step(): boolean {
      let moving = false;

      for (const list of bands) {
        for (let i = 0; i < list.length; i++) {
          const p = list[i];

          // Home is a spring; the pointer is a well the particle falls into.
          let ax = (p.hx - p.x) * 0.045;
          let ay = (p.hy - p.y) * 0.045;

          if (pointer) {
            const dx = px - p.x;
            const dy = py - p.y;
            const d = Math.hypot(dx, dy);
            if (d < reach && d > 0.5) {
              const pull = (1 - d / reach) * 1.4;
              ax += (dx / d) * pull;
              ay += (dy / d) * pull;
            }
          }

          p.vx = (p.vx + ax) * 0.82;
          p.vy = (p.vy + ay) * 0.82;
          p.x += p.vx;
          p.y += p.vy;

          if (!moving && (Math.abs(p.vx) > 0.02 || Math.abs(p.vy) > 0.02)) moving = true;
        }
      }

      return moving;
    }

    /**
     * Paint. One fill per alpha band rather than one per particle — the fade is
     * a function of where a particle belongs, so the bands are fixed at build
     * time and thousands of rects go down in a dozen calls.
     */
    function draw() {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);

      for (let b = 0; b < bands.length; b++) {
        const list = bands[b];
        if (list.length === 0) continue;

        const t = (b + 0.5) / BANDS;
        const alpha = TOP_ALPHA + (FOOT_ALPHA - TOP_ALPHA) * t * t;
        ctx!.fillStyle = `rgba(242, 233, 216, ${alpha.toFixed(3)})`;

        ctx!.beginPath();
        for (let i = 0; i < list.length; i++) {
          const p = list[i];
          ctx!.rect(p.x, p.y, 1.6, 1.6);
        }
        ctx!.fill();
      }
    }

    function frame() {
      if (disposed) return;
      const moving = step();
      draw();

      // Nothing is moving and the pointer has left: stop burning frames until
      // something asks for them again.
      if (!moving && !pointer) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(frame);
    }

    /**
     * Ask for frames again.
     *
     * The pending frame is cancelled rather than trusted: a request made while
     * the tab was not compositing can sit unfired indefinitely, and a `running`
     * flag on its own would then latch the loop off for good.
     */
    function wake() {
      if (disposed) return;
      cancelAnimationFrame(raf);
      running = true;
      raf = requestAnimationFrame(frame);
    }

    function onPointerMove(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      px = e.clientX - rect.left;
      py = e.clientY - rect.top;
      // Track a little outside the box too, so the word reacts as the pointer
      // approaches rather than snapping on at the edge.
      const margin = reach;
      pointer =
        px > -margin && px < width + margin && py > -margin && py < height + margin;
      if (pointer) wake();
    }

    function onPointerLeave() {
      pointer = false;
      wake();
    }

    let ro: ResizeObserver | null = null;

    async function start() {
      // measureText silently measures the fallback until the webfont lands, and
      // every number after that is confidently wrong.
      await document.fonts.ready;
      if (disposed) return;

      build();
      if (bands.length === 0) return;

      canvas!.style.opacity = '1';
      if (svgRef.current) svgRef.current.style.opacity = '0';

      wake();

      ro = new ResizeObserver(() => {
        build();
        wake();
      });
      ro.observe(host!);

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerleave', onPointerLeave, { passive: true });
      window.addEventListener('blur', onPointerLeave);
    }

    // Anything unexpected — a missing font, a canvas the browser refuses to
    // read back — leaves the static SVG on screen rather than an empty box.
    void start().catch((err) => {
      console.error('[wordmark] particles unavailable', err);
    });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('blur', onPointerLeave);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      aria-hidden
      className="relative w-full"
      /* The canvas font is read from here, so the host must carry the same
         family the wordmark is set in. */
      style={{ fontFamily: 'var(--font-display)', aspectRatio: '1000 / 270' }}
    >
      <div ref={svgRef} className="absolute inset-0 transition-opacity duration-700">
        <Wordmark id="footer" fill="rgb(242 233 216 / 0.5)" className="block w-full" />
      </div>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full opacity-0 transition-opacity duration-700"
      />
    </div>
  );
}
