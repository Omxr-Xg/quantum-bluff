# Checklist ops — production & staging

Actions manuelles sur les plateformes après merge du code (Sentry, backups, E2E CI, RGPD, audit admin).

---

## 1. Sentry (prod + staging)

### Sentry.io

1. Créer **2 projets** : `quantum-bluff-web` (React) et `quantum-bluff-api` (Node), ou un projet par environnement.
2. Copier les **DSN** dans les dashboards ci-dessous.
3. Configurer des **alertes** (erreurs non gérées, spike 5xx) → email ou Slack.

### Render (API Node)

| Variable | Production | Staging |
|----------|------------|---------|
| `SENTRY_DSN` | DSN projet API prod | DSN API staging |
| `SENTRY_ENVIRONMENT` | `production` | `staging` |
| `SENTRY_RELEASE` | `$RENDER_GIT_COMMIT` | idem |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.1` | `0.2` |
| `NODE_ENV` | `production` | `staging` |
| `DIRECT_URL` | URL Supabase **port 5432** (migrations) | projet staging séparé |

Redéployer après ajout des variables.

### Vercel (client web)

| Variable | Production | Preview / staging |
|----------|------------|-------------------|
| `VITE_SENTRY_DSN` | DSN projet web prod | DSN web staging |
| `VITE_SENTRY_ENVIRONMENT` | `production` | `staging` |
| `VITE_SENTRY_RELEASE` | `$VERCEL_GIT_COMMIT_SHA` | idem |
| `VITE_API_URL` | URL Render prod | URL Render staging |
| `VITE_SOCKET_URL` | idem (wss si HTTPS) | idem |
| `VITE_ICE_SERVERS` | JSON TURN Metered (voir § Metered) | optionnel en staging |

Build staging : branche dédiée ou preview avec `--mode staging` et `client/.env.staging`.

---

## 2. Backups PostgreSQL + drill restore

### Supabase

- Activer **Backups** managés (plan Pro si requis).
- Conserver un **projet staging séparé** — ne jamais pointer staging sur la prod.

### Cron backup manuel (`scripts/backup-prod.sh`)

Sur une machine de confiance (VM, GitHub Actions scheduled, ou Render Cron Job si disponible) :

```bash
# Exemple crontab — 03:00 UTC chaque jour
0 3 * * * DATABASE_URL='postgresql://...@db....supabase.co:5432/postgres' /path/to/quantum-bluff/scripts/backup-prod.sh >> /var/log/qb-backup.log 2>&1
```

- Utiliser `DATABASE_URL` en **connexion directe port 5432** (pas le pooler 6543).
- `BACKUP_DIR` et `RETENTION_DAYS` optionnels (défaut 30 jours).

### Drill restore (sans toucher la prod)

```bash
./scripts/backup-prod.sh                    # après export DATABASE_URL
./scripts/restore-test.sh backups/prod/quantum_bluff_*.sql.gz
```

Restore réel (destructif) :

```bash
CONFIRM=RESTORE DATABASE_URL='...' ./scripts/restore.sh backups/prod/fichier.sql.gz
```

**Render** : pas de cron natif sur tous les plans — prévoir GitHub Actions `schedule` ou cron système externe avec secret `DATABASE_URL`.

---

## 3. E2E Playwright + GitLab CI

Le job `frontend:e2e` dans `.gitlab-ci.yml` :

- Postgres service + migrations
- Seed utilisateur `E2E_EMAIL` / `E2E_PASSWORD`
- API + Vite + Playwright (auth, lobby, salle, daily reward)

Variables CI optionnelles (défauts dans le script) :

- `E2E_EMAIL` / `E2E_PASSWORD`
- `PLAYWRIGHT_BASE_URL` / `PLAYWRIGHT_API_URL`

Local :

```bash
# Terminal 1 — API + DB
cd server && npm run dev

# Terminal 2 — seed + client + tests
cd server && npx tsx scripts/seedE2eUser.ts
cd client && E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e
```

---

## 4. RGPD export + audit admin (code déployé)

### Joueur

- `GET /api/auth/export` (JWT) — export JSON
- UI : Paramètres → Compte → **Exporter mes données**

### Admin

- Journal : table `admin_audit_logs` (migration Prisma)
- API : `GET /api/admin/console/audit-logs?take=50`
- Actions journalisées : suppression compte, salle, code cadeau, broadcast

Aucune config plateforme supplémentaire — migration via `prisma migrate deploy` sur Render au deploy.

---

## 5. Upstash (Redis)

| Cas | Action |
|-----|--------|
| **1 instance Render** | `INSTANCE_COUNT=1`, `SOCKET_IO_REDIS_ADAPTER` **non** défini ou `false` — économise le quota |
| **Multi-instance** | Instance Upstash dédiée, `REDIS_URL`, `SOCKET_IO_REDIS_ADAPTER=true` |
| **Staging** | Instance Redis **séparée** de la prod |
| **Monitoring** | Alerte dashboard Upstash à ~70 % du quota mensuel |

Le vocal WebRTC n’utilise pas Redis — seul Socket.IO multi-pods en a besoin.

---

## 6. Metered.ca (TURN / WebRTC)

Pour les **appels vocaux** entre réseaux différents (box ↔ 4G) :

1. Compte [Metered](https://www.metered.ca/) — créer une app TURN.
2. Construire le JSON `iceServers` (STUN + TURN avec credentials).
3. Sur **Vercel** uniquement : `VITE_ICE_SERVERS` = JSON stringifié (voir `client/src/features/voice/shared/iceConfig.ts`).
4. **Redéployer** Vercel après modification.

Sans TURN : STUN seul — OK en LAN, souvent KO en mobile/NAT strict.

**Render / Supabase** : rien à configurer pour Metered.

---

## 7. Render — migration bloquée (rappel)

Si deploy échoue sur une migration déjà partiellement appliquée :

```bash
cd server && npx prisma migrate resolve --rolled-back <nom_migration>
```

Puis redeploy.

---

## Récap « quoi faire où »

| Plateforme | À faire |
|------------|---------|
| **Sentry** | Créer projets + DSN |
| **Render** | `SENTRY_*`, `DIRECT_URL`, `NODE_ENV`, cron backup externe ou GH Actions |
| **Vercel** | `VITE_SENTRY_*`, `VITE_API_URL`, `VITE_SOCKET_URL`, `VITE_ICE_SERVERS` |
| **Supabase** | Backups activés, staging séparé, `DIRECT_URL` 5432 pour migrations/dump |
| **Upstash** | Instance staging séparée ; adapter Redis adapter si scaling |
| **Metered** | TURN dans `VITE_ICE_SERVERS` sur Vercel |
| **GitLab** | Rien — job E2E dans le pipeline `develop` / `main` |
