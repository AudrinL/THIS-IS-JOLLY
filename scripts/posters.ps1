# Generates one still per space at its posterTime from tour-map.json.
# Local convenience copy — the authoritative set comes from the Colab pipeline.
$ff  = "C:\Users\owner\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"
$src = "THIS IS JOLLY.webm"
$out = "public\media\posters"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$tour = Get-Content "tour-map.json" -Raw | ConvertFrom-Json
$n = 0
foreach ($s in $tour.spaces) {
  $jpg = "$out\$($s.slug).jpg"
  & $ff -y -hide_banner -loglevel error -ss $s.posterTime -i $src -frames:v 1 `
        -vf "scale=1280:-2:flags=lanczos" -q:v 3 $jpg
  if (Test-Path $jpg) {
    & $ff -y -hide_banner -loglevel error -i $jpg -c:v libaom-av1 -still-picture 1 `
          -crf 34 -cpu-used 8 "$out\$($s.slug).avif"
    $n++
  }
  Write-Host "$n/$($tour.spaces.Count) $($s.slug)"
}
Write-Host "DONE $n posters"
