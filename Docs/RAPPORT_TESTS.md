# Rapport de tests — backend (Jest)

**Dernière exécution de référence :** mars 2025 (à régénérer après changements majeurs)

Ce document décrit la suite de tests unitaires du serveur (`server/`), centrée sur la logique poker (`GameTable`, `CashGameController`, `Evaluator`, types).

---

## Commandes

| Commande | Description |
|----------|-------------|
| `cd server && npm test` | Lance Jest (par défaut). |
| `cd server && npx jest --runInBand` | Exécution séquentielle (recommandé pour des résultats stables en local / CI). |
| `cd server && npm run test:coverage` | Rapport de couverture de code. |
| `cd server && npm run lint` | ESLint sur les fichiers TypeScript. |

Aucune base de données ni service externe n’est requis pour ces tests.

---

## Synthèse (référence)

| Indicateur | Valeur |
|------------|--------|
| **Suites** | 12 |
| **Tests** | 257 |
| **Statut** | Tous passés (`PASS`) |

Pour mettre à jour les chiffres après modification du code :

```bash
cd server && npx jest --runInBand
```

---

## Répartition par fichier

| Fichier | Tests | Contenu principal |
|---------|------:|-------------------|
| `GameTable.blinds-matrix.test.ts` | 101 | Matrice SB/BB : `getMinRaise`, pot initial après blinds, variantes de paires. |
| `CashGameController.seats.test.ts` | 30 | Sièges cash, sit/leave/rebuy, buy-in min, démarrage de main, multi-joueurs. |
| `GameTable.actions-matrix.test.ts` | 21 | Fold HU, montants de call préflop, erreurs (mauvais joueur, CHECK avec mise). |
| `GameTable.coverage.test.ts` | 17 | Déconnexions, all-in jusqu’au showdown, `calculateBet`, RAISE min, etc. |
| `GameTable.test.ts` | 17 | Comportement de base : blinds, tours, phases, actions CHECK/RAISE/CALL/FOLD. |
| `Evaluator.extended.test.ts` | 17 | Évaluation 7 cartes, `findWinner`, comparaisons de mains, noms FR. |
| `Deck.test.ts` | 17 | Deck : tirage, burn, flop/turn/river, reset. |
| `Evaluator.test.ts` | 14 | Catégories de mains, égalités, `findWinner` simple. |
| `GameTable.extended.test.ts` | 11 | Sanitized state, flux préflop HU, showdown. |
| `poker.types.test.ts` | 10 | Invariants sur types / phases / `Card` / `GameState`. |
| `ping.test.ts` | 1 | Smoke test minimal. |
| `example.test.ts` | 1 | Exemple Jest. |

Emplacement : `server/src/__tests__/`.

---

## Lecture des résultats

Les tests vérifient des **invariants** et des scénarios ciblés ; ils ne constituent pas une preuve formelle d’exactitude pour toutes les parties possibles.

Détails et limites : voir [`server/src/__tests__/TESTING_NOTES.md`](../server/src/__tests__/TESTING_NOTES.md).

---

## Intégration continue (extrait)

Exemple pour un job qui ne fait qu’exécuter la suite backend :

```yaml
- name: Tests backend
  run: |
    cd server
    npm ci
    npx jest --runInBand
```

---

## Voir aussi

- [`rapport-validation.md`](rapport-validation.md) — validation manuelle / bots / build (contexte plus large que les seuls tests Jest).
- [`SETUP_TESTEUR.md`](SETUP_TESTEUR.md) — mise en place environnement testeur.
