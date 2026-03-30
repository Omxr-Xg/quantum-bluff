# Quantum Bluff - Rapport Interne Complet (A a Z)

> Usage strictement interne.  
> Ce document contient volontairement des informations techniques detaillees, y compris des informations sensibles presentes dans le depot au moment de la redaction.

**Dernière mise à jour du document :** 30 mars 2026 (synthèse des évolutions récentes du dépôt, CI, casino, poker, blackjack, base de données).

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
- **CI GitLab (backend)** :
  - Le job `backend:test` exécute `npm run test:coverage` **sans service Redis** sur le runner : la suite Jest ne doit pas dépendre d’un Redis local. Le teardown global (`server/jest.setup.ts`) appelle `redisClient.disconnect()` (et non `quit()`, qui peut dépasser le timeout Jest si aucun serveur n’écoute). En environnement `JEST_WORKER_ID` ou `CI=true`, le client ioredis partagé est configuré pour échouer vite (`maxRetriesPerRequest` réduit, `connectTimeout` court) et pour ne pas spammer la console sur erreurs de connexion attendues (`ECONNREFUSED`, etc.). `activeGames` filtre les messages Redis « normaux » en cas d’indisponibilité (dont `max retries per request`).
  - Le job `backend:build` exécute `tsc` en **strict** + copie Prisma generate : les imports `ioredis` côté blackjack store utilisent `import { Redis } from 'ioredis'` (compatible `moduleResolution: NodeNext`). Le nettoyage snapshot dans `cleanupOrphanBlackjackRuntime` référence explicitement le delegate Prisma `blackjackRoomSnapshot` pour éviter les erreurs TS sur `snapshotDelegate`.

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

- waiting rooms publiques/privees (champ **`turbo`** : tour limité à ~10 s au lieu de ~30 s quand activé côté salle ; migration Prisma avec ajout de colonne **idempotent** `IF NOT EXISTS` pour environnements déjà partiellement migrés)
- systeme ready/start
- join requests pour salles privees
- moteur cash game (`CashGameController`)
- actions realtime (fold/call/raise/check)
- spectateurs + file de rejoin
- reconnect/disconnect avec timeout
- coherence avatars multi-comptes entre salle d’attente et table:
  - propagation d’URL avatar publique (sanitisee serveur) depuis le client
  - diffusion `avatarUrl` dans les payloads waiting room pour eviter les fallbacks differents selon le compte observateur
  - reprise de l’avatar au demarrage de la cash table via `initFromRoomPlayers`
- hidden bets PRE+LIVE (v1) integres au runtime cash:
  - fenetres PRE_HAND + LIVE_FLOP/TURN/RIVER
  - affichage des resultats pendant l’inter-main avec gate "ready" (pas de decompte client force en cash)
  - resolution backend autoritaire (wallet/idempotence/audit) + historique table
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
  - tirage public crypto (`spinWheel`) sans `forceResult` sur la route joueur
  - idempotence spin : le client envoie `actionId` / `roundId` (meme UUID stable jusqu’a reponse HTTP OK), retries avec la meme cle ; le serveur stocke le resultat JSON sous cle `gameType:userId:actionId` (Redis `SET NX` + TTL **15 minutes** si Redis disponible, sinon Map memoire process). Si le corps des mises differe pour le meme `actionId`, reponse **409** `IDEMPOTENCY_PAYLOAD_MISMATCH`. Apres expiration TTL, un retry tardif avec la meme cle ne replay plus (nouvelle intention possible sans rejeu serveur — a documenter cote produit)
  - forgage resultat reserve a une route **admin** non-prod (localhost + token + flag `ENABLE_ADMIN_ROULETTE_OVERRIDE`, voir `server/.env.example`)
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
- `WaitingRoom` (dont champ **`turbo`** pour parties « rapides »), `RoomPlayer` (incluant `avatarUrl`), `JoinRequest`, `GameInvitation`
- `HiddenBetTicket`, `HiddenBetSelection` (tickets PRE+LIVE, resolution et historique)
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
- build: `prisma generate && tsc && cp -r src/generated dist/` (client Prisma généré copié dans `dist/` pour l’exécution Node)
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
- route publique roulette : sans `forceResult` ; risque residuel principalement sur hygiene secrets / CORS (l’override force resultat reste une route admin opt-in non-prod, localhost)

---

## 11) Qualite, tests, docs existantes

Docs existantes utiles:
- `Docs/REPORT.md`
- `Docs/DEPLOY.md`
- `Docs/Security_Audit.md`
- `Docs/RAPPORT_TESTS.md`
- `Docs/NETWORK_QOS.md`
- `Docs/BUILD_APPS.md`
- `Docs/intern/RAPPORT_INTERNE_AZ.md` (vue d’ensemble + **§16 nouveautés récentes** + sensibilités §10)

Tests:
- backend: Jest/Supertest (`server/src/__tests__`)
- setup global: `server/jest.setup.ts` (teardown `activeGames` + `redis.disconnect()` — pas de `quit()` bloquant)
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
- **Casino** : idempotence des spins (roulette, slot) avec `actionId` / `roundId` côté client, retries réseau ou HTTP 5xx avec le même identifiant ; persistance Redis `SET NX` + TTL avec repli mémoire processus ; ledger wallet dans la transaction Prisma là où c’est en place
- **CI** : tests backend reproductibles sans Redis ni import dynamique fragile en teardown Jest

---

## 13) Recommandations internes prioritaires

1. **Sortir tous les secrets du depot** (`.env` local, mdp DB, fallback JWT)
2. **Rotations immediates** des credentials deja exposes
3. **Surveillance override roulette** : ne jamais activer `ENABLE_ADMIN_ROULETTE_OVERRIDE` hors machine locale ; tokens admin longs et non versionnes
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
- Config Redis partagée + mode CI/Jest: `server/src/config/redis.config.ts`
- Setup Jest global: `server/jest.setup.ts`
- Front roulette: `client/src/pages/Roulette.tsx`
- Idempotence casino: `server/src/casino/services/idempotency.service.ts` (Redis avec repli memoire si Redis indisponible ; TTL ~15 min). Le client roulette et slot envoient `actionId` / `roundId` (UUID) par spin et reessaient les erreurs reseau ou HTTP 5xx avec le meme identifiant pour permettre le rejeu serveur. En production multi-instance, Redis doit etre operationnel pour que la deduplication soit fiable entre pods. Voir `server/.env.example` pour `REDIS_*` et pour `ADMIN_API_TOKEN` / `ENABLE_ADMIN_ROULETTE_OVERRIDE` (reserve machine locale + jeton).
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

## 16) Nouveautés récentes du projet (synthèse 2025–2026)

> Liste non exhaustive, ordre par thème. Voir l’historique Git pour le détail commit par commit.

### Casino et monétisation fiable

- **Idempotence** : service dédié (`idempotency.service.ts`) — clé par `gameType`, utilisateur et `actionId` ; réponse rejouée si identique ; **409** `IDEMPOTENCY_PAYLOAD_MISMATCH` si le corps des mises diffère pour la même clé.
- **Roulette / Slot** : le client génère des UUID stables par spin (`actionId` / `roundId`), réessaie les erreurs réseau ou **5xx** avec le même identifiant ; alignement avec le traitement serveur **async** (await sur la chaîne idempotente / abort en cas d’échec).
- **Admin override résultat roulette** : réservé aux environnements **non production**, **localhost** et jeton (`ENABLE_ADMIN_ROULETTE_OVERRIDE`, `ADMIN_API_TOKEN` — voir `server/.env.example`).
- **Tests** : intégration POST double avec même `actionId` ; scénarios async, replay et mismatch de payload.

### Poker multijoueur (produit et UX)

- **Journal de main** : état serveur (`lastHandAction`, rôle acteur) consommé par le client ; panneau journal dans l’UI.
- **i18n** : libellés du journal d’actions poker en **FR, EN, ES, AR, UK**.
- **Realtime** : réduction des timers de tour obsolètes via un **epoch** par partie (évite les déclenchements croisés après changement de main).
- **Layout / table** : pastilles SB/BB alignées sur les rôles serveur ; ajustements layout salle d’attente (bande hamburger).
- **Tests** : couverture runtime + temps réel (leave/disconnect, invariants lock, showdown, etc.).

### Blackjack multijoueur et recovery

- Idempotence renforcée sur certaines routes (ex. **start** avec gestion de session).
- Nettoyage snapshot Prisma dans `cleanupOrphanBlackjackRuntime` (suppression des snapshots pour salles dont `room.status` n’est pas `PLAYING`) avec typage explicite du delegate pour le build TypeScript strict.

### Base de données

- Modèle **WaitingRoom** : champ **`turbo`** (booléen, défaut `false`) pour mode partie rapide ; migrations Prisma avec garde-fous `IF NOT EXISTS` sur colonnes sensibles lors de déploiements hétérogènes.
- Modèle **RoomPlayer** : ajout `avatarUrl` (URL publique facultative) pour conserver le meme rendu avatar entre clients en salle d’attente puis en partie.
- Modèle **HiddenBetTicket** : extension V1 (phase de marche, expiration de quote, snapshot de pricing/etat, version de house edge) + index associes.

### Qualité et pipeline

- **Backend test** : compatible exécution GitLab **sans Redis** (voir §2.4).
- **Backend build** : compilation stricte ; correctifs **ioredis** (`NodeNext`) et recovery blackjack pour éviter les régressions CI.
- Validation locale recente:
  - backend: `npm run lint`, `npm test`, `npm run build` -> OK (warnings non bloquants restants)
  - frontend: `npm run lint`, `npm test`, `npm run build` -> OK (warnings non bloquants restants)

---

## 17) Clause interne

Ce document est destine a un usage interne d'equipe technique.  
Toute copie externe doit etre prealablement nettoyee des sections sensibles (section 10 minimum).

*La section 16 et les mises à jour des §2.4, §8.2 et §11 documentent l’état du dépôt à la révision indiquée en tête de document ; en cas de divergence, le code et la CI GitLab font foi.*

