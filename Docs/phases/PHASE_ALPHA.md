# Phase Alpha — Quantum Bluff

## Périmètre de la phase

La phase Alpha couvre la construction du produit depuis le démarrage du projet jusqu'à l'état actuel de la branche `dailychallenges` (MR `!132`), avec un focus sur:

- la mise en place du socle technique (client, serveur, DB, realtime),
- la livraison des fonctionnalités coeur (poker, casino, social, progression),
- le durcissement progressif de la logique serveur (idempotence, ledger, recovery),
- et la finalisation d'une V2 server-authoritative des daily challenges.

## Objectif global de l'Alpha

Passer d'un prototype jouable à une base applicative fiable, testable, et exploitable par l'équipe, avec:

- gameplay principal jouable de bout en bout,
- APIs et sockets intégrées,
- persistance Prisma/PostgreSQL,
- documentation et tests techniques suffisants pour préparer la phase suivante.

## Ce qui a ete construit (debut -> maintenant)

## 1) Socle applicatif et architecture

- Monorepo structuré `client/` (React + Vite) et `server/` (Node + Express + Socket.IO).
- Base de données PostgreSQL + Prisma, avec migrations successives pour faire évoluer le modèle.
- Intégration Redis pour cache/recovery de parties et mécanismes runtime.
- Organisation des contexts frontend (socket, toasts, accessibilité, musique, HUD, user).
- Route protection côté client (`ProtectedRoute`) + auth JWT côté serveur.

## 2) Authentification, profils et sécurité

- Flux auth complet (check email, register, login, reset), stockage token + user local.
- Middleware JWT sur routes protégées.
- Mécanismes anti-abus progressifs:
  - rate limits ciblés,
  - logs d'actions suspectes,
  - anti-cheat monitoring.
- Sécurisation HTTP (helmet, CORS encadré) et stabilisation socket auth.

## 3) Gameplay principal poker (coeur produit)

- Moteur Texas Hold'em intégré (phases, blinds, turn system, showdown, split pots).
- Version bot + version multijoueur serveur.
- Cash game controller (sièges, rebuy, spectateurs, cycle de main).
- Stabilisation realtime (events de phase, snapshots, reconnect, timers de tour).
- Durcissement des invariants runtime (résolutions et transitions plus déterministes).

## 4) Mini-jeux casino

- Slot machine serveur (tirage + payouts côté backend).
- Roulette serveur (validation mises, résolution, payouts, config expose).
- Blackjack solo + blackjack multijoueur (rooms, seats, invites, état de table).
- Améliorations runtime blackjack:
  - recovery au boot,
  - diagnostics readiness,
  - purge de tables/sessions obsolètes.

## 5) Social et UX transverses

- Système amis (recherche, demandes, accept/reject, messages).
- Invitations de partie (poker + blackjack).
- Notification center + événements d'état en temps réel.
- Améliorations UI/UX progressives:
  - lobby multi-sections,
  - accessibilité (mode daltonien),
  - avatars stabilisés,
  - parcours de navigation plus robustes.

## 6) Progression et économie

- XP, niveaux, caps dynamiques de mise selon progression.
- Leaderboards multi-catégories.
- Comptabilité wallet/ledger pour opérations casino.
- Introduction de patterns idempotents pour éviter doubles traitements.

## 7) Daily Challenges (fin de phase Alpha)

### V0 (prototype initial)

- Widget frontend fonctionnel mais logique métier fragile:
  - `userId` piloté par client,
  - progression mémoire,
  - endpoints non autoritaires.

### V2 (implémentée en fin d'Alpha)

- Refonte server-authoritative complète:
  - `GET /api/daily-challenges/me`
  - `POST /api/daily-challenges/:challengeCode/claim`
- Défis fixes quotidiens:
  - `WIN_WITH_PAIR` (1, reward 250)
  - `WIN_200_ROULETTE` (200, reward 300)
  - `PLAY_5_TIMES` (5, reward 500, multi uniquement)
  - `WIN_200_SLOT` (200, reward 350)
- Persistance DB via `DailyChallengeProgress`:
  - `userId`, `dayKey`, `challengeCode`, `progress`, `goal`,
  - `completed`, `claimed`, `rewardTokens`,
  - `claimedAt`, `createdAt`, `updatedAt`,
  - unique `(userId, dayKey, challengeCode)`.
- Progression serveur branchée sur événements métier (roulette, slot, poker multi, blackjack multi).
- Claim transactionnel avec crédit wallet + entrée ledger (`DAILY_CHALLENGE_REWARD`).
- Front nettoyé:
  - plus de progression envoyée depuis le client,
  - lecture/claim only,
  - suppression hardcode localhost.

## 8) Qualité, test et documentation

- Batteries de tests backend et frontend mises en place et enrichies.
- Tests dédiés daily challenges ajoutés (service + routes).
- Docs techniques consolidées:
  - `Docs/REPORT.md`,
  - `Docs/RAPPORT_TESTS.md`,
  - `Docs/CR/nouveautes-depuis-bafc0c8.md`,
  - docs internes spécialisées (hidden bets, prêts, tournois, observabilité).

## Decisions techniques structurantes prises en Alpha

- Déplacer progressivement l'autorité métier vers le serveur.
- Encadrer les opérations financières avec transactions + ledger.
- Favoriser les hooks gameplay backend plutôt que les updates métier pilotées par le frontend.
- Structurer la montée en robustesse via migrations Prisma + tests ciblés.

## Etat de sortie de la phase Alpha

À la fin de l'Alpha, le projet dispose de:

- un produit jouable et riche fonctionnellement,
- une base technique backend/frontend cohérente,
- un niveau de fiabilité nettement supérieur au prototype initial,
- une V2 daily challenges alignée avec les exigences prod (autorité serveur, persistance, sécurité API, transactions).

## Limites restantes (connues) a adresser ensuite

- Renforcer encore l'idempotence métier sur certains flux realtime multi.
- Continuer la réduction des risques de régression sur les parcours cross-feature.
- Poursuivre l'industrialisation (observabilité, QA E2E, durcissement infra).

---

Document de phase rédigé pour `Docs/phases`, synthèse opérationnelle de la Phase Alpha.
