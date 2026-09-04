# Exporte la base PostgreSQL locale StudyCheck (Docker port 5433).
param(
  [string]$OutputPath = "studycheck.dump"
)

$ErrorActionPreference = "Stop"

Write-Host "Export vers $OutputPath …"
docker exec studycheck-postgres-1 pg_dump -U studycheck -Fc studycheck > $OutputPath
Write-Host "Terminé. Taille : $((Get-Item $OutputPath).Length / 1MB) Mo"
