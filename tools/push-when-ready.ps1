# 等待 GitHub 授权完成后自动推送（用户点完 GCM 登录窗口即可，无需再操作）
param(
  [int]$TimeoutSec = 1200,
  [int]$IntervalSec = 5
)

$ErrorActionPreference = 'Continue'
$repo = 'E:\软件开发\touxizhiyou'
$job  = 'github-push'
$progressDir = $env:DSH_PROGRESS_DIR

function Emit($state, $pct, $msg) {
  if (-not $progressDir) { return }
  $line = '{"v":1,"task":"' + $job + '","state":"' + $state + '","pct":' + $pct + ',"msg":"' + $msg + '"}'
  try {
    Add-Content -Path (Join-Path $progressDir "$job.jsonl") -Value $line -Encoding UTF8
  } catch { }
}

function Has-GitHubCred {
  $out = cmdkey /list 2>&1 | Select-String -Pattern 'github' -SimpleMatch
  return [bool]$out
}

Emit 'running' 5 '等待你在窗口里完成 GitHub 登录'

$deadline = (Get-Date).AddSeconds($TimeoutSec)
$waited = 0
$found = $false
while ((Get-Date) -lt $deadline) {
  if (Has-GitHubCred) { $found = $true; break }
  Start-Sleep -Seconds $IntervalSec
  $waited += $IntervalSec
  $pct = [Math]::Min(40, 5 + [int]($waited / $TimeoutSec * 35))
  if ($waited % 30 -eq 0) { Emit 'running' $pct ('已等待 ' + $waited + ' 秒') }
}

if (-not $found) {
  Emit 'failed' 0 '等待超时，未检测到 GitHub 凭据'
  Write-Host 'TIMEOUT: 未检测到凭据'
  exit 2
}

Emit 'running' 45 '已拿到凭据，开始推送'
Write-Host 'OK: 检测到凭据，开始推送'

$env:GIT_TERMINAL_PROMPT = '0'
$ok = $false
for ($i = 1; $i -le 3; $i++) {
  Emit 'running' (45 + $i * 12) ("第 " + $i + " 次推送")
  $out = git -c http.sslBackend=openssl -C $repo push -u origin main 2>&1
  $code = $LASTEXITCODE
  Write-Host ('--- push try ' + $i + ' exit=' + $code)
  $out | ForEach-Object { Write-Host $_ }
  if ($code -eq 0) { $ok = $true; break }
  Start-Sleep -Seconds 6
}

if ($ok) {
  Emit 'done' 100 '推送成功'
  Write-Host 'PUSH OK'
  exit 0
} else {
  Emit 'failed' 90 '推送失败'
  Write-Host 'PUSH FAILED'
  exit 1
}
