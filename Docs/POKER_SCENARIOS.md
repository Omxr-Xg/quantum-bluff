# Scénarios exceptionnels poker Hold'em – état d’implémentation

Référence : guide « SCÉNARIOS EXCEPTIONNELS POKER HOLDEM ».

## 1. GESTION DES TAPIS (ALL-IN) ET POTS MULTIPLES

| Scénario | Statut | Notes |
|----------|--------|------|
| 1.1 All-in simple 2 joueurs | ✅ | Pot principal unique, remboursement du surplus si l’autre call avec moins (totalRefund dans handleCall). |
| 1.2–1.4 Side pots (3+ joueurs) | ⏸ | Jeu actuel en 2 joueurs uniquement ; side pots à prévoir pour multi. |
| 1.5–1.6 Joueur tapis et side pot | ⏸ | Idem, N/A en 2 joueurs. |
| 1.7 Double all-in simultané | ⏸ | N/A en 2 joueurs. |
| 1.8 Moins de jetons que la blind | ⏸ | À faire : all-in automatique, pot principal + side pot. |

## 2. FIN DE PARTIE (HEADS-UP)

| Scénario | Statut | Notes |
|----------|--------|------|
| 2.1 Joueur à 0 jetons | ✅ | `gameOverReason` (human_eliminated / bot_eliminated), redirection vers le lobby. |
| 2.2 Égalité / split pot | ✅ | API `evaluate-winner` retourne `winnerIds`, `isSplit` ; partage du pot, jeton impair au dealer (position 0). |
| 2.3 SB avec moins que la SB | ⏸ | À faire si on gère les blinds dynamiques. |

## 3–4. ERREURS DE JEU / TOURS D’ENCHÈRES

| Scénario | Statut | Notes |
|----------|--------|------|
| 3.1 String bet | ⏸ | Non implémenté (mise = premier montant touché). |
| 3.2 Action out of turn | ⏸ | Non implémenté. |
| 4.1–4.2 Relance minimale | ✅ | Déjà géré (minRaise, plafonnement à la stack). |
| 4.5 Heads-up | ✅ | SB = dealer (position 0), parle en premier preflop ; post-flop BB parle en premier. |

## 5. SHOWDOWN

| Scénario | Statut | Notes |
|----------|--------|------|
| 5.1 Ordre d’abattage | ⏸ | Affichage unique (pas d’ordre imposé). |
| 5.4 Split pot / jetons impairs | ✅ | Voir 2.2 ; jeton impair au dealer. |

## 6–12. BLINDS, CONFLITS, DISTRIBUTION, TEMPS, FORMATS

| Statut | Notes |
|--------|--------|
| ⏸ | Blinds fixes (50/100). Pas de dead button, pas de time bank dédié. Cash game 2 joueurs. |

---

**Résumé**  
- **Implémenté** : all-in 2 joueurs avec remboursement correct, split pot + jeton impair au dealer, élimination à 0 jeton et retour au lobby.  
- **Prévu pour plus tard** : side pots (multi-joueurs), blinds dynamiques, string bet / out of turn, time bank.
