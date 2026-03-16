# Déploiement sur VM

## Prérequis VM
- Node.js >= 18
- PostgreSQL
- Redis
- PM2 (`npm install -g pm2`)

## Backend

1. Copier le code sur la VM
2. Configurer les variables d'environnement :
   ```bash
   cp server/.env.production server/.env
   # Éditer server/.env avec les bonnes valeurs (DB, Redis, JWT_SECRET)
   ```
3. Lancer le déploiement :
   ```bash
   cd server && ./deploy.sh
   ```

## Mises à jour client

1. Bumper la version et builder le client :
   ```bash
   cd client
   npm run version:patch   # ou version:minor / version:major
   npm run publish:win
   ```
2. Uploader le `.exe` et `latest.yml` dans `server/updates/` sur la VM
3. Le fichier `latest.yml` est généré automatiquement par electron-builder

## Vérification

- Backend : `curl http://IP_VM:3000/`
- Mises à jour : `curl http://IP_VM:3000/updates/latest`
- Logs PM2 : `pm2 logs quantum-bluff`

## Déploiement Docker (alternative)

Si vous utilisez `docker-compose.prod.yml` :

```bash
docker-compose -f docker-compose.prod.yml up -d
```

Le backend exécute automatiquement `prisma migrate deploy` au démarrage (via `docker-entrypoint.sh`).

## Dépannage VM

| Problème | Solution |
|----------|----------|
| **Erreur 500 à l'inscription** / « The table public.User does not exist » | Les migrations n'ont pas été exécutées. Lancer : `cd server && npx prisma migrate deploy` puis redémarrer le serveur (PM2 ou Docker). |
| **PostgreSQL inaccessible** | Vérifier que PostgreSQL tourne et que `DATABASE_URL` dans `.env` pointe vers le bon hôte (ex. `localhost` si PostgreSQL est sur la VM, ou le nom du service si Docker). |
| **Première mise en place** | S'assurer que PostgreSQL + Redis sont lancés **avant** le backend, puis exécuter `prisma migrate deploy` une fois. |

## Architecture

```
VM
├── server/           # Backend API + WebSocket
│   ├── dist/         # Build compilé
│   ├── updates/      # Fichiers .exe + latest.yml pour auto-update
│   └── .env          # Variables d'environnement production
└── PM2               # Process manager
```
