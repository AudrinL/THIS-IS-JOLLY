# Verifies the encoded renditions against tour-map.json:
# dimensions, duration, keyframe density and seekability.
$probe = "C:\Users\owner\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffprobe.exe"
$ff    = "C:\Users\owner\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"
$tour  = Get-Content "tour-map.json" -Raw | ConvertFrom-Json
$problems = @()

foreach ($res in @(720, 1080, 1440)) {
  $summed = 0.0
  Write-Host "`n=== ${res}p ==="
  for ($i = 1; $i -le $tour.chapters.Count; $i++) {
    $ch  = $tour.chapters[$i - 1]
    $exp = [math]::Round($ch.end - $ch.start, 3)
    $f   = "processed\video\$res\chapter-{0:d2}.mp4" -f $i
    if (-not (Test-Path $f)) { $problems += "MISSING $f"; continue }

    $j = & $probe -v error -show_entries stream=width,height,codec_name,nb_frames `
                  -show_entries format=duration -of json $f | ConvertFrom-Json
    $s   = $j.streams[0]
    $dur = [double]$j.format.duration
    $mb  = [math]::Round((Get-Item $f).Length / 1MB, 2)
    $summed += $dur

    $okDur = [math]::Abs($dur - $exp) -lt 0.2
    $okRes = $s.height -eq $res
    if (-not $okDur) { $problems += "$f duration $dur vs $exp" }
    if (-not $okRes) { $problems += "$f height $($s.height) vs $res" }

    $status = if ($okDur -and $okRes) { "OK" } else { "FAIL" }
    "  ch{0:d2} {1,5}x{2,-5} {3,7:N2}s (exp {4,7:N2}) {5,7:N2} MB  {6}" -f `
      $i, $s.width, $s.height, $dur, $exp, $mb, $status
  }
  $delta = [math]::Round($summed - $tour.source.duration, 2)
  "  summed {0:N2}s vs master {1}s  delta {2:+0.00;-0.00;0.00}s" -f $summed, $tour.source.duration, $delta
  if ([math]::Abs($delta) -gt 1.0) { $problems += "${res}p total duration drift ${delta}s" }
}

# Keyframe density on a representative chapter — this is what makes scrubbing work.
Write-Host "`n=== keyframe interval (1080p chapter-02) ==="
$kf = & $probe -v error -select_streams v -skip_frame nokey -show_entries frame=pts_time `
               -of csv=p=0 "processed\video\1080\chapter-02.mp4"
$times = $kf | Where-Object { $_ -match '\d' } | ForEach-Object { [double]($_ -replace ',','') }
if ($times.Count -gt 2) {
  $gaps = for ($i = 1; $i -lt $times.Count; $i++) { $times[$i] - $times[$i-1] }
  $avg = ($gaps | Measure-Object -Average).Average
  $max = ($gaps | Measure-Object -Maximum).Maximum
  "  {0} keyframes, avg gap {1:N3}s, max gap {2:N3}s" -f $times.Count, $avg, $max
  if ($max -gt 1.2) { $problems += "keyframe gap too large: ${max}s" }
}

# Seek test: pull a frame from the middle of every 1080p chapter.
Write-Host "`n=== seek test (1080p) ==="
for ($i = 1; $i -le $tour.chapters.Count; $i++) {
  $f = "processed\video\1080\chapter-{0:d2}.mp4" -f $i
  & $ff -v error -ss 5 -i $f -frames:v 1 -f null - 2>&1 | Out-Null
  if ($LASTEXITCODE -ne 0) { $problems += "seek failed $f" }
}
"  all chapters seekable: $($problems -notmatch 'seek failed' -ne $null)"

Write-Host "`n=============================="
if ($problems.Count -eq 0) { Write-Host "ALL CHECKS PASSED" }
else { Write-Host "PROBLEMS:"; $problems | ForEach-Object { Write-Host " - $_" } }
