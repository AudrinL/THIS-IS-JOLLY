# =============================================================================
#  THIS IS JOLLY — media pipeline for Google Colab
# =============================================================================
#  Paste each CELL into its own Colab cell and run them in order.
#  Runtime > Change runtime type > CPU is fine. You do NOT need a GPU.
#
#  Inputs  (upload these two to Google Drive, folder: MyDrive/jolly/)
#     - THIS IS JOLLY.webm     (the master, 280 MB)
#     - tour-map.json
#
#  Outputs (written to MyDrive/jolly/processed/)
#     video/1440/chapter-01..07.mp4
#     video/1080/chapter-01..07.mp4
#     video/720/chapter-01..07.mp4
#     posters/<slug>.jpg + .avif   (one per space, from posterTime)
#     posters/hero-*.jpg           (hero candidates)
#     review/contact-sheet.jpg     (send this back — it drives the hero art direction)
#     metadata/encode-report.json
# =============================================================================


# ===================== CELL 1 — setup =========================================
import os, json, subprocess, shutil, time, math

from google.colab import drive
drive.mount('/content/drive')

WORK = '/content/work'
OUT  = f'{WORK}/processed'

# Find the two input files anywhere in your Drive, whatever you named the folder.
def find_in_drive(filename):
    for root, dirs, files in os.walk('/content/drive/MyDrive'):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        if filename in files:
            return os.path.join(root, filename)
    return None

SRC = find_in_drive('THIS IS JOLLY.webm')
MAP = find_in_drive('tour-map.json')

if not SRC or not MAP:
    print('Could not find the inputs. Files sitting in your Drive:')
    for root, dirs, files in os.walk('/content/drive/MyDrive'):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for f in files:
            if f.endswith(('.webm','.mp4','.mov','.json')):
                print('   ', os.path.join(root, f))
    raise SystemExit('Set SRC and MAP manually to the paths printed above.')

DRIVE = os.path.dirname(SRC)          # everything gets written back here
print('master :', SRC)
print('map    :', MAP)
print('output :', DRIVE + '/processed')

for d in ['video/1440','video/1080','video/720','posters','metadata','review','calib']:
    os.makedirs(f'{OUT}/{d}', exist_ok=True)

# Colab ships ffmpeg, but an older one. Install current build.
subprocess.run('apt-get -qq update && apt-get -qq install -y ffmpeg', shell=True)

def sh(cmd, quiet=True):
    """Run a shell command, return (ok, stderr)."""
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if r.returncode != 0 and not quiet:
        print(r.stderr[-2000:])
    return r.returncode == 0, r.stderr

def probe(path, entries='stream=width,height,r_frame_rate,pix_fmt:format=duration,size'):
    r = subprocess.run(
        f'ffprobe -v error -show_entries {entries} -of json "{path}"',
        shell=True, capture_output=True, text=True)
    return json.loads(r.stdout) if r.stdout else {}

def mb(path):
    return os.path.getsize(path) / 1024 / 1024

tour = json.load(open(MAP))
CHAPTERS = tour['chapters']
SPACES   = tour['spaces']
DURATION = tour['source']['duration']

print('ffmpeg :', subprocess.run('ffmpeg -version', shell=True, capture_output=True,
                                 text=True).stdout.split('\n')[0])
print('master :', json.dumps(probe(SRC), indent=1)[:600])
print(f'\n{len(CHAPTERS)} chapters, {len(SPACES)} spaces, {DURATION}s')


# ===================== CELL 2 — contact sheet (do this FIRST) =================
# A single image showing ~48 frames across the whole film. Send this back to
# Claude — it is what makes the hero design belong to THIS house rather than
# being generic. Takes ~2 minutes.

sh(f'ffmpeg -y -hide_banner -loglevel error -i "{SRC}" '
   f'-vf "fps=1/7,scale=360:-1,tile=8x6" -frames:v 1 -q:v 3 '
   f'"{OUT}/review/contact-sheet.jpg"', quiet=False)

# A second, denser sheet of just the first 40s (the arrival — hero material)
sh(f'ffmpeg -y -hide_banner -loglevel error -t 40 -i "{SRC}" '
   f'-vf "fps=1,scale=360:-1,tile=8x5" -frames:v 1 -q:v 3 '
   f'"{OUT}/review/contact-arrival.jpg"', quiet=False)

os.makedirs(f'{DRIVE}/processed/review', exist_ok=True)
for f in ['contact-sheet.jpg','contact-arrival.jpg']:
    shutil.copy(f'{OUT}/review/{f}', f'{DRIVE}/processed/review/{f}')
    print(f, round(mb(f'{OUT}/review/{f}'),2), 'MB')
print('\n>>> Download these two from Drive and send them to Claude. <<<')


# ===================== CELL 3 — calibration ===================================
# Encode 20s of real footage at several CRFs, measure SSIM against the master.
# This is how we pick "maximum quality per byte" instead of guessing.
# ~5 minutes.

CAL_START, CAL_LEN = 78, 20      # a busy interior stretch — the hardest to encode

sh(f'ffmpeg -y -hide_banner -loglevel error -ss {CAL_START} -t {CAL_LEN} -i "{SRC}" '
   f'-an -vf "fps=30,scale=-2:1080:flags=lanczos" -c:v libx264 -preset veryfast '
   f'-crf 8 -pix_fmt yuv420p "{OUT}/calib/ref.mp4"')

rows = []
for crf in [19, 21, 23, 25]:
    out = f'{OUT}/calib/crf{crf}.mp4'
    t0 = time.time()
    sh(f'ffmpeg -y -hide_banner -loglevel error -ss {CAL_START} -t {CAL_LEN} -i "{SRC}" '
       f'-an -vf "fps=30,scale=-2:1080:flags=lanczos" '
       f'-c:v libx264 -preset slow -crf {crf} '
       f'-g 15 -keyint_min 15 -sc_threshold 0 '
       f'-pix_fmt yuv420p -movflags +faststart "{out}"')
    enc = time.time() - t0
    r = subprocess.run(
        f'ffmpeg -hide_banner -i "{out}" -i "{OUT}/calib/ref.mp4" '
        f'-lavfi ssim -f null - 2>&1', shell=True, capture_output=True, text=True)
    ssim = [l for l in (r.stdout + r.stderr).split('\n') if 'SSIM All' in l]
    ssim = ssim[-1].split('All:')[1].split()[0] if ssim else '?'
    mbps = mb(out) / CAL_LEN * 8
    rows.append(dict(crf=crf, size_mb=round(mb(out),2), mbps=round(mbps,2),
                     ssim=ssim, encode_s=round(enc,1)))
    print(f'CRF {crf}:  {mb(out):6.2f} MB   {mbps:5.2f} Mbps   SSIM {ssim}   {enc:.0f}s')

print('\nProjected full-film size at each CRF (1080p):')
for r_ in rows:
    print(f"  CRF {r_['crf']}: ~{r_['size_mb']/CAL_LEN*DURATION:.0f} MB")
json.dump(rows, open(f'{OUT}/metadata/calibration.json','w'), indent=2)


# ===================== CELL 4 — encode all chapters ===========================
# THE KEY SETTINGS, and why:
#   fps=30            the master is 59.94; 30 is plenty for scrub and halves the data
#   -g 15 ... 0.5s    keyframe every 0.5s => near-instant seeking while scrolling.
#                     This is the whole reason we are not using a generic converter.
#   -ss/-t per chapter  frame-exact chapter boundaries matching tour-map.json
#   +faststart        moov atom first, so playback can begin before full download
#   -an               the master has no audio track
#
# Adjust CRF here if Cell 3 says the files are too heavy.
LADDER = [
    dict(name='1440', height=1440, crf=21),
    dict(name='1080', height=1080, crf=21),
    dict(name='720',  height=720,  crf=23),
]

report = {'chapters': [], 'renditions': {}}
t_all = time.time()

for rung in LADDER:
    h, crf, name = rung['height'], rung['crf'], rung['name']
    total = 0
    print(f'\n===== {name}p (CRF {crf}) =====')
    for i, ch in enumerate(CHAPTERS, start=1):
        start = ch['start']
        dur   = round(ch['end'] - ch['start'], 3)
        out   = f'{OUT}/video/{name}/chapter-{i:02d}.mp4'

        # resume: if this chapter already made it to Drive, reuse it
        done = f'{DRIVE}/processed/video/{name}/chapter-{i:02d}.mp4'
        if os.path.exists(done) and os.path.getsize(done) > 100_000:
            shutil.copy(done, out)
            total += mb(out)
            print(f'  ch{i:02d} {ch["name"]:<20} already done, skipped')
            continue

        t0 = time.time()
        ok, err = sh(
            f'ffmpeg -y -hide_banner -loglevel error '
            f'-ss {start} -t {dur} -i "{SRC}" -an '
            f'-vf "fps=30,scale=-2:{h}:flags=lanczos" '
            f'-c:v libx264 -preset slow -crf {crf} -profile:v high -level 4.2 '
            f'-g 15 -keyint_min 15 -sc_threshold 0 '
            f'-pix_fmt yuv420p -movflags +faststart "{out}"')
        if not ok:
            print('FAILED', out); print(err[-1500:]); break
        total += mb(out)
        print(f'  ch{i:02d} {ch["name"]:<20} {dur:6.2f}s  '
              f'{mb(out):6.2f} MB  ({time.time()-t0:.0f}s)')
        # save each chapter to Drive immediately, so a disconnect costs one chapter
        os.makedirs(f'{DRIVE}/processed/video/{name}', exist_ok=True)
        shutil.copy(out, f'{DRIVE}/processed/video/{name}/chapter-{i:02d}.mp4')
    report['renditions'][name] = dict(crf=crf, height=h, total_mb=round(total,2))
    print(f'  --> {name}p total: {total:.1f} MB')

    # copy to Drive after each rendition so a disconnect never loses work
    dst = f'{DRIVE}/processed/video/{name}'
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(f'{OUT}/video/{name}')):
        shutil.copy(f'{OUT}/video/{name}/{f}', f'{dst}/{f}')
    print(f'  --> copied to Drive')

print(f'\nAll renditions done in {(time.time()-t_all)/60:.1f} min')


# ===================== CELL 5 — posters =======================================
# One still per space at its posterTime, plus hero candidates. JPEG + AVIF.
# ~4 minutes.

def still(t, out_jpg, width=1920, q=3):
    return sh(f'ffmpeg -y -hide_banner -loglevel error -ss {t} -i "{SRC}" '
              f'-frames:v 1 -vf "scale={width}:-2:flags=lanczos" -q:v {q} "{out_jpg}"')[0]

def to_avif(jpg, avif, crf=32):
    return sh(f'ffmpeg -y -hide_banner -loglevel error -i "{jpg}" '
              f'-c:v libaom-av1 -still-picture 1 -crf {crf} -cpu-used 6 "{avif}"')[0]

made = 0
for s in SPACES:
    j = f"{OUT}/posters/{s['slug']}.jpg"
    if still(s['posterTime'], j):
        to_avif(j, f"{OUT}/posters/{s['slug']}.avif")
        made += 1
print(f'{made}/{len(SPACES)} space posters')

# Hero candidates — several strong exterior/dusk moments to choose from.
HERO_TIMES = [1.5, 2.5, 6.0, 12.0, 20.0, 27.0, 300.0, 315.0, 330.0]
for t in HERO_TIMES:
    j = f'{OUT}/posters/hero-{str(t).replace(".","_")}.jpg'
    if still(t, j, width=2560, q=2):
        to_avif(j, j.replace('.jpg','.avif'), crf=30)
print('hero candidates:', len(HERO_TIMES))

# small blurred placeholder for instant first paint
still(HERO_TIMES[0], f'{OUT}/posters/hero-lqip.jpg', width=32, q=8)

os.makedirs(f'{DRIVE}/processed/posters', exist_ok=True)
for f in os.listdir(f'{OUT}/posters'):
    shutil.copy(f'{OUT}/posters/{f}', f'{DRIVE}/processed/posters/{f}')
print('posters copied to Drive:', round(sum(
    mb(f'{OUT}/posters/{f}') for f in os.listdir(f'{OUT}/posters')), 1), 'MB')


# ===================== CELL 6 — verify ========================================
# Confirm every chapter has the right dimensions and duration, that the
# durations sum back to the master, and that files are actually seekable.

print(f"{'file':<28}{'WxH':>12}{'dur':>9}{'expect':>9}{'MB':>8}  ok")
problems = []
for rung in LADDER:
    name = rung['name']
    summed = 0
    for i, ch in enumerate(CHAPTERS, start=1):
        p = f'{OUT}/video/{name}/chapter-{i:02d}.mp4'
        if not os.path.exists(p):
            problems.append(f'MISSING {p}'); continue
        info = probe(p)
        st = info['streams'][0]
        d  = float(info['format']['duration'])
        exp = ch['end'] - ch['start']
        summed += d
        good = abs(d - exp) < 0.15 and st['height'] == rung['height']
        if not good: problems.append(f'{p}: {d:.2f}s vs {exp:.2f}s, h={st["height"]}')
        print(f"{name}/ch{i:02d}{'':<16}{st['width']}x{st['height']:>6}"
              f"{d:9.2f}{exp:9.2f}{mb(p):8.2f}  {'OK' if good else 'FAIL'}")
    print(f'  {name}p summed: {summed:.2f}s  (master {DURATION}s)  '
          f'delta {summed-DURATION:+.2f}s\n')

# seek test: pull a frame from the middle of each chapter of the 1080p set
for i in range(1, len(CHAPTERS)+1):
    p = f'{OUT}/video/1080/chapter-{i:02d}.mp4'
    ok = sh(f'ffmpeg -v error -ss 1.25 -i "{p}" -frames:v 1 -f null -')[0]
    if not ok: problems.append(f'seek failed {p}')
print('seek test:', 'all OK' if not problems else 'issues')

print('\nPROBLEMS:' if problems else '\nAll checks passed.')
for p in problems: print(' -', p)

report['problems'] = problems
report['duration_master'] = DURATION
json.dump(report, open(f'{OUT}/metadata/encode-report.json','w'), indent=2)
shutil.copy(MAP, f'{OUT}/metadata/tour-map.json')
os.makedirs(f'{DRIVE}/processed/metadata', exist_ok=True)
for f in os.listdir(f'{OUT}/metadata'):
    shutil.copy(f'{OUT}/metadata/{f}', f'{DRIVE}/processed/metadata/{f}')
print(json.dumps(report['renditions'], indent=2))


# ===================== CELL 7 — OPTIONAL: upload straight to Cloudflare R2 ====
# Skip this if you'd rather download from Drive and upload later.
# Nothing here is stored — credentials are typed into your own Colab session.

UPLOAD_TO_R2 = False        # flip to True when you have R2 set up

if UPLOAD_TO_R2:
    subprocess.run('pip -q install boto3', shell=True)
    import boto3
    from getpass import getpass

    ACCOUNT_ID  = input('R2 account id: ').strip()
    ACCESS_KEY  = input('R2 access key id: ').strip()
    SECRET_KEY  = getpass('R2 secret access key: ').strip()
    BUCKET      = input('R2 bucket name: ').strip()

    s3 = boto3.client('s3',
        endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
        aws_access_key_id=ACCESS_KEY, aws_secret_access_key=SECRET_KEY,
        region_name='auto')

    CT = {'.mp4':'video/mp4', '.avif':'image/avif', '.jpg':'image/jpeg',
          '.json':'application/json'}
    sent = 0
    for root, _, files in os.walk(OUT):
        if '/calib' in root or '/review' in root:
            continue
        for f in files:
            local = os.path.join(root, f)
            key   = os.path.relpath(local, OUT).replace('\\','/')
            ext   = os.path.splitext(f)[1]
            s3.upload_file(local, BUCKET, key, ExtraArgs={
                'ContentType': CT.get(ext,'application/octet-stream'),
                'CacheControl': 'public, max-age=31536000, immutable'})
            sent += 1
            print('uploaded', key)
    print(f'\n{sent} objects uploaded. Master was NOT uploaded (stays archived).')
