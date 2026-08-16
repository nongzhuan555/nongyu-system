#Requires -Version 5.1
<#
.SYNOPSIS
  nongyu-node-server：本机构建 dist → 上传 → 远端重启探活。

.DESCRIPTION
  敏感配置只从 scripts/ops/node-deploy.env 读取（该目录已 gitignore）。
  依据：docs/nongyu-node-server/部署与发布.md
  不同步 .env，不上传 node_modules，不触碰 MySQL。

.PARAMETER SkipBuild
  跳过 pnpm build，仅上传已有 dist。

.PARAMETER SkipRestart
  仅上传，不 systemctl restart。

.PARAMETER InstallDeps
  上传 package.json 后在远端执行 npm install --omit=dev（依赖变更时使用）。
#>
param(
  [switch]$SkipBuild,
  [switch]$SkipRestart,
  [switch]$InstallDeps
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RepoRoot "scripts/ops/node-deploy.env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "缺少 $EnvFile 。请复制 scripts/node-deploy.env.example 到该路径并填写。"
}

function Import-NodeDeployEnv([string]$Path) {
  Get-Content -Path $Path -Encoding utf8 | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -gt 0 -and [int][char]$line[0] -eq 0xFEFF) {
      $line = $line.Substring(1).Trim()
    }
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    $idx = $line.IndexOf("=")
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    Set-Item -Path "Env:$key" -Value $val
  }
}

Import-NodeDeployEnv $EnvFile

foreach ($req in @(
    "NODE_SSH_HOST", "NODE_SSH_USER", "NODE_REMOTE_DIR",
    "NODE_LOCAL_DIST", "NODE_LOCAL_PACKAGE_JSON",
    "NODE_SYSTEMD_UNIT", "NODE_HEALTH_URL"
  )) {
  if (-not [string]$env:$req) {
    Write-Error "node-deploy.env 缺少 $req"
  }
}

$LocalDist = Join-Path $RepoRoot $env:NODE_LOCAL_DIST
$LocalPkg = Join-Path $RepoRoot $env:NODE_LOCAL_PACKAGE_JSON
$Remote = "$($env:NODE_SSH_USER)@$($env:NODE_SSH_HOST)"
$FilterDir = Join-Path $RepoRoot "apps/nongyu-node-server"

function Get-OpenSsh([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:SystemRoot "System32\OpenSSH\$Name.exe"
  if (Test-Path $fallback) { return $fallback }
  Write-Error "找不到 $Name.exe。请安装 Windows OpenSSH。"
}

$SshExe = Get-OpenSsh "ssh"
$ScpExe = Get-OpenSsh "scp"

function Get-SshBaseArgs {
  $sshArgs = @("-o", "StrictHostKeyChecking=accept-new")
  if ($env:NODE_SSH_KEY_PATH) {
    $sshArgs += @("-i", $env:NODE_SSH_KEY_PATH)
  }
  return $sshArgs
}

function Invoke-Remote([string]$RemoteCommand) {
  $sshArgs = Get-SshBaseArgs
  if ($env:NODE_SSH_PASSWORD -and -not $env:NODE_SSH_KEY_PATH) {
    Write-Error "口令登录请改用 NODE_SSH_KEY_PATH 密钥；脚本不走交互口令。"
  }
  & $SshExe @sshArgs $Remote $RemoteCommand
  if ($LASTEXITCODE -ne 0) {
    Write-Error "远端命令失败: $RemoteCommand"
  }
}

function Send-RemoteFile([string]$Local, [string]$RemotePath) {
  $scpArgs = Get-SshBaseArgs
  & $ScpExe @scpArgs $Local "${Remote}:$RemotePath"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "scp 失败: $Local -> $RemotePath"
  }
}

if (-not $SkipBuild) {
  if (-not (Test-Path $FilterDir)) {
    Write-Error "Node 工程目录不存在: $FilterDir"
  }
  Write-Host "Building nongyu-node-server dist..."
  Push-Location $RepoRoot
  try {
    pnpm --filter nongyu-node-server build
    if ($LASTEXITCODE -ne 0) {
      Write-Error "pnpm build 失败"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $LocalDist)) {
  Write-Error "本地 dist 不存在: $LocalDist"
}
if (-not (Test-Path $LocalPkg)) {
  Write-Error "本地 package.json 不存在: $LocalPkg"
}

$tarName = "nongyu-node-dist.tgz"
$tarLocal = Join-Path $env:TEMP $tarName
if (Test-Path $tarLocal) {
  Remove-Item -Force $tarLocal
}

Write-Host "Packing dist -> $tarLocal"
tar -czf $tarLocal -C $LocalDist .
if ($LASTEXITCODE -ne 0) {
  Write-Error "打包 dist 失败（需要本机 tar，Git for Windows 或 tar.exe）"
}

$remoteDir = $env:NODE_REMOTE_DIR
$tmpTar = "/tmp/$tarName"
Write-Host "Upload dist archive -> ${Remote}:$tmpTar"
Send-RemoteFile $tarLocal $tmpTar

if ($InstallDeps) {
  Write-Host "Upload package.json"
  Send-RemoteFile $LocalPkg "$remoteDir/package.json"
}

$unit = $env:NODE_SYSTEMD_UNIT
$health = $env:NODE_HEALTH_URL

$remoteScript = @"
set -e
mkdir -p '$remoteDir/dist'
tar -xzf '$tmpTar' -C '$remoteDir/dist'
rm -f '$tmpTar'
"@

if ($InstallDeps) {
  $remoteScript += @"

cd '$remoteDir'
npm install --omit=dev
"@
}

if (-not $SkipRestart) {
  $remoteScript += @"

systemctl restart '$unit'
systemctl is-active '$unit'
curl -sf '$health' || true
"@
}

Write-Host "Remote extract/restart..."
Invoke-Remote $remoteScript
Write-Host "Done."
