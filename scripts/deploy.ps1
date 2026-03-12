$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root
Write-Host "[deploy] project: $root"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "docker not found"
}

try {
  docker compose version | Out-Null
} catch {
  throw "docker compose not found"
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "[info] .env created from .env.example"
}

function Get-EnvValue([string]$key) {
  $line = Get-Content ".env" | Where-Object { $_ -match "^$key=" } | Select-Object -Last 1
  if (-not $line) { return "" }
  return ($line -split "=", 2)[1].Trim()
}

$appId = Get-EnvValue "FEISHU_APP_ID"
$appSecret = Get-EnvValue "FEISHU_APP_SECRET"
$llmKey = Get-EnvValue "LLM_API_KEY"

if ([string]::IsNullOrWhiteSpace($appId) -or $appId.Contains("xxx")) {
  throw "FEISHU_APP_ID is missing or placeholder"
}
if ([string]::IsNullOrWhiteSpace($appSecret) -or $appSecret.Contains("xxx")) {
  throw "FEISHU_APP_SECRET is missing or placeholder"
}
if ([string]::IsNullOrWhiteSpace($llmKey) -or $llmKey.Contains("xxx")) {
  throw "LLM_API_KEY is missing or placeholder"
}

Write-Host "[deploy] docker compose up -d --build"
docker compose up -d --build

Write-Host "[deploy] done"
docker compose ps

$port = Get-EnvValue "PORT"
if ([string]::IsNullOrWhiteSpace($port)) {
  $port = "3000"
}
Write-Host "[deploy] health check: http://localhost:$port/healthz"
