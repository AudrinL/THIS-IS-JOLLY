/**
 * Removes the local development media directory.
 *
 * `public/media/video` is a junction to `processed/video` — removing the
 * junction does not touch the encoded files, and nothing here can reach the
 * master video. Re-create the dev setup afterwards with:
 *
 *   node scripts/link-dev-media.mjs
 */
import { existsSync, rmSync } from 'node:fs';

const dir = 'public/media';

if (!existsSync(dir)) {
  console.log(`  ${dir} does not exist — nothing to do.`);
  process.exit(0);
}

rmSync(dir, { recursive: true, force: true });
console.log(`  Removed ${dir}. processed/ and the master are untouched.`);
