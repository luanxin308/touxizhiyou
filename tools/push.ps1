# 一键推送到 GitHub（本机没有存凭据，需要交互输入或先登录 gh）
# 用法：
#   powershell -ExecutionPolicy Bypass -File tools\push.ps1 -Repo https://github.com/你的用户名/touxizhiyou.git
# 说明：
#   1. 先在 GitHub 网页上新建一个空仓库 touxizhiyou（不要勾选 README / .gitignore）
#   2. 再跑本脚本；会提示输入用户名与 Personal Access Token（Token 仅本次使用，不落盘）
#   3. 若已安装 gh 且 gh auth login 过，可直接 gh repo create 后 git push
param(
  [Parameter(Mandatory = $true)][string]$Repo,
  [string]$Branch = "main"
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not (Test-Path ".git")) { throw "还没有 git 仓库，请先执行 tools\build.ps1 之前的 git init" }

# 本机 git 走 schannel 会拿不到凭据，强制用 openssl 后端
git config http.sslBackend openssl | Out-Null

$remotes = git remote
if ($remotes -match "^origin$") {
  git remote set-url origin $Repo
} else {
  git remote add origin $Repo
}

git branch -M $Branch
Write-Host "推送到 $Repo ($Branch) ..."
git push -u origin $Branch

if ($LASTEXITCODE -eq 0) {
  Write-Host ""
  Write-Host "推送成功：$Repo"
} else {
  Write-Host ""
  Write-Host "推送失败。常见原因："
  Write-Host "  1) 仓库不存在或名字不对 → 先在 GitHub 网页新建空仓库 touxizhiyou"
  Write-Host "  2) 认证失败 → 用 Personal Access Token 当密码（需要 repo 权限）"
  Write-Host "  3) 网络不通 → 试试镜像：git remote set-url origin https://ghfast.top/$Repo"
}
