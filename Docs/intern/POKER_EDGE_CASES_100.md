# Poker Edge Cases 100% Pack

- Statut: VALIDATED (ruleset)
- Scope: Texas Hold'em runtime rules hardening
- Objectif: verrouiller les derniers cas limites pour passer de 9/10 a 10/10 sur les regles poker

## 1) Matrice exhaustive des cas critiques

### Bloc A - Short all-in / reopen

Cas a couvrir:

- bet 100 -> all-in 120 -> call -> action non reouverte
- bet 100 -> all-in 200 -> call -> action reouverte
- raise legal apres short all-in
- multiple short all-ins successifs
- short all-in preflop multiway

Invariant:

- reopen uniquement si `raise >= minRaise`

### Bloc B - Side pots multi-niveaux

Cas de base:

- 4 joueurs: A=1000, B=500, C=200, D=50

Variantes:

- all-in simultanes
- fold dans un side pot
- split sur main pot
- split sur side pot uniquement
- un gagnant par niveau

Invariant:

- somme payouts = somme contributions

### Bloc C - Odd chip policy

Cas:

- pot impair avec 3 gagnants
- split pair puis impair
- odd chip avec side pot
- odd chip avec heads-up split

Invariant:

- odd chip assignee selon une policy unique et stable
- jamais de jeton perdu

### Bloc D - All-in avant river

Cas:

- all-in preflop
- all-in flop
- all-in turn

Attendu:

- runout auto
- 5 cartes board
- pas de double showdown

### Bloc E - Heads-up blind rules

Cas:

- Dealer = small blind
- Big blind joue en premier preflop
- Dealer joue en premier postflop
- 5 mains consecutives avec rotation correcte

Invariant:

- dealer alterne
- ordre preflop/postflop correct

### Bloc F - Fold-to-win

Cas:

- tous fold sauf 1 preflop
- tous fold sauf 1 flop
- tous fold sauf 1 river

Attendu:

- pas de showdown
- pot attribue immediatement

### Bloc G - Minimum raise logic

Cas:

- raise minimum accepte
- raise inferieur refuse
- short all-in < minRaise
- raise apres short all-in

Invariant:

- `minRaise = lastRaiseSize` (floor = big blind)

### Bloc H - Multiway action progression

Cas:

- 5 joueurs
- 2 fold
- 1 raise
- 1 call
- 1 all-in

Attendu:

- ordre de tour correct
- completion de round correcte

## 2) Oracle side-pot automatique

Checks automatiques a ajouter dans les tests:

- Invariant 1: `sum(contributions) == sum(payouts)`
- Invariant 2: `payout >= 0`
- Invariant 3: un joueur non eligible ne recoit jamais de pot
- Invariant 4: un all-in ne gagne jamais au-dela de son niveau d'eligibilite
- Invariant 5: aucun payout duplique

## 3) Invariants runtime a verifier

Toujours vrai:

- un seul joueur courant (acting player) a la fois
- phase valide
- street monotone
- actionVersion monotone
- pot >= 0
- stacks >= 0
- contributions >= 0

## 4) Checklist staging ultra-courte (10 min)

Test 1:

- 2 joueurs
- 5 mains HU
- verifier ordre + blinds

Test 2:

- 3 joueurs
- short all-in
- verifier reopen

Test 3:

- 4 joueurs
- multi all-in
- verifier side pots

Test 4:

- split pot
- verifier odd chip

Test 5:

- restart en pleine main
- verifier recovery

## 5) Critere "10/10"

Le moteur peut etre considere "Texas Hold'em parfait" si:

- tous les edge tests passent
- tous les invariants sont valides
- staging manuel OK
- aucun payout incorrect
- aucun round bloque
- aucune action mal ordonnee

## 6) Statut final de validation

### Resultat des 10 cas officiels

- minimum raise exact valide (`minRaise = lastRaiseSize`, floor big blind)
- short all-in n'ouvre pas l'action
- raise legal ouvre/reouvre l'action
- heads-up preflop/postflop conforme
- rotation HU multi-mains conforme (alternance dealer)
- odd chip policy stable
- all-in runout complet (preflop/flop) valide
- showdown all-in unique (pas de double resolution)
- fold-to-win immediat valide
- progression multiway valide (pas de saut de street)

### Invariants mathematiques settlement

- `sum(contributions) == sum(payouts)` valide
- `payout >= 0` valide
- aucun joueur ineligible ne recoit de payout
- coherences multi all-in imbriques validees

### Suites executees (vertes)

- `poker.edge-cases.test.ts`
- `GameTable.runtime-rules.test.ts`
- `GameTable.actions-matrix.test.ts`
- `potSettlement.test.ts`
- `pokerActionDedup.service.test.ts`
- `GameTable.test.ts`
- `GameTable.extended.test.ts`
- `GameTable.coverage.test.ts`
- `GameTable.blinds-matrix.test.ts`

Conclusion: les regles officielles ciblees pour Texas Hold'em sont validees sur le moteur runtime courant.

