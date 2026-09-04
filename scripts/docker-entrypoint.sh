#!/bin/sh
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "ERREUR: DATABASE_URL manquante. Liez Postgres au service StudyCheck."
  exit 1
fi

echo "Synchronisation du schéma Prisma…"
node ./node_modules/prisma/build/index.js db push --skip-generate

export HOSTNAME="${HOSTNAME:-0.0.0.0}"
export PORT="${PORT:-3000}"

echo "Démarrage de StudyCheck sur ${HOSTNAME}:${PORT}…"
exec node server.js
