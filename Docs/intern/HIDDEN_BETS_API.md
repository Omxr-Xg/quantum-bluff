# API HTTP — Paris cachés (cash game)

Authentification : cookie session (même schéma que le reste du client).

## `POST /api/hidden-bets/quote`

Corps JSON :

- `gameId` (string, requis)
- `marketPhase` : `PRE_HAND` | `LIVE_FLOP` | `LIVE_TURN` | `LIVE_RIVER`
- `targetHandId` (string) — doit être `nextHandId` si `PRE_HAND`, ou `currentHandId` si LIVE (cohérence serveur stricte)
- `combinator` : `SINGLE` | `AND`
- `selections` : tableau de marchés (voir spec métier)
- `stakePreview` (optionnel, nombre)

Réponse : `quotedOdds`, `potentialPayout`, `pricingVersion` (`hidden-bets-pre-v1` ou `hidden-bets-live-v1`), `quoteExpiresAt` (ISO), `quoteHash`, `quotedProbability` (optionnel).

Erreurs typiques : 400 avec message / code (fenêtre fermée, mauvais `targetHandId`, marché non autorisé pour la phase).

## `POST /api/hidden-bets/place`

- `gameId`, `marketPhase`, `targetHandId`, `stake`, `combinator`, `selections`
- `actionId` (UUID, idempotence)
- `quoteHash`, `quoteExpiresAt`, `pricingVersion` — doivent correspondre à la quote

Champs persistés côté ticket : `marketPhase`, `quoteExpiresAt` (DateTime), `stateSnapshotJson` (optionnel, LIVE).

## `GET /api/hidden-bets/markets?gameId=...`

Marchés visibles / activés pour l’état courant de la table (phases, labels, paramètres). Le front ne duplique pas le catalogue métier.

## `GET /api/hidden-bets/history?limit=50`

Tickets de l’utilisateur connecté (filtres additionnels possibles : `status`, `gameId`, `handId`).

## `GET /api/hidden-bets/:ticketId`

Détail d’un ticket (propriétaire uniquement). Les tickets legacy `hidden-bets-v1` restent lisibles via compatibilité affichage.

## WebSocket

- `GAME_UPDATE` / état : bloc `hiddenBetState` (voir spec runtime) — source de vérité pour fenêtres.
- `HIDDEN_BET_TICKET_UPDATED` : `{ ticketId, status, resolvedAt?, payout?, resultSummary? }` (room `gameId`).

Référence métier : [HIDDEN_BETS_SPEC.md](./HIDDEN_BETS_SPEC.md). Runtime : [HIDDEN_BETS_RUNTIME_DESIGN.md](./HIDDEN_BETS_RUNTIME_DESIGN.md).
