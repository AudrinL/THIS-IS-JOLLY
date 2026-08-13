/**
 * Recreates the local development media setup.
 *
 *   public/media/video    junction -> processed/video   (no copy, no duplication)
 *   public/media/posters  copied from processed/posters if missing
 *
 * Only needed for developing against local files. In production the app reads
 * everything from NEXT_PUBLIC_MEDIA_BASE.
 */
import { cpSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

mkdirSync('public/media', { recursive: true });

const videoLink = 'public/media/video';
const videoTarget = resolve('processed/video');

if (!existsSync(videoTarget)) {
  console.error(`  ${videoTarget} not found. Run the media pipeline first.`);
  process.exit(1);
}

if (!existsSync(videoLink)) {
  // 'junction' is the Windows form that does not require elevated privileges;
  // it is ignored on other platforms, which fall back to a directory symlink.
  symlinkSync(videoTarget, videoLink, process.platform === 'win32' ? 'junction' : 'dir');
  console.log(`  Linked ${videoLink} -> processed/video`);
} else {
  console.log(`  ${videoLink} already exists.`);
}

const posters = 'public/media/posters';
if (!existsSync(posters) && existsSync('processed/posters')) {
  cpSync('processed/posters', posters, { recursive: true });
  console.log(`  Copied posters into ${posters}`);
}

console.log('  Dev media ready. Set NEXT_PUBLIC_MEDIA_BASE=/media in .env.local');
