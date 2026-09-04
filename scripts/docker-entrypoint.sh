#!/bin/sh
set -e

echo "Synchronisation du schéma Prisma…"
node ./node_modules/prisma/build/index.js db push --skip-generate

echo "Démarrage de StudyCheck…"
exec node server.js
