/**
 * Pre-build guard.
 *
 * `public/media` is a local development convenience — a junction to
 * `processed/video` plus locally generated posters. Next copies everything under
 * `public/` into the build output verbatim, so building with it in place
 * produces a ~610 MB deployment full of video that the app will not even
 * request in production, because the media base points at R2.
 *
 * Cloudflare Pages rejects any single file over 25 MB, so this fails as a
 * confusing upload error rather than an obvious one. Catch it here instead.
 *
 * It is gitignored, so a clean CI checkout never hits this — the guard exists
 * for builds run from a working machine.
 */
import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const base = process.env.NEXT_PUBLIC_MEDIA_BASE ?? '';
const remote = /^https?:\/\//.test(base);
const mediaDir = 'public/media';

function bytes(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    try {
      if (entry.isDirectory() || lstatSync(path).isSymbolicLink()) {
        total += bytes(path);
      } else {
        total += statSync(path).size;
      }
    } catch {
      /* unreadable entries are not worth failing over */
    }
  }
  return total;
}

if (!remote) {
  console.log(
    `\n  Building against local media (NEXT_PUBLIC_MEDIA_BASE=${base || 'unset'}).` +
      `\n  Fine for development. For production, point it at the R2 media domain.\n`,
  );
  process.exit(0);
}

if (existsSync(mediaDir)) {
  const mb = (bytes(mediaDir) / 1024 / 1024).toFixed(1);
  console.error(
    `\n  Refusing to build.\n\n` +
      `  NEXT_PUBLIC_MEDIA_BASE is remote (${base}), so media is served from the\n` +
      `  CDN — but ${mediaDir} still exists and Next would copy ${mb} MB of it\n` +
      `  into the deployment.\n\n` +
      `  Remove it first (this does not touch processed/ or the master):\n\n` +
      `      node scripts/unlink-dev-media.mjs\n\n`,
  );
  process.exit(1);
}

console.log(`\n  Media served from ${base}. No media in the deployment.\n`);
