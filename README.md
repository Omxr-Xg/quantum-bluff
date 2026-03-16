# Quantum Bluff

Plateforme de poker Texas Hold'em en temps réel — multi-joueur, mode bot, et interface analytique augmentée.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Développement](#développement)
- [Tests](#tests)
- [Déploiement](#déploiement)
- [Structure du projet](#structure-du-projet)
- [Contribution](#contribution)
- [Licence](#licence)

---

## Vue d'ensemble

**Quantum Bluff** est une application de poker Texas Hold'em haute fidélité, développée en monorepo, avec :

- **Parties multi-joueur** : salles publiques/privées, invitations amis, WebSocket temps réel
- **Mode bot** : entraînement en solo avec IA configurable
- **Quantum HUD** : probabilités et statistiques en temps réel pour la prise de décision
- **Accessibilité** : mode daltonien, contraste étendu, alertes visuelles
- **Client desktop** : application Electron (Windows, macOS, Linux) avec mises à jour automatiques

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Authentification** | Inscription, connexion, JWT, gestion de profil |
| **Lobby** | Création/rejoindre des salles, mode bot ou serveur |
| **Salles d'attente** | Rôles (hôte, joueur), salles publiques/privées, demandes de rejoindre |
| **Partie** | Texas Hold'em complet (preflop → river → showdown), split pot, timer de tour |
| **Quantum HUD** | Probabilités, odds, feedback visuel pour l’aide à la décision |
| **Amis** | Demandes, listes d’amis, statut en ligne |
| **Historique** | Actions de jeu, résultats, statistiques par joueur |
| **Hidden Bets** | Mode de mises cachées avec révélation à la fin |
| **Tutoriels** | Parcours Lobby + partie pour les nouveaux joueurs |
| **i18n** | Interface en français (extensible) |
| **Client desktop** | Electron avec auto-update (Windows, macOS, Linux) |

---

## Stack technique

### Frontend

- **React 19** + **TypeScript**
- **Vite 7**
- **React Router v7**
- **Tailwind CSS 4**
- **Motion** (Framer Motion)
- **Socket.io-client**
- **Radix UI**, **Lucide React**
- **i18next**
- **Electron** (client bureau)

### Backend

- **Node.js** + **Express**
- **TypeScript** (ESM)
- **Socket.io**
- **Prisma** + **PostgreSQL**
- **Redis** (ioredis)
- **JWT**, **bcryptjs**
- **Zod** (validation)

### Infrastructure

- **Docker** / Docker Compose (PostgreSQL, Redis, backend, frontend, nginx)
- **PM2** pour le déploiement

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    Client       │────▶│     Backend       │────▶│   PostgreSQL    │
│ React / Vite    │◀────│ Node.js / Express │     │   Prisma ORM    │
└────────┬────────┘     └────────┬──────────┘     └─────────────────┘
         │                      │
         │ Socket.io             │ Redis
         │                      │
         ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Logique métier (GameTable)                     │
│  Deck • Evaluator • Texas Hold'em (preflop→river→showdown)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prérequis

- **Node.js** ≥ 18
- **Docker** et **Docker Compose** (base de données)
- **PostgreSQL** 16 (ou via Docker)
- **Redis** (pour les sessions / cache)
- **npm** ou **pnpm**

---

## Installation

1. **Cloner le dépôt**
   ```bash
   git clone <url-du-repo>
   cd quantum-bluff
   ```

2. **Variables d'environnement**
   ```bash
   cp server/.env.example server/.env
   # Éditer server/.env : DATABASE_URL, REDIS_URL, JWT_SECRET
   ```

3. **Base de données**
   ```bash
   npm run dev:db
   cd server && npx prisma migrate deploy
   ```

4. **Dépendances**
   ```bash
   npm run install:all
   ```

---

## Développement

Lancer l’environnement complet :

```bash
npm run dev
```

Cela démarre :

- **PostgreSQL** et **Redis** (Docker)
- **Serveur** (port 3000)
- **Client** (port 5173 par défaut)

Scripts utiles :

| Commande | Description |
|----------|-------------|
| `npm run dev` | Lancer DB, serveur et client |
| `npm run dev:db` | Démarrer PostgreSQL + Redis (Docker) |
| `npm run dev:server` | Backend seul |
| `npm run dev:client` | Frontend seul |

---

## Tests

```bash
# Tous les tests (depuis la racine)
npm run test:coverage

# Tests serveur uniquement
cd server && npm test

# Tests client uniquement
cd client && npm test
```

---

## Déploiement

Le projet est conçu pour un déploiement sur machine virtuelle avec PM2. Voir [DEPLOY.md](./DEPLOY.md) pour :

- Configuration `.env` production
- Script `server/deploy.sh`
- Gestion des mises à jour du client Electron
- Vérification des services

---

## Structure du projet

```
quantum-bluff/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/      # Composants réutilisables, UI
│   │   ├── contexts/        # Accessibilité, Socket, Auth, Toast
│   │   ├── hooks/
│   │   ├── i18n/
│   │   ├── pages/           # Lobby, Game, Friends, Profile, etc.
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.tsx
│   ├── electron.cjs
│   └── package.json
│
├── server/                  # Backend Node.js
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── logic/           # Deck, Evaluator, GameTable
│   │   ├── middleware/
│   │   ├── routes/          # auth, friends, game, waitingRoom, bot
│   │   ├── sockets/         # game.gateway.ts
│   │   ├── services/
│   │   └── validation/
│   └── package.json
│
├── database/                # Docker Compose PostgreSQL + Redis
├── nginx/                   # Configuration reverse proxy
├── scripts/
├── Docs/
├── CONTRIBUTING.md
├── DEPLOY.md
└── README.md
```

---

## Contribution

Les contributions sont bienvenues. Voir [CONTRIBUTING.md](./CONTRIBUTING.md) pour :

- Workflow Git (branches `main`, `develop`, `feature/*`)
- Standards de code (TypeScript, structure des dossiers)
- Processus de Merge Request

---

## Licence

MIT — voir le fichier [LICENSE](./LICENSE) pour les détails.
