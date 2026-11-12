<#
  Lotse on a Windows server in the domain, with Windows sign-in (Kerberos) and without IIS.
  Run once as administrator on the server:

    .\deploy\kerberos\install-windows.ps1 -HostName intranet.firma.local -CertFile C:\lotse\cert.pem -KeyFile C:\lotse\key.pem

  - builds the backend environment (incl. pyspnego) and the web interface
  - registers the SPN HTTP/<HostName> on this computer account (needs rights in AD; otherwise prints the command)
  - opens the port in the Windows firewall
  - starts Lotse as a scheduled task at system start (account SYSTEM = computer account, restarts on failure)
  Without -CertFile/-KeyFile Lotse runs on plain HTTP (port 80) - only for a test.
#>
param(
    [Parameter(Mandatory)] [string] $HostName,
    [string] $CertFile = "",
    [string] $KeyFile = "",
    [int] $Port = 0
)
$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$backend = Join-Path $root "backend"
$python = Join-Path $backend ".venv\Scripts\python.exe"
$tls = [bool]($CertFile -and $KeyFile)
if (-not $Port) { $Port = if ($tls) { 443 } else { 80 } }

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw "Please run this script as administrator." }
if (-not (Get-CimInstance Win32_ComputerSystem).PartOfDomain) { throw "This server is not a domain member - Kerberos needs the domain." }
if ($tls -and -not ((Test-Path $CertFile) -and (Test-Path $KeyFile))) { throw "Certificate or key file not found." }

Write-Host "1/5 Backend environment" -ForegroundColor Cyan
if (-not (Test-Path $python)) { python -m venv (Join-Path $backend ".venv") }
& $python -m pip install --quiet -r (Join-Path $backend "requirements.txt")

Write-Host "2/5 Web interface" -ForegroundColor Cyan
Push-Location (Join-Path $root "frontend"); npm install --no-audit --no-fund; npm run build; Pop-Location

Write-Host "3/5 SPN HTTP/$HostName on computer $env:COMPUTERNAME" -ForegroundColor Cyan
setspn -S "HTTP/$HostName" $env:COMPUTERNAME
if ($LASTEXITCODE -ne 0) {
    Write-Warning "SPN could not be set (rights?). A domain admin runs:  setspn -S HTTP/$HostName $env:COMPUTERNAME"
}

Write-Host "4/5 Firewall port $Port" -ForegroundColor Cyan
if (-not (Get-NetFirewallRule -DisplayName "Lotse" -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName "Lotse" -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
}

Write-Host "5/5 Start at system start" -ForegroundColor Cyan
$uvArgs = "-m uvicorn app.main:app --host 0.0.0.0 --port $Port"
if ($tls) { $uvArgs += " --ssl-certfile `"$CertFile`" --ssl-keyfile `"$KeyFile`"" }
$action = New-ScheduledTaskAction -Execute $python -Argument $uvArgs -WorkingDirectory $backend
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable
Register-ScheduledTask -TaskName "Lotse" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Force | Out-Null
Start-ScheduledTask -TaskName "Lotse"

$scheme = if ($tls) { "https" } else { "http" }
$url = if (($tls -and $Port -eq 443) -or (-not $tls -and $Port -eq 80)) { "${scheme}://$HostName" } else { "${scheme}://${HostName}:$Port" }
Write-Host ""
Write-Host "Lotse runs on $url" -ForegroundColor Green
Write-Host "Next: Einstellungen -> Allgemein -> LDAP einrichten, dann Windows-Anmeldung einschalten,"
Write-Host "      Art 'Kerberos direkt', Adresse des Portals: $HostName"
Write-Host "      Browser per Gruppenrichtlinie freigeben - siehe deploy\kerberos\README.md"
