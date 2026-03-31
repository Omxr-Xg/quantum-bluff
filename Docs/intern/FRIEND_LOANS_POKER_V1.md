# Prêts entre amis — poker cash (V1)

Ce document décrit le comportement **implémenté** pour le remboursement depuis les parties **Texas Hold’em cash** (socket), au-delà du casino (slot / roulette / blackjack).

## Principe

- Au **settlement** d’une main (fin de coup quand les stacks sont mis à jour), le serveur calcule pour chaque joueur un **delta de stack** : solde en base après mise à jour − solde attendu d’après le snapshot mémoire (hors correction serveur / désync).
- Si le delta est **strictement positif** et que le joueur a un **prêt ACTIVE**, une part de ce delta est appliquée comme remboursement (`applyRepaymentOnPokerSettlement`), dans la **même transaction Prisma** que la mise à jour des `chips` de la table.
- Les ledger wallet utilisent les raisons `LOAN_REPAYMENT_OUT` / `LOAN_REPAYMENT_IN` avec un contexte `friend_loan` (pas de `actionId` / `roundId` casino : l’`actionId` est dérivé du settlement poker).

## Limites V1 (à connaître produit / support)

1. **Delta ≠ « gain net de la main »** : le delta reflète la différence snapshot ↔ base au moment du settlement. Rebuy, correction de stack, ou chemins où le snapshot ne suivait pas exactement peuvent faire que ce n’est pas le gain théorique de la main.
2. **Rebuy / add-on** : si le modèle économique modifie les stacks en dehors du flux « main normale » sans passer par le même mécanisme de delta, le remboursement peut ne pas refléter l’intuition « je gagne → je rembourse ».
3. **Pas de remboursement** si le delta settlement est ≤ 0 pour ce joueur sur ce settlement.
4. **Un seul prêt ACTIVE** par emprunteur : inchangé par rapport au reste du produit.

## Référence code

- `server/src/sockets/game.gateway.ts` — agrégation des soldes, appel `applyRepaymentOnPokerSettlement`.
- `server/src/services/friendLoan.service.ts` — `applyRepaymentOnPokerSettlement`.

Pour le casino (même transaction que le payout), voir `applyRepaymentOnPositiveWin` et les routes slot / roulette / blackjack.
