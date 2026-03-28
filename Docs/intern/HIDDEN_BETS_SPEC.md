# Hidden bets — spécification métier (V1 cash game)

Référence normative pour le backend autoritaire. Le client n’interprète pas les règles : affichage et intentions seulement.

## Identifiants

- **gameId** : identifiant de session cash (`CashGameController.id`), aligné sur la room WebSocket.
- **handId** : identifiant logique de la main. Entre deux mains, le serveur expose **nextHandId** : les paris V1 ciblent la **prochaine** main ; au `startHand`, ce `handId` devient **currentHandId** sur la table.
- **nextHandId** : généré à la fin de main (`onHandComplete`) ; stable jusqu’au démarrage effectif de la main suivante.

## Fenêtre de marché (règle unique)

- **hiddenBetWindowOpen** = `true` uniquement lorsque :
  - `runtimePhase` est `NEXT_HAND_COUNTDOWN` ou `WAITING_PLAYERS`, **et**
  - aucune main n’est en cours (`gameTable === null`), **et**
  - au moins 2 joueurs assis avec jetons peuvent jouer la prochaine main.
- Fermeture **dès** `startHand()` (première carte / blinds) : plus aucun placement accepté pour ce `nextHandId`.
- Tout placement est refusé si `handId` ≠ `nextHandId` attendu ou si la fenêtre est fermée.

## Marchés V1 (sélection simple ou combiné AND whitelist P3)

### A — `PLAYER_WINS`

- **Paramètre** : `playerId` (userId du siège).
- **Showdown** : gagnant si `playerId ∈ showdownWinnerIds` (split : tous les IDs listés sont gagnants pour **leur** ticket respectif).
- **WIN_BY_FOLD** : gagnant si ce joueur est l’unique récipiendaire du pot (dernier non couché) — `showdownWinnerIds` côté moteur contient ce joueur.

### B — `WINNING_HAND_CLASS`

- **Paramètre** : classe d’évaluation alignée sur `Evaluator` / `evaluateSeven` : `HIGH_CARD`, `PAIR`, `TWO_PAIR`, `THREE_OF_A_KIND`, `STRAIGHT`, `FLUSH`, `QUANTUM_COMBI`, `FULL_HOUSE`, `FOUR_OF_A_KIND`, `STRAIGHT_FLUSH`.
- **Showdown / ALL_IN_RUNOUT** : on compare la classe de la **meilleure main 7 cartes** du (des) gagnant(s). En split, les gagnants ont la même valeur de main → **une seule classe** ; le marché est gagnant si la classe annoncée == classe gagnante.
- **WIN_BY_FOLD** : **VOID** (aucune main showdown observable).
- **hand_canceled** : **VOID**.

### C — `WINNING_HAND_CONTAINS_RANK`

- **Paramètre** : rang (`2`…`A`) : la **meilleure main de 5 cartes** du joueur gagnant (ou du premier gagnant en split, même board) contient au moins une carte de ce rang.
- Implémentation : extraire les 7 cartes du gagnant, calculer le score via `evaluateSeven` ; les 5 cartes effectives sont dérivées du même chemin d’évaluation que le showdown (utiliser la logique d’évaluation existante pour obtenir rangs présents dans la main retenue). En pratique : vérifier la présence du rang dans les cartes formant la meilleure combinaison (aligné serveur `Evaluator`).
- **WIN_BY_FOLD** : **VOID**.
- **hand_canceled** : **VOID**.

## Matrice de résolution (rappel)

| Marché | Showdown | WIN_BY_FOLD | ALL_IN_RUNOUT | hand annulée |
|--------|----------|-------------|-----------------|--------------|
| PLAYER_WINS | WON/LOST selon gagnants | WON/LOST selon pot | idem showdown | VOID |
| WINNING_HAND_CLASS | WON/LOST | VOID | WON/LOST | VOID |
| WINNING_HAND_CONTAINS_RANK | WON/LOST | VOID | WON/LOST | VOID |

## Quote et placement

- **POST /quote** : pas de ledger ; retourne `pricingVersion`, `quotedOdds`, `potentialPayout`, `quoteExpiresAt`, `quoteHash` (intégrité des paramètres + version).
- **POST /place** : idempotence forte sur `(userId, actionId)` ; valide fenêtre, `handId`, quote non expirée, hash si fourni ; débit stake + ticket `PENDING`.

## Résolution

- Statuts ticket : `PENDING` → `SETTLING` → `WON` | `LOST` | `VOID` | `CANCELED`.
- Résolution **idempotente** par `(gameId, handId)` : une seule passe de traitement effective (verrou in-process ou transaction unique).
- Ledger : `HIDDEN_BET_STAKE`, `HIDDEN_BET_PAYOUT`, `HIDDEN_BET_REFUND_VOID`, `HIDDEN_BET_REFUND_CANCEL`.

## Temps réel (optionnel)

- Événement `HIDDEN_BET_TICKET_UPDATED` : `{ ticketId, status, resolvedAt?, payout?, resultSummary? }`. La vérité reste API + historique.

## Combinés AND (P3)

- Uniquement **AND**, **2 conditions max**, paires **whitelist** avec **cotes tabulaires dédiées** (pas de produit libre des cotes).
