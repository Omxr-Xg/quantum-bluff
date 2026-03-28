# Hidden bets — spécification métier (V1 cash game)

Référence normative pour le backend autoritaire. Le client n’interprète pas les règles : affichage et intentions seulement.

## Identifiants

- **gameId** : identifiant de session cash (`CashGameController.id`), aligné sur la room WebSocket.
- **handId / targetHandId** : identifiant logique de la main ciblée par le ticket.
  - **PRE_HAND** : cible **nextHandId** (prochaine main).
  - **LIVE_*** : cible **currentHandId** (main en cours).
- **nextHandId** : généré à la fin de main (`onHandComplete`) ; stable jusqu’au `startHand()` suivant.
- **currentHandId** : `gameTable.state.handId` pendant une main en cours.

## Phases marché (`marketPhase`)

Enum produit (API / Prisma) :

- `PRE_HAND` — paris entre deux mains.
- `LIVE_FLOP`, `LIVE_TURN`, `LIVE_RIVER` — paris pendant la main, fenêtres gelées après révélation de la street (V1 LIVE **sans** `LIVE_PREFLOP`).

Règle : **PRE_HAND** → `targetHandId === nextHandId` ; **LIVE_*** → `targetHandId === currentHandId`. Le serveur rejette toute incohérence (400, code stable).

## Types runtime : `HiddenBetWindowType` (socket / `hiddenBetState`)

```text
"PRE_HAND" | "LIVE_FLOP" | "LIVE_TURN" | "LIVE_RIVER" | null
```

`LIVE_PREFLOP` n’existe pas dans ce type tant que le produit ne l’active pas.

## Fenêtres PRE_HAND

- Ouverte entre deux mains quand : pas de `gameTable`, au moins 2 joueurs avec jetons, phase runtime entre-mains autorisée (countdown ou attente joueurs), comme aujourd’hui.
- Fermeture à `startHand()` : plus de placement PRE sur ce `nextHandId`.
- **Validation quote/place** : `targetHandId === nextHandId` au moment de la requête.

## Fenêtres LIVE (V1) — fenêtres gelées

Contrat serveur (le front ne déduit pas la fin de fenêtre) :

1. Cartes de la street révélées ; état table à jour.
2. `hiddenBetState.windowOpen = true`, `windowType` ∈ { `LIVE_FLOP`, `LIVE_TURN`, `LIVE_RIVER` }, `closesAt` renseigné.
3. **`PLAYER_ACTION` refusé** pendant toute la fenêtre (erreur explicite).
4. Fin du timer serveur.
5. `windowOpen = false` ; `windowType` = `null` hors fenêtre.
6. **`currentTurn`** activé pour le tour d’enchères sur cette street ; actions autorisées.

Durées par défaut (config serveur) : **5 s** mode normal, **3 s** mode turbo pour chaque fenêtre FLOP/TURN/RIVER. Le turbo affecte surtout le temps d’action poker ; les fenêtres LIVE sont des constantes distinctes.

**All-in runout automatique** : aucune fenêtre LIVE ouverte entre streets si la main est déjà en runout automatique (mains entièrement all-in avant nouvelle street) — évite courses et UX incohérentes.

Détails d’implémentation (timers, sous-phases `BET_WINDOW_*`) : [HIDDEN_BETS_RUNTIME_DESIGN.md](./HIDDEN_BETS_RUNTIME_DESIGN.md).

## Pricing

- **PRE_HAND** : `pricingVersion = hidden-bets-pre-v1` (tables heuristiques ; pas Monte Carlo généralisé).
- **LIVE** : `pricingVersion = hidden-bets-live-v1` (tables / heuristiques distinctes ; entrées : street, board, joueurs actifs/foldés).
- Les cotes PRE et LIVE pour un même marché conceptuel peuvent différer (règle non négociable).

### Compatibilité tickets legacy

- Ancienne version `hidden-bets-v1` : tickets existants **read-only** en historique ; **aucun nouveau ticket** avec cette version.
- Affichage : couche de compatibilité mappe l’ancienne version vers l’affichage unifié (`hidden-bets-pre-v1` en lecture logique pour les anciens enregistrements PRE).

## Marchés PRE_HAND (V1)

| Marché | Paramètres |
|--------|------------|
| `PLAYER_WINS` | `playerId` |
| `WINNING_HAND_CLASS` | `class` (classe Evaluator) |
| `WINNING_HAND_CONTAINS_RANK` | `rank` |

## Marchés LIVE (V1)

| Marché | Paramètres |
|--------|------------|
| `PLAYER_WINS_CURRENT_HAND` | `playerId` |
| `HAND_REACHES_SHOWDOWN` | — |
| `HAND_ENDS_BY_FOLD` | — |
| `FINAL_WINNING_HAND_CLASS` | `class` |

Pas de combinés LIVE en V1. Pas de `LIVE_PREFLOP` en V1.

## Matrice de résolution PRE_HAND

| Marché | Showdown | WIN_BY_FOLD | ALL_IN_RUNOUT | Main annulée |
|--------|----------|-------------|----------------|--------------|
| PLAYER_WINS | WON/LOST | WON/LOST | idem showdown | VOID |
| WINNING_HAND_CLASS | WON/LOST | VOID | WON/LOST | VOID |
| WINNING_HAND_CONTAINS_RANK | WON/LOST | VOID | WON/LOST | VOID |

## Matrice de résolution LIVE

| Marché | Showdown | WIN_BY_FOLD | ALL_IN_RUNOUT | Main annulée |
|--------|----------|-------------|----------------|--------------|
| PLAYER_WINS_CURRENT_HAND | WON/LOST | WON/LOST | idem showdown | VOID |
| HAND_REACHES_SHOWDOWN | WON | LOST | WON | VOID |
| HAND_ENDS_BY_FOLD | LOST | WON | LOST | VOID |
| FINAL_WINNING_HAND_CLASS | WON/LOST | VOID | WON/LOST | VOID |

`FORCED_END` / annulation : traiter comme « main annulée » (VOID pour les marchés concernés).

## Split pot

- **PLAYER_WINS** / **PLAYER_WINS_CURRENT_HAND** : vrai si `playerId ∈ winnerIds` (chaque gagnant en split valide son propre ticket).
- **WINNING_HAND_CLASS** / **FINAL_WINNING_HAND_CLASS** : une seule classe gagnante ; split = même classe pour les gagnants.
- Si cas ambigu impossible à classer proprement → **VOID**.

## Quote et placement

- **POST /quote** : pas de ledger ; `marketPhase`, `targetHandId`, `selections`, `combinator` ; retour `pricingVersion`, `quotedOdds`, `potentialPayout`, `quoteExpiresAt`, `quoteHash` ; pour LIVE, snapshot d’état peut être persisté au place (`stateSnapshotJson`).
- **POST /place** : idempotence `(userId, actionId)` ; valide fenêtre, `targetHandId`, quote non expirée, hash ; débit stake + ticket `PENDING` avec `marketPhase`, `quoteExpiresAt` stocké.

## Résolution

- Statuts : `PENDING` → `SETTLING` → `WON` | `LOST` | `VOID` | `CANCELED`.
- Idempotence par `(gameId, handId)` pour la passe de résolution.
- Ledger : `HIDDEN_BET_STAKE`, `HIDDEN_BET_PAYOUT`, `HIDDEN_BET_REFUND_VOID`, `HIDDEN_BET_REFUND_CANCEL`.

## Temps réel (optionnel)

- `HIDDEN_BET_TICKET_UPDATED` : `{ ticketId, status, resolvedAt?, payout?, resultSummary? }`. Vérité = API + historique.

## Combinés AND (P3 uniquement, PRE)

- **AND**, 2 conditions max, paires whitelist, `hidden-bets-pre-v1` ; pas de combinés LIVE.
