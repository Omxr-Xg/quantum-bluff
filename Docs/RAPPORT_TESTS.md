# Rapport de tests — Quantum Bluff (backend + frontend)

**Dernière exécution de référence :** mars 2026 — régénérer les chiffres après modification majeure des suites (`cd server && npx jest --runInBand` · `cd client && npx vitest run`).

Ce document regroupe **tous les tests automatisés** côté serveur (Jest) et **tous les tests automatisés** côté client (Vitest), ainsi qu’un rappel des **scénarios validés manuellement** (build, API bot, flux UI) décrits plus en détail dans [`rapport-validation.md`](rapport-validation.md).

---

## Synthèse globale

| Couche | Outil | Fichiers de suites | Tests | Statut |
|--------|--------|-------------------|------:|--------|
| **Backend** (`server/`) | Jest | 12 | **257** | Tous passés |
| **Frontend** (`client/`) | Vitest | 6 | **20** | Tous passés |
| **Total automatisé** | — | 18 | **277** | — |

Les fichiers `example.test.ts` / `example.test.tsx` et `ping.test.*` sont des **smoke tests** minimaux pour vérifier que les runners fonctionnent.

---

## Commandes

### Monorepo

| Commande | Description |
|----------|-------------|
| `cd server && npm test` | Jest — toutes les suites backend. |
| `cd server && npx jest --runInBand` | Jest séquentiel (recommandé CI / résultats stables). |
| `cd server && npm run test:coverage` | Couverture de code serveur. |
| `cd server && npm run lint` | ESLint serveur. |
| `cd client && npm test` | Vitest (watch). |
| `cd client && npx vitest run` | Vitest une passe (CI). |
| `cd client && npm run test:coverage` | Couverture client. |
| `cd client && npm run lint` | ESLint client. |

Aucune base de données ni service externe n’est requis pour les **tests unitaires** listés ci-dessous.

---

# Partie A — Backend (Jest)

**Emplacement :** `server/src/__tests__/`

## A.1 Vue par fichier

| Fichier | Tests | Rôle principal |
|---------|------:|----------------|
| `GameTable.blinds-matrix.test.ts` | 101 | Matrice SB/BB : `getMinRaise`, pot après `startHand`, relance min. |
| `CashGameController.seats.test.ts` | 30 | Cash game : sièges, sit/leave/rebuy, buy-in min, `startHand`, multi-joueurs. |
| `GameTable.actions-matrix.test.ts` | 21 | Fold HU, call préflop, erreurs (mauvais joueur, CHECK avec mise). |
| `GameTable.coverage.test.ts` | 17 | Déco, all-in → board, `calculateBet`, RAISE min, etc. |
| `GameTable.test.ts` | 17 | Moteur : blinds, tours, phases, CHECK/RAISE/CALL/FOLD. |
| `Evaluator.extended.test.ts` | 17 | 7 cartes, `findWinner` / `findWinners`, noms FR, comparaisons. |
| `Deck.test.ts` | 17 | Deck : tirage, burn, flop/turn/river, reset. |
| `Evaluator.test.ts` | 14 | Catégories de mains, égalités, `findWinner`. |
| `GameTable.extended.test.ts` | 11 | État, fog of war, `calculateCallAmount`, showdown. |
| `poker.types.test.ts` | 10 | Invariants types / phases / `Card` / `GameState`. |
| `ping.test.ts` | 1 | Smoke backend. |
| `example.test.ts` | 1 | Exemple Jest. |

**Fichiers non exécutés :** `example.test.ts.save` (sauvegarde).

---

## A.2 Scénarios regroupés par domaine

### GameTable — matrice blinds (`GameTable.blinds-matrix.test.ts`)

- **49 paires (SB, BB)** : SB = 1…40 avec BB = 2×SB, plus 9 paires « non standard » (ex. 5/12, 10/25, 1/3…).
- Pour **chaque** paire, 2 tests : `getMinRaise() === BB` ; après `startHand`, `pot === SB + BB`.
- **3 tests** supplémentaires : relance min sans main (SB/BB = 1/2, 10/20, 100/200).

### GameTable — actions HU & erreurs (`GameTable.actions-matrix.test.ts`)

- **15 tests** fold immédiat : SB/BB = (10+5i, 20+10i) pour i = 0…14 ; fold P1 → P2 gagne le pot.
- **3 tests** montant de call préflop pour le SB : paires (5,10), (10,20), (50,100).
- **3 tests** erreurs : mauvais joueur (2 variantes) ; CHECK impossible avec mise à suivre.

### CashGameController (`CashGameController.seats.test.ts`)

- Init SB/BB (ex. 1/2, 5/10, 25/50).
- Sit sur sièges 0…8, siège invalide, double sit, clamp buy-in (plusieurs montants).
- Leave, rebuy, `removeDisconnectedPlayer` entre mains.
- Garde-fous `startHand` : 0 ou 1 joueur → pas de main ; 2 joueurs → main ; `getSanitizedState` sans id.
- Matrice multi-joueurs : 2 à 6 joueurs sur différentes combinaisons de sièges.

### GameTable — cœur (`GameTable.test.ts`)

- Constructeur PREFLOP ; `getSanitizedState` + fog of war ; pas d’action avant `startHand`.
- `startHand` : cartes + blinds ; ordre de parole HU préflop ; SB complète vers BB ; CHECK interdit si mise ; mauvais tour → erreur ; FOLD → pot à l’autre ; `advancePhase` jusqu’à SHOWDOWN.
- `nextTurn`, `bettingRoundComplete`, `endBettingRound`, `handlePlayerAction` CHECK/RAISE/CALL/FOLD.

### GameTable — couverture complémentaire (`GameTable.coverage.test.ts`)

- `endGameDueToDisconnect` ; `forceFoldForDisconnect` ; `addPlayer` / `removePlayer`.
- `getMinRaise` / `calculateBet` (plafond jetons, joueur inexistant).
- `startHand` erreurs (moins de 2 connectés, joueur `isConnected: false`).
- `runOutBoardIfAllIn` ; `bettingRoundComplete` / `endBettingRound` ; validation RAISE.

### GameTable — étendu (`GameTable.extended.test.ts`)

- `getPlayerState` / `getState` ; sanitized (cartes visibles pour le demandeur).
- `calculateCallAmount` (SB complète, BB check après call SB).
- `canPlayerAct` ; `advancePhase` + showdown avec `showdownWinnerId` / `showdownHandName`.

### Evaluator (`Evaluator.test.ts` + `Evaluator.extended.test.ts`)

- `getHandValue` : haute carte → quinte royale ; quinte blanche ; égalités (split, kicker).
- `getHandInfo`, `findWinnerWithHand`, `findWinner` / `findWinners`, `Evaluator.evaluateHand` / `compareHands`.
- Cas 7 cartes, mains en français, ex-aequo.

### Deck (`Deck.test.ts`)

- 52 cartes, shuffle, `draw` (limites, erreurs), `burn`, `dealInitialCards`, flop/turn/river, `reset`, `debug`.

### Types (`poker.types.test.ts`)

- Phases (7), Suit/Rank, Card, Player, GameState (+ champs showdown).

### Smoke (`ping.test.ts`, `example.test.ts`)

- Tests minimaux « toujours verts ».

---

## A.3 Liste exhaustive des noms de tests (backend)

<details>
<summary><strong>CashGameController.seats.test.ts</strong> (30)</summary>

- **CashGameController — init :** SB=1 BB=2 ; SB=5 BB=10 ; SB=25 BB=50  
- **sit / leave / rebuy :** sit sièges 0…8 ; sit siège invalide ; double sit même siège ; buy-in clamp (100, 500, 1000, 50 → min) ; leave ok entre mains ; rebuy ajoute des jetons ; removeDisconnectedPlayer entre mains  
- **startHand garde-fous :** 0 joueur → pas de GameTable ; 1 joueur → pas de main ; 2 joueurs → main démarre ; getSanitizedState sans requesting id  
- **matrice sièges multiples :** 2 joueurs [0,1] ; 3 [0,2,4] ; 4 [0,1,2,3] ; 5 [0…4] ; 6 [0…5]  

</details>

<details>
<summary><strong>GameTable.coverage.test.ts</strong> (17)</summary>

- endGameDueToDisconnect : pas 2 joueurs ; les deux connectés ; un déconnecté → winnerId + pot  
- forceFoldForDisconnect : pot au dernier actif  
- addPlayer / removePlayer : position ; réindexation  
- getMinRaise / calculateBet : BB ; options perso ; plafond jetons ; joueur inexistant  
- startHand erreurs : &lt; 2 connectés ; déconnecté absent  
- runOutBoardIfAllIn : board jusqu’au showdown  
- bettingRoundComplete / endBettingRound  
- RAISE : montant insuffisant ; valide augmente pot + currentBet  

</details>

<details>
<summary><strong>GameTable.actions-matrix.test.ts</strong> (21)</summary>

- fold HU : 15 paires SB/BB (10/20 … 80/160) fold P1 → P2 gagne  
- call préflop : SB=5,10,50  
- erreurs : mauvais joueur ×2 ; CHECK avec mise  

</details>

<details>
<summary><strong>GameTable.test.ts</strong> (17)</summary>

- Moteur : constructor PREFLOP ; sanitized + fog ; impossible avant startHand ; startHand ; HU dealer/SB d’abord ; CALL SB ; CHECK interdit si mise ; pas ton tour ; FOLD → pot ; advancePhase FLOP→SHOWDOWN  
- Nouvelles méthodes : nextTurn ; bettingRoundComplete ; endBettingRound ; handlePlayerAction CHECK/RAISE/CALL/FOLD  

</details>

<details>
<summary><strong>GameTable.blinds-matrix.test.ts</strong> (101)</summary>

- 98 tests paramétrés (`test.each`) sur 49 paires (SB,BB) × 2 : `getMinRaise() === BB` et `pot === SB+BB` après `startHand`  
- 3 tests : relance min sans main pour (1,2), (10,20), (100,200)  

</details>

<details>
<summary><strong>Evaluator.extended.test.ts</strong> (17)</summary>

- getHandInfo : paire ; quinte flush FR ; &lt;5 cartes ; 7 cartes paire unique vs double paire  
- findWinnerWithHand : ok ; liste vide → erreur  
- findWinner limites : vide ; un joueur  
- findWinners : ex-aequo ; un seul gagnant  
- getHandValue limites : &lt;5 cartes ; 7 cartes meilleures 5  
- Classe statique : evaluateHand ; compareHands &gt; &lt; =  

</details>

<details>
<summary><strong>Deck.test.ts</strong> (17)</summary>

- Init : 52 uniques ; shuffle  
- draw : 0 ; négatif ; 1 ; 5 ; trop grand ; drawCard  
- burn : une carte ; plusieurs  
- dealInitialCards : 2 par joueur ; init cards  
- Flop / Turn / River  
- reset ; debug  

</details>

<details>
<summary><strong>Evaluator.test.ts</strong> (14)</summary>

- getHandValue : haute carte → quinte royale ; quinte blanche  
- Égalité : même quinte ; même paire kicker différent  
- resolveShowdown : findWinner correct  

</details>

<details>
<summary><strong>GameTable.extended.test.ts</strong> (11)</summary>

- getPlayerState ; getState ; sanitized visible / masqué  
- calculateCallAmount SB→BB ; BB check après SB call  
- canPlayerAct ; tour après CALL  
- advancePhase + showdown winner + handName  

</details>

<details>
<summary><strong>poker.types.test.ts</strong> (10)</summary>

- GamePhase ; Suit ; Rank ; Card ; Player ; GameState (+ showdown fields)  

</details>

<details>
<summary><strong>ping.test.ts</strong> (1) · <strong>example.test.ts</strong> (1)</summary>

- should pass basic test · should pass  

</details>

---

## A.4 Limites (backend)

Les tests vérifient des **invariants** et des **scénarios ciblés** ; ce n’est pas une preuve pour toutes les parties possibles. Détails : [`server/src/__tests__/TESTING_NOTES.md`](../server/src/__tests__/TESTING_NOTES.md).

---

# Partie B — Frontend (Vitest)

**Emplacement :** `client/src/__tests__/` et `client/example.test.tsx`

## B.1 Vue par fichier

| Fichier | Tests | Rôle principal |
|---------|------:|----------------|
| `utils/cards.test.ts` | 10 | `normalizeServerCard` : entrées invalides, suit, value/rank. |
| `CommunityCards.test.tsx` | 5 | Pot, 5 emplacements board, rendu cartes, mode daltonien. |
| `utils/avatars.test.ts` | 3 | `getPlayerAvatar` (placeholder). |
| `PokerTable.test.tsx` | 1 | Rendu sans crash (smoke). |
| `ping.test.tsx` | 1 | Smoke frontend. |
| `example.test.tsx` (racine `client/`) | 1 | Exemple Vitest. |

---

## B.2 Liste exhaustive des tests (frontend)

### `client/example.test.tsx`
- Example test › should pass

### `src/__tests__/ping.test.tsx`
- Frontend health check › should pass basic test

### `src/__tests__/PokerTable.test.tsx`
- PokerTable › should render without crashing

### `src/__tests__/utils/cards.test.ts`
- **normalizeServerCard — entrées invalides :** null ; undefined ; objet sans suit/value  
- **suit :** HEARTS → hearts ; DIAMONDS, CLUBS, SPADES ; défaut hearts si inconnu  
- **value :** rank J,Q,K,A ; value numérique 11–14 ; chiffres 2–10  

### `src/__tests__/utils/avatars.test.ts`
- getPlayerAvatar : chaîne définie ; chaîne vide (placeholder) ; n’importe quelle chaîne sans erreur  

### `src/__tests__/CommunityCards.test.tsx`
- **Rendu de base :** pot affiché ; 5 emplacements (flop, turn, river)  
- **Cartes affichées :** valeur + symbole ; value string J, Q, K, 10  
- **Mode daltonien :** `colorblindMode=true` sans erreur  

---

## B.3 Limites (frontend)

- Pas de tests E2E (Playwright/Cypress) dans le dépôt au moment de ce rapport.
- `PokerTable` est un smoke test léger (pas de mock i18n complet — warning possible en console pendant les tests).

---

# Partie C — Scénarios validés hors suites unitaires (référence)

Ces vérifications sont documentées dans [`rapport-validation.md`](rapport-validation.md) : builds, lint, API `/api/bot/action` (difficultés, format cartes), timer tour, auto CHECK/FOLD, affichage cartes, mode bot, toasts amis, etc. Elles **complètent** mais ne **remplacent** pas les 277 tests automatisés ci-dessus.

Pour une **vue d’ensemble de tous les scénarios** (modes de jeu, tapis, cash, spectateur, bots, accessibilité, backlog), voir [`POKER_SCENARIOS.md`](POKER_SCENARIOS.md).

---

## Intégration continue (exemple)

```yaml
- name: Tests backend
  run: |
    cd server && npm ci && npx jest --runInBand
- name: Tests frontend
  run: |
    cd client && npm ci && npx vitest run
```

---

## Voir aussi

- [`rapport-validation.md`](rapport-validation.md) — validation manuelle / API / build  
- [`SETUP_TESTEUR.md`](SETUP_TESTEUR.md) — environnement testeur  
- [`POKER_SCENARIOS.md`](POKER_SCENARIOS.md) — scénarios poker (jeu)  
- [`REPORT.md`](REPORT.md) — section 15 (aperçu tests)
