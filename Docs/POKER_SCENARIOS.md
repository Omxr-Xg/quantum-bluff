# Scénarios Quantum Bluff — référence complète

Document unique listant **tous les scénarios** couverts ou attendus : règles poker exceptionnelles, modes de jeu, flux réseau, bots, compte social, tests automatisés et validation manuelle.

**Documents liés :** [`RAPPORT_TESTS.md`](RAPPORT_TESTS.md) (tests Jest/Vitest) · [`rapport-validation.md`](rapport-validation.md) (checklist build/API/UI) · [`SETUP_TESTEUR.md`](SETUP_TESTEUR.md) · [`bot-difficulte.md`](bot-difficulte.md) · [`bot-integration-frontend.md`](bot-integration-frontend.md) · [`REPORT.md`](REPORT.md)

---

## Table des matières

1. [Modes et points d’entrée](#1-modes-et-points-dentrée)
2. [Déroulé d’une main (Texas Hold’em)](#2-déroulé-dune-main-texas-holdem)
3. [Tapis, pots et multi-joueurs](#3-tapis-pots-et-multi-joueurs)
4. [Fin de main, showdown et élimination](#4-fin-de-main-showdown-et-élimination)
5. [Erreurs, tours d’enchères, blinds](#5-erreurs-tours-denchères-blinds)
6. [Réseau, timer et déconnexions](#6-réseau-timer-et-déconnexions)
7. [Cash game, spectateur, rematch](#7-cash-game-spectateur-rematch)
8. [Mode bot et API](#8-mode-bot-et-api)
9. [Compte, amis, chat, accessibilité](#9-compte-amis-chat-accessibilité)
10. [Client desktop (Electron)](#10-client-desktop-electron)
11. [Tests automatisés](#11-tests-automatisés)
12. [Validation manuelle (hors suites unitaires)](#12-validation-manuelle-hors-suites-unitaires)
13. [Non couvert / backlog](#13-non-couvert--backlog)

---

## 1. Modes et points d’entrée

| Scénario | Description | Où / comment |
|----------|-------------|--------------|
| **Mode bot (local)** | Partie sans socket serveur ; état géré dans le client (`Game.tsx`) | URL type `/game?mode=bot&bots=N&difficulty=…` depuis [`BotConfiguration`](client/src/pages/BotConfiguration.tsx) ; difficultés FR → API (`facile`→`easy`, etc.) — voir [`bot-difficulte.md`](bot-difficulte.md) |
| **Partie multijoueur** | Salle avec Socket.io, état serveur (`GameTable` / `CashGameController`) | Lobby → file d’attente → `/game?gameId=…` avec JWT / session |
| **Cash game** | Sièges, sit / leave / rebuy, file de retour après une main | Événements `CASH_*`, affichage compte à rebours / sièges dans `Game.tsx` ; logique testée côté serveur — voir `CashGameController.seats.test.ts` |
| **Spectateur** | Voir la table sans jouer ; file pour **rejoindre à la prochaine main** | `spectatorRejoinQueue`, boutons `SPECTATOR_QUEUE_*`, UI spectateur dans `Game.tsx` |
| **Rematch** | Nouvelle salle après une partie | Socket `REMATCH_CREATED` → navigation `/waiting-room?roomId=…` |
| **Tutoriel / visite guidée** | Mise en avant table, pot, actions | `GameInteractiveTour` + refs dans `Game.tsx` |

---

## 2. Déroulé d’une main (Texas Hold’em)

| Étape | Scénario | Implémentation / notes |
|-------|----------|-------------------------|
| **Distribution** | 2 cartes fermées par joueur actif ; blinds postées | `startHand`, deck (`Deck` : tests burn, flop/turn/river) |
| **Preflop** | En HU : dealer = SB parle en premier ; relance min = BB typiquement | Tests `GameTable.test.ts`, matrice blinds |
| **Flop / Turn / River** | Brûlage + cartes communes | `advancePhase`, `dealFlop` / `dealTurn` / `dealRiver` |
| **Mises** | CHECK / CALL / RAISE / FOLD ; relance min ; jetons plafonnés à la stack | `handlePlayerAction`, `calculateBet`, tests erreurs (mauvais joueur, CHECK avec mise) |
| **Showdown** | Comparaison des mains (7 cartes → meilleure main 5) | `Evaluator`, `findWinner` / `findWinners`, split pot |
| **Abattage visuel (UI)** | Avant l’overlay « gagnant », **~3 s** pour voir les cartes des joueurs encore en jeu (non couchés) | `Game.tsx` — délai avant `RoundTransition` ; exception si fin par « adversaire parti » (`skipRevealDelay`) |

---

## 3. Tapis, pots et multi-joueurs

| Scénario | Statut | Notes |
|----------|--------|--------|
| **All-in simple 2 joueurs** | ✅ | Remboursement surplus si besoin (`totalRefund` / logique `handleCall` côté moteur) |
| **All-in → board révélé jusqu’au showdown** | ✅ | Test `runOutBoardIfAllIn` (`GameTable.coverage.test.ts`) |
| **Side pots (3+ joueurs)** | Partiel / ⏸ | UI client peut afficher **plusieurs side pots** en mode bot (`sidePots` dans `Game.tsx` / `CommunityCards`) ; **serveur one-shot HU** dans beaucoup de chemins — vérifier le comportement exact pour **cash multi** si stacks inégaux |
| **Double all-in simultané N>2** | ⏸ | Dépend de l’extension complète des side pots côté serveur |
| **Moins de jetons que la blind** | ⏸ | All-in forcé / blind morte : à cadrer si non couvert partout |

---

## 4. Fin de main, showdown et élimination

| Scénario | Statut | Notes |
|----------|--------|--------|
| **Joueur à 0 jeton** | ✅ | `gameOverReason` (`human_eliminated` / `bot_eliminated`) en mode bot ; retour lobby |
| **Égalité / split pot** | ✅ | API `evaluate-winner` : `winnerIds`, `isSplit` ; jeton impair au dealer côté règles documentées |
| **Gagnant affiché (overlay)** | ✅ / à recheck | `RoundTransition` + données `showdownResult` ; validation manuelle recommandée sur longues mains |
| **Adversaire parti (multi)** | ✅ | `GAME_ENDED` / pot au joueur restant ; **pas** de délai d’abattage si `skipRevealDelay` |
| **SB avec moins que la SB** | ⏸ | Blinds dynamiques / all-in blind |

---

## 5. Erreurs, tours d’enchères, blinds

| Scénario | Statut | Notes |
|----------|--------|--------|
| **String bet** | ⏸ | Non appliqué (montant saisi d’un coup côté UI) |
| **Action hors tour (out of turn)** | Partiel | Le **moteur** rejette si ce n’est pas le bon joueur (tests) ; pas de file d’actions annulées type live |
| **Relance minimale** | ✅ | `getMinRaise`, plafonnement stack ; matrices SB/BB |
| **Heads-up** | ✅ | SB = dealer préflop ; ordre des mises cohérent avec tests |
| **Blinds** | ✅ | Matrice large en tests ; **en jeu** souvent **50/100** selon configuration |
| **Dead button / time bank** | ⏸ | Non documenté comme implémenté |

---

## 6. Réseau, timer et déconnexions

| Scénario | Description |
|----------|-------------|
| **Timer de tour (~20 s)** | `TURN_TIMEOUT_MS`, événement `TURN_TIMER`, `timeLeft` — voir `game.gateway.ts` |
| **Auto-action à 0 s** | Si `callAmount === 0` → **CHECK**, sinon **FOLD** |
| **Fin de partie par déco** | `endGameDueToDisconnect`, `forceFoldForDisconnect` (tests) |
| **Sync état** | `GAME_UPDATE` avec `getSanitizedState` (brouillage des cartes adverses) |
| **Fog of war** | Tests `getSanitizedState` : cartes visibles pour le joueur demandeur uniquement |

---

## 7. Cash game, spectateur, rematch

| Scénario | Description |
|----------|-------------|
| **Siège / leave / rebuy** | Contrôleur cash + tests sièges 0–8, buy-in min, plusieurs joueurs sur sièges variés |
| **Attente joueurs cash** | `CASH_WAITING_PLAYERS`, compte à rebours nouvelle main |
| **File spectateur** | `SPECTATOR_QUEUE_JOIN` / `LEAVE`, état `spectatorWantsToRejoin` |
| **Rematch hôte** | Fetch room-info pour `isRematchHost`, chargement `rematchLoading` |

---

## 8. Mode bot et API

| Élément | Détail |
|---------|--------|
| **`POST /api/bot/action`** | Corps : cartes, board, `difficulty`, mises, pot, position, etc. — voir [`bot-integration-frontend.md`](bot-integration-frontend.md) |
| **Quatre difficultés** | `easy`, `medium`, `hard`, `expert` — logique [`botAI.ts`](../server/src/logic/botAI.ts) |
| **`POST /api/bot/evaluate-winner`** | Showdown : pas de triche aux cartes ; toutes les difficultés utilisent l’évaluateur |
| **Multiplicateur de gains** | `winMultiplier` (ex. facile 0,3 … expert 1,0) — **uniquement** gains humain mode bot |
| **Délai « réflexion » bot** | Court délai aléatoire avant d’appliquer l’action (UX) |

---

## 9. Compte, amis, chat, accessibilité

| Domaine | Scénarios |
|---------|-----------|
| **Auth** | Inscription, connexion, JWT, profil (Prisma + routes API) ; **mode bot** jouable sans compte |
| **Amis** | Demandes, acceptation, statut en ligne ; **toasts** via sockets `FRIEND_*` |
| **Chat de table** | Envoi / réception messages (composant `PokerChat`) |
| **i18n** | Locales **fr, en, es, uk, ar** (clés `game.*`, etc.) |
| **Accessibilité** | Mode daltonien (`colorblindMode`), contrastes — tests `CommunityCards` + usage table |
| **Quantum HUD** | Probabilités / aide décision (overlay dédié) |
| **Hidden Bets** | Panneau résultats / paris cachés selon produit |

---

## 10. Client desktop (Electron)

| Scénario | Notes |
|----------|--------|
| **Build app** | Voir [`BUILD_APPS.md`](BUILD_APPS.md) |
| **Mises à jour** | `GET /updates/latest` — voir [`DEPLOY.md`](DEPLOY.md) |

---

## 11. Tests automatisés

| Couche | Contenu |
|--------|---------|
| **Backend (Jest)** | **12** fichiers, **257** tests : `GameTable` (cœur, matrices, couverture), `CashGameController`, `Evaluator`, `Deck`, `poker.types`, smokes — **liste détaillée** : [`RAPPORT_TESTS.md`](RAPPORT_TESTS.md) section A |
| **Frontend (Vitest)** | **6** fichiers, **20** tests : `normalizeServerCard`, `CommunityCards`, `PokerTable` smoke, avatars, smokes — section B de [`RAPPORT_TESTS.md`](RAPPORT_TESTS.md) |
| **Total** | **277** tests unitaires |

**Non inclus dans le dépôt :** tests **E2E** (Playwright/Cypress) — à traiter au backlog si besoin.

---

## 12. Validation manuelle (hors suites unitaires)

Checklist synthétique (détail historique : [`rapport-validation.md`](rapport-validation.md)) :

| Zone | Exemples de scénarios |
|------|---------------------|
| **Build** | `npm run build` serveur + `vite build` client |
| **Lint** | ESLint serveur / client |
| **API bot** | `easy` / `medium` / `hard` / `expert` ; format cartes type frontend (`suit`, `value`) |
| **UI jeu** | Cartes héros visibles, adversaires masqués ; pot et jetons cohérents |
| **Longue main** | Preflop → river → showdown + overlay gagnant + **délai abattage** si activé |
| **Réseau** | `VITE_API_URL` ou même origine ; DB + Redis pour parcours complets auth/amis |

---

## 13. Non couvert / backlog

Résumé des limites connues (aligné §3–5 et [`TESTING_NOTES`](../server/src/__tests__/TESTING_NOTES.md) si présent) :

- Side pots **complets** côté serveur pour toutes les configurations **3+** joueurs (à confirmer selon branche).
- String bet, time bank, dead button, ordre d’abattage « live » au showdown.
- Lint frontend : dette possible (`any`, variables inutilisées) — voir rapport validation.

---

## Historique du document (ancienne structure)

Les sections **1–2** (tapis / fin HU) et **3–5** (erreurs / blinds / showdown) du fichier d’origine « SCÉNARIOS EXCEPTIONNELS POKER HOLDEM » sont **fusionnées** ci-dessus dans les tableaux §3–5 et §4. Les statuts ✅ / ⏸ sont conservés ou précisés (ex. side pots UI vs serveur).

*Dernière mise à jour : mars 2026 — alignée sur le code et [`RAPPORT_TESTS.md`](RAPPORT_TESTS.md).*
