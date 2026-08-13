# Low-resolution local proxies, purely so the scroll-to-video pipeline can be
# developed and tested before the real renditions come back from the pipeline.
# These are throwaway: the 720/1080/1440 sets from Colab replace them.
$ff   = "C:\Users\owner\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0-full_build\bin\ffmpeg.exe"
$src  = "THIS IS JOLLY.webm"
$out  = "public\media\video\720"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$tour = Get-Content "tour-map.json" -Raw | ConvertFrom-Json
$i = 0
foreach ($c in $tour.chapters) {
  $i++
  $dur = [math]::Round($c.end - $c.start, 3)
  $dst = "$out\chapter-{0:d2}.mp4" -f $i
  & $ff -y -hide_banner -loglevel error -ss $c.start -t $dur -i $src -an `
        -vf "fps=30,scale=-2:360:flags=bilinear" `
        -c:v libx264 -preset veryfast -crf 30 `
        -g 15 -keyint_min 15 -sc_threshold 0 `
        -pix_fmt yuv420p -movflags +faststart $dst
  $mb = [math]::Round((Get-Item $dst).Length / 1MB, 2)
  Write-Host ("ch{0:d2} {1,-20} {2,6:N2}s  {3,6:N2} MB" -f $i, $c.name, $dur, $mb)
}
Write-Host "DONE proxies"
