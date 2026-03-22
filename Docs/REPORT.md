# Quantum Bluff – Rapport technique complet

---

## 1. Structure du projet

### 1.1 Arborescence racine
- `client/` – Frontend React + Vite
- `server/` – Backend Node.js + Express
- `database/` – Docker Compose (PostgreSQL, Redis)
- `scripts/` – Scripts (backup, version-bump)
- `Docs/` – Documentation
- `nginx/` – Config reverse proxy
- `package.json` – Monorepo (concurrently)
- `README.md`, `DEPLOY.md`, `SETUP_TESTEUR.md`, `CHANGELOG`, `CODEOWNERS`

### 1.2 Client (`client/`)
- `src/pages/` – StartScreen, Auth, Lobby, BotConfiguration, WaitingRoom, Game, GameDeal, GameExample, HiddenBetsResult, Profile, Friends, EditProfile, TutorialLobby
- `src/components/` – Layout, ProtectedRoute, PokerTable, CommunityCards, ActionButtons, QuantumHUD, ShowdownDisplay, HiddenBetsPanel, InvitationBanner, NotificationCenter, MusicPlayer, AccessibilityMenu, ChipIcon, PokerCard, etc.
- `src/components/ui/` – Composants shadcn/ui (accordion, alert, avatar, button, card, dialog, form, input, tabs, tooltip, etc.)
- `src/contexts/` – SocketContext, ToastContext, QuantumHUDContext, AccessibilityContext, AccessibilityMenuOpenContext, HiddenBetsContext, MusicContext, TopBarContext
- `src/services/` – api.ts (RTK Query), socket via contexts
- `src/hooks/` – usePokerGame, usePokerSocket, usePokerDeck, useUser, useDeviceType
- `src/utils/` – cards.ts, avatars.ts, userProfile.ts, tablePositions.ts
- `src/i18n/` – Traductions fr, en, es, uk, ar
- `src/types/` – index.ts, game.ts
- `electron.cjs` – Point d’entrée app desktop Electron

### 1.3 Serveur (`server/`)
- `src/routes/` – auth, game, game.api, waitingRoom, bot, friends, invitation, updates
- `src/logic/` – GameTable, CashGameController, Evaluator, Deck
- `src/sockets/` – game.gateway.ts
- `src/middleware/` – auth.middleware, socketAuth.middleware
- `src/config/` – database.ts, redis.config.ts
- `src/validation/` – auth.validation, game.validation, friends.validation
- `src/shared/` – activeGames.ts
- `src/utils/` – antiCheat.ts, securityLogger.ts, cleanup.job.ts
- `prisma/` – schema.prisma, migrations

---

## 2. Authentification

### 2.1 Endpoints HTTP (`/api/auth/`)
- `POST /check-email` – Vérifie si l’email existe (body: `{ email }`), réponse `{ exists: boolean }`
  - Rate limit: 20 req / 5 min
  - Validation email: regex `xxx@yyy.zzz`
  - Utilisé par le flux login/register unifié
- `POST /register` – Création de compte (body: `{ email, username, password }`)
  - Rate limit: 5 / 10 min
  - Validation via `registerSchema` (Zod)
  - Bcrypt hash (10 rounds)
  - SanitizeHtml sur email et username
  - Création optionnelle de PlayerStats
  - Réponse: `{ token, user }`
- `POST /login` – Connexion (body: `{ email, password }`)
  - Rate limit: 5 / 10 min
  - Validation via `loginSchema`
  - Réponse: `{ token, user }` (user: id, email, username, chips, level, playerStats)
- `GET /balance` – Balance serveur (protégé, authMiddleware)
- `POST /add-dev-money` – Ajout jetons (protégé, secret=dev, body: `{ secret, amount }`)
  - Plafond: 999999
- `POST /sync-balance` – Désactivé, renvoie 410

### 2.2 JWT
- Secret: `process.env.JWT_SECRET` ou `quantum_bluff_secret`
- Expiration: `7d`
- Structure: `{ userId }`
- Génération: `jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })`

### 2.3 Middleware HTTP
- `auth.middleware.ts` – Lit `Authorization: Bearer <token>`, décode JWT, injecte `req.userId`
- Utilisé sur: balance, add-dev-money, record-result, friends, invitations

### 2.4 Socket auth
- `socketAuth.middleware` – Token via `handshake.auth.token` ou header `Authorization`
- En cas d’échec: logSuspiciousAction, erreur "Token manquant" ou "Token invalide"

### 2.5 Sécurité
- bcrypt pour les mots de passe
- sanitize-html pour email et username
- logSuspiciousAction (BRUTE_FORCE_LOGIN, BRUTE_FORCE_REGISTER, MISSING_TOKEN, INVALID_TOKEN)
- Rate limit global: 1000 req / 15 min (sans compter les succès)

---

## 3. Base de données (Prisma)

### 3.1 Models
- **User** – id, username, email, password, chips (1000), level (1), createdAt, updatedAt
  - Relations: stats, histories, sentRequests, receivedRequests, friendshipsAsUser1/2, sentFriendMessages, receivedFriendMessages, roomPlayers, sentInvitations, receivedInvitations, joinRequests, gameActions, gameWins, playerStats
  - Index: username, email, createdAt
- **UserStats** – id, wins, totalGames, biggestPot, userId (1-1 User)
- **GameHistory** – id, tableId, gameId, board, pot, winnerId, createdAt
- **FriendRequest** – id, senderId, receiverId, status (PENDING|ACCEPTED|REJECTED), createdAt, updatedAt
- **Friendship** – id, user1Id, user2Id, createdAt
- **FriendMessage** – id, senderId, receiverId, content, createdAt (Cascade onDelete)
- **WaitingRoom** – id, name, hostId, maxPlayers (5), visibility (PUBLIC|PRIVATE), status (WAITING|STARTING|IN_GAME), gameId?, createdAt, updatedAt
- **RoomPlayer** – id, roomId, userId, isReady (false), position?, joinedAt
- **JoinRequest** – id, roomId, userId, status, createdAt, updatedAt
- **GameAction** – id, gameId, playerId, action (FOLD|CALL|RAISE|CHECK|BET), amount?, phase, round, timestamp
- **GameResult** – id, gameId, winnerId, winnerName, pot, hands (Json), startedAt, endedAt
- **PlayerStats** – id, playerId, totalGames, totalWins, totalLosses, totalHands, totalRaises, totalCalls, totalFolds, totalChecks, biggestPot, biggestWin, totalChipsWon, totalChipsLost, updatedAt
- **GameInvitation** – id, roomId, senderId, receiverId, status (PENDING|ACCEPTED|REJECTED), createdAt, updatedAt

### 3.2 Enums
- RequestStatus: PENDING, ACCEPTED, REJECTED
- InvitationStatus: PENDING, ACCEPTED, REJECTED
- RoomVisibility: PUBLIC, PRIVATE
- RoomStatus: WAITING, STARTING, IN_GAME

### 3.3 Connexion
- Provider: PostgreSQL
- Variable: `DATABASE_URL`

---

## 4. Routes API serveur

### 4.1 Game legacy (`/api`)
- `GET /games` – Liste des parties (game.routes)
- `POST /games` – Créer une partie (body: `{ playerName }`)
- `POST /games/:gameId/join` – Rejoindre (body: `{ playerName }`)

### 4.2 Game API (`/api/game`)
- `POST /start` – Démarrer cash game depuis salle (body: `{ roomId, hostId }`)
  - Crée CashGameController, initFromRoomPlayers, startHand
  - Sauvegarde dans activeGames (Map + Redis)
  - Émet GAME_STARTED à la room socket
  - Crée GameHistory
- `GET /:gameId/room-info` – roomId, hostId pour rematch
- `GET /:gameId` – État partie (?playerId= pour cartes du joueur)
- `POST /:gameId/action` – Jouer une action (body: `{ playerId, action, amount }`)
- `GET /active/list` – Liste parties actives
- `POST /record-result` – Enregistrer résultat main (mode bot, protégé) (body: `{ won: boolean, delta?: number }`)
- `GET /history/:gameId` – Historique partie
- `GET /stats/:playerId` – Stats joueur

### 4.3 Waiting room (`/api/waiting-room`)
- Endpoints CRUD salles, join, leave, ready, start
- Gestion join-requests (accept/reject) pour salles privées
- `games-in-progress` – Parties en cours
- `rematch` – Relancer avec mêmes membres

### 4.4 Bot (`/api/bot`)
- `POST /action` – Décision bot (body: playerCards, communityCards, difficulty, currentBet, playerChips, callAmount, minRaise, potSize, position, playersCount)
  - Difficultés: easy, medium, hard
  - Retourne: `{ action, amount?, reasoning? }`
- `POST /evaluate-winner` – Gagnant showdown (body: players[{ id, name?, cards }], communityCards)
  - Utilise Evaluator (findWinners, getHandInfo)

### 4.5 Friends (`/api/friends`)
- `GET /search?query=` – Recherche utilisateurs
- `POST /request` – Envoyer demande (body: senderId, receiverUsername)
- `GET /requests/:userId` – Demandes reçues
- `PUT /request/:requestId` – Accepter/refuser (body: status)
- `GET /:userId` – Liste amis
- `GET /messages?userId=&friendId=` – Messages
- `POST /messages` – Envoyer message (body: receiverId, content)

### 4.6 Invitations (`/api/invitations`)
- Envoi, liste reçues, accept, reject

### 4.7 Updates (`/`)
- `GET /updates/latest` – Electron auto-update

---

## 5. WebSockets (game.gateway.ts)

### 5.1 Auth socket
- Token: `handshake.auth.token` ou header `Authorization`
- JWT vérifié, `socket.userId` défini
- Rooms: `user:${userId}` (join automatique)

### 5.2 Events client → serveur
- `JOIN_USER_ROOM` – Rejoindre room user
- `join-room` – Rejoindre waiting room
- `leave-room` – Quitter waiting room
- `invite-to-room` – Inviter ami (roomId, invitedUserId, inviterId)
- `JOIN_GAME` – Rejoindre partie (gameId, playerId)
- `JOIN_SPECTATE` – Mode spectateur
- `SPECTATOR_QUEUE_JOIN` / `SPECTATOR_QUEUE_LEAVE` – Rejoindre/quitter file spectateur
- `PLAYER_ACTION` – Action (fold, call, check, raise, amount)
- `GAME_CHAT` – Message chat
- `CASH_SIT` / `CASH_LEAVE` / `CASH_REBUY` – Cash game
- `RECONNECT_GAME` – Reconnexion

### 5.3 Events serveur → client
- `GAME_UPDATE` – État jeu (players, pot, phase, communityCards, currentTurn, etc.)
- `TURN_TIMER` – Timer tour (timeLeft)
- `ERROR` – Erreur (GAME_NOT_FOUND, ACTION_ERROR, INVALID_RAISE, TOO_MANY_ACTIONS)
- `GAME_STARTED` – Partie démarrée (gameId)
- `GAME_ENDED` – Partie terminée
- `PLAYER_DISCONNECTED` / `PLAYER_RECONNECTED`
- `GAME_INVITATION_RECEIVED`
- `FRIEND_STATUS_CHANGED`
- `JOIN_REQUEST_RECEIVED`
- `CASH_WAITING_PLAYERS`

### 5.4 Comportement
- Timer tour: 30 s
- Auto-fold après déconnexion: 10 s (disconnectionTimeouts)
- Anti-cheat: AntiCheatMonitor (8 actions / 3 s)
- Reconnexion: annulation du timeout si JOIN_GAME avant expiry

---

## 6. Logique jeu

### 6.1 GameTable (logic/GameTable.ts)
- Moteur Texas Hold’em
- Phases: WAITING, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
- SB, BB, Dealer
- Split pots
- runOutBoardIfAllIn

### 6.2 CashGameController (logic/CashGameController.ts)
- Cash game (sièges, buy-in, rebuy)
- Compteur entre les mains (countdown)
- Spectateurs (spectatorRejoinQueue)
- getSanitizedState(playerId?) pour masquer cartes adverses

### 6.3 Evaluator (logic/Evaluator.ts)
- getHandValue(cards)
- findWinners(players, board)
- getHandInfo(cards) – nom main + rang

### 6.4 Deck (logic/Deck.ts)
- 52 cartes
- Shuffle Fisher-Yates (crypto.randomInt)
- dealFlop, dealTurn, dealRiver

### 6.5 activeGames (shared/activeGames.ts)
- Map en mémoire + cache Redis
- set, get, getAll, restoreAllGames

---

## 7. Client – Pages

### 7.1 Routes et protection
- `/` – StartScreen (public)
- `/auth` – Auth unifié (public)
- `/lobby` – Protégé
- `/bot-configuration` – Protégé
- `/waiting-room` – Protégé
- `/game` – Protégé (GameWithKey pour remount)
- `/game-deal`, `/game-example` – Protégé
- `/results`, `/hidden-bets-result` – Protégé
- `/profile`, `/edit-profile` – Protégé
- `/friends` – Protégé
- `/tutorial-lobby` – Protégé

### 7.2 StartScreen
- Animation de chargement (init, shuffling, preparingTable, etc.)
- Bouton COMMENCER → navigate("/auth")
- Cartes flottantes, jetons
- basename: `/vmProjetIntegrateurgrp10-0`

### 7.3 Auth (flux unifié)
- Étape 1: email uniquement + "Continuer"
- POST check-email → si exists: formulaire login (password), sinon: formulaire register (username, password, confirmPassword)
- Validation email: regex
- Google OAuth (optionnel): bouton "Se connecter avec Google" si VITE_GOOGLE_CLIENT_ID
- Traductions: auth.continue, auth.changeEmail, auth.invalidEmailFormat, auth.signInWithGoogle

### 7.4 Lobby
- Liste salles: GET /api/waiting-room
- Parties en cours: GET /api/waiting-room/games-in-progress (toutes les 5 s)
- Créer salle: POST /api/waiting-room/create
- Rejoindre: POST /api/waiting-room/:id/join ou request-join (privé)
- Jouer vs Bot → navigate("/bot-configuration")
- Rejoindre partie en cours → navigate("/game?gameId=...")
- Spectate → navigate("/game?gameId=...&spectate=1")

### 7.5 BotConfiguration
- Nombre de bots: 1–5
- Difficulté: facile, moyen, difficile, expert
- Jetons par bot (botChips)
- Vérification balance (getUserBalance)
- handleStartGame → navigate(`/game?mode=bot&bots=N&difficulty=X&botChips=...`)

### 7.6 WaitingRoom
- Récupération room: GET /api/waiting-room/:id
- Ready: POST /api/waiting-room/:id/ready
- Start (host): POST /api/waiting-room/:id/start
- Join requests (host, privé): accept, reject
- Socket: join-room, GAME_STARTED
- Création salle si pas d’id

### 7.7 Game (principal)
- Modes: bot (sans gameId) ou serveur (gameId dans URL)
- Paramètres URL: mode, gameId, bots, difficulty, botChips, spectate
- Phases: init, shuffle, deal, preflop, flop, turn, river, showdown
- Bot: délai 3 s avant action du bot
- Showdown: révélation 3 s, bouton Skip (showdownSkipRef)
- Hidden bets, Quantum HUD, chat
- Record result: POST /api/game/record-result après main
- Cash game: countdown, sièges, rebuy

---

## 8. Client – Composants majeurs

### 8.1 Layout
- TopBar (profile, friends, logout) si authentifié
- NotificationCenter, InvitationBanner, MusicPlayer
- isAuthPage: /, /auth (masque top bar)
- ChipIcon, balance

### 8.2 ProtectedRoute
- Vérifie localStorage.token
- Si absent: Navigate vers /auth avec state.from

### 8.3 PokerTable
- Affichage joueurs autour de la table
- communitySafeZone, position des sièges

### 8.4 ShowdownDisplay
- Props: winner (name, hand, pot, isSplit), winnerCards, onClose
- Affiche gagnant, combinaison, gains

### 8.5 PokerCard
- Props: suit, value, size, animated, faceDown, animationDelay
- Gestion visuelle des cartes

### 8.6 QuantumHUD
- Probabilités, odds en temps réel
- Contexte QuantumHUDContext

### 8.7 AccessibilityMenu
- Mode daltonien, contraste
- AccessibilityContext

---

## 9. Client – Contexts

### 9.1 SocketContext
- Connexion socket.io
- connect(), disconnect
- joinRoom, leaveRoom
- Invitations (accept, reject)
- Événement auth-changed pour reconnect

### 9.2 ToastContext
- addToast(message, type: success|error|info)
- removeToast

### 9.3 QuantumHUDContext
- updateFromCards(heroCards, communityCards, oppCount)
- État HUD

### 9.4 useUser
- userId, username depuis localStorage (userId, userid)

---

## 10. Client – API (RTK Query)

### 10.1 baseUrl
- Dev: `${origin}/api` (proxy Vite)
- Prod: `VITE_API_URL` ou `${origin}/api`

### 10.2 Headers
- Authorization: Bearer token (localStorage.token)

### 10.3 Mutations
- useLoginMutation, useRegisterMutation, useCheckEmailMutation
- useCreateGameMutation, useJoinGameMutation
- useSendFriendRequestMutation, useRespondToFriendRequestMutation
- useSendFriendMessageMutation

### 10.4 Queries
- useGetGamesQuery
- useSearchUsersQuery
- useGetFriendRequestsQuery
- useGetFriendsQuery
- useGetFriendMessagesQuery
- useGetPlayerStatsQuery

### 10.5 tagTypes
- User, Game, Friend, FriendRequest, FriendMessage

---

## 11. i18n

### 11.1 Langues
- fr (défaut), en, es, uk, ar

### 11.2 Namespaces
- lobby, game, auth, profile, friends, showdown, botConfig, startScreen, common, nav, etc.

### 11.3 Détection
- i18next-browser-languagedetector

---

## 12. Variables d’environnement

### 12.1 Serveur
- `DATABASE_URL` – Requis (PostgreSQL)
- `REDIS_HOST` (localhost), `REDIS_PORT` (6379), `REDIS_PASSWORD`, `REDIS_URL`
- `JWT_SECRET` (quantum_bluff_secret)
- `CORS_ORIGIN` (JSON array)
- `PORT` (3000)
- `GOOGLE_CLIENT_ID` – Optionnel (OAuth)

### 12.2 Client
- `VITE_API_URL` – Base API
- `VITE_GOOGLE_CLIENT_ID` – OAuth Google

---

## 13. Vite

### 13.1 base
- `/vmProjetIntegrateurgrp10-0/`

### 13.2 Proxy
- `/api` → http://localhost:3000
- `/vmProjetIntegrateurgrp10-0/api` → rewrite puis 3000
- `/socket.io`, `/vmProjetIntegrateurgrp10-0/socket.io` → ws 3000

---

## 14. Dépendances principales

### 14.1 Serveur
- express, cors, helmet, express-rate-limit
- bcryptjs, jsonwebtoken
- prisma, @prisma/client, pg
- socket.io
- ioredis
- zod, sanitize-html
- google-auth-library (optionnel)

### 14.2 Client
- React 19, React Router 7
- Vite 7
- Tailwind 4
- @radix-ui/*, motion
- i18next, react-i18next
- socket.io-client
- @react-oauth/google (optionnel)

---

## 15. Tests

### 15.1 Serveur (Jest)
- Deck: shuffle préserve 52 cartes
- Evaluator
- GameTable
- game.api.routes

### 15.2 Client (Vitest)
- PokerTable
- avatars, cards utils

---

## 16. Docker

### 16.1 database/
- PostgreSQL 16 (port 5433)
- Redis (6379)
- docker-compose.yml

---

## 17. Documentation existante

### 17.1 Docs/
- rapport-validation.md
- POKER_SCENARIOS.md
- bot-integration-frontend.md
- SETUP_TESTEUR.md
- DEPLOY.md
- NETWORK_QOS.md
- socket_test/ (test-socket-S1.html, socket-test.html)

### 17.2 Racine
- README.md, DEPLOY.md, SETUP_TESTEUR.md, CHANGELOG, CODEOWNERS

---

## 18. Points techniques importants

### 18.1 Mode bot
- Pas d’appel /api/game/:id
- État local (deck, players, phase)
- Appels: POST /api/bot/action, POST /api/bot/evaluate-winner
- winMultiplier selon difficulté (facile 0.3, moyen 0.6, difficile 0.9, expert 1)
- Enregistrement: POST /api/game/record-result avec token

### 18.2 localStorage
- token, userId, username
- quantum_bluff_username, quantum_bluff_email, quantum_bluff_balance
- gamePlayers (multi, stockage temporaire)

### 18.3 Cleanup
- initCleanupJobs (node-cron)
- Nettoyage parties inactives, etc.

### 18.4 Electron
- electron.cjs
- Updates: GET /updates/latest

---

*Rapport généré pour le repository Quantum Bluff*
