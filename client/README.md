# Quantum Bluff — client

Application **React + Vite** (web, **Electron**, **Capacitor**). La documentation du monorepo est à la racine du dépôt.

→ **[README principal](../README.md)**

## Commandes utiles (`client/`)

| Script | Description |
|--------|-------------|
| `npm run dev` | Serveur Vite (port **5175**) |
| `npm run build` | Build web production |
| `npm run build:cap` | Build pour Capacitor |
| `npm run cap:sync` | Web build + `cap sync` |
| `npm run electron:dev` | Dev Electron + Vite |
| `npm run package:android-rendu` | APK → `../Game_Versions/` |
| `npm run package:ios-rendu` | Archive iOS → `../Game_Versions/` |

Configuration mobile : copier **`.env.capacitor.example`** vers **`.env.capacitor`** (non versionné).
