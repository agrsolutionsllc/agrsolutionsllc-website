$ErrorActionPreference = 'Stop'

$serverRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$envFile = Join-Path $serverRoot '.env'

if (-not (Test-Path $envFile)) {
  throw 'Missing .env file in agr-crm-server.'
}

Get-Content $envFile | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $parts = $_ -split '=',2
  [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
}

$backupDir = $env:AGR_BACKUP_DIR
if ([string]::IsNullOrWhiteSpace($backupDir)) {
  throw 'AGR_BACKUP_DIR is not configured in .env.'
}

New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$file = Join-Path $backupDir "AGR-CRM-$stamp.backup"

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  $candidates = @(
    'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\17\bin\pg_dump.exe',
    'C:\Program Files\PostgreSQL\16\bin\pg_dump.exe'
  )
  $pgDumpPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $pgDumpPath) { throw 'pg_dump.exe was not found.' }
} else {
  $pgDumpPath = $pgDump.Source
}

$env:PGPASSWORD = $env:PGPASSWORD
& $pgDumpPath -h $env:PGHOST -p $env:PGPORT -U $env:PGUSER -d $env:PGDATABASE -F c -f $file

if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL backup failed.' }

# Keep 30 newest database backups on the external drive.
Get-ChildItem -Path $backupDir -Filter 'AGR-CRM-*.backup' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -Skip 30 |
  Remove-Item -Force

Write-Host "Backup created: $file"
