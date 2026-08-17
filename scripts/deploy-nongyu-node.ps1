#Requires -Version 5.1
<#
.SYNOPSIS
  Build nongyu-node-server dist, upload, restart remote systemd unit.

.PARAMETER SkipBuild
  Skip pnpm build; upload existing dist only.

.PARAMETER SkipRestart
  Upload only; do not systemctl restart.

.PARAMETER InstallDeps
  After upload package.json, run npm install --omit=dev on remote.
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
  Write-Error "Missing $EnvFile. Copy scripts/node-deploy.env.example to that path."
}

function Import-NodeDeployEnv([string]$Path) {
  Get-Content -Path $Path -Encoding UTF8 | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -gt 0 -and [int][char]$line[0] -eq 0xFEFF) {
      $line = $line.Substring(1).Trim()
    }
    $isComment = $false
    if ($line.StartsWith([string]"#")) { $isComment = $true }
    if (($line -ne "") -and (-not $isComment)) {
      $idx = $line.IndexOf("=")
      if ($idx -ge 1) {
        $key = $line.Substring(0, $idx).Trim()
        $val = $line.Substring($idx + 1).Trim()
        Set-Item -Path ("Env:" + $key) -Value $val
      }
    }
  }
}

Import-NodeDeployEnv $EnvFile

foreach ($req in @(
    "NODE_SSH_HOST", "NODE_SSH_USER", "NODE_REMOTE_DIR",
    "NODE_LOCAL_DIST", "NODE_LOCAL_PACKAGE_JSON",
    "NODE_SYSTEMD_UNIT", "NODE_HEALTH_URL"
  )) {
  $reqVal = [Environment]::GetEnvironmentVariable($req)
  if ([string]::IsNullOrWhiteSpace($reqVal)) {
    Write-Error ("node-deploy.env missing " + $req)
  }
}

$LocalDist = Join-Path $RepoRoot $env:NODE_LOCAL_DIST
$LocalPkg = Join-Path $RepoRoot $env:NODE_LOCAL_PACKAGE_JSON
$Remote = ($env:NODE_SSH_USER + "@" + $env:NODE_SSH_HOST)
$FilterDir = Join-Path $RepoRoot "apps/nongyu-node-server"

function Get-OpenSsh([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $fallback = Join-Path $env:SystemRoot ("System32\OpenSSH\" + $Name + ".exe")
  if (Test-Path $fallback) { return $fallback }
  Write-Error ("Missing " + $Name + ".exe. Install Windows OpenSSH.")
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
    Write-Error "Password login unsupported; set NODE_SSH_KEY_PATH."
  }
  & $SshExe @sshArgs $Remote $RemoteCommand
  if ($LASTEXITCODE -ne 0) {
    Write-Error ("Remote command failed: " + $RemoteCommand)
  }
}

function Send-RemoteFile([string]$Local, [string]$RemotePath) {
  $scpArgs = Get-SshBaseArgs
  & $ScpExe @scpArgs $Local ($Remote + ":" + $RemotePath)
  if ($LASTEXITCODE -ne 0) {
    Write-Error ("scp failed: " + $Local + " -> " + $RemotePath)
  }
}

if (-not $SkipBuild) {
  if (-not (Test-Path $FilterDir)) {
    Write-Error ("Node app dir missing: " + $FilterDir)
  }
  Write-Host "Building nongyu-node-server dist..."
  Push-Location $RepoRoot
  try {
    pnpm --filter nongyu-node-server build
    if ($LASTEXITCODE -ne 0) {
      Write-Error "pnpm build failed"
    }
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $LocalDist)) {
  Write-Error ("Local dist missing: " + $LocalDist)
}
if (-not (Test-Path $LocalPkg)) {
  Write-Error ("Local package.json missing: " + $LocalPkg)
}

$tarName = "nongyu-node-dist.tgz"
$tarLocal = Join-Path $env:TEMP $tarName
if (Test-Path $tarLocal) {
  Remove-Item -Force $tarLocal
}

Write-Host ("Packing dist -> " + $tarLocal)
tar -czf $tarLocal -C $LocalDist .
if ($LASTEXITCODE -ne 0) {
  Write-Error "tar pack failed"
}

$remoteDir = $env:NODE_REMOTE_DIR
$tmpTar = "/tmp/" + $tarName
Write-Host ("Upload dist archive -> " + $Remote + ":" + $tmpTar)
Send-RemoteFile $tarLocal $tmpTar

if ($InstallDeps) {
  Write-Host "Upload package.json"
  Send-RemoteFile $LocalPkg ($remoteDir + "/package.json")
}

$unit = $env:NODE_SYSTEMD_UNIT
$health = $env:NODE_HEALTH_URL

$remoteScript = "set -e; mkdir -p '" + $remoteDir + "/dist'; tar -xzf '" + $tmpTar + "' -C '" + $remoteDir + "/dist'; rm -f '" + $tmpTar + "'"

if ($InstallDeps) {
  $remoteScript = $remoteScript + "; cd '" + $remoteDir + "'; npm install --omit=dev"
}

if (-not $SkipRestart) {
  $remoteScript = $remoteScript + "; systemctl restart '" + $unit + "'; systemctl is-active '" + $unit + "'; curl -sf '" + $health + "' | cat"
}

Write-Host "Remote extract/restart..."
Invoke-Remote $remoteScript
Write-Host "Done."
