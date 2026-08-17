#Requires -Version 5.1
<#
.SYNOPSIS
  Build nongyu-web-site + nongyu-web-admin dist, upload to WEB host, optionally reload nginx.

.PARAMETER SkipBuild
  Skip pnpm build; upload existing dist only.

.PARAMETER SiteOnly
  Publish site only.

.PARAMETER AdminOnly
  Publish admin only.

.PARAMETER SkipReload
  Do not nginx -s reload (static overwrite usually enough).

.PARAMETER Bootstrap
  Install nginx if missing, write dirs, push nginx conf from example.
#>
param(
  [switch]$SkipBuild,
  [switch]$SiteOnly,
  [switch]$AdminOnly,
  [switch]$SkipReload,
  [switch]$Bootstrap
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$EnvFile = Join-Path $RepoRoot "scripts/ops/web-deploy.env"

if (-not (Test-Path $EnvFile)) {
  Write-Error "Missing $EnvFile. Copy scripts/web-deploy.env.example to that path."
}

function Import-WebDeployEnv([string]$Path) {
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

Import-WebDeployEnv $EnvFile

foreach ($req in @(
    "WEB_SSH_HOST", "WEB_SSH_USER",
    "WEB_REMOTE_SITE_DIR", "WEB_REMOTE_ADMIN_DIR",
    "WEB_LOCAL_SITE_DIST", "WEB_LOCAL_ADMIN_DIST",
    "WEB_API_UPSTREAM"
  )) {
  $reqVal = [Environment]::GetEnvironmentVariable($req)
  if ([string]::IsNullOrWhiteSpace($reqVal)) {
    Write-Error ("web-deploy.env missing " + $req)
  }
}

$doSite = -not $AdminOnly
$doAdmin = -not $SiteOnly
if ($SiteOnly -and $AdminOnly) {
  Write-Error "Use only one of -SiteOnly / -AdminOnly"
}

$LocalSite = Join-Path $RepoRoot $env:WEB_LOCAL_SITE_DIST
$LocalAdmin = Join-Path $RepoRoot $env:WEB_LOCAL_ADMIN_DIST
$Remote = ($env:WEB_SSH_USER + "@" + $env:WEB_SSH_HOST)

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
  if ($env:WEB_SSH_KEY_PATH) {
    $sshArgs += @("-i", $env:WEB_SSH_KEY_PATH)
  }
  return $sshArgs
}

function Invoke-Remote([string]$RemoteCommand) {
  $sshArgs = Get-SshBaseArgs
  if ($env:WEB_SSH_PASSWORD -and -not $env:WEB_SSH_KEY_PATH) {
    Write-Error "Password login unsupported; set WEB_SSH_KEY_PATH."
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
  Push-Location $RepoRoot
  try {
    if ($doSite) {
      Write-Host "Building nongyu-web-site..."
      pnpm --filter nongyu-web-site build
      if ($LASTEXITCODE -ne 0) { Write-Error "site build failed" }
    }
    if ($doAdmin) {
      Write-Host "Building nongyu-web-admin (base=/admin/)..."
      pnpm --filter nongyu-web-admin build
      if ($LASTEXITCODE -ne 0) { Write-Error "admin build failed" }
    }
  }
  finally {
    Pop-Location
  }
}

if ($doSite -and -not (Test-Path $LocalSite)) {
  Write-Error ("Local site dist missing: " + $LocalSite)
}
if ($doAdmin -and -not (Test-Path $LocalAdmin)) {
  Write-Error ("Local admin dist missing: " + $LocalAdmin)
}

if ($Bootstrap) {
  Write-Host "Bootstrap: ensure nginx + dirs + conf..."
  $nginxExample = Join-Path $RepoRoot "docs/nongyu-web-site/deploy/nongyu-web.nginx.conf.example"
  if (-not (Test-Path $nginxExample)) {
    Write-Error ("Missing nginx example: " + $nginxExample)
  }
  $confBody = Get-Content -Path $nginxExample -Raw -Encoding UTF8
  $confBody = $confBody.Replace("YOUR_WEB_IP", $env:WEB_SSH_HOST)
  $confBody = $confBody.Replace("YOUR_NODE_UPSTREAM", $env:WEB_API_UPSTREAM)
  $confRemote = $env:WEB_NGINX_CONF_REMOTE
  if ([string]::IsNullOrWhiteSpace($confRemote)) {
    $confRemote = "/etc/nginx/conf.d/nongyu-web.conf"
  }
  $tmpConf = Join-Path $env:TEMP "nongyu-web.nginx.conf"
  if ($confBody.Length -gt 0 -and [int][char]$confBody[0] -eq 0xFEFF) {
    $confBody = $confBody.Substring(1)
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText(
    $tmpConf,
    ($confBody -replace "`r`n", "`n"),
    $utf8NoBom
  )

  $bootstrapSh = @'
set -e
if ! command -v nginx >/dev/null 2>&1; then
  if command -v yum >/dev/null 2>&1; then
    yum install -y epel-release
    yum install -y nginx
  elif command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y nginx
  else
    echo "No yum/apt; install nginx manually" >&2
    exit 1
  fi
fi
mkdir -p /var/www/site /var/www/admin
if [ -f /etc/nginx/conf.d/default.conf ]; then
  mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
fi
systemctl enable nginx
systemctl start nginx || systemctl restart nginx
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-service=http || true
  firewall-cmd --reload || true
fi
'@
  $bootstrapLocal = Join-Path $env:TEMP "nongyu-web-bootstrap.sh"
  # LF line endings for bash
  [System.IO.File]::WriteAllText($bootstrapLocal, ($bootstrapSh -replace "`r`n", "`n"))

  Send-RemoteFile $bootstrapLocal "/tmp/nongyu-web-bootstrap.sh"
  Send-RemoteFile $tmpConf "/tmp/nongyu-web.nginx.conf"
  Invoke-Remote "bash /tmp/nongyu-web-bootstrap.sh; mv /tmp/nongyu-web.nginx.conf '$confRemote'; nginx -t; systemctl reload nginx; rm -f /tmp/nongyu-web-bootstrap.sh"
}

function Publish-Dist([string]$LocalDir, [string]$RemoteDir, [string]$TarName) {
  $tarLocal = Join-Path $env:TEMP $TarName
  if (Test-Path $tarLocal) { Remove-Item -Force $tarLocal }
  Write-Host ("Packing " + $LocalDir + " -> " + $tarLocal)
  tar -czf $tarLocal -C $LocalDir .
  if ($LASTEXITCODE -ne 0) { Write-Error "tar pack failed" }
  $tmpTar = "/tmp/" + $TarName
  Write-Host ("Upload -> " + $Remote + ":" + $tmpTar)
  Send-RemoteFile $tarLocal $tmpTar
  $remoteScript = "set -e; mkdir -p '" + $RemoteDir + "'; find '" + $RemoteDir + "' -mindepth 1 -delete; tar -xzf '" + $tmpTar + "' -C '" + $RemoteDir + "'; rm -f '" + $tmpTar + "'"
  Invoke-Remote $remoteScript
}

if ($doSite) {
  Publish-Dist $LocalSite $env:WEB_REMOTE_SITE_DIR "nongyu-web-site-dist.tgz"
}
if ($doAdmin) {
  Publish-Dist $LocalAdmin $env:WEB_REMOTE_ADMIN_DIR "nongyu-web-admin-dist.tgz"
}

if (-not $SkipReload) {
  Write-Host "nginx -t && reload..."
  Invoke-Remote "nginx -t && systemctl reload nginx"
}

Write-Host "Done."
Write-Host ("Site:  http://" + $env:WEB_SSH_HOST + "/")
Write-Host ("Admin: http://" + $env:WEB_SSH_HOST + "/admin/")
