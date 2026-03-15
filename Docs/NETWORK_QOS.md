## Comportement réseau – QoS, reconnexion, timeouts

Ce document résume le comportement réseau côté serveur et client après l’implémentation RA1–RA5.

### 1. Connexions Socket.IO

- **Connexion**  
  - Chaque nouvelle connexion socket est loggée avec l’ID socket, l’ID utilisateur et le **nombre total de connexions simultanées**.
  - Objectif : suivre l’évolution de la charge temps réel.

- **Déconnexion**  
  - Chaque déconnexion est loggée avec l’ID socket, la raison (`reason`) et le nombre de connexions restantes.

### 2. Gestion des déconnexions joueur (timeout 10s)

- **Au moment de la déconnexion** (`disconnect`) :
  - Si le socket est associé à un `userId` et à une `gameId`, le serveur **ne met plus immédiatement fin à la partie**.
  - À la place, il :
    - Logge : le joueur est déconnecté et un **délai de 10s** est démarré.
    - Crée un timeout (10 000 ms) associé à ce `userId` dans `disconnectionTimeouts`.

- **Si le joueur revient avant les 10s** :
  - Sur `JOIN_GAME` / `JOIN_WAITING_ROOM`, si un timeout existe pour ce `userId` :
    - Le timeout est **clearé** et supprimé de `disconnectionTimeouts`.
    - Un log indique que le joueur est revenu avant la fin du délai.
  - Conséquence : la partie continue normalement (pas d’auto-fold, pas de fin de game).

- **Si le timeout de 10s expire** (le joueur ne revient pas) :
  - Le serveur :
    - Récupère la partie via `activeGames.get(gameId)`.
    - Marque le joueur comme **déconnecté** (`player.isConnected = false`).
    - Si c’était **son tour** (`game.state.currentTurn === userId`) :
      - Tente un **auto-FOLD** sécurisé :
        - `game.handlePlayerAction(userId, 'FOLD')`.
        - Envoie un `GAME_UPDATE` à tous les sockets de la room.
        - Redémarre le **turn timer** pour le joueur suivant.
    - Appelle `endGameDueToDisconnect()` :
      - Si un résultat est retourné :
        - `GAME_ENDED` est émis avec `winnerId`, `pot` et `reason: 'opponent_left'`.
        - La partie est supprimée de `activeGames`.
      - Sinon :
        - Seul un évènement `PLAYER_DISCONNECTED` est émis (la partie continue avec les joueurs restants).
    - Le timeout est supprimé de `disconnectionTimeouts`.

### 3. Mesure de latence des actions et du bot

- **Actions joueur (`PLAYER_ACTION`)** :
  - Au début du handler, un `startActionTime` est pris.
  - Après traitement de l’action et broadcast des `GAME_UPDATE`, un log est produit :
    - `[Réseau] ⚡ Action <ACTION> traitée et diffusée en <X>ms pour <playerId>`.
  - Objectif : monitorer la **latence bout-en-bout** (réception → traitement → diffusion).

- **Décisions du bot (`/api/bot/action`)** :
  - Au début du handler, un `startBotTime` est pris.
  - Après calcul de la décision :
    - Log info : `[Monitoring QoS] 🤖 Décision bot (<difficulty>) calculée en <duration>ms (Obj: <500ms)`.
    - Si `duration > 500` ms, log warning :
      - `[Alerte Réseau] ⚠️ Le bot a dépassé la limite de latence (<duration>ms)`.
  - Objectif : détecter rapidement les dérives de latence (CPU, réseau, saturation).

### 4. Comportement côté client (résumé)

- **Mode bot** :
  - Un flag `botIsFetchingRef` empêche d’envoyer plusieurs requêtes `/api/bot/action` en parallèle pendant que le bot « réfléchit ».
  - Ce flag est remis à `false` :
    - En cas de succès (après application de la décision),
    - En cas de réponse HTTP en erreur,
    - En cas d’exception réseau.

- **Actions invalides côté multi** :
  - Sur `ERROR` socket (`ACTION_ERROR`, `INVALID_RAISE`, `TOO_MANY_ACTIONS`) :
    - Affichage d’un toast d’erreur,
    - Reset de `isLoading` et `hasPlayerActed` pour éviter de bloquer l’UI.

