#Requires -Version 5.1
<#
.SYNOPSIS
  nongyu-go-track-server: local cross-compile, upload, remote restart.

.DESCRIPTION
  Reads scripts/ops/track-deploy.env (gitignored).
  See docs/nongyu-go-track-server/部署与发布.md
  Does not sync .env, does not overwrite SQLite, does not touch MySQL.

.PARAMETER SkipBuild
  Skip go build; upload existing TRACK_LOCAL_BIN.

.PARAMETER SkipRestart
  Upload only; no systemctl restart.
#>
param(
  [switch]$SkipBuild,
  [switch]$SkipRestart
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RepoRoot "scripts/ops/track-deploy.env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile . Copy scripts/track-deploy.env.example to that path."
}

function Import-TrackDeployEnv([string]$Path) {
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

Import-TrackDeployEnv $EnvFile

foreach ($req in @(
    "TRACK_SSH_HOST", "TRACK_SSH_USER", "TRACK_REMOTE_BIN",
    "TRACK_LOCAL_BIN", "TRACK_GO_WORKDIR", "TRACK_GO_PACKAGE",
    "TRACK_SYSTEMD_UNIT", "TRACK_HTTP_ADDR"
  )) {
  $reqVal = [Environment]::GetEnvironmentVariable($req)
  if (-not $reqVal) {
    Write-Error "track-deploy.env missing $req"
  }
}

$LocalBin = Join-Path $RepoRoot $env:TRACK_LOCAL_BIN
$GoWorkdir = Join-Path $RepoRoot $env:TRACK_GO_WORKDIR
$Remote = "$($env:TRACK_SSH_USER)@$($env:TRACK_SSH_HOST)"

function Get-OpenSsh([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:SystemRoot "System32\OpenSSH\$Name.exe"
  if (Test-Path $fallback) { return $fallback }
  Write-Error "Cannot find $Name.exe. Install Windows OpenSSH."
}

function Get-GoExe {
  $cmd = Get-Command go -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = "C:\Program Files\Go\bin\go.exe"
  if (Test-Path $fallback) { return $fallback }
  Write-Error "Cannot find go.exe. Install Go 1.23+."
}

$SshExe = Get-OpenSsh "ssh"
$ScpExe = Get-OpenSsh "scp"

function Get-SshBaseArgs {
  $sshArgs = @("-o", "StrictHostKeyChecking=accept-new")
  if ($env:TRACK_SSH_KEY_PATH) {
    $sshArgs += @("-i", $env:TRACK_SSH_KEY_PATH)
  }
  return $sshArgs
}

function Invoke-Remote([string]$RemoteCommand) {
  $sshArgs = Get-SshBaseArgs
  if ($env:TRACK_SSH_PASSWORD -and -not $env:TRACK_SSH_KEY_PATH) {
    Write-Error "Use TRACK_SSH_KEY_PATH; this script does not use interactive passwords."
  }
  & $SshExe @sshArgs $Remote $RemoteCommand
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Remote command failed: $RemoteCommand"
  }
}

function Send-RemoteFile([string]$Local, [string]$RemotePath) {
  $scpArgs = Get-SshBaseArgs
  & $ScpExe @scpArgs $Local "${Remote}:$RemotePath"
  if ($LASTEXITCODE -ne 0) {
    Write-Error "scp failed: $Local -> $RemotePath"
  }
}

if (-not $SkipBuild) {
  if (-not (Test-Path $GoWorkdir)) {
    Write-Error "Go project dir missing: $GoWorkdir"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $LocalBin) | Out-Null
  $GoExe = Get-GoExe
  Push-Location $GoWorkdir
  try {
    $env:GOOS = "linux"
    $env:GOARCH = $(if ($env:TRACK_GOARCH) { $env:TRACK_GOARCH } else { "amd64" })
    $env:CGO_ENABLED = "0"
    if (-not $env:GOPROXY) {
      $env:GOPROXY = "https://goproxy.cn,direct"
    }
    Write-Host "Building $($env:GOOS)/$($env:GOARCH) -> $LocalBin"
    & $GoExe build -o $LocalBin $env:TRACK_GO_PACKAGE
    if ($LASTEXITCODE -ne 0) {
      Write-Error "go build failed"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $LocalBin)) {
  Write-Error "Local binary missing: $LocalBin"
}

$tmpRemote = "/tmp/nongyu-track.new"
Write-Host "Upload $LocalBin -> ${Remote}:$tmpRemote"
Send-RemoteFile $LocalBin $tmpRemote

$unit = $env:TRACK_SYSTEMD_UNIT
$bin = $env:TRACK_REMOTE_BIN
$healthHost = $env:TRACK_HTTP_ADDR
$healthUrl = "http://$healthHost/health"
$remoteScript = "set -e`ninstall -m 755 '$tmpRemote' '$bin'`nrm -f '$tmpRemote'"
if (-not $SkipRestart) {
  $remoteScript += "`nsystemctl restart '$unit'`nsystemctl is-active '$unit'`ncurl -sf '$healthUrl' || true"
}

Write-Host "Remote install/restart..."
Invoke-Remote $remoteScript
Write-Host "Done."