#Requires -Version 5.1
<#
.SYNOPSIS
  nongyu-go-track-server：本机交叉编译（可选）→ SCP 上传 → 远端重启探活。

.DESCRIPTION
  敏感配置只从 scripts/ops/track-deploy.env 读取（该目录已 gitignore）。
  依据：docs/nongyu-go-track-server/部署与发布.md

.PARAMETER SkipBuild
  跳过 go build，仅上传已有 TRACK_LOCAL_BIN。

.PARAMETER SkipRestart
  仅上传，不 systemctl restart。
#>
param(
  [switch]$SkipBuild,
  [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RepoRoot "scripts/ops/track-deploy.env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "缺少 $EnvFile 。请复制 scripts/track-deploy.env.example 到该路径并填写。"
}

function Import-TrackDeployEnv([string]$Path) {
  Get-Content -Path $Path -Encoding utf8 | ForEach-Object {
    $line = $_.Trim()
    # strip UTF-8 BOM if present on first line
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

Import-TrackDeployEnv $EnvFile

foreach ($req in @(
    "TRACK_SSH_HOST", "TRACK_SSH_USER", "TRACK_REMOTE_BIN",
    "TRACK_LOCAL_BIN", "TRACK_GO_WORKDIR", "TRACK_GO_PACKAGE",
    "TRACK_SYSTEMD_UNIT", "TRACK_HTTP_ADDR"
  )) {
  if (-not [string]$env:$req) {
    Write-Error "track-deploy.env 缺少 $req"
  }
}

$LocalBin = Join-Path $RepoRoot $env:TRACK_LOCAL_BIN
$GoWorkdir = Join-Path $RepoRoot $env:TRACK_GO_WORKDIR
$Remote = "$($env:TRACK_SSH_USER)@$($env:TRACK_SSH_HOST)"

function Invoke-Remote([string]$RemoteCommand) {
  $sshArgs = @("-o", "StrictHostKeyChecking=accept-new")
  if ($env:TRACK_SSH_KEY_PATH) {
    $sshArgs += @("-i", $env:TRACK_SSH_KEY_PATH)
  }
  if ($env:TRACK_SSH_PASSWORD -and -not $env:TRACK_SSH_KEY_PATH) {
    if (-not (Get-Command plink -ErrorAction SilentlyContinue) -and
        -not (Get-Command sshpass -ErrorAction SilentlyContinue)) {
      Write-Error @"
口令登录需要本机具备非交互传密能力。
推荐：配置 SSH 公钥，在 track-deploy.env 设置 TRACK_SSH_KEY_PATH 并清空口令依赖。
临时：安装 PuTTY plink，或 WSL 下 sshpass。
"@
    }
    if (Get-Command plink -ErrorAction SilentlyContinue) {
      & plink -batch -pw $env:TRACK_SSH_PASSWORD $Remote $RemoteCommand
      return
    }
  }
  & ssh @sshArgs $Remote $RemoteCommand
}

function Send-RemoteFile([string]$Local, [string]$RemotePath) {
  $scpArgs = @("-o", "StrictHostKeyChecking=accept-new")
  if ($env:TRACK_SSH_KEY_PATH) {
    $scpArgs += @("-i", $env:TRACK_SSH_KEY_PATH)
  }
  if ($env:TRACK_SSH_PASSWORD -and -not $env:TRACK_SSH_KEY_PATH) {
    if (Get-Command pscp -ErrorAction SilentlyContinue) {
      & pscp -batch -pw $env:TRACK_SSH_PASSWORD $Local "${Remote}:$RemotePath"
      return
    }
    Write-Error "口令 SCP 需要 pscp（PuTTY）或改为密钥登录（TRACK_SSH_KEY_PATH）。"
  }
  & scp @scpArgs $Local "${Remote}:$RemotePath"
}

if (-not $SkipBuild) {
  if (-not (Test-Path $GoWorkdir)) {
    Write-Error "Go 工程目录不存在: $GoWorkdir （服务代码未落地前请用 -SkipBuild 且仅测连通）"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $LocalBin) | Out-Null
  Push-Location $GoWorkdir
  try {
    $env:GOOS = "linux"
    $env:GOARCH = $(if ($env:TRACK_GOARCH) { $env:TRACK_GOARCH } else { "amd64" })
    $env:CGO_ENABLED = "0"
    Write-Host "Building $($env:GOOS)/$($env:GOARCH) -> $LocalBin"
    go build -o $LocalBin $env:TRACK_GO_PACKAGE
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $LocalBin)) {
  Write-Error "本地二进制不存在: $LocalBin"
}

$tmpRemote = "/tmp/nongyu-track.new"
Write-Host "Upload $LocalBin -> ${Remote}:$tmpRemote"
Send-RemoteFile $LocalBin $tmpRemote

$unit = $env:TRACK_SYSTEMD_UNIT
$bin = $env:TRACK_REMOTE_BIN
$healthHost = $env:TRACK_HTTP_ADDR
$remoteScript = @"
set -e
install -m 755 '$tmpRemote' '$bin'
rm -f '$tmpRemote'
"@
if (-not $SkipRestart) {
  $remoteScript += @"

systemctl restart '$unit'
systemctl is-active '$unit'
curl -sf "http://$healthHost/health" || true
"@
}

Write-Host "Remote install/restart..."
Invoke-Remote $remoteScript
Write-Host "Done."
