# Deploy finance dashboard to VPS (isolated from sport/mentally/trading).
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1
param(
    [string]$HostName = "root@135.106.209.129",
    [string]$RemotePath = "/opt/dashbord"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$Archive = Join-Path $env:TEMP "dashbord-deploy.tgz"
if (Test-Path $Archive) { Remove-Item $Archive -Force }

Write-Host "==> Packaging project"
tar `
  --exclude=node_modules `
  --exclude=.next `
  --exclude=.git `
  --exclude="*.db" `
  --exclude="*.db-journal" `
  --exclude=.env `
  -czf $Archive .

Write-Host "==> Upload to ${HostName}:${RemotePath}"
ssh $HostName "mkdir -p $RemotePath"
scp $Archive "${HostName}:${RemotePath}/dashbord-deploy.tgz"

Write-Host "==> Build and restart on server"
# Avoid PowerShell here-string CRLF breaking remote bash
$remote = @(
  "set -e",
  "cd $RemotePath",
  "tar xzf dashbord-deploy.tgz",
  "rm -f dashbord-deploy.tgz",
  "chmod +x deploy/setup_server.sh",
  "sed -i 's/\r`$//' deploy/setup_server.sh",
  "bash deploy/setup_server.sh",
  "curl -sf -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:5001/ || true"
) -join "`n"

ssh $HostName $remote

Write-Host ""
Write-Host "==> Deploy done"
Write-Host "URL:  https://135.106.209.129.sslip.io/"
Write-Host "Open access: no login required while OPEN_ACCESS=true"
