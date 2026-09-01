# Script de démarrage StudyCheck (Option A — Docker)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Find-Docker {
  $candidates = @(
    "docker",
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe",
    "$env:LOCALAPPDATA\Programs\Docker\Docker\resources\bin\docker.exe"
  )
  foreach ($candidate in $candidates) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
      return $candidate
    }
    if (Test-Path $candidate) {
      return $candidate
    }
  }
  return $null
}

$docker = Find-Docker
if (-not $docker) {
  Write-Host "Docker introuvable." -ForegroundColor Red
  Write-Host "Installez Docker Desktop : https://docs.docker.com/desktop/setup/install/windows-install/"
  Write-Host "Puis relancez : ./scripts/setup.ps1"
  exit 1
}

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Fichier .env créé."
}

Write-Host "Démarrage PostgreSQL (port 5433, pour éviter conflit avec un PostgreSQL local sur 5432)..."
& $docker compose up -d

Write-Host "Installation des dépendances npm..."
npm install

Write-Host "Synchronisation Prisma..."
npm run db:push

Write-Host "Seed (projet + 2 lecteurs + motifs d'exclusion)..."
npm run db:seed

Write-Host "Lancement des tests..."
npm test

Write-Host ""
Write-Host "Prêt. Lancez l'application avec :" -ForegroundColor Green
Write-Host "  npm run dev"
