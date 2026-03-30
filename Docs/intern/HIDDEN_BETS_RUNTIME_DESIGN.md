# Hidden bets — design runtime (fenêtres gelées LIVE)

Prérequis avant implémentation du code P1.2 dans `CashGameController` / `GameTable`.

## Objectif

Après révélation FLOP / TURN / RIVER, ouvrir une fenêtre courte où seuls les paris LIVE sont acceptés, **sans** accepter `PLAYER_ACTION`. Puis fermer la fenêtre et activer le vrai `currentTurn` pour la street.

## Sous-états recommandés

Le contrôleur cash peut exposer (en interne) :

- `BET_WINDOW_PRE_HAND` — entre mains (déjà couvert par `runtimePhase` existant + pas de table).
- `BET_WINDOW_FLOP` / `BET_WINDOW_TURN` / `BET_WINDOW_RIVER` — board à jour pour la street, timer LIVE actif, **actions poker bloquées**.

Alternative équivalente : `actionsBlockedForHiddenBetWindow: boolean` + `hiddenBetState.windowType` / `closesAt`.

## Séquence par street (FLOP exemple)

1. `GameTable` termine la distribution du flop (cartes en `communityCards`).
2. Passage à l’état « fenêtre LIVE flop » : démarrer timer `LIVE_WINDOW_MS` (ex. 5000 normal / 3000 turbo).
3. Émettre `GAME_UPDATE` + `GAME_STATE_UPDATED` avec `hiddenBetState` : `windowOpen: true`, `windowType: LIVE_FLOP`, `closesAt`, `currentHandId`, `nextHandId`.
4. Toute tentative `PLAYER_ACTION` : erreur `HIDDEN_BET_WINDOW_ACTIVE` ou message stable (400).
5. À expiration timer : `windowOpen: false`, `windowType: null`, activer `currentTurn` pour le premier joueur post-flop.
6. Émettre à nouveau snapshot.

## All-in runout

Si la main est en runout automatique (plus d’actions possibles entre streets) : **ne pas** ouvrir de fenêtre LIVE (passer directement à la suite logique du moteur).

## Turbo

Constantes distinctes du `turnTimeoutMs` : `LIVE_BET_WINDOW_MS_NORMAL`, `LIVE_BET_WINDOW_MS_TURBO`.

## Sync client

Le client **ne** ferme **pas** la fenêtre par décompte local seul : il affiche `closesAt` pour l’UX mais réagit aux `GAME_UPDATE` serveur.
