#Requires -Version 5.1
<#
.SYNOPSIS
  nongyu-node-track-server: local build, upload, remote restart.

.DESCRIPTION
  Reads scripts/ops/track-deploy.env (gitignored).
  See docs/nongyu-go-track-server/部署与发布.md
  Does not sync .env, does not overwrite SQLite, does not touch MySQL.

.PARAMETER SkipBuild
  Skip pnpm build; upload existing TRACK_LOCAL_DIST_TGZ.

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
    "TRACK_SSH_HOST", "TRACK_SSH_USER", "TRACK_REMOTE_DIR",
    "TRACK_LOCAL_DIST_TGZ", "TRACK_PKG_WORKDIR",
    "TRACK_SYSTEMD_UNIT", "TRACK_HTTP_ADDR"
  )) {
  $reqVal = [Environment]::GetEnvironmentVariable($req)
  if (-not $reqVal) {
    Write-Error "track-deploy.env missing $req"
  }
}

$LocalTgz = Join-Path $RepoRoot $env:TRACK_LOCAL_DIST_TGZ
$PkgWorkdir = Join-Path $RepoRoot $env:TRACK_PKG_WORKDIR
$Remote = "$($env:TRACK_SSH_USER)@$($env:TRACK_SSH_HOST)"

function Get-OpenSsh([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:SystemRoot "System32\OpenSSH\$Name.exe"
  if (Test-Path $fallback) { return $fallback }
  Write-Error "Cannot find $Name.exe. Install Windows OpenSSH."
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
  if (-not (Test-Path $PkgWorkdir)) {
    Write-Error "Track package dir missing: $PkgWorkdir"
  }
  New-Item -ItemType Directory -Force -Path (Split-Path $LocalTgz) | Out-Null
  Push-Location $RepoRoot
  try {
    Write-Host "Building nongyu-node-track-server..."
    pnpm --filter nongyu-node-track-server... build
    if ($LASTEXITCODE -ne 0) {
      Write-Error "pnpm build failed"
    }
    $distDir = Join-Path $PkgWorkdir "dist"
    if (-not (Test-Path (Join-Path $distDir "index.js"))) {
      Write-Error "dist/index.js missing after build"
    }
    if (Test-Path $LocalTgz) { Remove-Item -Force $LocalTgz }
    tar -czf $LocalTgz -C $distDir .
    if ($LASTEXITCODE -ne 0) {
      Write-Error "tar failed"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $LocalTgz)) {
  Write-Error "Local dist tgz missing: $LocalTgz"
}

$tmpTgz = "/tmp/nongyu-track-dist.tgz"
$tmpPkg = "/tmp/nongyu-track-package.json"
$pkgJson = Join-Path $PkgWorkdir "package.deploy.json"
if (-not (Test-Path $pkgJson)) {
  $pkgJson = Join-Path $PkgWorkdir "package.json"
}
Write-Host "Upload $LocalTgz -> ${Remote}:$tmpTgz"
Send-RemoteFile $LocalTgz $tmpTgz
Send-RemoteFile $pkgJson $tmpPkg

$unit = $env:TRACK_SYSTEMD_UNIT
$remoteDir = $env:TRACK_REMOTE_DIR
$healthHost = $env:TRACK_HTTP_ADDR
$healthUrl = "http://$healthHost/health"
$publishLocal = Join-Path $RepoRoot "scripts/cd/publish-track.sh"
Send-RemoteFile $publishLocal "/tmp/publish-track.sh"

$remoteScript = "set -e`nsed -i 's/\r$//' /tmp/publish-track.sh"
if (-not $SkipRestart) {
  $remoteScript += "`nbash /tmp/publish-track.sh '$remoteDir' '$unit' '$healthUrl' '$tmpTgz' '$tmpPkg'"
} else {
  $remoteScript += "`necho skip restart; ls -la '$tmpTgz' '$tmpPkg'"
}
$remoteScript += "`nrm -f /tmp/publish-track.sh"

Write-Host "Remote publish/restart..."
Invoke-Remote $remoteScript
Write-Host "Done."
