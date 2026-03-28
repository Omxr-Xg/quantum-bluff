# API HTTP — Paris cachés (cash game)

Authentification : cookie session (même schéma que le reste du client).

## `POST /api/hidden-bets/quote`

Corps JSON :

- `gameId` (string)
- `handId` (string) — doit être `hiddenBetNextHandId` du snapshot `GAME_UPDATE`
- `combinator` : `SINGLE` | `AND`
- `selections` : tableau de marchés (voir spec métier)
- `stakePreview` (optionnel, nombre) — pour afficher un gain potentiel

Réponse : `quotedOdds`, `potentialPayout`, `pricingVersion`, `quoteExpiresAt`, `quoteHash`, `quotedProbability`.

## `POST /api/hidden-bets/place`

- `gameId`, `handId`, `stake`, `combinator`, `selections`
- `actionId` (UUID, idempotence)
- `quoteHash`, `quoteExpiresAt`, `pricingVersion` — doivent correspondre à la quote

## `GET /api/hidden-bets/history?limit=50`

Tickets de l’utilisateur connecté.

## `GET /api/hidden-bets/:ticketId`

Détail d’un ticket (propriétaire uniquement).

## WebSocket

- `HIDDEN_BET_TICKET_UPDATED` : `{ ticketId, status, resolvedAt, payout, resultSummary }` (room `gameId`).

Référence métier : [HIDDEN_BETS_SPEC.md](./HIDDEN_BETS_SPEC.md).
