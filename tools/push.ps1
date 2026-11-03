# 一键推送到 GitHub
# 用法：
#   powershell -ExecutionPolicy Bypass -File tools\push.ps1 -Repo https://github.com/用户名/touxizhiyou.git
# 前提：先在 GitHub 网页新建一个空仓库 touxizhiyou（不要勾 README / .gitignore，否则要先 pull）
# 认证：第一次推送会弹出 GitHub 登录窗口（Git Credential Manager），登录一次后凭据由系统保管

param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Branch = "main",
  [switch]$Force
)

# git / keytool 的中文警告会走 stderr，Stop 会被误当成异常打断
$ErrorActionPreference = 'Continue'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".git")) { throw "这里还不是 git 仓库：$root" }

# 本机 git 走 schannel 拿不到凭据，强制 openssl 后端
git config http.sslBackend openssl | Out-Null

$remotes = (git remote) -join " "
if ($remotes -match 'origin') {
  git remote set-url origin $Repo | Out-Null
} else {
  git remote add origin $Repo | Out-Null
}

git branch -M $Branch | Out-Null

Write-Host "远程：$Repo"
Write-Host "分支：$Branch"
Write-Host "推送中（若弹出 GitHub 登录窗口，请完成登录授权）..."

if ($Force) {
  $out = git push -u -f origin $Branch 2>&1
} else {
  $out = git push -u origin $Branch 2>&1
}
$code = $LASTEXITCODE
$out | Select-Object -Last 15 | ForEach-Object { Write-Host "  $_" }

if ($code -eq 0) {
  Write-Host ""
  Write-Host "推送成功：$Repo" -ForegroundColor Green
} else {
  Write-Host ""
  Write-Host "推送失败（exit=$code）。按提示逐条排查："
  Write-Host "  1) Repository not found → 仓库还没建，或名字拼错。去 https://github.com/new 建一个空的 touxizhiyou"
  Write-Host "  2) Authentication failed → 没登录。重跑一次，在弹出的 GitHub 窗口里登录"
  Write-Host "  3) rejected / fetch first → 远端已有内容（比如建仓库时勾了 README）。加 -Force 覆盖，或先 git pull --rebase"
  Write-Host "  4) 一直卡住不动 → 网络问题。试：git remote set-url origin https://ghfast.top/$Repo"
}
