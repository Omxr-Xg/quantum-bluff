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

## Architecture

```
VM
├── server/           # Backend API + WebSocket
│   ├── dist/         # Build compilé
│   ├── updates/      # Fichiers .exe + latest.yml pour auto-update
│   └── .env          # Variables d'environnement production
└── PM2               # Process manager
```
