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
- `npm run dev:clean` — supprime `.next` puis relance le dev (en cas d'erreur 500 / cache corrompu)
- `npm test` — tests Vitest (parseurs, scoring, export PRISMA-ScR)
- `npm run db:push` — synchroniser le schéma Prisma
- `npm run db:seed` — projet par défaut + 2 lecteurs + motifs d'exclusion
- `npx tsx scripts/rescore-project.ts` — recalculer les scores du projet avec la config active
- `npx tsx scripts/detect-duplicates.ts` — détecter les doublons probables par titre

## Phase actuelle

Fondations + moteur de scoring **v0.2.0** (Fiche critères Rayyan du 02/09/2026) :

- modèle de données PostgreSQL / Prisma
- authentification simple à deux lecteurs
- import RIS / NBIB / CSV avec provenance et scoring post-import
- moteur lexical transparent (`config/scoring/v0.2.0.yaml`, listes Rayyan enrichies EN/FR)
- tri par score sur l'ensemble des références filtrées (pas page par page)
- export **PRISMA-ScR** (JSON, CSV, Markdown) + diagramme Sankey sur le tableau de bord
- **doublons probables par titre** — détection automatique, validation et fusion manuelle (`/duplicates`)
- tests parsing, scoring, doublons et export

La config `v0.1.0.yaml` est conservée pour l'historique des scores déjà calculés.

### Recalcul des scores

Après modification de la config YAML :

```bash
npx tsx scripts/rescore-project.ts
```

Ou via le bouton **Recalculer les scores** sur le tableau de bord / page import.

Prochaines étapes : calibration double lecture + kappa, critères A/B/C en texte intégral.

## Mise en ligne

Voir [`docs/deployment.md`](docs/deployment.md) — Railway (recommandé) ou Docker Compose production.

## Documentation

- `docs/architecture.md` — architecture technique et formule de score
- `docs/deployment.md` — mise en ligne (Railway, Docker)
- `docs/methodology/` — protocole et paramétrage Rayyan
