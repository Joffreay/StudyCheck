# StudyCheck

Bêta d'application web de pré-tri bibliographique pour une revue de portée sur l'improvisation théâtrale en santé.

## Démarrage

### Option A — Docker (recommandé)

1. Installez [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) si nécessaire.
2. Exécutez :

```powershell
./scripts/setup.ps1
npm run dev
```

Ou manuellement :

```bash
docker compose up -d
npm install
npm run db:push
npm run db:seed
npm run dev
```

Comptes seed (modifiables via `.env`) :

- `lecteur1@studycheck.local` / `lecteur1`
- `lecteur2@studycheck.local` / `lecteur2`

## Scripts

- `npm run dev` — serveur de développement
- `npm test` — tests Vitest (parseurs)
- `npm run db:push` — synchroniser le schéma Prisma
- `npm run db:seed` — projet par défaut + 2 lecteurs + motifs d'exclusion

## Phase actuelle

Fondations + moteur de scoring v0.1.0 :

- modèle de données PostgreSQL / Prisma
- authentification simple à deux lecteurs
- import RIS / NBIB / CSV avec provenance et scoring post-import
- moteur lexical transparent (`config/scoring/v0.1.0.yaml`, listes Rayyan)
- tests parsing et scoring

Prochaines étapes : liste virtualisée, screening humain, calibration double lecture.

## Documentation

Voir `docs/architecture.md` et les documents méthodologiques dans `Document Thèse Ilyes (Joffrey) (1)/`.
