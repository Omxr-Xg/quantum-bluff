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

### Interface (site chargé dans Electron)

L’app de bureau ouvre l’URL publique du jeu (`QB_PUBLIC_URL` / défaut VM). **Chaque déploiement du build Vite sur la VM** est donc pris en compte au prochain chargement (comme dans le navigateur). Aucun nouvel installateur n’est nécessaire pour changer le React / les assets web.

### Installateur Windows / macOS (binaire Electron)

Pour livrer une **nouvelle version de l’app** (Electron, preload, etc.) :

1. Bumper la version et builder le client :
   ```bash
   cd client
   npm run version:patch   # ou version:minor / version:major
   npm run publish:win     # Windows ; pour Mac : electron-builder --mac --publish always
   ```
2. Uploader les artefacts dans `server/updates/` sur la VM : au minimum `latest.yml`, l’`.exe` (ou setup NSIS), et pour Mac `latest-mac.yml` + `.dmg` / zip selon la cible.
3. Les fichiers `latest*.yml` sont générés par electron-builder. L’app vérifie les mises à jour au lancement puis **toutes les 4 h**. Le joueur doit **accepter** le téléchargement puis, une fois prêt, **choisir** de redémarrer (pas d’installation silencieuse).

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

## Production — monitoring, secrets, charge

### Variables sensibles (ne jamais committer)

| Variable | Rôle |
|----------|------|
| `JWT_SECRET` | Signature des tokens (obligatoire en prod, forte entropie) |
| `ADMIN_SECRET_TOKEN` | Header `x-admin-token` pour `GET /api/admin/cheaters` (obligatoire si `NODE_ENV=production`) |
| `DATABASE_URL` | PostgreSQL |
| `REDIS_*` / URL Redis | Si utilisé (sessions, rate limit distribué) |
| `CORS_ORIGIN` | JSON array des origines front autorisées |

### Erreurs côté client

- `client/src/utils/errorReporting.ts` : `console.error` centralisé, hook optionnel `window.__QB_REPORT_ERROR__`.
- Optionnel : `VITE_SENTRY_DSN` + intégration `@sentry/react` (commentaire dans le fichier).

### API bot (`POST /api/bot/action`)

- **Rate limit** dédié sur `/api/bot` (voir `server/src/index.ts`, `botApiLimiter`) — ajuster `max` selon la charge (bots en mode solo peuvent solliciter souvent).
- Surveiller la latence (logs QoS déjà présents dans `bot.routes.ts`).

### Santé & logs

- `pm2 logs quantum-bluff` — erreurs Express / Socket.io.
- Tester périodiquement : `curl -sSf http://IP:3000/` (ou route health si ajoutée).

### Déploiement front statique (Vite)

- Builder avec les bonnes URLs : `VITE_API_URL`, `VITE_SOCKET_URL` pointant vers l’API publique HTTPS si applicable.
