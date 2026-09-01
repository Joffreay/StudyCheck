# StudyCheck — plan corrigé (v1 bêta)

## Objectif

Application web de **pré-tri** pour une revue de portée sur l'improvisation théâtrale en formation des professionnels et étudiants en santé. Le score sert uniquement à **prioriser la lecture**. Aucune inclusion ou exclusion automatique.

## Périmètre v1

- Import RIS / NBIB / CSV avec provenance conservée
- Fusion automatique DOI/PMID ; doublons probables par titre soumis à validation humaine
- Moteur lexical transparent (config YAML versionnée), calibré ultérieurement sur l'échantillon réel
- Décisions humaines : `PENDING`, `RETAIN`, `EXCLUDE`, `UNCERTAIN`
- **Calibration à deux lecteurs** (~100 refs) : mode aveugle, accord brut, kappa Cohen, résolution des désaccords
- PRISMA-ScR **recalculé** depuis imports, fusions et décisions historisées

## Critères A / B / C

Définis pour le texte intégral uniquement. Au pré-tri : `NOT_ASSESSED`, jamais dans le score.

| Critère | Définition |
|---------|------------|
| A | Le participant évalué improvise activement |
| B | L'intervention repose sur des techniques d'improvisation théâtrale |
| C | Le point de départ n'est pas une situation clinique prédéfinie |

## Vocabulaire des décisions

| Code | Interface FR | Sens |
|------|--------------|------|
| `PENDING` | À examiner | Pas encore décidée |
| `RETAIN` | Conservée pour la suite | Passe au texte intégral, **pas** une inclusion définitive |
| `EXCLUDE` | Exclue au pré-tri | Exclue à ce stade |
| `UNCERTAIN` | Incertaine | À arbitrer |

## Formule de score (v1)

```
contribution = poids_règle × multiplicateur_champ
score_brut = Σ contributions + bonus_combinaisons
score_final = normalisation documentée(score_brut) → [0, 100]
```

- Une règle ne contribue **qu'une fois par champ**, même si le terme est répété
- **Pertinence** (score) et **complétude** (`infoCompleteness`, alertes) sont séparées
- Absence de résumé → alerte, pas de pénalité de pertinence

## Tags sans effet décisionnel

- `CO_INTERVENTION_POTENTIAL` : simulation, standardized/simulated patient, OSCE, ECOS, role-play
- `RELATED_INTERVENTION_CONTINGENCY` : forum theatre, theatre of the oppressed, Boal, jeu de rôle improvisé, simulation à composante improvisée

## Lexique initial

Reprendre le **paramétrage Rayyan** (`Document Thèse Ilyes (Joffrey) (1)/Paramétrage Rayyan.docx`) :

- **Intervention** : improvisation, improv, applied improvisation, medical improv, Spolin, Johnstone, Second City, yes and, spontaneity…
- **Population** : medical/nursing/pharmacy/dental student, resident, clinician, health professional…
- **Pédagogique** : curriculum, workshop, communication skills, empathy, debriefing…
- **Bruit** : shakespeare, film, music, jazz, operating theatre, drama therapy, psychodrama…

**Exclus comme signaux positifs forts** : applied theatre, drama-based, theatre in education.

## Architecture

- Next.js 15 + TypeScript + Tailwind
- PostgreSQL + Prisma
- Route Handlers pour import, auth, export
- Config scoring : `config/scoring/v0.1.0.yaml` (poids provisoires)
- Auth simple : 2 comptes lecteurs (seed)

## Lots fonctionnels

1. Fondations (en cours) — init, modèle, auth, import, tests parsing
2. Déduplication probable + audit fusions
3. Moteur de scoring + tests unitaires formule
4. Liste virtualisée + filtres
5. Screening + historique décisions
6. Calibration double lecture + kappa + résolution
7. Export PRISMA-ScR calculé

## Documents

- `docs/methodology/` — protocole, paramétrage Rayyan, grille
- `tests/fixtures/` — jeux synthétiques
- Échantillon réel (~100 refs) pour calibration fonctionnelle
