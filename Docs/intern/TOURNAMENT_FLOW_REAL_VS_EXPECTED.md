# Tournois — fonctionnement backend / frontend (réel vs attendu)

Document interne. Dernière mise à jour : 2026-03-30.

## 1. Portée

Ce document décrit le sous-système **tournois** (création, liste, inscription `join`, départ, lancement).  
Il ne couvre pas la partie poker cash / salle d’attente (`/api/waiting-room/.../join`).

Références code :

- Backend : `server/src/routes/tournament.routes.ts`, `server/src/services/tournament.service.ts`, `server/src/cron/tournament.cron.ts`, montage dans `server/src/index.ts` sous **`/api/tournaments`**.
- Frontend : `client/src/services/tournament.service.ts`, `client/src/pages/TournamentLobby.tsx`, `client/src/pages/AdminTournaments.tsx`, événements socket côté app dans `client/src/App.tsx` (`tournament-started`, etc.).

---

## 2. API REST (réel)

| Méthode | Chemin | Auth | Rôle |
|--------|--------|------|------|
| `GET` | `/api/tournaments` | Optionnelle (Bearer) | Liste des tournois `status: PENDING` ; si token valide, calcule `isJoined` pour l’utilisateur courant. |
| `POST` | `/api/tournaments/create` | **Obligatoire** (`authMiddleware`) | Crée un tournoi (`PENDING`, `prizePool: 0`). **N’inscrit pas** automatiquement le créateur comme joueur. |
| `POST` | `/api/tournaments/:id/join` | **Obligatoire** | Inscription : débit `buyIn` des jetons utilisateur, incrément `prizePool`, création `TournamentPlayer`. |
| `POST` | `/api/tournaments/:id/leave` | **Obligatoire** | Désinscription si `PENDING` : remboursement `buyIn`, décrément `prizePool`. |
| `POST` | `/api/tournaments/:id/start` | **Obligatoire** | Lancement manuel (voir §5). |

Toute erreur métier dans `join` / `leave` / `start` côté service est attrapée dans la route et renvoyée en **`400 { error: "<message>" }`** (pas de code d’erreur structuré dédié).

---

## 3. Logique métier `join` (réel)

Implémentation : `TournamentService.joinTournament` dans `server/src/services/tournament.service.ts`.

Ordre des vérifications (transaction Prisma) :

1. Tournoi existe et `status === 'PENDING'`. Sinon → **`throw`** → message typique : `Ce tournoi n'est plus disponible.`
2. Pas déjà une ligne `TournamentPlayer` pour `(tournamentId, userId)`. Sinon → **`Déjà inscrit !`**
3. `count(players) < maxPlayers`. Sinon → **`Tournoi complet.`**
4. Utilisateur existe et `user.chips >= buyIn`. Sinon → **`Jetons insuffisants.`**
5. Sinon : débit jetons, incrément `prizePool`, `tournamentPlayer.create`, émission socket globale **`tournament-updated`** si `TournamentService` a reçu une instance IO.

### Codes HTTP typiques côté `join`

- **401** : `authMiddleware` (token manquant, révoqué ou invalide) — **pas** un `400`.
- **400** : message d’erreur métier ci-dessus, ou message d’exception Prisma / autre capturé dans le `catch` de la route.

---

## 4. Frontend (réel)

### 4.1 Service HTTP

`client/src/services/tournament.service.ts` :

- Base URL **hardcodée** : `http://localhost:3000/api` (pas de `apiUrl` / proxy Vite comme ailleurs dans l’app).
- `getTournaments`, `createTournament`, `joinTournament`, `leaveTournament` envoient `Authorization: Bearer <localStorage token>`.

### 4.2 Création (admin UI)

`AdminTournaments.tsx` :

- `POST /api/tournaments/create` avec `{ name, buyIn, maxPlayers, startTime }` (`startTime` en ISO).
- Succès → toast + navigation vers **`/tournaments`** (lobby liste).

### 4.3 Lobby joueur

`TournamentLobby.tsx` :

- Au montage : `getTournaments()`, polling 60 s, écoute socket **`tournament-updated`** → recharge la liste.
- Bouton **S’INSCRIRE** : `joinTournament(id)` → `POST /api/tournaments/:id/join`.
- Affichage **Inscrit** / **Quitter** piloté par `isJoined` renvoyé par le `GET /api/tournaments`.

**Important (réel)** : le **créateur** du tournoi n’est **pas** marqué inscrit tant qu’il n’a pas appelé `join` lui-même : après création, la carte affiche encore « S’INSCRIRE » pour lui.

---

## 5. Démarrage du tournoi (réel)

- **Cron** : `server/src/cron/tournament.cron.ts` — sélectionne les tournois `PENDING` dont `startTime <= maintenant`, puis appelle `TournamentService.startTournament(id)`.
- **Manuel** : `POST /api/tournaments/:id/start` (auth requise).

`startTournament` (réel) :

- Exige au moins **2** joueurs inscrits ; sinon passe le tournoi en **`CANCELED`** et lance une erreur du type annulation.
- Passe le statut à **`ACTIVE`**, répartit les joueurs en tables de max **6**, crée des **`GameTable`** (moteur **tournoi classique**, pas `CashGameController`), enregistre dans **`activeGames`**, émet **`tournament-started`** via Socket.IO avec `playersToTeleport`, `playerToGameMap`, etc.

---

## 6. Comportement **attendu** (produit / cohérence)

Ce qui est raisonnablement attendu par un utilisateur ou une spec « clean » :

| Sujet | Attendu | Réel aujourd’hui |
|-------|---------|-------------------|
| Créateur après création | Souvent : **déjà inscrit** ou invitation explicite à s’inscrire une seule fois. | Créateur **non** inscrit automatiquement ; doit cliquer **S’INSCRIRE** comme tout le monde. |
| Erreur `join` | Message clair + code stable (ex. `INSUFFICIENT_CHIPS`) ; pas de double appel silencieux. | `400` + texte français ; double clic / double effet peut provoquer **`Déjà inscrit !`** sur le 2e appel. |
| URL API | Même résolution que le reste de l’app (proxy, env). | **`localhost:3000` en dur** → en prod ou autre hôte, appels peuvent partir vers la mauvaise origine (comportement « bizarre » ou CORS). |
| Liste lobby + token | `isJoined` fiable si même secret JWT que le login. | `GET /` utilise `jwt.verify(..., process.env.JWT_SECRET \|\| **'secret'**)` alors que `authMiddleware` utilise **`quantum_bluff_secret`** par défaut (`jwt.service.ts`). Si `JWT_SECRET` n’est **pas** défini, **isJoined peut être faux** alors que `join` (avec bon token) fonctionne — ou l’inverse selon les env. |
| DB | Tables `tournaments`, `tournament_players` présentes. | Sinon erreurs Prisma au runtime / en CI (à ne pas confondre avec erreurs métier `400`). |

---

## 7. Diagnostic : `400 (Bad Request)` sur **`join`** après création

Symptôme observé : requête vers **`.../tournaments/<id>/join`**, statut **400**, parfois **deux** requêtes.

### Causes **les plus probables** (alignées sur le code réel)

1. **« Déjà inscrit ! »**  
   - Premier `POST` réussit (200) ; un second `POST` (double clic, double effet React Strict Mode en dev, ou logique UI qui rappelle `join` deux fois) renvoie **400** avec ce message.

2. **« Jetons insuffisants. »**  
   - Le serveur compare **`User.chips`** en base au **`buyIn`** du tournoi. Le solde affiché côté client (localStorage / autre) peut être **plus élevé** que la vérité serveur.

3. **« Ce tournoi n'est plus disponible. »**  
   - Statut plus `PENDING` (démarrage cron, annulation, etc.) au moment du `join`.

4. **« Tournoi complet. »**  
   - Peu probable juste après création sauf si `maxPlayers` très bas et beaucoup d’inscrits.

### Ce que ce **n’est** probablement **pas**

- **401** déguisé : `authMiddleware` renvoie **401**, pas **400**, pour token invalide.
- Confusion avec **`/api/waiting-room/.../join`** : autre route, autre corps ; ici le contexte est bien le lobby tournoi (`TournamentService.joinTournament`).

### Vérification rapide (sans modifier le code)

- Onglet Réseau : lire le **corps JSON** de la réponse `400` → champ **`error`** (message exact).
- Vérifier s’il y a **deux** requêtes `join` consécutives pour le même `id`.

---

## 8. Socket (réel)

- `TournamentService.setIo(io)` : appelé depuis le démarrage serveur pour pouvoir émettre `tournament-updated`, `tournament-started`, etc. (voir `server/src/index.ts` et usages dans `tournament.service.ts`).
- Client lobby : `socket.on('tournament-updated', ...)` pour rafraîchir la liste.

---

## 9. Résumé une ligne

**Réel** : création = tournoi vide côté joueurs ; inscription = `POST /join` avec débit jetons + contraintes strictes ; erreurs métier = **400** avec message texte.  
**Attendu produit** : souvent auto-inscription du créateur, URL API unifiée, JWT cohérent sur `GET /tournaments`, et garde-fous UX contre double `join`.
