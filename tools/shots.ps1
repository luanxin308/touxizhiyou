# 批量截图：用 Edge headless 跑 app/assets/shot.html，裁成 780x1688
# 用法：pwsh -File tools/shots.ps1 -Pages home,weight,bp
param(
  [string[]]$Pages = @('home', 'weight', 'weightHist', 'trend', 'bp', 'bpHist', 'camera', 'med', 'stats', 'settings')
)

$ErrorActionPreference = 'Stop'
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'proto\shots'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Add-Type -AssemblyName System.Drawing

foreach ($p in $Pages) {
  $raw = Join-Path $outDir "_raw_$p.png"
  if (Test-Path $raw) { Remove-Item $raw -Force }
  $ud = Join-Path $root ".edge-$p"
  $url = "file:///E:/软件开发/touxizhiyou/app/assets/shot.html?s=$p"
  $a = @(
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
    '--force-device-scale-factor=2', '--window-size=600,1000',
    '--virtual-time-budget=6000', "--user-data-dir=$ud", "--screenshot=$raw", $url
  )
  $proc = Start-Process -FilePath $edge -ArgumentList $a -PassThru -WindowStyle Hidden
  $proc.WaitForExit(90000) | Out-Null
  Start-Sleep -Milliseconds 300

  if (Test-Path $raw) {
    $src = [System.Drawing.Image]::FromFile($raw)
    $bmp = New-Object System.Drawing.Bitmap 780, 1688
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $dstRect = New-Object System.Drawing.Rectangle 0, 0, 780, 1688
    $g.DrawImage($src, $dstRect, $dstRect, [System.Drawing.GraphicsUnit]::Pixel)
    $bmp.Save((Join-Path $outDir "app-$p.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose(); $bmp.Dispose(); $src.Dispose()
    Remove-Item $raw -Force
    Write-Host "OK   $p"
  } else {
    Write-Host "FAIL $p"
  }
}
Write-Host "done -> $outDir"
