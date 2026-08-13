/**
 * Upload processed media to Cloudflare R2.
 *
 *   node scripts/upload-r2.mjs ./processed
 *
 * Credentials come from the environment, never from this file and never from
 * the repository:
 *
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * The master video is deliberately not uploadable by this script — it walks a
 * processed/ directory only. The master stays archived where it is.
 *
 * Requires: npm i -D @aws-sdk/client-s3
 */
import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const ROOT = process.argv[2] ?? './processed';

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
} = process.env;

for (const [k, v] of Object.entries({
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
})) {
  if (!v) {
    console.error(`Missing environment variable ${k}`);
    process.exit(1);
  }
}

const CONTENT_TYPE = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
};

/** Media filenames are content-stable, so they can be cached forever. */
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      // review/ and calib/ are working files, not deliverables
      if (['review', 'calib'].includes(entry.name)) continue;
      yield* walk(path);
    } else {
      yield path;
    }
  }
}

let count = 0;
let bytes = 0;

for await (const path of walk(ROOT)) {
  const key = relative(ROOT, path).split(/[\\/]/).join('/');
  const ext = extname(path).toLowerCase();
  const body = await readFile(path);
  const size = (await stat(path)).size;

  await s3.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: CONTENT_TYPE[ext] ?? 'application/octet-stream',
      CacheControl: CACHE_CONTROL,
    }),
  );

  count += 1;
  bytes += size;
  console.log(`${key}  ${(size / 1024 / 1024).toFixed(2)} MB`);
}

console.log(`\n${count} objects, ${(bytes / 1024 / 1024).toFixed(1)} MB total.`);
console.log('Set NEXT_PUBLIC_MEDIA_BASE to your media domain and redeploy.');
