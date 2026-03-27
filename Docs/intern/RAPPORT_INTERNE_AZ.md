# Quantum Bluff - Rapport Interne Complet (A a Z)

> Usage strictement interne.  
> Ce document contient volontairement des informations techniques detaillees, y compris des informations sensibles presentes dans le depot au moment de la redaction.

---

## 1) Identite du projet

- **Nom repo**: `quantum-bluff`
- **Type**: monorepo Node.js/TypeScript
- **Produit**: plateforme de jeux (Poker, Roulette, Slot, Blackjack solo, Blackjack multijoueur), social (amis/messages/invitations), gamification
- **Architecture globale**:
  - `client/` -> Frontend React + Vite (+ Electron + Capacitor)
  - `server/` -> Backend Express + Socket.IO + Prisma
  - `database/` -> docker-compose local (PostgreSQL + Redis)
  - `Docs/` -> documentation technique/fonctionnelle
  - `nginx/` -> reverse proxy (prod)

---

## 2) Stack technique complete

## 2.1 Backend

- Runtime: **Node.js** (ESM)
- Langage: **TypeScript**
- Framework HTTP: **Express**
- Realtime: **Socket.IO**
- ORM: **Prisma**
- Base principale: **PostgreSQL** (`pg`)
- Cache/etat distribue partiel: **Redis** (`ioredis`)
- Auth: **JWT** (`jsonwebtoken`) + bcrypt (`bcryptjs`)
- Validation/schemas: **zod**
- Securite:
  - `helmet`
  - `cors`
  - `express-rate-limit`
  - sanitation (`sanitize-html`)
- Observabilite:
  - logs serveur manuels (`console.log/error`)
  - route healthcheck `/api/health`
- Docs API: **swagger-jsdoc** + **swagger-ui-express**
- Jobs: **node-cron** (`cleanup.job.ts`)

## 2.2 Frontend

- Framework UI: **React 19**
- Build tool: **Vite 7**
- Routing: **react-router-dom 7**
- i18n: **i18next + react-i18next + language detector**
- Realtime client: **socket.io-client**
- Animation: **motion**
- UI libs: ecosys **Radix UI** + utilitaires (`clsx`, `tailwind-merge`, etc.)
- Style: **Tailwind CSS**
- Charts: **recharts**
- Icons: **lucide-react**
- Tests front:
  - unit/component: **Vitest + Testing Library**
  - e2e: **Playwright**

## 2.3 Desktop/Mobile

- Desktop: **Electron** + `electron-builder` + `electron-updater`
- Mobile hybride: **Capacitor** (Android / iOS)

## 2.4 Qualite/tests/outillage

- Lint: ESLint (front + back)
- Tests backend: Jest + Supertest
- Coverage: Jest/Vitest coverage
- Dev orchestration monorepo: `concurrently`

---

## 3) Arborescence et responsabilites

- `client/src/pages/`
  - Auth/lobby/gameplay/pages casino/social/profil
  - pages critiques: `Lobby.tsx`, `Game.tsx`, `WaitingRoom.tsx`, `Roulette.tsx`, `Blackjack.tsx`, `BlackjackMultiTable.tsx`
- `client/src/components/`
  - layout, tables, section blackjack lobby multi, notifications, UI partages
- `client/src/contexts/`
  - `SocketContext`, `ToastContext`, autres contextes UX
- `client/src/i18n/locales/`
  - FR/EN/ES/AR/UK

- `server/src/routes/`
  - `auth.routes.ts`, `game.routes.ts`, `game.api.routes.ts`
  - `waitingRoom.routes.ts`, `roulette.routes.ts`, `slot.routes.ts`
  - `blackjack.routes.ts`, `blackjackMulti.routes.ts`
  - `friends.routes.ts`, `invitation.routes.ts`, `leaderboard.routes.ts`, `updates.routes.ts`
  - `admin.blackjack.runtime.routes.ts` (diagnostic/metrics runtime blackjack)
  - `admin.poker.runtime.routes.ts` (diagnostic/readiness runtime poker)
- `server/src/logic/`
  - moteurs de jeu: poker (`GameTable`, `CashGameController`), roulette, slot, blackjack
- `server/src/logic/poker/`
  - pipeline showdown/payout pur poker (`showdownRanking.ts`, `potSettlement.ts`)
- `server/src/blackjack/`
  - domaine/runtime (`domain/`)
  - state store abstrait + implementations in-memory/redis (`store/`)
  - sync runtime->store (`services/blackjackStateSync.service.ts`)
  - locks distribues (`services/blackjackTableLock.service.ts`)
  - readiness runtime + mapping HTTP (`services/blackjackRuntimeHealth.service.ts`)
  - recovery/cleanup/snapshots (`recovery/`)
- `server/src/sockets/game.gateway.ts`
  - events realtime, invitations, updates de jeu, gestion disconnect/reconnect
- `server/src/shared/`
  - `activeGames.ts` (poker), `activeBlackjackGames.ts` (registre runtime local)
  - `blackjackStateStore.ts` (singleton store blackjack)
  - `pokerStateStore.ts` (singleton store poker)
- `server/src/poker/`
  - `domain/` (contrat + validation action poker)
  - `services/` (orchestrator mutation, dedup, lock, sync state)
  - `store/` (PokerStateStore memory/redis)
  - `recovery/` (readiness/recovery poker)
- `server/prisma/`
  - `schema.prisma` + migrations
  - migration snapshot blackjack: `20260327120000_blackjack_room_snapshots`

---

## 4) Fonctionnalites metier (inventaire)

## 4.1 Authentification / comptes

- register/login JWT
- lecture solde (`/api/auth/balance`)
- 2FA TOTP route dediee
- ajout dev money (route debug)
- profils utilisateur (username/email/chips/level/xp)

## 4.2 Poker multijoueur

- waiting rooms publiques/privees
- systeme ready/start
- join requests pour salles privees
- moteur cash game (`CashGameController`)
- actions realtime (fold/call/raise/check)
- spectateurs + file de rejoin
- reconnect/disconnect avec timeout
- **Durcissement runtime poker (etat actuel)**:
  - source de verite runtime recentree sur l'etat serveur (`handId`, `actionVersion`, `streetVersion`, `updatedAt`)
  - contrat d'action unifie socket/HTTP (`gameId`, `handId`, `playerId`, `actionType`, `amount`, `actionId`, `expectedStreet`)
  - point d'entree unique de mutation (`pokerActionOrchestrator.service.ts`)
  - lock de table + dedup TTL `actionId` + rejet `STALE_ACTION`/`DUPLICATE_ACTION`
  - settlement deterministe via modules purs (`showdownRanking`, `potSettlement`)
  - readiness/recovery poker + snapshots runtime store + endpoint admin poker runtime
  - certification interne de regles poker couverte via `Docs/intern/POKER_EDGE_CASES_100.md`

## 4.3 Casino

- **Slot**:
  - tirage serveur (crypto)
  - table de poids + multiplicateurs
  - endpoint spin + config
- **Roulette**:
  - roulette europeenne (0..36)
  - paris complets (plein/cheval/street/corner/sixline/dozen/column/chances simples)
  - endpoint spin + config
  - forgage resultat ajoute (forceResult) via API
- **Blackjack solo**:
  - sabot 6 decks
  - hit/stand/double
  - payout server side
- **Blackjack multijoueur**:
  - salles, sieges, host, ready, start
  - invitations dediees blackjack
  - runtime hybride: execution locale + projection Redis/state store
  - verrouillage distribue des mutations critiques (start/deal/action)
  - readiness runtime (codes stables: `TABLE_RECOVERING`, `TABLE_STATE_STALE`, `TABLE_UNAVAILABLE`, etc.)
  - snapshots DB periodiques + recovery boot + nettoyage runtime/salles orphelines
  - endpoints admin de diagnostic runtime (`/api/admin/blackjack/runtime/*`)

## 4.4 Social

- amis (recherche, demandes, accept/refuse)
- messagerie entre amis
- invitations en partie (poker + blackjack)
- statut online/offline via socket

## 4.5 Gamification / leaderboard

- XP + niveaux
- badges
- statistiques poker/casino
- leaderboard (dont biggest wins roulette/blackjack/slot)

---

## 5) API exposee (resume)

- Prefixes principaux:
  - `/api/auth`
  - `/api/auth/2fa`
  - `/api/game`
  - `/api/waiting-room`
  - `/api/bot`
  - `/api/slot`
  - `/api/roulette`
  - `/api/blackjack`
  - `/api/blackjack-tables`
  - `/api/admin/blackjack/runtime`
  - `/api/admin/poker/runtime`
  - `/api/friends`
  - `/api/invitations`
  - `/api/leaderboard`
  - `/api/health`
  - `/api-docs` (Swagger UI)

Rate limits dedies visibles dans `server/src/index.ts`:
- global limiter
- bot limiter
- slot limiter
- roulette limiter
- blackjack limiter
- blackjack-tables limiter

---

## 6) WebSocket (resume operationnel)

- Gateway unique: `server/src/sockets/game.gateway.ts`
- Auth JWT sur handshake
- Events majeurs:
  - `JOIN_GAME`, `JOIN_SPECTATE`, `PLAYER_ACTION`
  - `JOIN_BLACKJACK_TABLE`, `BLACKJACK_TABLE_UPDATE`
  - invitations (`GAME_INVITATION_RECEIVED`)
  - lifecycle (`GAME_STARTED`, `GAME_ENDED`, reconnect/disconnect events)

Points structurels:
- Poker: support redis/memoire via `activeGames`
- Blackjack multi: resilience active via state store (memory/redis), snapshots DB, lock distribue et pub/sub; `activeBlackjackGames` reste un registre runtime local de controllers vivants
- Poker (nouveau niveau de maturite): orchestration mutations lock+dedup, contrat d'action unifie, settlement pur, state store poker, readiness/recovery admin

---

## 7) Base de donnees (Prisma) - couverture

Modeles centraux identifies dans `schema.prisma`:
- `User`, `UserStats`, `PlayerStats`
- `GameHistory`, `GameAction`, `GameResult`
- `FriendRequest`, `Friendship`, `FriendMessage`
- `WaitingRoom`, `RoomPlayer`, `JoinRequest`, `GameInvitation`
- `CasinoStats`, `UserBadge`
- Blackjack multi:
  - `BlackjackRoom`
  - `BlackjackRoomSnapshot`
  - `BlackjackRoomSeat`
  - `BlackjackRoomInvitation`

Enums:
- `RequestStatus`, `InvitationStatus`, `RoomVisibility`, `RoomStatus`, `BlackjackRoomStatus`, etc.

---

## 8) Build, execution, scripts

## 8.1 Monorepo root (`package.json`)

- `npm run dev`:
  - DB docker local
  - backend dev
  - frontend dev
- `npm run test:coverage`
- `npm run test:e2e:client`

## 8.2 Backend (`server/package.json`)

- dev: `nodemon --exec tsx src/index.ts`
- build: `prisma generate && tsc`
- lint, test, coverage

## 8.3 Frontend (`client/package.json`)

- dev/build/preview
- tests vitest + playwright
- electron build multi-plateformes
- scripts capacitor (android/ios)

---

## 9) Deploiement & infra

- `docker-compose.prod.yml`:
  - `postgres`, `redis`, `backend`, `frontend`, `nginx`
- `database/docker-compose.yml` (local):
  - postgres expose en `5433`
  - redis expose en `6379`

Nginx:
- config reverse proxy dans `nginx/conf.d`
- certs letsencrypt montes en lecture seule dans compose prod

---

## 10) Inventaire d'informations sensibles (etat actuel du depot)

> **Section sensible** - a ne pas diffuser hors equipe interne.

## 10.1 Secrets/credentials visibles dans fichiers

### `server/.env`
- `DATABASE_URL="postgresql://admin:My027@localhost:5433/quantum_bluff"`
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`
- `REDIS_PASSWORD=` (vide)

### `database/docker-compose.yml`
- `POSTGRES_USER=admin`
- `POSTGRES_PASSWORD=My027`
- `POSTGRES_DB=quantum_bluff`

### `docker-compose.prod.yml` (defaults)
- `DB_USER` default: `admin`
- `DB_PASSWORD` default: `My027`
- `DB_NAME` default: `quantum_bluff`
- `JWT_SECRET` default: `super_secret_for_production_change_me`

### `client/.env`
- `VITE_API_URL=http://localhost:3000`

### `client/package.json` (publishing config)
- update feed URL:
  - `https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/updates/`

## 10.2 Parametres reseau/origines autorisees (backend)

Dans `server/src/index.ts`, CORS permet notamment:
- localhost (5173/5174/5175)
- `https://mai-projet-integrateur.u-strasbg.fr`
- `http://185.155.93.105` (+ ports 3000/5173)
- `capacitor://localhost`

## 10.3 Observations de risque immediate

- mot de passe DB clair present dans plusieurs fichiers versionnes
- secret JWT de fallback faible/explicite
- forgage roulette (`forceResult`) actif si body present (comportement volontaire demande) -> risque de triche total

---

## 11) Qualite, tests, docs existantes

Docs existantes utiles:
- `Docs/REPORT.md`
- `Docs/DEPLOY.md`
- `Docs/Security_Audit.md`
- `Docs/RAPPORT_TESTS.md`
- `Docs/NETWORK_QOS.md`
- `Docs/BUILD_APPS.md`
- `Docs/intern/RAPPORT_INTERNE_AZ.md`

Tests:
- backend: Jest/Supertest (`server/src/__tests__`)
- frontend: Vitest + Playwright
- verrous recents:
  - backend unit: `server/src/blackjack/services/__tests__/blackjackRuntimeHealth.service.test.ts`
  - backend integration: `server/src/__tests__/blackjackMulti.state.integration.test.ts`
  - backend poker edge rules: `server/src/__tests__/poker.edge-cases.test.ts`
  - backend poker runtime rules: `server/src/__tests__/GameTable.runtime-rules.test.ts`
  - backend poker dedup: `server/src/__tests__/pokerActionDedup.service.test.ts`
  - backend poker settlement: `server/src/__tests__/potSettlement.test.ts`
  - frontend unit: `client/src/features/blackjack/runtimeStatus.test.ts`
  - frontend integration: `client/src/pages/BlackjackMultiTable.runtime.integration.test.tsx`

---

## 12) Etat actuel des choix techniques importants

- Poker multi: runtime fortement durci (orchestrator mutation, lock/dedup, contrat action unifie, settlement pur, readiness/recovery/store)
- Blackjack multi: runtime distribue (store abstrait), avec fallback memoire local pour execution des controllers
- API riche + realtime dense
- i18n 5 langues
- support desktop electron + support mobile capacitor
- securite basique bonne (helmet/cors/rate-limit/JWT/bcrypt), mais hygiene secrets a renforcer

---

## 13) Recommandations internes prioritaires

1. **Sortir tous les secrets du depot** (`.env` local, mdp DB, fallback JWT)
2. **Rotations immediates** des credentials deja exposes
3. **Limiter/retirer `forceResult` roulette** en prod (role admin ou flag serveur strict)
4. **Durcir l'observabilite blackjack** (logs structures + dashboard sur metrics runtime admin)
5. **Etendre observabilite poker** (compteurs dedup/stale/lock wait/recovery)
6. **Scanner secret automatique CI** (gitleaks/trufflehog)
7. **Durcir politiques CORS** par environnement
8. **Verifier hygiene API friends** (surveiller 404 anormaux et bruit reseau client)

---

## 14) Fichiers techniques de reference (point d'entree rapide)

- Backend bootstrap: `server/src/index.ts`
- Socket gateway: `server/src/sockets/game.gateway.ts`
- Roulette route: `server/src/routes/roulette.routes.ts`
- Blackjack multi route: `server/src/routes/blackjackMulti.routes.ts`
- Admin runtime blackjack: `server/src/routes/admin.blackjack.runtime.routes.ts`
- Admin runtime poker: `server/src/routes/admin.poker.runtime.routes.ts`
- Runtime health blackjack: `server/src/blackjack/services/blackjackRuntimeHealth.service.ts`
- Recovery blackjack: `server/src/blackjack/recovery/blackjackRecovery.service.ts`
- Poker action orchestrator: `server/src/poker/services/pokerActionOrchestrator.service.ts`
- Poker store/recovery: `server/src/poker/store/*`, `server/src/poker/recovery/*`
- Poker edge certification: `Docs/intern/POKER_EDGE_CASES_100.md`
- Poker room route: `server/src/routes/waitingRoom.routes.ts`
- Prisma schema: `server/prisma/schema.prisma`
- Front roulette: `client/src/pages/Roulette.tsx`
- Front blackjack multi lobby: `client/src/components/LobbyBlackjackMultiSection.tsx`
- Front blackjack table: `client/src/pages/BlackjackMultiTable.tsx`

---

## 15) Electron et Capacitor - etat actuel et manques

## 15.1 Electron - deja configure

Sources:
- `client/electron.cjs`
- `client/preload.js`
- `client/package.json` (`main`, scripts `electron:*`, bloc `build`)

Configuration en place:
- process principal Electron present (`electron.cjs`)
- fenetre principale:
  - `nodeIntegration: false`
  - `contextIsolation: true`
  - `preload: client/preload.js`
- preload minimal expose `window.electron.appVersion()`
- auto-update:
  - `electron-updater`
  - feed generic configure vers `/updates/`
  - notifications utilisateur (maj dispo / telechargee)
- logs auto-update via `electron-log`
- packaging `electron-builder`:
  - appId: `com.quantumbluff.app`
  - cibles: `nsis` (Windows), `AppImage` (Linux), `mac` (category + icon)
  - scripts build/publish deja declares
- URL chargee dans la fenetre:
  - VM de prod: `https://mai-projet-integrateur.u-strasbg.fr/vmProjetIntegrateurgrp10-0/`

## 15.2 Electron - points manquants / techniques a renforcer

1. **Securite TLS**
   - actuellement: `app.commandLine.appendSwitch('ignore-certificate-errors');`
   - manque: suppression de ce bypass, certificat valide, pinning eventuel

2. **Canal IPC structure**
   - preload tres minimal (ok), mais pas d'API IPC metier ni politique stricte par canal
   - manque: schema IPC explicite, validation des payloads

3. **Politique de contenu**
   - app charge directement une URL distante
   - manque: mode offline/fallback, gestion erreur reseau robuste, page maintenance

4. **Code-signing / notarization**
   - scripts build presents mais pas de details de signature/notarization dans ce repo
   - manque: pipeline CI de signature (certificats hors repo)

5. **Telemetrie/crash reporting**
   - logs updater existent
   - manque: collecte crash report centralisee (Sentry ou equivalent)

6. **Gestion des secrets update channel**
   - url de publication statique dans config
   - manque: separation canaux stable/beta et parametrage runtime par environnement

## 15.3 Capacitor - deja configure

Sources:
- `client/capacitor.config.ts`
- `client/package.json` (`cap:*`, `build:cap`, `cap:run:android`)
- `client/.env.example` (variables commentaires)

Configuration en place:
- config Capacitor presente
  - `appId: com.quantumbluff.app`
  - `appName: Quantum Bluff`
  - `webDir: dist`
- support server URL dynamique:
  - `server.url = process.env.CAPACITOR_SERVER_URL || undefined`
- options mobile:
  - `server.cleartext: true`
  - `android.allowMixedContent: true`
- scripts npm:
  - `cap:copy`, `cap:sync`
  - `cap:android`, `cap:ios`
  - `build:cap` (avec `VITE_BASE_PATH`, `VITE_API_URL`, `VITE_SOCKET_URL`)
  - `cap:run:android` live reload

## 15.4 Capacitor - points manquants / techniques a renforcer

1. **Durcissement transport**
   - `cleartext: true` + `allowMixedContent: true` sont permissifs
   - manque: bascule HTTPS-only en prod mobile

2. **Config environnement mobile formalisee**
   - variables presentes en scripts/comments
   - manque: matrice dev/staging/prod documentee + automatisation CI

3. **Plugins natifs**
   - repo montre la base Capacitor, mais pas de couche plugin metier explicite (notifications push, secure storage, biometrie, etc.)
   - manque: inventaire plugin cible selon besoins produit

4. **Stockage securise des credentials**
   - pas de preuve ici d'integration secure storage
   - manque: keychain/keystore pour tokens sensibles

5. **Signing et releases stores**
   - scripts existent pour ouvrir Android/iOS
   - manque: pipeline signature + publication Play/App Store documente

6. **Monitoring mobile**
   - manque: crash reporting mobile centralise et metrics perf reseau

## 15.5 Synthese actionnable Electron/Capacitor

Priorite haute:
- retirer bypass certificat Electron
- verrouiller mode secure transport mobile (HTTPS, mixed content off en prod)
- mettre en place gestion des secrets/signatures hors repo

Priorite moyenne:
- structurer CI release desktop + mobile
- ajouter crash reporting unifie
- formaliser matrice d'environnements (dev/staging/prod)

---

## 16) Clause interne

Ce document est destine a un usage interne d'equipe technique.  
Toute copie externe doit etre prealablement nettoyee des sections sensibles (section 10 minimum).

