# Media pipeline — run in Google Colab

The master video never leaves your machine except as a copy to Drive, and is
never modified or uploaded to the public CDN path.

## Steps

1. Open <https://colab.research.google.com> → **New notebook** (free tier, CPU is fine).
2. In Google Drive create a folder `jolly` and upload **both** files into it:
   - `THIS IS JOLLY.webm`
   - `tour-map.json`
3. Open `colab_pipeline.py`, and paste each `# ===== CELL n =====` block into its
   own Colab cell. Run them **in order**.
4. **After Cell 2**, download `processed/review/contact-sheet.jpg` and
   `contact-arrival.jpg` from Drive and send them back to Claude. They drive the
   hero art direction. Don't wait for the rest — Cells 3–6 can keep running.
5. **After Cell 3**, send back the printed CRF/SSIM table so the bitrate choice is
   made on measurements rather than assumption.
6. Cell 7 is optional — it pushes everything to Cloudflare R2 directly so you never
   have to download the video files at all.

## Expected timings (free Colab CPU)

| Cell | What | Time |
|---|---|---|
| 1 | setup + probe | ~1 min |
| 2 | contact sheets | ~2 min |
| 3 | CRF calibration + SSIM | ~5 min |
| 4 | all 21 chapter files | ~30–50 min |
| 5 | 40 posters + hero candidates | ~4 min |
| 6 | verification | ~1 min |

Colab free sessions disconnect after ~90 min idle. Cell 4 copies each rendition to
Drive as soon as it finishes, so a disconnect costs at most one rendition. Keep the
browser tab visible while it runs.

## Why these encoding settings

- **`-g 15` (keyframe every 0.5 s)** — the critical one. Scroll-scrubbing seeks the
  video constantly; with default keyframe spacing (~10 s) the browser must decode
  hundreds of frames per seek and the scrub stutters badly. This costs ~20–25% file
  size and buys the entire feel of the product.
- **`fps=30`** — the master is 59.94 fps. Half the frames, half the data, and no
  perceptible difference when the timeline is driven by scroll position.
- **`-ss`/`-t` per chapter** — chapter files are cut frame-exact at the boundaries in
  `tour-map.json`, so the app can map global tour time to chapter-local time by
  simple subtraction.
- **`+faststart`** — moov atom first, so a chapter starts playing before it has
  fully downloaded.
- **`-an`** — the master genuinely has no audio track.
- **H.264 High** — universal support. AV1 is worth evaluating later, but scrub
  performance depends on fast seeking, and AV1 software decode is heavier on exactly
  the low-power devices we care about.

## Output layout

```
processed/
  video/1440/chapter-01..07.mp4
  video/1080/chapter-01..07.mp4
  video/720/chapter-01..07.mp4
  posters/<slug>.jpg + .avif        one per space, cut at its posterTime
  posters/hero-*.jpg + .avif        hero candidates
  metadata/encode-report.json
  review/contact-sheet.jpg          for art direction
```
