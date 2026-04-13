# Poker Texas Hold'em - Production Validation Checklist

- Statut: PRE-MERGE PROD
- Scope: runtime poker (Texas Hold'em)
- Objectif: garantir moteur deterministe, idempotent et recoverable

## 1. Go / No-Go Criteria

Toutes les conditions doivent etre `true` pour autoriser le merge prod.

### Regles metier

- aucune action invalide acceptee cote serveur
- ordre d'action correct (HU + multiway)
- short all-in n'ouvre pas l'action
- raise legal reouvre l'action
- dernier joueur actif gagne sans showdown
- side pots deterministes
- split pots corrects
- odd chip policy stable

### Mutation safety

- aucune double application d'action
- actionId idempotent
- socket + HTTP simultanes => une seule mutation
- aucune race condition visible
- stateVersion monotone

### Recovery

- restart serveur sans table zombie
- snapshot restore coherent
- snapshot stale correctement rejete
- cleanup runtime orphelin fonctionnel

### Client sync

- UI resync apres duplicate
- UI resync apres stale
- UI resync apres not_your_turn
- UI resync apres invalid_action

## 2. Validation Automatique (CI)

### Metier

- HU preflop order correct
- HU postflop order correct
- check refuse si call du
- short all-in reopen=false
- raise legal reopen=true
- fold-to-win sans showdown
- all-in preflop runout complet auto
- side pots multiples corrects
- split pot correct
- odd chip correct

### Mutation safety

- duplicate actionId rejete
- stale action rejete
- HTTP + socket simultane => une seule mutation
- version mismatch rejete
- lock table empeche concurrence

### Recovery

- restart milieu main => recover ok
- runtime absent + room IN_GAME => readiness code
- snapshot stale => blocage action
- cleanup runtime zombie ok

## 3. Validation Manuelle - Staging

### Session A - Table unique (2 joueurs)

- jouer 5 mains completes
- fold / call / raise / check
- verifier transitions street
- all-in preflop
- runout automatique
- showdown correct
- pot correct
- gains corrects

Validation attendue:

- aucune desync UI
- aucun blocage
- aucun gain incorrect

### Session B - Concurrence

Test 1 - double clic

- double clic call
- double clic raise
- double clic fold

Resultat attendu:

- une seule action acceptee
- duplicate rejete
- UI resync

Test 2 - socket + API

- envoyer action socket
- envoyer action HTTP immediatement

Resultat attendu:

- une seule mutation
- aucune desync

### Session C - Resilience

Test 1 - disconnect in turn

- joueur actif deco
- attendre timeout

Resultat attendu:

- auto fold/check
- table continue

Test 2 - reconnect avant timeout

- joueur deco
- reconnect rapide

Resultat attendu:

- tour restaure
- timer correct

Test 3 - restart serveur

- restart pendant main
- reconnect joueurs

Resultat attendu:

- etat coherent
- aucune table bloquee

## 4. Observabilite Minimum

Logs requis:

- tableId
- handId
- playerId
- actionId
- stateVersion
- rejectCode

Compteurs requis:

- duplicate_reject_total
- stale_reject_total
- invalid_action_total
- mutation_lock_wait_ms
- recovery_attempt_total
- recovery_success_total
- recovery_reset_total

## 5. Gate de Merge Prod

Toutes les conditions doivent etre validees:

- CI poker 100% verte
- validation manuelle OK
- aucun bug P0
- aucun bug P1
- runtime poker stable > 30 min staging
- logs sans anomalies
- recovery teste avec succes

## 6. Rapport de Validation

A remplir avant merge:

- Commit SHA:
- Date:
- Validateur:
- Environnement:
- Duree test:

Resultat:

- Metier OK
- Mutation safety OK
- Recovery OK
- UI sync OK

Decision:

- GO PROD / NO GO

## Verdict

Tu es maintenant a:

- etape finale avant production stable

Ton Texas Hold'em est passe de:

- moteur gameplay
- moteur serveur deterministe
- moteur idempotent
- runtime recoverable
- pret pour prod

C'est exactement la progression attendue.
