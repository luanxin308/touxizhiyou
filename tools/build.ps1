# Build APK offline with Android SDK build-tools (no Gradle)
# aapt2 cannot handle non-ASCII paths, so the project is mirrored to C:\tb first.
# Usage: powershell -ExecutionPolicy Bypass -File tools\build.ps1
$ErrorActionPreference = 'Continue'

$srcRoot = Split-Path -Parent $PSScriptRoot
$sdk = "C:\Users\nj_lu\AppData\Local\Android\Sdk"
$bt = Join-Path $sdk "build-tools\35.0.0"
$jar = Join-Path $sdk "platforms\android-34\android.jar"
$javaHome = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"

foreach ($p in @($bt, $jar, $javaHome)) {
  if (-not (Test-Path $p)) { throw "missing: $p" }
}

# mirror to ASCII path
$work = "C:\tb"
if (Test-Path $work) { Remove-Item $work -Recurse -Force }
robocopy $srcRoot $work /E /NFL /NDL /NJH /NJS /NP /XD build dist .git .edge-home .edge-weight .edge-bp .edge-trend .edge-med .edge-stats .edge-camera .edge-weightHist .edge-bpHist .edge-settings .edge-confirm | Out-Null

$root = $work
$src = Join-Path $root "android\src"
$res = Join-Path $root "android\res"
$man = Join-Path $root "android\AndroidManifest.xml"
$assets = Join-Path $root "app\assets"
$build = Join-Path $root "build"
$dist = Join-Path $srcRoot "dist"

# drop debug-only pages from the shipped package
foreach ($dbgFile in @("test.html", "shot.html", "ocr-test.html")) {
  $f = Join-Path $assets $dbgFile
  if (Test-Path $f) { Remove-Item $f -Force }
}

New-Item -ItemType Directory -Force -Path $build, (Join-Path $build "gen"), (Join-Path $build "classes"), (Join-Path $build "dex"), $dist | Out-Null

# 1) compile resources
Write-Host "[1/6] aapt2 compile"
& (Join-Path $bt "aapt2.exe") compile --dir $res -o (Join-Path $build "res.zip")
if ($LASTEXITCODE -ne 0) { throw "aapt2 compile failed" }

# 2) link -> base apk (includes assets and R.java)
Write-Host "[2/6] aapt2 link"
& (Join-Path $bt "aapt2.exe") link -o (Join-Path $build "base.apk") -I $jar --manifest $man -R (Join-Path $build "res.zip") --java (Join-Path $build "gen") --min-sdk-version 24 --target-sdk-version 34 --auto-add-overlay
if ($LASTEXITCODE -ne 0) { throw "aapt2 link failed" }

# 3) javac
Write-Host "[3/6] javac"
$files = @()
$files += (Get-ChildItem -Recurse -Filter *.java $src | ForEach-Object { $_.FullName })
$files += (Get-ChildItem -Recurse -Filter *.java (Join-Path $build "gen") | ForEach-Object { $_.FullName })
& (Join-Path $javaHome "bin\javac.exe") -source 8 -target 8 -bootclasspath $jar -encoding UTF-8 -nowarn -d (Join-Path $build "classes") $files 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) { throw "javac failed" }

# 4) d8 -> classes.dex
Write-Host "[4/6] d8"
$classes = (Get-ChildItem -Recurse -Filter *.class (Join-Path $build "classes") | ForEach-Object { $_.FullName })
& (Join-Path $bt "d8.bat") --lib $jar --min-api 24 --output (Join-Path $build "dex") $classes
if ($LASTEXITCODE -ne 0) { throw "d8 failed" }

# 5) put classes.dex and assets into apk, then align
# NOTE: do NOT use aapt2 -A on Windows: it writes sub-directory asset entries with
# backslashes ("assets/js\app.js"), which WebView cannot resolve -> blank screen.
# Assets are packed here manually with forward slashes.
Write-Host "[5/6] pack assets + dex"
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apk = Join-Path $build "base.apk"
$zip = [System.IO.Compression.ZipFile]::Open($apk, 'Update')
foreach ($e in @($zip.Entries | Where-Object { $_.FullName -like 'assets*' })) { $e.Delete() }
$entry = $zip.GetEntry("classes.dex")
if ($entry) { $entry.Delete() }
[System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, (Join-Path $build "dex\classes.dex"), "classes.dex") | Out-Null
$assetRoot = (Resolve-Path $assets).Path.TrimEnd('\')
foreach ($f in (Get-ChildItem -Recurse -File $assets)) {
  $rel = $f.FullName.Substring($assetRoot.Length).TrimStart('\').Replace('\', '/')
  $name = "assets/" + $rel
  $old = $zip.GetEntry($name)
  if ($old) { $old.Delete() }
  [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $name, [System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
}
$zip.Dispose()
& (Join-Path $bt "zipalign.exe") -f 4 $apk (Join-Path $build "aligned.apk")
if ($LASTEXITCODE -ne 0) { throw "zipalign failed" }

# 6) sign
Write-Host "[6/6] apksigner"
$ks = Join-Path $build "debug.keystore"
$ErrorActionPreference = 'Continue'
if (-not (Test-Path $ks)) {
  & (Join-Path $javaHome "bin\keytool.exe") -genkeypair -keystore $ks -storepass android -keypass android -alias touxizhiyou -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=touxizhiyou, OU=dev, O=touxizhiyou, L=CN, S=CN, C=CN" 2>&1 | Out-Null
}
$outApk = Join-Path $dist "touxizhiyou-v1.0.apk"
if (Test-Path $outApk) { Remove-Item $outApk -Force }
& (Join-Path $bt "apksigner.bat") sign --ks $ks --ks-pass pass:android --key-pass pass:android --out $outApk (Join-Path $build "aligned.apk") 2>&1 | Out-Null
$ErrorActionPreference = 'Stop'
if (-not (Test-Path $outApk)) { throw "apksigner failed" }

Write-Host ""
Write-Host ("OK -> " + $outApk)
Write-Host ("size: " + [math]::Round((Get-Item $outApk).Length / 1KB, 1) + " KB")
