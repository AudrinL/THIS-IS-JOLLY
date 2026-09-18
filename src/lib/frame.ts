/**
 * Where the film actually is inside the viewport.
 *
 * The video is `object-cover`: it fills the stage and whatever does not fit is
 * cropped away. On a landscape screen that is a sliver off the top and bottom;
 * on a phone held upright it is most of the picture's width. Hotspot
 * coordinates are authored as percentages of the *film*, so on a phone they
 * have to be run through this cover mapping or they land on features that are
 * not on screen.
 *
 * The same mapping, run the other way, is how the stage pans: given a point in
 * the film to hold in the centre of the viewport, `focalFor` gives the
 * `object-position` that puts it there.
 */
import { tour } from './tour';

export interface FrameGeometry {
  /** Rendered film size, px. At least one of these equals the viewport. */
  width: number;
  height: number;
  /** Film's top-left in viewport px. Zero or negative — the film overhangs. */
  left: number;
  top: number;
  /** Viewport size, px. */
  vw: number;
  vh: number;
}

const ASPECT = tour.source.width / tour.source.height;

/**
 * Cover geometry for a viewport, with the film's horizontal focal point placed
 * as `object-position: <focalX * 100>% 50%` would place it.
 */
export function coverGeometry(vw: number, vh: number, focalX = 0.5): FrameGeometry {
  const scale = Math.max(vw / ASPECT, vh);
  const height = scale;
  const width = scale * ASPECT;
  // object-position aligns the focal fraction of the image with the same
  // fraction of the box, which is this one line.
  const left = (vw - width) * focalX;
  const top = (vh - height) * 0.5;
  return { width, height, left, top, vw, vh };
}

/** A film-percentage point as a viewport-percentage point. */
export function toViewport(g: FrameGeometry, x: number, y: number): { x: number; y: number } {
  return {
    x: ((g.left + (x / 100) * g.width) / g.vw) * 100,
    y: ((g.top + (y / 100) * g.height) / g.vh) * 100,
  };
}

/**
 * The `object-position` x fraction that centres film x-percentage `x` in the
 * viewport. Clamped, so asking for a point near an edge shows the edge rather
 * than a gap.
 */
export function focalFor(vw: number, vh: number, x: number): number {
  const { width } = coverGeometry(vw, vh);
  const overhang = vw - width;
  if (overhang >= 0) return 0.5;
  const target = vw / 2 - (x / 100) * width;
  return Math.min(1, Math.max(0, target / overhang));
}
