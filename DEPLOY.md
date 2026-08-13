# Deploying without lag

Two separate things ship, and conflating them is the main cause of a slow site:

| | What | Where |
|---|---|---|
| **The app** | 1.15 MB of HTML/CSS/JS | Any static CDN |
| **The media** | 606 MB of video + posters | Cloudflare R2 behind a custom domain |

The app never serves a byte of video. If media ends up in the deployment, the
build is doing something wrong — see the guard below.

---

## 1. Media first (this is what determines whether it feels smooth)

Scroll-scrubbing is unusual: it seeks constantly rather than playing straight
through. That makes **time-to-first-byte on range requests** the number that
matters, far more than raw bandwidth.

**Upload to R2** with the structure the app expects:

```
video/720/chapter-02..07.mp4
video/1080/chapter-02..07.mp4
video/1440/chapter-02..07.mp4
posters/*.avif
posters/*.jpg
```

`chapter-01.*` is not needed — the walk starts at chapter 2.

**Put a custom domain in front of the bucket.** R2 → bucket → Settings →
Custom Domains → `media.yourdomain.com`. This is not cosmetic:

- The `pub-*.r2.dev` development URL is **rate limited and not CDN cached**.
  Every seek would go to origin. It will feel broken under real use.
- A custom domain puts the files on Cloudflare's edge, so a seek is served from
  a nearby city rather than the bucket's region.

**Set caching.** The upload scripts already send
`Cache-Control: public, max-age=31536000, immutable`, which is correct because
the filenames never change content. Confirm in Cloudflare → Caching → the files
should report `cf-cache-status: HIT` on a second request.

**Do not** proxy media through the Next app or a serverless function. That adds
a hop to every range request and defeats edge caching.

### Verifying it is actually fast

```bash
curl -sI -H "Range: bytes=0-1023" https://media.yourdomain.com/video/1080/chapter-02.mp4
```

Look for:

- `HTTP/2 206` — range requests work. **If this says `200`, seeking will stall**,
  because the browser has to download the whole file to reach any frame.
- `cf-cache-status: HIT` on the second call.
- `accept-ranges: bytes`.

---

## 2. The app

The whole site prerenders, so it needs no server at all:

```bash
npm run build:static
```

That emits `out/` — 1.15 MB across 33 files. Deploy that folder to Cloudflare
Pages (same network as R2, so the app and media share an edge), Netlify, S3 +
CloudFront, or anything else that serves files.

Set one environment variable at build time:

```
NEXT_PUBLIC_MEDIA_BASE=https://media.yourdomain.com
```

Everything else follows from it: the app preconnects to that origin during first
paint, so DNS and TLS are already done by the time the visitor scrolls into the
tour.

`npm run build` (without `:static`) still produces a normal Node build if you
later add API routes.

### The 610 MB trap

`public/media` is a local development convenience — a junction to
`processed/video`. Next copies everything under `public/` into the build
verbatim, so building with it in place produces a **610 MB** deployment full of
video the app will never request. Cloudflare Pages rejects any file over 25 MB,
so this surfaces as a confusing upload failure rather than an obvious one.

`npm run build` refuses to run in that state:

```
Refusing to build.
NEXT_PUBLIC_MEDIA_BASE is remote, but public/media still exists and Next
would copy 609.2 MB of it into the deployment.
```

Fix, then restore afterwards:

```bash
npm run media:unlink
```

```bash
npm run media:link
```

Neither touches `processed/` or the master video. A clean CI checkout never
hits this, because `public/media/` is gitignored.

---

## 3. What actually causes lag, and what already handles it

| Risk | Mitigation | Where |
|---|---|---|
| Seeking decodes from a distant keyframe | Keyframe every 0.5 s — measured 15 ms median seek | encode settings |
| Downloading the whole house up front | Only current ± 1 chapter hold a `src` | `VideoController` |
| Too much video for the device | 720/1080/1440 chosen from viewport, cores and `effectiveType` | `media.ts` |
| React re-rendering during scroll | Engine writes to refs; React hears about identity changes only | `InteractionManager` |
| Blur over a scrubbing video | One blur layer, 11 px, no displacement or beading | `globals.css` |
| Cold TLS to the media origin | `preconnect` in the document head | `layout.tsx` |

The remaining variable is the network, which is why the custom domain and the
`206` check above matter more than anything else on this page.

---

## 4. After deploying, check these

1. Hero visible almost immediately — it is a 30 KB AVIF, nothing else blocks it.
2. Scroll into the tour, then DevTools → Network → filter `mp4`. You should see
   **206 Partial Content** responses, and only chapters near your position.
3. Throttle to *Fast 3G* and scroll. It should degrade to 720p and stay
   responsive rather than freezing.
4. DevTools → Performance while scrolling the tour: no long tasks from React.
