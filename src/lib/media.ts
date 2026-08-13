/**
 * Every media URL in the application resolves through this file.
 *
 * Local development reads from /media (public/media). Production reads from the
 * Cloudflare R2 media domain. Nothing else in the app should ever build a media
 * path by hand.
 */
import { Chapter, chapterFileNumber, Space } from './tour';

/** e.g. https://media.thisisjolly.com — no trailing slash. */
const BASE = (process.env.NEXT_PUBLIC_MEDIA_BASE || '/media').replace(/\/$/, '');

export const RESOLUTIONS = [720, 1080, 1440] as const;
export type Resolution = (typeof RESOLUTIONS)[number];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function chapterVideoUrl(chapter: Chapter, res: Resolution): string {
  // Uses the file numbering, not the display numbering, so excluding a chapter
  // from the walk never points at the wrong file.
  return `${BASE}/video/${res}/chapter-${pad(chapterFileNumber(chapter))}.mp4`;
}

export function spacePosterUrl(space: Space, format: 'avif' | 'jpg' = 'avif'): string {
  return `${BASE}/posters/${space.slug}.${format}`;
}

export function heroPosterUrl(format: 'avif' | 'jpg' = 'avif'): string {
  return `${BASE}/posters/hero.${format}`;
}

export const heroPlaceholderUrl = `${BASE}/posters/hero-lqip.jpg`;

/**
 * Pick a rendition from viewport and connection.
 *
 * Deliberately conservative: a scrubbed video is decoded far more aggressively
 * than one that simply plays, so we would rather serve a smaller file that
 * seeks instantly than a larger one that stutters. Runs once, client side.
 */
export function pickResolution(): Resolution {
  if (typeof window === 'undefined') return 1080;

  // Escape hatch for local development against the low-res proxy set.
  const forced = Number(process.env.NEXT_PUBLIC_FORCE_RESOLUTION);
  if (RESOLUTIONS.includes(forced as Resolution)) return forced as Resolution;

  const conn = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;

  if (conn?.saveData) return 720;
  if (conn?.effectiveType && /^(slow-)?2g$|^3g$/.test(conn.effectiveType)) return 720;

  const width = window.innerWidth;
  const dpr = window.devicePixelRatio || 1;
  const cores = navigator.hardwareConcurrency || 4;

  // Tiers chosen from measured seek latency on an integrated-GPU laptop,
  // scrubbing a warm buffer:
  //
  //    720p   median 16.1 ms   p90 25.5 ms
  //   1080p   median 15.0 ms   p90 20.1 ms
  //   1440p   median 35.1 ms   p90 56.4 ms
  //
  // 1080p is effectively free next to 720p and looks far better, so it is the
  // default for anything that is not small, slow or under-powered. 1440p costs
  // roughly 2.3x per seek and 50% more bytes, so it is held back for viewports
  // genuinely large enough to resolve the difference.
  if (cores <= 4) return 720;
  if (width < 768) return 720;
  if (width < 1800) return 1080;
  return dpr >= 2 ? 1440 : 1080;
}
