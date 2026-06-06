# Quantum Bluff
   **Not final**
Plateforme de jeu en ligne — **poker Texas Hold’em** temps réel, **blackjack** (solo et multijoueur), **mini-jeux** (casino), **tournois**, avec client **web**, **Electron** (Windows, macOS, Linux) et apps **mobiles** (Capacitor : iOS / Android).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Table des matières

1. [Vue d’ensemble](#vue-densemble)
2. [Fonctionnalités](#fonctionnalités)
3. [Stack technique](#stack-technique)
4. [Architecture](#architecture)
5. [Arborescence du dépôt](#arborescence-du-dépôt)
6. [Prérequis](#prérequis)
7. [Installation rapide](#installation-rapide)
8. [Variables d’environnement](#variables-denvironnement)
9. [Console administrateur (web)](#console-administrateur-web)
10. [Développement](#développement)
11. [Client Electron (bureau)](#client-electron-bureau)
12. [Applications mobiles (Capacitor)](#applications-mobiles-capacitor)
13. [Livrables installables (`Game_Versions/`)](#livrables-installables-game_versions)
14. [Tests](#tests)
15. [Lint](#lint)
16. [Déploiement](#déploiement)
17. [Documentation](#documentation)
18. [Contribution](#contribution)
19. [Licence](#licence)

> **Guide testeur pas à pas** : [Docs/SETUP_TESTEUR.md](./Docs/SETUP_TESTEUR.md)

---

## Vue d’ensemble

**Quantum Bluff** est un monorepo **TypeScript** :

| Domaine | Contenu |
|--------|---------|
| **Poker** | Salles, attente, Texas Hold’em (preflop → showdown), bots, Quantum HUD, mises cachées |
| **Blackjack** | Table solo, lobby / tables multijoueur |
| **Casino** | Mini-jeux intégrés au hub |
| **Social** | Comptes, amis, invitations, prêts entre joueurs (selon routes) |
| **Tournois** | Lobby et flux tournoi côté client + backend |
| **Clients** | Navigateur (PWA), **Electron**, **iOS** et **Android** (Capacitor) |

Temps réel via **Socket.IO** ; persistance via **PostgreSQL** (Prisma) et **Redis** selon les fonctionnalités.

---

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Auth** | Inscription, connexion JWT, profil, récupération de compte |
| **Lobby & salles** | Création / rejoindre, public / privé, file d’attente |
| **Poker** | Moteur de table, timers, split pot, historique |
| **Quantum HUD** | Indicateurs et probabilités pour l’aide à la décision |
| **Blackjack** | Mode classique et multijoueur avec synchronisation |
| **Mini-jeux** | Hub casino (roulette, slots, etc. selon pages) |
| **Amis & social** | Demandes, messages, présence |
| **Tournois** | Parcours tournoi (UI + événements socket) |
| **Console admin (web)** | Comptes, parties poker en direct, salles blackjack, historique, avis ; filtres et fermeture de tables (voir [section dédiée](#console-administrateur-web)) |
| **Accessibilité** | Thèmes, contraste, options d’affichage |
| **i18n** | FR, EN, ES, AR, UK (détection + changement de langue) |
| **Bureau** | Electron avec mises à jour (Windows / macOS / Linux) |
| **Mobile** | Capacitor (même base web embarquée) |

---

## Stack technique

### Frontend (`client/`)

- **React 19** · **TypeScript** · **Vite 7**
- **React Router 7** (`react-router-dom`)
- **Tailwind CSS** 3 + plugin Vite Tailwind 4
- **Motion** (animations)
- **Redux Toolkit** + RTK Query
- **Socket.IO client**
- **i18next**
- **Electron** + **electron-builder**
- **Capacitor** 8 (Android / iOS)
- **Vitest** · **Playwright** (e2e)

### Backend (`server/`)

- **Node.js** · **Express** · **TypeScript** (ESM)
- **Socket.IO**
- **Prisma** + **PostgreSQL**
- **Redis** (ioredis)
- **JWT** · **bcrypt**
- **Zod** · **Jest**

### Infrastructure

- **Docker Compose** (`database/`) — PostgreSQL 16 + Redis
- **Vercel** — client web (`quantum-bluff.com`)
- **Render** — API (`api.quantum-bluff.com`)

---

## Architecture

```
┌──────────────┐     HTTP / WS      ┌─────────────────┐     ┌──────────────┐
│   Client     │ ◄──────────────► │    API Express   │ ◄─► │  PostgreSQL  │
│ React / Vite │                    │   + Socket.IO    │     │   (Prisma)   │
└──────────────┘                    └────────┬──────────┘     └──────────────┘
       │                                    │
       │                                    ▼
       │                           ┌──────────────┐
       └──────────────────────────►│    Redis     │
                                   └──────────────┘
```

- **API REST** sous `/api` (auth, jeux, amis, etc.)
- **WebSocket** Socket.IO (`/socket.io` ou préfixe derrière reverse proxy)
- **Logique métier** : tables poker, blackjack, tournois, etc. dans `server/src/`

---

## Arborescence du dépôt

```
quantum-bluff/
├── client/                    # Frontend + Electron + Capacitor
│   ├── android/               # Projet Gradle (généré / sync Capacitor)
│   ├── ios/                   # Projet Xcode (Capacitor)
│   ├── src/                   # App React (pages, composants, contexts…)
│   ├── electron.cjs           # Point d’entrée Electron
│   ├── vite.config.ts
│   └── package.json
├── server/                    # Backend
│   ├── prisma/                # Schéma + migrations
│   ├── src/
│   │   ├── routes/
│   │   ├── sockets/
│   │   ├── logic/             # Moteurs de jeu
│   │   └── …
│   └── package.json
├── database/                  # docker-compose.yml (Postgres + Redis)
├── nginx/                     # Exemples de config reverse proxy
├── scripts/                   # Scripts utilitaires (packaging mobile, etc.)
├── Game_Versions/             # Livrables binaires (installateurs) — voir section dédiée
├── Docs/                      # Guides (déploiement, tests, testeurs…)
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

---

## Prérequis

| Outil | Version / note |
|-------|----------------|
| **Node.js** | ≥ 18 |
| **npm** | (fourni avec Node) |
| **Docker Desktop** | Recommandé pour Postgres + Redis en local |
| **Android** (APK) | Android Studio + SDK (script d’empaquetage optionnel) |
| **iOS** (archive) | Xcode (macOS), compte Apple pour signature / IPA |

---

## Installation rapide

```bash
git clone <url-du-dépôt>
cd quantum-bluff

# 1. Environnement serveur
cp server/.env.example server/.env
# Éditer server/.env — avec Docker du repo, utiliser le port Postgres **hôte** 5433 :
# DATABASE_URL="postgresql://admin:My027@localhost:5433/quantum_bluff?schema=public"
# (aligner user/mot de passe avec database/docker-compose.yml)

# 2. Base de données
cd database && docker-compose up -d && cd ..

# 3. Migrations
cd server && npx prisma migrate deploy && cd ..

# 4. Dépendances
npm run install:all

# 5. Lancer tout (DB déjà up)
npm run dev
```

Ouvrir le client : **http://localhost:5175** (port défini dans `client/vite.config.ts`).  
API + Socket.IO : **http://localhost:3000**.

---

## Variables d’environnement

### Backend — `server/.env`

| Variable | Rôle |
|----------|------|
| `DATABASE_URL` | Connexion PostgreSQL |
| `JWT_SECRET` | Signature des tokens (≥ 32 caractères) |
| `REDIS_HOST` / `REDIS_PORT` ou `REDIS_URL` | Redis |
| `PORT` | Port HTTP (défaut `3000`) |
| `NODE_ENV` | `development` / `production` |
| `CORS_ORIGIN` | En prod : origines autorisées (JSON ou liste). Le serveur ajoute aussi `capacitor://localhost` pour les apps natives. |
| `ADMIN_CONSOLE_USERNAME` + `ADMIN_CONSOLE_PASSWORD_HASH` | Console administrateur web (optionnel) : identifiant + **hash bcrypt** du mot de passe — [détails](#console-administrateur-web) |

Voir **`server/.env.example`**.

### Frontend web — build production

- **`client/.env.production`** : `VITE_API_URL=https://api.quantum-bluff.com` (build Vercel / Capacitor).

### Mobile — `client/.env.capacitor` (à créer, non versionné)

Copier **`client/.env.capacitor.example`**. Sur **iOS / Android**, l’origine n’est pas le site HTTPS : il faut une **URL absolue** ou `VITE_DEPLOY_ORIGIN` + chemin relatif — voir commentaires dans l’exemple.

| Variable | Rôle |
|----------|------|
| `VITE_BASE_PATH` | Souvent `/` pour Capacitor |
| `VITE_API_URL` | URL du backend (HTTPS ou IP selon cas) |
| `VITE_SOCKET_URL` / `VITE_SOCKET_PATH` | Socket.IO si différent du défaut |

---

## Console administrateur (web)

Interface d’**exploitation** distincte du compte joueur : pas d’utilisateur admin en base ; les identifiants sont dans **`server/.env`**.

### Accès client

| URL | Rôle |
|-----|------|
| **`/auth/admin`** | Formulaire de connexion (nom d’utilisateur + mot de passe) |
| **`/admin/console`** | Tableau de bord (protégé par jeton « rôle admin ») |

Ne pas utiliser la page **`/auth`** (joueurs) pour l’admin : celle-ci demande un **e-mail**. Un lien « Console admin » peut être proposé depuis l’écran d’auth.

Sur les routes admin, la **musique de fond** du client est coupée automatiquement.

### Configuration serveur (`server/.env`)

| Variable | Obligatoire | Description |
|----------|-------------|-------------|
| `ADMIN_CONSOLE_USERNAME` | Oui* | Nom d’utilisateur attendu à la connexion |
| `ADMIN_CONSOLE_PASSWORD_HASH` | Oui* | Mot de passe **déjà hashé** avec bcrypt (jamais en clair) |
| `ADMIN_CONSOLE_JWT_USER_ID` | Non | UUID utilisé dans le payload JWT (défaut documenté dans `.env.example`) |

\* Les **deux** premières doivent être renseignées ensemble ; sinon la route `POST /api/auth/admin/login` répond **503** (« console non configurée »).

Générer un hash (exemple, depuis le dossier `server/` où `bcryptjs` est disponible) :

```bash
cd server && node -e "require('bcryptjs').hash('VotreMotDePasse', 10).then(console.log)"
```

Copier la chaîne `$2a$10$…` dans `ADMIN_CONSOLE_PASSWORD_HASH`, redémarrer l’API.

### Authentification et API

- Connexion : **`POST /api/auth/admin/login`** → JWT avec `role: 'admin'` (et `userId` fixe).
- Ce jeton **ne** doit **pas** être utilisé sur les routes joueur classiques (`authMiddleware` le refuse).
- Routes console : préfixe **`/api/admin/console`** (middleware `adminConsoleAuthMiddleware`), par ex. :
  - **GET** `/users`, `/games/history`, `/games/active-poker`, `/games/blackjack-rooms`, `/ratings` — pagination `take` / `skip`, filtre optionnel **`q`** (recherche).
  - **PATCH** `/users/:id` — suspendre / bannir / réactiver (sauf l’UUID admin technique).
  - **DELETE** `/games/active-poker/:gameId` — fermer une table poker en mémoire / Redis (les clients reçoivent `GAME_ENDED`).
  - **DELETE** `/games/blackjack-rooms/:roomId` — supprimer une salle blackjack (runtime + BDD).

En **production**, d’autres routes sous `/api/admin/*` (métriques, overrides dev, etc.) peuvent être **désactivées** — voir `server/src/index.ts`. La console web reste montée si les variables `ADMIN_CONSOLE_*` sont présentes.

### Fonctions de l’interface (`client/src/pages/AdminConsole.tsx`)

- Onglets : **Poker (direct)** — tables actives, phase, pot, **participants** (pseudo, jetons, présence) ; **Blackjack** — salles, hôte, statut, sièges ; **Comptes** ; **Historique poker (BDD)** ; **Avis**.
- **Recherche / filtre** (champ avec debounce) + **pagination** sur les listes paginées côté API.
- Actions : **fermer** une partie poker ou **supprimer** une salle blackjack (avec confirmation) ; modération des comptes (suspendre / bannir / réactiver).

---

## Développement

| Commande (racine) | Description |
|-------------------|-------------|
| `npm run dev` | Docker DB + serveur `:3000` + client Vite `:5175` |
| `npm run dev:db` | Démarre uniquement Postgres + Redis (Docker) |
| `npm run dev:server` | Backend seul |
| `npm run dev:client` | Frontend seul |
| `npm run install:all` | `npm install` à la racine, `server/`, `client/` |

| Commande (`client/`) | Description |
|---------------------|-------------|
| `npm run dev` | Vite (port **5175**) |
| `npm run build` | Build web prod (base `/`, API Render) |
| `npm run build:cap` | Build mode `capacitor` |
| `npm run cap:sync` | `build:cap` + `cap sync` (Android + iOS) |
| `npm run electron:dev` | Vite + fenêtre Electron |

---

## Client Electron (bureau)

- **Développement** : `cd client && npm run electron:dev` (attend `http://localhost:5175`).
- **Build installateurs** : `cd client && npm run electron:build` (ou `:win`, `:mac`, `:linux`).
- **URL de prod Electron** : configurable via `QB_PUBLIC_URL` (défaut `https://api.quantum-bluff.com`).

Sortie typique : `client/dist-electron/` (souvent ignoré par Git — volumineux).

---

## Applications mobiles (Capacitor)

1. Configurer **`client/.env.capacitor`** (URL API / Socket complètes ou `VITE_DEPLOY_ORIGIN`).
2. Sync web → natif :
   ```bash
   cd client && npm run build:cap && npx cap sync
   ```
3. Ouvrir les projets natifs :
   - **Android** : `npm run cap:android` ou Android Studio → dossier `client/android`
   - **iOS** (Mac) : `npm run cap:ios` ou Xcode → `client/ios/App/App.xcodeproj`

### Scripts de packaging (racine ou `client/`)

| Commande | Résultat |
|----------|----------|
| `npm run package:android-rendu` | Build Capacitor + APK release (signé clé debug démo) → `Game_Versions/Quantum-Bluff-Android-<version>.apk` |
| `npm run package:ios-rendu` | Build Capacitor + archive Xcode → `Game_Versions/Quantum-Bluff-iOS-<version>.xcarchive.zip` |

Prérequis machine : **JDK** + **Android SDK** pour Android ; **Xcode** pour iOS. Le script Android configure `JAVA_HOME` (JBR Android Studio) et `local.properties` si besoin.

---

## Livrables installables (`Game_Versions/`)

Dossier prévu pour **uniquement** les binaires / archives **installables** (`.exe`, `.dmg`, `.apk`, `.zip` d’archive iOS, etc.).  
Les fichiers `.txt` / `.md` y sont ignorés par Git (voir `.gitignore`) pour éviter les guides mélangés aux livrables.

---

## Tests

| Portée | Commande |
|--------|----------|
| **Racine** (serveur + client) | `npm run test:coverage` |
| **Serveur uniquement** | `cd server && npm test` ou `npm run test:coverage` |
| **Client uniquement** | `cd client && npm test` ou `npm run test:coverage` |
| **E2E (Playwright)** | `cd client && npm run test:e2e` (serveur / client doivent être disponibles selon config) |

Références : [Docs/RAPPORT_TESTS.md](./Docs/RAPPORT_TESTS.md), [Docs/POKER_SCENARIOS.md](./Docs/POKER_SCENARIOS.md).

---

## Lint

```bash
cd server && npm run lint
cd ../client && npm run lint
```

---

## Déploiement

Guide Docker local : **[Docs/DEPLOY.md](./Docs/DEPLOY.md)**. Prod : Vercel + Render.

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| [Docs/SETUP_TESTEUR.md](./Docs/SETUP_TESTEUR.md) | Installation locale pour testeurs |
| [Docs/DEPLOY.md](./Docs/DEPLOY.md) | Docker local / Electron updates |
| [Docs/RAPPORT_TESTS.md](./Docs/RAPPORT_TESTS.md) | Inventaire tests |
| [Docs/POKER_SCENARIOS.md](./Docs/POKER_SCENARIOS.md) | Scénarios poker |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Workflow Git & MR |

---

## Contribution

Voir **[CONTRIBUTING.md](./CONTRIBUTING.md)** (branches, conventions, merge requests).

---

## Licence

**MIT** — voir [LICENSE](./LICENSE).
