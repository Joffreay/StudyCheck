#!/bin/sh
set -e

echo "Synchronisation du schéma Prisma…"
npx prisma db push --skip-generate

echo "Démarrage de StudyCheck…"
exec node server.js
