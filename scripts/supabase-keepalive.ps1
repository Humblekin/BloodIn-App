# Supabase keep-alive script (Windows PowerShell + Bash)
# Pings the project's REST API so the free-tier project is never
# considered "inactive" and paused after 7 days of no activity.
#
# Configure via .env (SUPABASE_URL, SUPABASE_ANON_KEY) or set
# the same variable names in the environment.
#
# Windows:  Task Scheduler  -> run powershell.exe -File supabase-keepalive.ps1
# macOS/Linux: crontab -e   -> 0 */6 * * * bash /path/to/supabase-keepalive.sh

$ErrorActionPreference = 'Stop'

function Get-EnvValue($name) {
  $envVal = [Environment]::GetEnvironmentVariable($name)
  if (-not [string]::IsNullOrWhiteSpace($envVal)) { return $envVal }

  $envFile = Join-Path (Split-Path $PSScriptRoot -Parent) '.env'
  if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
      if ($line -match "^\s*$name\s*=\s*(.+)\s*$") { return $Matches[1] }
    }
  }
  return $null
}

$url = Get-EnvValue 'SUPABASE_URL'
$key = Get-EnvValue 'SUPABASE_ANON_KEY'

if ([string]::IsNullOrWhiteSpace($url) -or [string]::IsNullOrWhiteSpace($key)) {
  Write-Error "SUPABASE_URL and SUPABASE_ANON_KEY are required (see .env or environment variables)"
  exit 1
}

try {
  $resp = Invoke-WebRequest -UseBasicParsing `
    -Uri "$url/rest/v1/" `
    -Headers @{ apikey = $key } `
    -TimeoutSec 30
  Write-Host "Supabase keep-alive OK (HTTP $($resp.StatusCode)) at $(Get-Date -Format o)"
  exit 0
}
catch {
  $status = $_.Exception.Response.StatusCode.value__
  if ($null -eq $status) {
    Write-Error "Supabase unreachable - project may be paused. $($_.Exception.Message)"
    exit 1
  }
  Write-Host "Supabase reached (HTTP $status) - kept-alive at $(Get-Date -Format o)"
  exit 0
}