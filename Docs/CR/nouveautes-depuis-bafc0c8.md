# Compte rendu — évolution du dépôt depuis `bafc0c8`

**Commit de référence :** `bafc0c873cde14b7ae38febbd4f85edb9d2ef340` — *fix du chemin des cartes*  
**État au moment de la rédaction :** `HEAD` ≈ `b1593ae` (*i18n(ar): message session blackjack réinitialisée*)  
**Période couverte :** principalement **24–31 mars 2026**  
**Volume :** environ **228 commits** sur la branche courante après la référence.

Ce document résume **ce qui s’est passé dans le temps** (thèmes et impacts), pas une ligne par ligne de chaque fusion.

---

## 1. Vue d’ensemble chronologique

| Période | Axes majeurs |
|---------|--------------|
| **24–25 mars** | Asset cartes & accessibilité ; casino (slot, roulette, blackjack) ; social (notifications) ; XP / classement ; poker (blinds, turbo) ; durcissement réseau (WSS) ; rate limiting |
| **27 mars** | Gros chantier **runtime** : poker (orchestration, invariants, recovery), casino (RNG, ledger, idempotence), persistance soldes cash, docs internes & tests de non-régression |
| **28–29 mars** | **Paris cachés (hidden bets)** : spec, API, modèle DB, moteur de cotes, intégration table cash & temps réel |
| **29–31 mars** | **Tournois** (moteur, lobby, élimination, sync activeGames) ; affinage hidden bets (live, quotes, historique) ; **cash** : gate « ready » entre mains, ordre UI abattage / countdown ; avatars ; blackjack (cartes unifiées, fuite WS, purge parties stale) ; merges *back-game-logic* |

---

## 2. Poker (cash game & règles)

- **Moteur & état serveur :** invariants de main déterministes (participants figés, phases runtime, raisons de fin de main), journal d’actions (`lastHandAction`, rôles SB/BB), alignement pastilles SB/BB avec le serveur.
- **Temps réel :** diffusions d’état plus complètes ; timers de tour avec **epoch** pour éviter les timeouts obsolètes ; événements de cycle de main (showdown, turbo / turn time).
- **Tournois :** service tournoi branché sur `activeGames`, UUIDs côté moteur, téléportation lobby → table, élimination à 0 jeton, auto-dealer, écrans de fin / gains ; correctifs CORS / socket, cron de lancement.
- **Cash entre deux mains :** après corrections récentes, **passage à une logique « tous prêts »** avant la main suivante (plus de redémarrage automatique immédiat) ; **délai / countdown** côté serveur pour laisser le temps à l’abattage et aux paris cachés résolus ; ajustements UI (moins de badge transition redondant sur le flux cash).
- **Qualité :** nombreux tests (HU, dédup, pot, départs / déconnexion, hidden bets & GameTable).

---

## 3. Paris cachés (*hidden bets*)

- **V1 documentée :** spec, design runtime, API (y compris phases PRE_HAND / LIVE).
- **Backend :** tickets, `marketPhase`, quotes, snapshots, tables de cotes, pricing pré-main et live, placement idempotent, résolution liée au poker, fenêtres gelées sur la table cash, routes (markets, quote, place, historique table).
- **Frontend :** contexte, panneaux PRE/LIVE, page résultats, intégration partie ; i18n marchés (fr/en entre autres) ; correctifs modal, affichage des tickets résolus en transition.
- **Évolution :** live sur toute la street ; breakdown pricing ; verrouillage quote / snapshot ; endpoint historique & client API.

---

## 4. Casino (roulette, blackjack, slot)

- **Roulette :** retrait du forcing public du résultat ; override admin cantonné (ex. hors prod / localhost) ; idempotence et ledger en transaction.
- **Blackjack :** résilience (recovery Redis, readiness, nettoyage de salles obsolètes) ; UX états « recovering » ; cartes alignées sur le jeu de poker unifié ; correction **memory leak** WebSocket ; purge **stale** via API et au `JOIN_BLACKJACK_TABLE` ; redirection lobby + i18n (*session réinitialisée*) en plusieurs langues.
- **Slot & wallet :** RNG centralisé, contexte de manche, **wallet ledger** Prisma (journal append-only) ; règlements **idempotents** (Redis SET NX + repli mémoire, fingerprints, abort si échec).

---

## 5. Social, progression, UI transverse

- **Centre de notifications** (demandes d’amis).
- **XP & leaderboard** (merge dédié + styles).
- **Lobby / salle d’attente :** style, snapshots serveur pour limiter désynchronisation et rafales de polling ; layout (ex. bande hamburger waiting room).
- **Avatars :** URL en base, propagation aux événements join/reconnect/sit, nettoyage à la levée de siège (merge *avatar-fix*).

---

## 6. Assets & accessibilité

- **Cartes :** design / assets « original » + correctifs chemins ; cartes brûlées (*burned cards*) côté UX poker.
- **Mode daltonien :** filtres et textures dédiés.

---

## 7. Infra, sécurité, observabilité (aperçu)

- **Client :** correction **mixed content** / **WSS** sur VM.
- **Serveur :** **rate limits** sur certaines routes ; durcissement **idempotence** casino ; route authentifiée **sync-balance** ; enregistrement résultats / soldes avec alignement Prisma (cash showdown, *back-game-logic*).
- **Documentation :** check-list prod poker, rapport interne mis à jour, observabilité (fichiers type `Docs/OBSERVABILITY.md`, alertes Prometheus d’exemple), docs Blackjack / Roulette / tâches internes.

---

## 8. Qualité outillage

- `.vite/` ignoré par git ; corrections **lint** / **typage** (tournois, lobby, game) ; correctifs **registry / runner** tests ; renforcement suites **intégration** (blackjack HTTP, poker runtime).

---

## 9. Lecture pour l’équipe

- L’historique est très **merge-intensive** (nombreuses MR `!98`–`!130` et suivantes) : la vérité terrain reste `git log bafc0c8..HEAD` et les descriptions de merge requests sur le forge.
- Les sujets **les plus structurants** après la référence sont : **durcissement runtime poker + casino**, **paris cachés**, **tournois**, et la **cohérence cash / soldes / prêt entre deux mains**.

---

## 10. Problèmes rencontrés et solutions

Synthèse des **tensions** observées dans les commits / merges / docs internes et des **réponses** apportées (ordre thématique, non exhaustif).

### 10.1 Réseau, déploiement et client

| Problème | Solution / mitigation |
|----------|------------------------|
| **Mixed content** (page HTTPS qui parle au socket en `ws:`) sur la VM | Passage / configuration **WSS** côté client et alignement avec l’URL de prod (MR *fix-VM*). |
| **Désynchronisation** lobby / partie, rafales de requêtes | Consommation d’**états serveur** (snapshots socket / API) sur la salle d’attente et la page jeu ; réduction du **polling** redondant. |
| **Centre de notifications** à intégrer sans casser le reste du shell | Feature dédiée (*NotificationCenter*) + merge sur `develop`. |

### 10.2 Poker cash & temps réel

| Problème | Solution / mitigation |
|----------|------------------------|
| Timers de tour **qui continuent** après une action déjà traitée (course) | **Epoch** par partie sur les timers gateway : une action annule la génération de timeout obsolète. |
| Ordre d’action **heads-up / blinds** incorrect | Correctifs moteur + tests ciblés sur les positions **SB/BB** et la prise de blinds. |
| États transitoires **ambigus** (fin de main, qui peut agir) | **Invariants** runtime : participants figés, `handEndReason`, phases explicites ; orchestration / dédup des actions. |
| **Mode turbo** annoncé (10 s) mais non appliqué | `turbo` **non persisté** à la création de salle, et **non relu** au `POST /start` — correction : enregistrement Prisma à la création + prise en compte de **`room.turbo`** (et `TURBO_TURN_TIMEOUT_MS`) au démarrage de la partie cash. |
| Compte à rebours **« prochaine main »** incohérent (sauts de secondes, départ à 1 s au lieu de 10) | Décalage **horloge client vs serveur** si on n’utilise que `cashCountdownEndsAt` absolu ; ajout de **`cashCountdownRemainingSec`** côté serveur + ancrage local `Date.now() + sec` ; tick UI plus fréquent ; pluriels i18n (*seconde(s)*). |
| Enchaînement **trop rapide** entre abattage, résolution hidden bets et nouvelle main | **Gate « ready »** pour tous les joueurs actifs avant `startHand` ; **countdown serveur** après la main pour laisser l’UI montrer abattage + résultats ; retrait de callbacks de countdown devenus incohérents. |
| **Retour lobby** / départs en équilibre table cash | Durcissement des transitions (événements leave, file spectateurs, règles HU vs 3+) documentés dans les merges *cash* / *realtime* — voir tests associés. |

### 10.3 Paris cachés

| Problème | Solution / mitigation |
|----------|------------------------|
| Cotes et résolution **couplées au mauvais moment** (pre vs live) | Introduction **`marketPhase`**, fenêtres gelées, moteur **PRE / LIVE** et refactors (`resolver`, validation, service de fenêtre). |
| **Pas de diffusion** après fermeture d’une fenêtre live | Correctif **realtime** : re-broadcast jeu + salle d’attente après clôture fenêtre. |
| UI (modal, clés React, liste des tickets en transition) | Enveloppe **fragment** modal, clés stables, affichage de **tous les tickets résolus** en phase de transition. |

### 10.4 Casino (roulette, blackjack, slot)

| Problème | Solution / mitigation |
|----------|------------------------|
| **Résultat roulette** forcable côté client / API publique — risque d’abus | Suppression du flux public **`forceResult`** ; **override admin** limité (ex. localhost, hors prod). |
| **Double débit / rejeu** de mêmes actions (retry client, double clic) | **Idempotence** (clés, Redis `SET NX` + fallback mémoire, TTL), **ledger** en transaction Prisma, soldes **dérivés serveur** plutôt que deltas client arbitraires. |
| Tables blackjack **fantômes** ou état incohérent après crash / longue inactivité | Couche **recovery / readiness** (Redis, diagnostics admin) ; **purge stale** via routes API et au **`JOIN_BLACKJACK_TABLE`** ; reset salle + code **`TABLE_SESSION_RESET`** ; **redirection lobby** + messages i18n (*session réinitialisée*). |
| **Fuite mémoire WebSocket** sur la table blackjack | Correctif dédié dans le merge *fix/blackjack* (nettoyage / lifecycle des listeners ou sockets). |
| Incohérence visuelle cartes blackjack vs poker | **Cartes poker unifiées** sur blackjack. |

### 10.5 Tournois

| Problème | Solution / mitigation |
|----------|------------------------|
| Frontend ne recevait pas le **signal de départ** | Correctifs **CORS** et **`autoConnect`** socket. |
| Rejet des joueurs (**404**) si identifiants incorrects | Moteur basé sur **UUID** utilisateur au lieu du pseudo seul. |
| **Deux mondes** `activeGames` (mémoire vs Redis) | **Synchronisation** du `TournamentService` avec l’instance `activeGames` unique. |
| **Doublons** de lancement cron | Nettoyage du job de lancement pour éviter exécutions multiples. |
| Limites connues côté produit (ex. créateur pas auto-inscrit, base URL hardcodée dans un service) | Documentées dans `Docs/intern/TOURNAMENT_FLOW_REAL_VS_EXPECTED.md` — évolutions possibles : auto-`join` créateur, `apiUrl` partagé. |

### 10.6 Qualité, lint et fusion de branches

| Problème | Solution / mitigation |
|----------|------------------------|
| Conflits **GameTable / gateway** (showdown, all-in, états sanitizés) | Merge explicite en conservant la logique **avancée** côté table + gateway. |
| **Lint** (variables inutilisées, `catch (e)` vides, `any` tournois) | Passes **chore/fix** ciblés ; typage erreurs / payloads socket. |
| Artefacts **Vite** versionnés par erreur | Ajout de **`.vite/`** au `.gitignore`. |
| Tests instables ou **registry** Jest | Correctifs **runner / registry** documentés dans les commits fin mars. |

### 10.7 Avatars et profil

| Problème | Solution / mitigation |
|----------|------------------------|
| Avatar absent ou **périmé** après sit / leave / reconnect | **URL en base**, propagation sur **JOIN / RECONNECT / sit**, effacement siège à la sortie ; merge *avatar-fix* avec intégration hidden bets + ready flow. |

---

*Document généré pour le dossier `Docs/CR` — synthèse des évolutions et des principaux problèmes / solutions depuis `bafc0c8`.*
