# StudyCheck — plan corrigé (v1 bêta)

## Objectif

Application web de **pré-tri** pour une revue de portée sur l'improvisation théâtrale en formation des professionnels et étudiants en santé. Le score sert uniquement à **prioriser la lecture**. Aucune inclusion ou exclusion automatique, sauf la langue hors français/anglais.

## Périmètre v1

- Import RIS / NBIB / CSV avec provenance conservée
- Fusion automatique DOI/PMID ; **doublons probables par titre** (titre normalisé exact) via page Doublons — fusion manuelle ou ignore
- Moteur lexical transparent (config YAML versionnée), calibré ultérieurement sur l'échantillon réel
- Décisions humaines : `PENDING`, `RETAIN`, `EXCLUDE`, `UNCERTAIN`
- **Calibration à deux lecteurs** (~100 refs) : mode aveugle, accord brut, kappa Cohen, résolution des désaccords
- PRISMA-ScR **recalculé** depuis imports, fusions et décisions historisées (export JSON / CSV / Markdown + Sankey)

## Critères A / B / C

Définis pour le texte intégral uniquement. Au pré-tri : `NOT_ASSESSED`, jamais dans le score.

| Critère | Définition | Signal au pré-tri |
|---------|------------|-------------------|
| A | Le participant évalué improvise activement | Population (titre/résumé + TI) |
| B | L'intervention repose sur des techniques d'improvisation théâtrale | Intervention (titre/résumé + TI) |
| C | Le point de départ n'est pas une situation clinique prédéfinie | Contexte pédagogique (TI surtout) |
| S | Type de document pertinent | `publicationType` + titres (pénalisation phase 3) |
| P | Population soignante / étudiante en santé | Population |

Phase 3 permissive (Carte du tri v3) : « peut-on exclure avec certitude ? » — le doute conserve la référence.

## Vocabulaire des décisions

| Code | Interface FR | Sens |
|------|--------------|------|
| `PENDING` | À examiner | Pas encore décidée |
| `RETAIN` | Conservée pour la suite | Passe au texte intégral, **pas** une inclusion définitive |
| `EXCLUDE` | Exclue au pré-tri | Exclue à ce stade |
| `UNCERTAIN` | Incertaine | À arbitrer |

## Formule de score

```
contribution = poids_règle × multiplicateur_champ
score_brut = Σ contributions + bonus_combinaisons
score_final = normalisation documentée(score_brut) → [0, 100]
```

Champs et multiplicateurs (v0.2.0) :

| Champ | Multiplicateur |
|-------|----------------|
| `title` | ×3 |
| `mesh` | ×2,5 |
| `keywords` | ×2 |
| `publicationType` | ×2 |
| `abstract` | ×1,5 |

Plafonds de sous-scores : intervention +40, population +30, pédagogique +20, bruit −30.

- Une règle ne contribue **qu'une fois par champ**, même si le terme est répété
- **Pertinence** (score) et **complétude** (`infoCompleteness`, alertes) sont séparées
- Absence de résumé → alerte `NO_ABSTRACT`, pas de pénalité de pertinence

## Config scoring v0.2.0

Fichier : `config/scoring/v0.2.0.yaml`  
Référence : Fiche critères et paramétrage Rayyan v1 (02/09/2026).

Principales évolutions par rapport à v0.1.0 :

- Termes FR d'improvisation théâtrale (`INT_IMPROVISATION_FR`, `INT_IMPROV_THEATRE`)
- Population EN/FR élargie (professions, contextes formation, `POP_EDUCATION_CONTEXT`)
- Types de document pénalisés au pré-tri : `DOC_EDITORIAL`, `DOC_REVIEW`, `DOC_CONFERENCE`, `DOC_PROTOCOL`, `DOC_RETRACTED`
- Bruit thématique : `NOISE_NON_THEATRICAL`, `NOISE_PSYCH_STUDENT`, termes FR musicaux/dansés
- Champ searchable `publicationType` pour le critère S

Version par défaut : `DEFAULT_SCORING_CONFIG_VERSION` dans `src/lib/scoring/config.ts`.

## Tags sans effet décisionnel

- `CO_INTERVENTION_POTENTIAL` : simulation, standardized/simulated patient, patient standardisé/simulé, OSCE, ECOS, role-play
- `RELATED_INTERVENTION_CONTINGENCY` : forum theatre, théâtre-forum, theatre of the oppressed, théâtre de l'opprimé, Boal, dramatherapy, psychodrama…

**Non tagués automatiquement** (ambiguïté Rayyan) : `jeu de rôle` seul.

## Export PRISMA-ScR

- Service : `src/lib/export/prisma-scr.ts` — `computePrismaScrFlow()`
- API : `GET /api/export/prisma-scr?projectId=&format=json|csv|markdown`
- UI : panneau tableau de bord avec diagramme Sankey (`d3-sankey`)
- Flux : identification → déduplication → screening par lecteur + consensus → éligibilité (double RETAIN) → inclusion

## Doublons par titre

- Détection : `titleNormalized` identique (≥ 15 caractères), hors refs déjà fusionnées (`mergedIntoId`)
- Automatique à l'import + bouton « Analyser les titres » (`/duplicates`)
- Actions : fusionner (référence la plus complète par défaut) ou ignorer le groupe
- API : `GET/POST /api/duplicates`, `POST /api/duplicates/[id]`
- Script : `npx tsx scripts/detect-duplicates.ts`

## Architecture

- Next.js 15 + TypeScript + Tailwind
- PostgreSQL + Prisma
- Route Handlers pour import, auth, export, rescore
- Config scoring : `config/scoring/v0.2.0.yaml`
- Auth simple : 2 comptes lecteurs (seed)

## Lots fonctionnels

1. ~~Fondations~~ — init, modèle, auth, import, tests parsing
2. ~~Déduplication probable + audit fusions~~ — détection titre normalisé, fusion/dismiss manuels
3. ~~Moteur de scoring v0.2.0~~ + tests unitaires
4. ~~Liste + filtres + tri global par score~~
5. ~~Screening + historique décisions~~
6. Calibration double lecture + kappa + résolution
7. ~~Export PRISMA-ScR calculé~~

## Documents

- `docs/methodology/` — protocole, paramétrage Rayyan, grille
- `tests/fixtures/` — jeux synthétiques
- PDF du 02/09/2026 : Carte du tri v3, Fiche critères Rayyan, Annexe équations complètes
- Échantillon réel (~100 refs) pour calibration fonctionnelle
