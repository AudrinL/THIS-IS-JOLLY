# =============================================================================
#  CELL 7 (revised) — upload processed media from Drive to Cloudflare R2
# =============================================================================
#  Paste this into a NEW Colab cell and run it after the R2 bucket exists.
#  Reads from Drive rather than the runtime's local disk, so it still works if
#  the runtime was recycled after the encode finished.
#
#  Your secret key is typed into your own Colab session. Do not paste it into
#  chat, into the repo, or anywhere else.
# =============================================================================

import os, subprocess
subprocess.run('pip -q install boto3', shell=True)
import boto3
from getpass import getpass
from google.colab import drive

try:
    drive.mount('/content/drive')
except Exception:
    pass

# Find the processed folder wherever it ended up.
SRC_DIR = None
for root, dirs, files in os.walk('/content/drive/MyDrive'):
    dirs[:] = [d for d in dirs if not d.startswith('.')]
    if os.path.basename(root) == 'processed' and 'video' in dirs:
        SRC_DIR = root
        break

assert SRC_DIR, 'Could not find the processed/ folder in Drive'
print('uploading from:', SRC_DIR)

ACCOUNT_ID = input('R2 account ID: ').strip()
ACCESS_KEY = input('R2 access key ID: ').strip()
SECRET_KEY = getpass('R2 secret access key (hidden): ').strip()
BUCKET     = input('R2 bucket name: ').strip()

s3 = boto3.client(
    's3',
    endpoint_url=f'https://{ACCOUNT_ID}.r2.cloudflarestorage.com',
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    region_name='auto',
)

CT = {
    '.mp4': 'video/mp4', '.avif': 'image/avif', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.json': 'application/json',
}

sent, total = 0, 0
for root, dirs, files in os.walk(SRC_DIR):
    # working files, not deliverables
    dirs[:] = [d for d in dirs if d not in ('review', 'calib')]
    for f in files:
        local = os.path.join(root, f)
        key = os.path.relpath(local, SRC_DIR).replace('\\', '/')
        ext = os.path.splitext(f)[1].lower()
        size = os.path.getsize(local)
        s3.upload_file(
            local, BUCKET, key,
            ExtraArgs={
                'ContentType': CT.get(ext, 'application/octet-stream'),
                # filenames are content-stable, so cache them forever
                'CacheControl': 'public, max-age=31536000, immutable',
            },
        )
        sent += 1
        total += size
        print(f'{key:<44} {size/1024/1024:7.2f} MB')

print(f'\n{sent} objects, {total/1024/1024:.1f} MB uploaded.')
print('The master video was NOT uploaded — it stays archived.')
