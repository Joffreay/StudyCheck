# Mise en ligne StudyCheck

StudyCheck nécessite **Node.js 22+**, **PostgreSQL** et les variables d'environnement listées dans [`.env.example`](../.env.example).

## Option A — Railway (recommandée)

### 1. Prérequis

- Compte [Railway](https://railway.app)
- Code poussé sur GitHub (`Joffreay/StudyCheck`)

### 2. Créer le projet

1. **New Project** → **Deploy from GitHub repo** → `StudyCheck`
2. **Add service** → **PostgreSQL**
3. Sur le service **app**, lier la variable :
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (reference Railway)

### 3. Variables d'environnement (service app)

| Variable | Valeur |
|----------|--------|
| `DATABASE_URL` | Référence PostgreSQL Railway |
| `SESSION_SECRET` | Chaîne aléatoire longue (32+ caractères) |
| `READER1_EMAIL` | Email lecteur 1 |
| `READER1_PASSWORD` | Mot de passe fort |
| `READER2_EMAIL` | Email lecteur 2 |
| `READER2_PASSWORD` | Mot de passe fort |

Railway utilise le `Dockerfile` et `railway.toml` du dépôt.

### 4. Premier déploiement

Après le premier déploiement réussi, exécutez une fois dans le shell Railway (**app** → **Shell**) :

```bash
npm run db:seed
```

Cela crée le projet, les 2 lecteurs et les motifs d'exclusion.

### 5. Migrer vos données locales (~22 000 refs)

Depuis votre machine (PostgreSQL Docker local, port 5433) :

```powershell
# Export
docker exec studycheck-postgres-1 pg_dump -U studycheck -Fc studycheck > studycheck.dump

# Import vers Railway (URL publique depuis l'onglet Connect du Postgres Railway)
pg_restore --clean --if-exists --no-owner --dbname "postgresql://..." studycheck.dump
```

Installez [pg_dump/pg_restore](https://www.postgresql.org/download/windows/) si nécessaire, ou utilisez TablePlus / DBeaver.

### 6. Domaine public

Railway → service app → **Settings** → **Networking** → **Generate domain** (HTTPS automatique).

---

## Option B — VPS / serveur avec Docker

### 1. Fichier d'environnement

Créez `.env.production` à la racine :

```env
POSTGRES_PASSWORD=mot-de-passe-fort
SESSION_SECRET=secret-long-aleatoire
READER1_PASSWORD=mot-de-passe-fort
READER2_PASSWORD=mot-de-passe-fort
```

### 2. Lancement

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Initialiser la base (première fois) :

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production run --rm app sh -c "cd /app && npm run db:seed"
```

Note : le seed nécessite les devDependencies ; sur VPS, exécutez plutôt `npm run db:seed` depuis une machine locale pointant `DATABASE_URL` vers le serveur.

L'application écoute sur le port **3000**. Placez Caddy ou Nginx devant pour HTTPS.

### 3. Arrêt

```bash
docker compose -f docker-compose.prod.yml down
```

---

## Vérifications post-déploiement

- [ ] Page `/login` accessible en HTTPS
- [ ] Connexion lecteur 1 / lecteur 2
- [ ] Import d'un petit fichier RIS/NBIB
- [ ] Liste des références et scores visibles
- [ ] Mots de passe par défaut (`lecteur1`) **remplacés**

## Commandes utiles en production

Recalcul des scores (shell Railway ou `docker compose exec`) :

```bash
npx tsx scripts/rescore-project.ts
npx tsx scripts/detect-duplicates.ts
```

## Limites connues

- Imports jusqu'à ~50 Mo (config Next.js)
- Rescore / détection doublons sur 22 k refs : 1–2 min, à lancer manuellement
- Ne pas utiliser Vercel Hobby (timeout 60 s insuffisant pour les gros imports)
