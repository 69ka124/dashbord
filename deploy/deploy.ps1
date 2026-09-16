# Deploy finance dashboard to a VPS.
# Usage:
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -HostName root@YOUR_IP
param(
    [string]$HostName = "root@YOUR_SERVER_IP",
    [string]$RemotePath = "/opt/dashbord",
    [string]$PublicUrl = "https://YOUR_DOMAIN"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

if ($HostName -like "*YOUR_SERVER*") {
    Write-Error "Set -HostName, e.g. -HostName root@1.2.3.4"
}

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
Write-Host "URL:  $PublicUrl"
Write-Host "Login: email from OWNER_EMAIL in server .env (OPEN_ACCESS should be false)"
