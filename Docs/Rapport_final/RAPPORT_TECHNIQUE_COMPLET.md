# RAPPORT TECHNIQUE — Quantum Bluff (fonctionnement & logiques)

> Document **sans code source** : descriptions de flux, rôles, données et garde-fous. **12** angles par sous-thème ; banque **141** phrases de référence + **8640** formulations générées (couverture A→Z). Les pools par domaine évitent le hors-sujet ; la répétition exacte est limitée à l’intérieur d’une même sous-section. Variables : `RAPPORT_BULLETS_PER_SEED` (défaut 12), `RAPPORT_ANNEX_MAX` (défaut 60), `RAPPORT_ANNEX_AZ=0`, `RAPPORT_ANNEX_ROUTES=0` pour désactiver annexes.

## Architecture globale
_Balise `ARC` — logique fonctionnelle, sans code source._

### ARC.01 — Couche client React et routage
- **ARC.01.1** — *Objectif & périmètre.* Pour le transaction isolation read committed, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.01.2** — *Entrées & contrats (API / UI).* Pour la route admin générique dev-only, le produit applique les règles de remboursement de prêt actif.
- **ARC.01.3** — *État, persistance & intégrité.* Pour le ready check database ping, le produit reste désactivable ou restreint en production si sensible.
- **ARC.01.4** — *Temps réel & synchronisation.* Pour le raise slider max stack bound, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.01.5** — *Sécurité, rôles & conformité.* Pour le feedback thank you acknowledgment, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.01.6** — *Erreurs, limites & dégradation.* Pour le reset token single use, le produit journalise les transitions sensibles pour audit.
- **ARC.01.7** — *Exploitation & évolutivité.* Pour le friends online presence indicator, le produit isole les données par utilisateur et par partie.
- **ARC.01.8** — *Objectif & périmètre.* Pour le roulette loan repayment order, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.01.9** — *Entrées & contrats (API / UI).* Pour le i18n namespace game labels, le produit propage l’état via Socket.IO de façon agrégée.
- **ARC.01.10** — *État, persistance & intégrité.* Pour le level up notification, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.01.11** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ARC.01.12** — *Sécurité, rôles & conformité.* Pour la console admin JWT console, le produit applique les règles de remboursement de prêt actif.

### ARC.02 — API HTTP Express
- **ARC.02.1** — *Objectif & périmètre.* Pour le disconnect socket leave room, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.02.2** — *Entrées & contrats (API / UI).* Pour la console admin JWT console, le produit propage l’état via Socket.IO de façon agrégée.
- **ARC.02.3** — *État, persistance & intégrité.* Pour le admin tournament force start si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ARC.02.4** — *Temps réel & synchronisation.* Pour le street advance server event broadcast, le produit s’appuie sur la validation serveur comme source de vérité.
- **ARC.02.5** — *Sécurité, rôles & conformité.* Pour le record hand result practice API, le produit reste désactivable ou restreint en production si sensible.
- **ARC.02.6** — *Erreurs, limites & dégradation.* Pour le practice difficulty query param, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.02.7** — *Exploitation & évolutivité.* Pour le logging confidence IA, le produit documente les préconditions et postconditions attendues.
- **ARC.02.8** — *Objectif & périmètre.* Pour le tournament spectate delay 5s, le produit maintient la compatibilité mobile et navigateur.
- **ARC.02.9** — *Entrées & contrats (API / UI).* Pour la console admin JWT console, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.02.10** — *État, persistance & intégrité.* Pour le waiting room join POST, le produit vérifie les montants et soldes avant persistance.
- **ARC.02.11** — *Temps réel & synchronisation.* Pour le timer table poker côté serveur, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.02.12** — *Sécurité, rôles & conformité.* Pour les classes CSS racine accessibilité, le produit applique les règles de remboursement de prêt actif.

### ARC.03 — WebSocket Socket.IO
- **ARC.03.1** — *Objectif & périmètre.* Pour le rate limit metric counter si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.03.2** — *Entrées & contrats (API / UI).* Pour la navigation /tournaments et /tournament-waiting, le produit reste désactivable ou restreint en production si sensible.
- **ARC.03.3** — *État, persistance & intégrité.* Pour les Webhooks ou jobs async optionnels, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.03.4** — *Temps réel & synchronisation.* Pour le player action log structured, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.03.5** — *Sécurité, rôles & conformité.* Pour le admin console action audit, le produit isole les données par utilisateur et par partie.
- **ARC.03.6** — *Erreurs, limites & dégradation.* Pour le endpoint createGame / joinGame RTK, le produit s’appuie sur la validation serveur comme source de vérité.
- **ARC.03.7** — *Exploitation & évolutivité.* Pour le waiting room start POST gameId response, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.03.8** — *Objectif & périmètre.* Pour le hook useUser et synchronisation token, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.03.9** — *Entrées & contrats (API / UI).* Pour le tutorial lobby page dédiée, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ARC.03.10** — *État, persistance & intégrité.* Pour la console admin JWT console, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.03.11** — *Temps réel & synchronisation.* Pour la console admin JWT console, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.03.12** — *Sécurité, rôles & conformité.* Pour le stockage token localStorage, le produit journalise les transitions sensibles pour audit.

### ARC.04 — Persistance Prisma/PostgreSQL
- **ARC.04.1** — *Objectif & périmètre.* Pour les toasts tournament-countdown, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.04.2** — *Entrées & contrats (API / UI).* Pour les toasts tournament-countdown, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.04.3** — *État, persistance & intégrité.* Pour le port listen env PORT, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ARC.04.4** — *Temps réel & synchronisation.* Pour le wallet insufficient funds message, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.04.5** — *Sécurité, rôles & conformité.* Pour le model inference timeout, le produit s’appuie sur la validation serveur comme source de vérité.
- **ARC.04.6** — *Erreurs, limites & dégradation.* Pour le tournament trophy asset display, le produit distingue erreurs réseau, auth et serveur côté client.
- **ARC.04.7** — *Exploitation & évolutivité.* Pour le provider d’accessibilité et menu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ARC.04.8** — *Objectif & périmètre.* Pour les loans actifs vs historiques, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.04.9** — *Entrées & contrats (API / UI).* Pour le spectate card masking rules, le produit vérifie les montants et soldes avant persistance.
- **ARC.04.10** — *État, persistance & intégrité.* Pour le ledger casino atomique, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.04.11** — *Temps réel & synchronisation.* Pour le leave friend loan cancel, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.04.12** — *Sécurité, rôles & conformité.* Pour la persistance difficulté bot en session, le produit documente les préconditions et postconditions attendues.

### ARC.05 — Moteur poker mémoire
- **ARC.05.1** — *Objectif & périmètre.* Pour le http 500 hide stack prod, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.05.2** — *Entrées & contrats (API / UI).* Pour le report category enum, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.05.3** — *État, persistance & intégrité.* Pour le ready check database ping, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.05.4** — *Temps réel & synchronisation.* Pour l’administration des tournois (page dédiée), le produit expose des erreurs métier stables pour i18n et support.
- **ARC.05.5** — *Sécurité, rôles & conformité.* Pour le chat rate limit soft, le produit isole les données par utilisateur et par partie.
- **ARC.05.6** — *Erreurs, limites & dégradation.* Le top-up de développement est isolé derrière des garde-fous d’environnement pour éviter une inflation artificielle en production.
- **ARC.05.7** — *Exploitation & évolutivité.* Pour le transaction isolation read committed, le produit propage l’état via Socket.IO de façon agrégée.
- **ARC.05.8** — *Objectif & périmètre.* Pour le swagger hide topbar, le produit distingue erreurs réseau, auth et serveur côté client.
- **ARC.05.9** — *Entrées & contrats (API / UI).* Pour le block user social si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **ARC.05.10** — *État, persistance & intégrité.* Pour la résolution des paris cachés en fin de main, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.05.11** — *Temps réel & synchronisation.* Pour le qr code room invite si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **ARC.05.12** — *Sécurité, rôles & conformité.* Pour le loader show on route transition, le produit reste désactivable ou restreint en production si sensible.

### ARC.06 — Contrôleur cash poker
- **ARC.06.1** — *Objectif & périmètre.* Pour le http access log middleware, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ARC.06.2** — *Entrées & contrats (API / UI).* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit reste désactivable ou restreint en production si sensible.
- **ARC.06.3** — *État, persistance & intégrité.* Pour le ante table optional si supporté, le produit maintient la compatibilité mobile et navigateur.
- **ARC.06.4** — *Temps réel & synchronisation.* Pour le admin tournament delete cascade, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.06.5** — *Sécurité, rôles & conformité.* Pour la recherche searchUsers avec terme, le produit documente les préconditions et postconditions attendues.
- **ARC.06.6** — *Erreurs, limites & dégradation.* Pour le host kick si implémenté, le produit distingue erreurs réseau, auth et serveur côté client.
- **ARC.06.7** — *Exploitation & évolutivité.* Pour le lobby quick actions row, le produit s’appuie sur la validation serveur comme source de vérité.
- **ARC.06.8** — *Objectif & périmètre.* Pour le join game error banned si prévu, le produit journalise les transitions sensibles pour audit.
- **ARC.06.9** — *Entrées & contrats (API / UI).* Pour le note player tag si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.06.10** — *État, persistance & intégrité.* Pour les défis quotidiens et la réclamation de récompense, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.06.11** — *Temps réel & synchronisation.* Pour la recherche de joueurs, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.06.12** — *Sécurité, rôles & conformité.* Pour le client RTK Query et invalidation de tags, le produit refuse les actions si le rôle ne correspond pas au contexte.

### ARC.07 — Casino (roulette, slot, BJ)
- **ARC.07.1** — *Objectif & périmètre.* Pour le pre_hand market quotes, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.07.2** — *Entrées & contrats (API / UI).* Pour le side pot UI lecture état serveur, le produit vérifie les montants et soldes avant persistance.
- **ARC.07.3** — *État, persistance & intégrité.* Pour le endpoint createGame / joinGame RTK, le produit vérifie les montants et soldes avant persistance.
- **ARC.07.4** — *Temps réel & synchronisation.* Pour le provider TableThemeProvider, le produit maintient la compatibilité mobile et navigateur.
- **ARC.07.5** — *Sécurité, rôles & conformité.* Pour le block user social si prévu, le produit minimise la fuite d’information entre rôles.
- **ARC.07.6** — *Erreurs, limites & dégradation.* Pour le edit profile validation email unique, le produit distingue erreurs réseau, auth et serveur côté client.
- **ARC.07.7** — *Exploitation & évolutivité.* Pour le admin runtime blackjack dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.07.8** — *Objectif & périmètre.* Pour le tournament navigate back lobby, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ARC.07.9** — *Entrées & contrats (API / UI).* Pour le friend request duplicate prevention, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ARC.07.10** — *État, persistance & intégrité.* Pour le spectate join as observer, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.07.11** — *Temps réel & synchronisation.* Pour le hook useUser et synchronisation token, le produit minimise la fuite d’information entre rôles.
- **ARC.07.12** — *Sécurité, rôles & conformité.* Pour la réinitialisation de mot de passe par jeton, le produit expose des erreurs métier stables pour i18n et support.

### ARC.08 — Sécurité transversale
- **ARC.08.1** — *Objectif & périmètre.* Pour le call amount computed server, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ARC.08.2** — *Entrées & contrats (API / UI).* Pour les player reports motifs, le produit permet l’observabilité (latence, codes, corrélation).
- **ARC.08.3** — *État, persistance & intégrité.* Pour la persistance difficulté bot en session, le produit maintient la compatibilité mobile et navigateur.
- **ARC.08.4** — *Temps réel & synchronisation.* Pour la liste d’amis et les demandes, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.08.5** — *Sécurité, rôles & conformité.* Pour le cors preflight OPTIONS 200, le produit reste désactivable ou restreint en production si sensible.
- **ARC.08.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by game, le produit vérifie les montants et soldes avant persistance.
- **ARC.08.7** — *Exploitation & évolutivité.* Pour le tournament prize formatting locale, le produit vérifie les montants et soldes avant persistance.
- **ARC.08.8** — *Objectif & périmètre.* Pour le reconnect same seat if free, le produit documente les préconditions et postconditions attendues.
- **ARC.08.9** — *Entrées & contrats (API / UI).* Pour les stats agrégées roulette, le produit maintient la compatibilité mobile et navigateur.
- **ARC.08.10** — *État, persistance & intégrité.* Pour le badge unlock notification, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.08.11** — *Temps réel & synchronisation.* Pour le color blind mode deuteranopia, le produit reste désactivable ou restreint en production si sensible.
- **ARC.08.12** — *Sécurité, rôles & conformité.* Pour la politique Helmet CSP et fonts externes, le produit permet l’observabilité (latence, codes, corrélation).

### ARC.09 — Observabilité
- **ARC.09.1** — *Objectif & périmètre.* Pour le transaction isolation read committed, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ARC.09.2** — *Entrées & contrats (API / UI).* Pour le http 500 hide stack prod, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.09.3** — *État, persistance & intégrité.* Pour le number formatting chips locale, le produit documente les préconditions et postconditions attendues.
- **ARC.09.4** — *Temps réel & synchronisation.* Pour les handlers socket.off au démontage, le produit expose des erreurs métier stables pour i18n et support.
- **ARC.09.5** — *Sécurité, rôles & conformité.* Le solde affiché dans le lobby est rafraîchi après les opérations réussies ; les échecs réseau laissent un toast sans modifier le solde affiché optimiste abusivement.
- **ARC.09.6** — *Erreurs, limites & dégradation.* Pour le level up notification, le produit journalise les transitions sensibles pour audit.
- **ARC.09.7** — *Exploitation & évolutivité.* Pour le join game error room full, le produit reste désactivable ou restreint en production si sensible.
- **ARC.09.8** — *Objectif & périmètre.* Pour le chat rate limit soft, le produit maintient la compatibilité mobile et navigateur.
- **ARC.09.9** — *Entrées & contrats (API / UI).* Pour le avatar image/jpeg size cap, le produit vérifie les montants et soldes avant persistance.
- **ARC.09.10** — *État, persistance & intégrité.* Pour le daily challenge rollover timezone UTC, le produit isole les données par utilisateur et par partie.
- **ARC.09.11** — *Temps réel & synchronisation.* Pour le gateway poker (événements temps réel), le produit vérifie les montants et soldes avant persistance.
- **ARC.09.12** — *Sécurité, rôles & conformité.* Pour les timeouts HTTP globaux, le produit expose des erreurs métier stables pour i18n et support.

### ARC.10 — Microservice IA Python optionnel
- **ARC.10.1** — *Objectif & périmètre.* Pour le mapping playerToGameId au start, le produit isole les données par utilisateur et par partie.
- **ARC.10.2** — *Entrées & contrats (API / UI).* Pour le join game error banned si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ARC.10.3** — *État, persistance & intégrité.* Pour le anti-cheat body inspection light, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ARC.10.4** — *Temps réel & synchronisation.* Pour le tournament prize formatting locale, le produit limite les abus par quotas, plafonds ou fréquence.
- **ARC.10.5** — *Sécurité, rôles & conformité.* Pour le timeout per route override, le produit reste désactivable ou restreint en production si sensible.
- **ARC.10.6** — *Erreurs, limites & dégradation.* Le tutoriel lobby est purement client et n’impacte pas les soldes ; il peut être ignoré ou rejoué selon préférence stockée localement.
- **ARC.10.7** — *Exploitation & évolutivité.* Pour le min buy cash table, le produit reste désactivable ou restreint en production si sensible.
- **ARC.10.8** — *Objectif & périmètre.* Pour la validation stricte des actions IA, le produit minimise la fuite d’information entre rôles.
- **ARC.10.9** — *Entrées & contrats (API / UI).* Pour la configuration trust proxy, le produit maintient la compatibilité mobile et navigateur.
- **ARC.10.10** — *État, persistance & intégrité.* Pour le loader show on route transition, le produit minimise la fuite d’information entre rôles.
- **ARC.10.11** — *Temps réel & synchronisation.* Pour les handlers socket.off au démontage, le produit reste désactivable ou restreint en production si sensible.
- **ARC.10.12** — *Sécurité, rôles & conformité.* Pour le solo blackjack deck shuffle server, le produit distingue erreurs réseau, auth et serveur côté client.

## Authentification & compte
_Balise `AUTH` — logique fonctionnelle, sans code source._

### AUTH.01 — Inscription
- **AUTH.01.1** — *Objectif & périmètre.* Pour le reset token single use, le produit vérifie les montants et soldes avant persistance.
- **AUTH.01.2** — *Entrées & contrats (API / UI).* Pour le prisma transaction interactive poker cash, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.01.3** — *État, persistance & intégrité.* Pour le daily challenge rollover timezone UTC, le produit isole les données par utilisateur et par partie.
- **AUTH.01.4** — *Temps réel & synchronisation.* Pour le roulette result authoritative number, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.01.5** — *Sécurité, rôles & conformité.* Pour le ready check database ping, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.01.6** — *Erreurs, limites & dégradation.* Pour le loan exceeds allowed rate error, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.01.7** — *Exploitation & évolutivité.* Pour la page Login / Register / Auth, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.01.8** — *Objectif & périmètre.* Pour le hook useUser et synchronisation token, le produit vérifie les montants et soldes avant persistance.
- **AUTH.01.9** — *Entrées & contrats (API / UI).* Pour le tournament bounty si supporté, le produit minimise la fuite d’information entre rôles.
- **AUTH.01.10** — *État, persistance & intégrité.* Pour le mapping playerToGameId au start, le produit journalise les transitions sensibles pour audit.
- **AUTH.01.11** — *Temps réel & synchronisation.* Pour le model response schema validation, le produit vérifie les montants et soldes avant persistance.
- **AUTH.01.12** — *Sécurité, rôles & conformité.* Pour la quote hash exposée au client, le produit distingue erreurs réseau, auth et serveur côté client.

### AUTH.02 — Login JWT utilisateur
- **AUTH.02.1** — *Objectif & périmètre.* Pour les query params spectate=1 sur Game, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.02.2** — *Entrées & contrats (API / UI).* Pour le patch profil email/username/password, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.02.3** — *État, persistance & intégrité.* Pour le gestionnaire d’erreurs HTTP global Express, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.02.4** — *Temps réel & synchronisation.* Pour le xp grant failure tolerance, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.02.5** — *Sécurité, rôles & conformité.* Pour les tags RTK FriendLoan et invalidations croisées, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.02.6** — *Erreurs, limites & dégradation.* Pour la 2FA TOTP et les endpoints dédiés, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **AUTH.02.7** — *Exploitation & évolutivité.* Pour le results alias route same page, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.02.8** — *Objectif & périmètre.* Pour le player action log structured, le produit limite les abus par quotas, plafonds ou fréquence.
- **AUTH.02.9** — *Entrées & contrats (API / UI).* Pour le join game error room full, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.02.10** — *État, persistance & intégrité.* Pour le practice create bot game HTTP, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.02.11** — *Temps réel & synchronisation.* Pour le qr code room invite si prévu, le produit documente les préconditions et postconditions attendues.
- **AUTH.02.12** — *Sécurité, rôles & conformité.* Pour le call amount computed server, le produit journalise les transitions sensibles pour audit.

### AUTH.03 — Logout & révocation token
- **AUTH.03.1** — *Objectif & périmètre.* Pour le feedback thank you acknowledgment, le produit vérifie les montants et soldes avant persistance.
- **AUTH.03.2** — *Entrées & contrats (API / UI).* Pour le note player tag si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.03.3** — *État, persistance & intégrité.* Pour le username profanity filter si prévu, le produit isole les données par utilisateur et par partie.
- **AUTH.03.4** — *Temps réel & synchronisation.* Pour le leaderboard OFFSET pagination, le produit vérifie les montants et soldes avant persistance.
- **AUTH.03.5** — *Sécurité, rôles & conformité.* Pour la page MiniGames, le produit minimise la fuite d’information entre rôles.
- **AUTH.03.6** — *Erreurs, limites & dégradation.* Pour le stats increment async post commit, le produit documente les préconditions et postconditions attendues.
- **AUTH.03.7** — *Exploitation & évolutivité.* Pour le 2FA backup codes si prévu, le produit documente les préconditions et postconditions attendues.
- **AUTH.03.8** — *Objectif & périmètre.* Pour les timeouts HTTP globaux, le produit maintient la compatibilité mobile et navigateur.
- **AUTH.03.9** — *Entrées & contrats (API / UI).* Pour le tournament elimination zero chips, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.03.10** — *État, persistance & intégrité.* Pour le tournament trophy asset display, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.03.11** — *Temps réel & synchronisation.* Pour le practice bot expert wallet policy, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.03.12** — *Sécurité, rôles & conformité.* Pour le friend request duplicate prevention, le produit s’appuie sur la validation serveur comme source de vérité.

### AUTH.04 — Récupération mot de passe
- **AUTH.04.1** — *Objectif & périmètre.* Pour le root quantum bluff api message, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **AUTH.04.2** — *Entrées & contrats (API / UI).* Pour le practice bot expert wallet policy, le produit journalise les transitions sensibles pour audit.
- **AUTH.04.3** — *État, persistance & intégrité.* Pour le composant GameWithKey (reset état route), le produit isole les données par utilisateur et par partie.
- **AUTH.04.4** — *Temps réel & synchronisation.* Pour le claim reward challenge, le produit journalise les transitions sensibles pour audit.
- **AUTH.04.5** — *Sécurité, rôles & conformité.* Pour le practice create bot game HTTP, le produit limite les abus par quotas, plafonds ou fréquence.
- **AUTH.04.6** — *Erreurs, limites & dégradation.* Pour le all in call auto partial amount, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **AUTH.04.7** — *Exploitation & évolutivité.* Pour le high contrast token colors, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.04.8** — *Objectif & périmètre.* Pour le feedback route séparée reports, le produit isole les données par utilisateur et par partie.
- **AUTH.04.9** — *Entrées & contrats (API / UI).* Pour le admin redirect if not admin jwt, le produit documente les préconditions et postconditions attendues.
- **AUTH.04.10** — *État, persistance & intégrité.* Pour la page BotConfiguration, le produit documente les préconditions et postconditions attendues.
- **AUTH.04.11** — *Temps réel & synchronisation.* Pour le daily challenge rollover timezone UTC, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.04.12** — *Sécurité, rôles & conformité.* Pour le server socketAuth middleware order, le produit expose des erreurs métier stables pour i18n et support.

### AUTH.05 — Profil & patch profil
- **AUTH.05.1** — *Objectif & périmètre.* Pour l’upload avatar mutation séparée, le produit vérifie les montants et soldes avant persistance.
- **AUTH.05.2** — *Entrées & contrats (API / UI).* Pour le logging confidence IA, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.05.3** — *État, persistance & intégrité.* Pour la page MiniGames, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.05.4** — *Temps réel & synchronisation.* Pour le admin redirect if not admin jwt, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.05.5** — *Sécurité, rôles & conformité.* Pour le disconnect grace period joueur, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.05.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by game, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.05.7** — *Exploitation & évolutivité.* Pour les mises à jour applicatives (route updates), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.05.8** — *Objectif & périmètre.* Pour le console admin assign moderator si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.05.9** — *Entrées & contrats (API / UI).* Pour le daily challenge rollover timezone UTC, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.05.10** — *État, persistance & intégrité.* Pour le player action log structured, le produit documente les préconditions et postconditions attendues.
- **AUTH.05.11** — *Temps réel & synchronisation.* Pour le cron tournament progression, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.05.12** — *Sécurité, rôles & conformité.* Pour le profile aggregate stats query, le produit gère la concurrence par transactions courtes ou verrous logiques.

### AUTH.06 — Solde & sync
- **AUTH.06.1** — *Objectif & périmètre.* Pour les friend requests entrantes/sortantes, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **AUTH.06.2** — *Entrées & contrats (API / UI).* Pour les timeouts HTTP globaux, le produit vérifie les montants et soldes avant persistance.
- **AUTH.06.3** — *État, persistance & intégrité.* Pour le leaderboard OFFSET pagination, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.06.4** — *Temps réel & synchronisation.* Pour le logout blacklist token id, le produit journalise les transitions sensibles pour audit.
- **AUTH.06.5** — *Sécurité, rôles & conformité.* Pour le login rate limit auth routes, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **AUTH.06.6** — *Erreurs, limites & dégradation.* Pour le roulette result authoritative number, le produit reste désactivable ou restreint en production si sensible.
- **AUTH.06.7** — *Exploitation & évolutivité.* Pour le tournament trophy asset display, le produit minimise la fuite d’information entre rôles.
- **AUTH.06.8** — *Objectif & périmètre.* Pour le calcul rang personnel leaderboard, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.06.9** — *Entrées & contrats (API / UI).* Pour les avis / notes post-partie, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.06.10** — *État, persistance & intégrité.* Pour le quantum bluff branding start screen, le produit minimise la fuite d’information entre rôles.
- **AUTH.06.11** — *Temps réel & synchronisation.* Pour les limites express.json pour payloads, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.06.12** — *Sécurité, rôles & conformité.* Pour le web share api invite link si prévu, le produit distingue erreurs réseau, auth et serveur côté client.

### AUTH.07 — Historique wallet
- **AUTH.07.1** — *Objectif & périmètre.* Pour le mini games hub cards layout, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.07.2** — *Entrées & contrats (API / UI).* Pour le client socket auth object, le produit limite les abus par quotas, plafonds ou fréquence.
- **AUTH.07.3** — *État, persistance & intégrité.* Pour l’historique des mains practice, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.07.4** — *Temps réel & synchronisation.* Pour les routes /api/daily-challenges, le produit isole les données par utilisateur et par partie.
- **AUTH.07.5** — *Sécurité, rôles & conformité.* Pour l’invalidation JWT / blacklist au logout, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.07.6** — *Erreurs, limites & dégradation.* Pour la salle d’attente tournoi et le watcher cron, le produit vérifie les montants et soldes avant persistance.
- **AUTH.07.7** — *Exploitation & évolutivité.* Pour la page Friends et flux social, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.07.8** — *Objectif & périmètre.* Pour la finale, l’élimination et le mode spectateur tournoi, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.07.9** — *Entrées & contrats (API / UI).* Pour le number formatting chips locale, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.07.10** — *État, persistance & intégrité.* Pour le player turn highlight UI, le produit documente les préconditions et postconditions attendues.
- **AUTH.07.11** — *Temps réel & synchronisation.* Pour le action buttons disabled wrong turn, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **AUTH.07.12** — *Sécurité, rôles & conformité.* Pour le root quantum bluff api message, le produit propage l’état via Socket.IO de façon agrégée.

### AUTH.08 — Gamification exposée au client
- **AUTH.08.1** — *Objectif & périmètre.* Pour le stats increment async post commit, le produit documente les préconditions et postconditions attendues.
- **AUTH.08.2** — *Entrées & contrats (API / UI).* Pour le i18n namespace auth labels, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **AUTH.08.3** — *État, persistance & intégrité.* Pour le tournament result delay 12s, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.08.4** — *Temps réel & synchronisation.* Pour le pot display multi-devises jetons, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.08.5** — *Sécurité, rôles & conformité.* Pour le service tournoi et broadcasts Socket.IO, le produit vérifie les montants et soldes avant persistance.
- **AUTH.08.6** — *Erreurs, limites & dégradation.* Pour le tie-break sur identifiant affiché, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.08.7** — *Exploitation & évolutivité.* Pour le quantum bluff branding start screen, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.08.8** — *Objectif & périmètre.* Pour la recherche de joueurs, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.08.9** — *Entrées & contrats (API / UI).* Pour la 2FA TOTP et les endpoints dédiés, le produit expose des erreurs métier stables pour i18n et support.
- **AUTH.08.10** — *État, persistance & intégrité.* Pour le tie-break sur identifiant affiché, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.08.11** — *Temps réel & synchronisation.* Pour le reject friend loan, le produit documente les préconditions et postconditions attendues.
- **AUTH.08.12** — *Sécurité, rôles & conformité.* Pour le feedback text max length, le produit minimise la fuite d’information entre rôles.

### AUTH.09 — Top-up développement
- **AUTH.09.1** — *Objectif & périmètre.* Pour les salles privées et demandes d’adhésion, le produit minimise la fuite d’information entre rôles.
- **AUTH.09.2** — *Entrées & contrats (API / UI).* Pour le port listen env PORT, le produit documente les préconditions et postconditions attendues.
- **AUTH.09.3** — *État, persistance & intégrité.* Pour le leave_game cleanup seat, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.09.4** — *Temps réel & synchronisation.* Pour le practice bot expert wallet policy, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.09.5** — *Sécurité, rôles & conformité.* Pour le tournament clock server synced si prévu, le produit documente les préconditions et postconditions attendues.
- **AUTH.09.6** — *Erreurs, limites & dégradation.* Pour les limites express.json pour payloads, le produit propage l’état via Socket.IO de façon agrégée.
- **AUTH.09.7** — *Exploitation & évolutivité.* Pour la gamification (niveaux, badges, plafonds de mise), le produit vérifie les montants et soldes avant persistance.
- **AUTH.09.8** — *Objectif & périmètre.* Pour la gamification (niveaux, badges, plafonds de mise), le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.09.9** — *Entrées & contrats (API / UI).* Pour le mute player chat si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **AUTH.09.10** — *État, persistance & intégrité.* Pour le protected redirect login if no token, le produit s’appuie sur la validation serveur comme source de vérité.
- **AUTH.09.11** — *Temps réel & synchronisation.* Pour le mini games hub cards layout, le produit permet l’observabilité (latence, codes, corrélation).
- **AUTH.09.12** — *Sécurité, rôles & conformité.* Pour le private room join request timeout, le produit limite les abus par quotas, plafonds ou fréquence.

### AUTH.10 — 2FA TOTP
- **AUTH.10.1** — *Objectif & périmètre.* Pour le tournament bounty si supporté, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.10.2** — *Entrées & contrats (API / UI).* Pour le roulette max bet config, le produit vérifie les montants et soldes avant persistance.
- **AUTH.10.3** — *État, persistance & intégrité.* Pour le practice bot expert wallet policy, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.10.4** — *Temps réel & synchronisation.* Pour le stats increment async post commit, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **AUTH.10.5** — *Sécurité, rôles & conformité.* Pour le tournament ranking by chips, le produit isole les données par utilisateur et par partie.
- **AUTH.10.6** — *Erreurs, limites & dégradation.* Pour le logout blacklist token id, le produit distingue erreurs réseau, auth et serveur côté client.
- **AUTH.10.7** — *Exploitation & évolutivité.* Pour le tournament elimination zero chips, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.10.8** — *Objectif & périmètre.* Pour le flux register → lobby, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **AUTH.10.9** — *Entrées & contrats (API / UI).* Pour le tournament cancelled refund policy, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.10.10** — *État, persistance & intégrité.* Pour le username profanity filter si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **AUTH.10.11** — *Temps réel & synchronisation.* Pour le protected redirect login if no token, le produit documente les préconditions et postconditions attendues.
- **AUTH.10.12** — *Sécurité, rôles & conformité.* Pour le console admin assign moderator si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.

## Accessibilité client
_Balise `ACC` — logique fonctionnelle, sans code source._

### ACC.01 — Haut contraste
- **ACC.01.1** — *Objectif & périmètre.* Pour le lobby blackjack multi, le produit applique les règles de remboursement de prêt actif.
- **ACC.01.2** — *Entrées & contrats (API / UI).* Pour le admin runtime blackjack dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.01.3** — *État, persistance & intégrité.* Pour le hidden bet history query by user, le produit documente les préconditions et postconditions attendues.
- **ACC.01.4** — *Temps réel & synchronisation.* Pour le xp grant failure tolerance, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.01.5** — *Sécurité, rôles & conformité.* Pour le reset token single use, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.01.6** — *Erreurs, limites & dégradation.* Pour la persistance difficulté bot en session, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.01.7** — *Exploitation & évolutivité.* Pour le join_game payload gameId, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.01.8** — *Objectif & périmètre.* Pour le waiting room start POST gameId response, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.01.9** — *Entrées & contrats (API / UI).* Pour le private room join request timeout, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.01.10** — *État, persistance & intégrité.* Pour le ready check database ping, le produit maintient la compatibilité mobile et navigateur.
- **ACC.01.11** — *Temps réel & synchronisation.* Pour le lobby blackjack multi, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.01.12** — *Sécurité, rôles & conformité.* Pour la vérification d’email avant inscription, le produit maintient la compatibilité mobile et navigateur.

### ACC.02 — Alertes visuelles
- **ACC.02.1** — *Objectif & périmètre.* Pour la page Leaderboard filtrable, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.02.2** — *Entrées & contrats (API / UI).* Pour le i18n namespace game labels, le produit minimise la fuite d’information entre rôles.
- **ACC.02.3** — *État, persistance & intégrité.* Pour les classes CSS racine accessibilité, le produit vérifie les montants et soldes avant persistance.
- **ACC.02.4** — *Temps réel & synchronisation.* Pour le duplicate action reject same round, le produit isole les données par utilisateur et par partie.
- **ACC.02.5** — *Sécurité, rôles & conformité.* Pour la vérification d’email avant inscription, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.02.6** — *Erreurs, limites & dégradation.* Pour la résolution des paris cachés en fin de main, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.02.7** — *Exploitation & évolutivité.* Pour le flux register → lobby, le produit vérifie les montants et soldes avant persistance.
- **ACC.02.8** — *Objectif & périmètre.* Pour le loan banner active on casino pages, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.02.9** — *Entrées & contrats (API / UI).* Pour le claim reward challenge, le produit isole les données par utilisateur et par partie.
- **ACC.02.10** — *État, persistance & intégrité.* Pour le tournament break schedule si prévu, le produit documente les préconditions et postconditions attendues.
- **ACC.02.11** — *Temps réel & synchronisation.* Pour le blackjack hit stand double split si supporté, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.02.12** — *Sécurité, rôles & conformité.* Pour le accessibility skip link si prévu, le produit permet l’observabilité (latence, codes, corrélation).

### ACC.03 — Mode daltonisme
- **ACC.03.1** — *Objectif & périmètre.* Pour les catégories victoires vs jetons vs XP, le produit maintient la compatibilité mobile et navigateur.
- **ACC.03.2** — *Entrées & contrats (API / UI).* Pour le démarrage de partie vers un gameId, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.03.3** — *État, persistance & intégrité.* Pour le logging confidence IA, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.03.4** — *Temps réel & synchronisation.* Pour le nettoyage planifié (cleanup jobs), le produit limite les abus par quotas, plafonds ou fréquence.
- **ACC.03.5** — *Sécurité, rôles & conformité.* Pour le friends list sort online first, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ACC.03.6** — *Erreurs, limites & dégradation.* Pour le tournament trophy asset display, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.03.7** — *Exploitation & évolutivité.* Pour le moteur de distribution et d’enchères, le produit maintient la compatibilité mobile et navigateur.
- **ACC.03.8** — *Objectif & périmètre.* Pour le rematch same players flag, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.03.9** — *Entrées & contrats (API / UI).* Pour le min buy cash table, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.03.10** — *État, persistance & intégrité.* Pour le ledger casino atomique, le produit maintient la compatibilité mobile et navigateur.
- **ACC.03.11** — *Temps réel & synchronisation.* Pour le provider d’accessibilité et menu, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.03.12** — *Sécurité, rôles & conformité.* Pour le self friend request block, le produit maintient la compatibilité mobile et navigateur.

### ACC.04 — Types de daltonisme
- **ACC.04.1** — *Objectif & périmètre.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit maintient la compatibilité mobile et navigateur.
- **ACC.04.2** — *Entrées & contrats (API / UI).* Pour le results alias route same page, le produit journalise les transitions sensibles pour audit.
- **ACC.04.3** — *État, persistance & intégrité.* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.04.4** — *Temps réel & synchronisation.* Pour le admin console action audit, le produit maintient la compatibilité mobile et navigateur.
- **ACC.04.5** — *Sécurité, rôles & conformité.* Pour le profile badges grid, le produit maintient la compatibilité mobile et navigateur.
- **ACC.04.6** — *Erreurs, limites & dégradation.* Pour le stockage token localStorage, le produit journalise les transitions sensibles pour audit.
- **ACC.04.7** — *Exploitation & évolutivité.* Pour le xp grant failure tolerance, le produit maintient la compatibilité mobile et navigateur.
- **ACC.04.8** — *Objectif & périmètre.* Pour le edit profile change password current required, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.04.9** — *Entrées & contrats (API / UI).* Pour le hidden bets result route params, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.04.10** — *État, persistance & intégrité.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.04.11** — *Temps réel & synchronisation.* Pour le navigation bottom bar si mobile, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ACC.04.12** — *Sécurité, rôles & conformité.* Pour les routes /api/leaderboard, le produit expose des erreurs métier stables pour i18n et support.

### ACC.05 — Persistance localStorage
- **ACC.05.1** — *Objectif & périmètre.* Pour le email verification optional flow, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.05.2** — *Entrées & contrats (API / UI).* Pour le straddle optional toggle room config, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.05.3** — *État, persistance & intégrité.* Pour le cors preflight OPTIONS 200, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.05.4** — *Temps réel & synchronisation.* Pour le provider d’accessibilité et menu, le produit minimise la fuite d’information entre rôles.
- **ACC.05.5** — *Sécurité, rôles & conformité.* Pour le game example route isolation, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.05.6** — *Erreurs, limites & dégradation.* Pour la politique Helmet CSP et fonts externes, le produit maintient la compatibilité mobile et navigateur.
- **ACC.05.7** — *Exploitation & évolutivité.* Pour le accessibility skip link si prévu, le produit minimise la fuite d’information entre rôles.
- **ACC.05.8** — *Objectif & périmètre.* Pour le microservice Python pour décisions expert bot, le produit maintient la compatibilité mobile et navigateur.
- **ACC.05.9** — *Entrées & contrats (API / UI).* Pour le feedback route séparée reports, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.05.10** — *État, persistance & intégrité.* Pour le hook useUser et synchronisation token, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.05.11** — *Temps réel & synchronisation.* Pour GameDeal et flux de distribution démo, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.05.12** — *Sécurité, rôles & conformité.* Pour le block user social si prévu, le produit maintient la compatibilité mobile et navigateur.

### ACC.06 — Application classes racine HTML
- **ACC.06.1** — *Objectif & périmètre.* Pour GameExample (démo / test intégration), le produit minimise la fuite d’information entre rôles.
- **ACC.06.2** — *Entrées & contrats (API / UI).* Pour le tournament name branding header, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ACC.06.3** — *État, persistance & intégrité.* Pour le navigation bottom bar si mobile, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.06.4** — *Temps réel & synchronisation.* Pour le note player tag si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.06.5** — *Sécurité, rôles & conformité.* Pour le blocked user list si prévu, le produit maintient la compatibilité mobile et navigateur.
- **ACC.06.6** — *Erreurs, limites & dégradation.* Pour le daily challenge streak bonus si prévu, le produit journalise les transitions sensibles pour audit.
- **ACC.06.7** — *Exploitation & évolutivité.* Pour le warning toast tournament soon, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.06.8** — *Objectif & périmètre.* Pour le email verification optional flow, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.06.9** — *Entrées & contrats (API / UI).* Pour la page BotConfiguration, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.06.10** — *État, persistance & intégrité.* Pour les routes /api/daily-challenges, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.06.11** — *Temps réel & synchronisation.* Pour le navigation bottom bar si mobile, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.06.12** — *Sécurité, rôles & conformité.* Pour la page MiniGames, le produit maintient la compatibilité mobile et navigateur.

### ACC.07 — Menu accessibilité
- **ACC.07.1** — *Objectif & périmètre.* Pour le error toast network french copy, le produit minimise la fuite d’information entre rôles.
- **ACC.07.2** — *Entrées & contrats (API / UI).* Pour le side pot UI lecture état serveur, le produit maintient la compatibilité mobile et navigateur.
- **ACC.07.3** — *État, persistance & intégrité.* Pour le hand strength display optional client only, le produit propage l’état via Socket.IO de façon agrégée.
- **ACC.07.4** — *Temps réel & synchronisation.* Pour le flux register → lobby, le produit limite les abus par quotas, plafonds ou fréquence.
- **ACC.07.5** — *Sécurité, rôles & conformité.* Pour la progression challenge stockée DB, le produit maintient la compatibilité mobile et navigateur.
- **ACC.07.6** — *Erreurs, limites & dégradation.* Pour l’endpoint /api/health/ready et l’état dégradé, le produit maintient la compatibilité mobile et navigateur.
- **ACC.07.7** — *Exploitation & évolutivité.* Pour le TournamentTeleporter dans App, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.07.8** — *Objectif & périmètre.* Pour le leaderboard OFFSET pagination, le produit expose des erreurs métier stables pour i18n et support.
- **ACC.07.9** — *Entrées & contrats (API / UI).* Pour le capacitor splash screen si mobile, le produit applique les règles de remboursement de prêt actif.
- **ACC.07.10** — *État, persistance & intégrité.* Pour le friends list sort online first, le produit s’appuie sur la validation serveur comme source de vérité.
- **ACC.07.11** — *Temps réel & synchronisation.* Pour le game deal route isolation, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ACC.07.12** — *Sécurité, rôles & conformité.* Pour la configuration des bots avant practice, le produit distingue erreurs réseau, auth et serveur côté client.

### ACC.08 — Impact zéro sur règles serveur
- **ACC.08.1** — *Objectif & périmètre.* Pour le roulette wheel animation client only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ACC.08.2** — *Entrées & contrats (API / UI).* Pour la gamification (niveaux, badges, plafonds de mise), le produit maintient la compatibilité mobile et navigateur.
- **ACC.08.3** — *État, persistance & intégrité.* Pour le language switcher component, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.08.4** — *Temps réel & synchronisation.* Pour le basename Capacitor vs web, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.08.5** — *Sécurité, rôles & conformité.* Pour le client RTK Query et invalidation de tags, le produit vérifie les montants et soldes avant persistance.
- **ACC.08.6** — *Erreurs, limites & dégradation.* Pour le start screen CTA login register, le produit limite les abus par quotas, plafonds ou fréquence.
- **ACC.08.7** — *Exploitation & évolutivité.* Pour le language switcher component, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.08.8** — *Objectif & périmètre.* Pour le duplicate action reject same round, le produit journalise les transitions sensibles pour audit.
- **ACC.08.9** — *Entrées & contrats (API / UI).* Pour les messages privés entre amis, le produit distingue erreurs réseau, auth et serveur côté client.
- **ACC.08.10** — *État, persistance & intégrité.* Pour le disconnect grace period joueur, le produit minimise la fuite d’information entre rôles.
- **ACC.08.11** — *Temps réel & synchronisation.* Pour les player reports motifs, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ACC.08.12** — *Sécurité, rôles & conformité.* Pour la machine à sous (tour, symboles, payout), le produit expose des erreurs métier stables pour i18n et support.

## Lobby & navigation
_Balise `LOBBY` — logique fonctionnelle, sans code source._

### LOBBY.01 — Vue hub poker/minijeux
- **LOBBY.01.1** — *Objectif & périmètre.* Pour le claim reward challenge, le produit minimise la fuite d’information entre rôles.
- **LOBBY.01.2** — *Entrées & contrats (API / UI).* Pour le pot odds hint display optional client only, le produit minimise la fuite d’information entre rôles.
- **LOBBY.01.3** — *État, persistance & intégrité.* Pour le tournament leave before start refund, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.01.4** — *Temps réel & synchronisation.* Pour la récupération blackjack au boot serveur, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.01.5** — *Sécurité, rôles & conformité.* Pour les notifications prêt accepté/refusé, le produit applique les règles de remboursement de prêt actif.
- **LOBBY.01.6** — *Erreurs, limites & dégradation.* Pour les niveaux XP seuils, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.01.7** — *Exploitation & évolutivité.* Pour le game example route isolation, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.01.8** — *Objectif & périmètre.* Pour le blocked user list si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.01.9** — *Entrées & contrats (API / UI).* Pour les défis quotidiens et la réclamation de récompense, le produit permet l’observabilité (latence, codes, corrélation).
- **LOBBY.01.10** — *État, persistance & intégrité.* Pour la waiting room poker (création / rejoindre), le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.01.11** — *Temps réel & synchronisation.* Pour le loan paid off celebration si prévu, le produit applique les règles de remboursement de prêt actif.
- **LOBBY.01.12** — *Sécurité, rôles & conformité.* Pour le small blind big blind labels i18n, le produit applique les règles de remboursement de prêt actif.

### LOBBY.02 — Onglets et query params
- **LOBBY.02.1** — *Objectif & périmètre.* Pour les avis / notes post-partie, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOBBY.02.2** — *Entrées & contrats (API / UI).* Pour le cash queue promote spectator, le produit permet l’observabilité (latence, codes, corrélation).
- **LOBBY.02.3** — *État, persistance & intégrité.* Pour le lobby principal et ses onglets, le produit journalise les transitions sensibles pour audit.
- **LOBBY.02.4** — *Temps réel & synchronisation.* Pour les routes /api/blackjack-tables, le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.02.5** — *Sécurité, rôles & conformité.* Pour le broadcast io vers room tournoi, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.02.6** — *Erreurs, limites & dégradation.* Pour le profile badges grid, le produit isole les données par utilisateur et par partie.
- **LOBBY.02.7** — *Exploitation & évolutivité.* Pour le friend request duplicate prevention, le produit documente les préconditions et postconditions attendues.
- **LOBBY.02.8** — *Objectif & périmètre.* Pour le basename Capacitor vs web, le produit documente les préconditions et postconditions attendues.
- **LOBBY.02.9** — *Entrées & contrats (API / UI).* Pour le moteur de distribution et d’enchères, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.02.10** — *État, persistance & intégrité.* La compatibilité mobile adapte les zones tactiles et réduit la densité d’information sur les écrans étroits sans changer les règles.
- **LOBBY.02.11** — *Temps réel & synchronisation.* Pour le rebuy max table enforcement, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.02.12** — *Sécurité, rôles & conformité.* Pour le tournament cancelled refund policy, le produit applique les règles de remboursement de prêt actif.

### LOBBY.03 — Tutoriel lobby
- **LOBBY.03.1** — *Objectif & périmètre.* Pour le player turn highlight UI, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOBBY.03.2** — *Entrées & contrats (API / UI).* Pour le i18n namespace casino labels, le produit minimise la fuite d’information entre rôles.
- **LOBBY.03.3** — *État, persistance & intégrité.* Pour les toasts tournament-countdown, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOBBY.03.4** — *Temps réel & synchronisation.* Pour le friend request duplicate prevention, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.03.5** — *Sécurité, rôles & conformité.* Pour le JSON body limit (avatars data URL), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.03.6** — *Erreurs, limites & dégradation.* La recherche joueur limite le débit et le contenu renvoyé pour limiter l’énumération ; les résultats respectent les paramètres de visibilité.
- **LOBBY.03.7** — *Exploitation & évolutivité.* Pour le slot reels animation client only, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.03.8** — *Objectif & périmètre.* Pour les invitations socket room blackjack, le produit isole les données par utilisateur et par partie.
- **LOBBY.03.9** — *Entrées & contrats (API / UI).* Pour la gamification (niveaux, badges, plafonds de mise), le produit documente les préconditions et postconditions attendues.
- **LOBBY.03.10** — *État, persistance & intégrité.* Pour le http 500 show stack dev, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.03.11** — *Temps réel & synchronisation.* Pour le loan banner active on casino pages, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.03.12** — *Sécurité, rôles & conformité.* Pour le navigation bottom bar si mobile, le produit maintient la compatibilité mobile et navigateur.

### LOBBY.04 — Toasts & erreurs réseau
- **LOBBY.04.1** — *Objectif & périmètre.* Pour le invitation accept deep link route, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.04.2** — *Entrées & contrats (API / UI).* Pour le practice difficulty query param, le produit isole les données par utilisateur et par partie.
- **LOBBY.04.3** — *État, persistance & intégrité.* Pour les routes /api/leaderboard, le produit minimise la fuite d’information entre rôles.
- **LOBBY.04.4** — *Temps réel & synchronisation.* Pour le TournamentTeleporter dans App, le produit minimise la fuite d’information entre rôles.
- **LOBBY.04.5** — *Sécurité, rôles & conformité.* Pour les classes CSS racine accessibilité, le produit applique les règles de remboursement de prêt actif.
- **LOBBY.04.6** — *Erreurs, limites & dégradation.* Pour le tournament leave before start refund, le produit minimise la fuite d’information entre rôles.
- **LOBBY.04.7** — *Exploitation & évolutivité.* Pour le loan paid off celebration si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.04.8** — *Objectif & périmètre.* Pour le hand strength display optional client only, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOBBY.04.9** — *Entrées & contrats (API / UI).* Pour les questions secrètes de récupération de compte, le produit minimise la fuite d’information entre rôles.
- **LOBBY.04.10** — *État, persistance & intégrité.* Pour le updates check new version banner si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOBBY.04.11** — *Temps réel & synchronisation.* Pour le friend request duplicate prevention, le produit isole les données par utilisateur et par partie.
- **LOBBY.04.12** — *Sécurité, rôles & conformité.* Pour le i18n namespace auth labels, le produit isole les données par utilisateur et par partie.

### LOBBY.05 — Barre solde globale
- **LOBBY.05.1** — *Objectif & périmètre.* Pour les healthchecks live / ready et dépendances, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.05.2** — *Entrées & contrats (API / UI).* Pour le blackjack bet limits table, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.05.3** — *État, persistance & intégrité.* Pour le gestionnaire d’erreurs HTTP global Express, le produit propage l’état via Socket.IO de façon agrégée.
- **LOBBY.05.4** — *Temps réel & synchronisation.* Pour le updates static route behavior, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.05.5** — *Sécurité, rôles & conformité.* Pour le hand strength display optional client only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.05.6** — *Erreurs, limites & dégradation.* Pour la page Leaderboard filtrable, le produit reste désactivable ou restreint en production si sensible.
- **LOBBY.05.7** — *Exploitation & évolutivité.* Pour le hook useUser et synchronisation token, le produit documente les préconditions et postconditions attendues.
- **LOBBY.05.8** — *Objectif & périmètre.* Pour le bot decision log structured, le produit applique les règles de remboursement de prêt actif.
- **LOBBY.05.9** — *Entrées & contrats (API / UI).* Pour le pot display multi-devises jetons, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.05.10** — *État, persistance & intégrité.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.05.11** — *Temps réel & synchronisation.* Pour le cash queue promote spectator, le produit permet l’observabilité (latence, codes, corrélation).
- **LOBBY.05.12** — *Sécurité, rôles & conformité.* Pour le tournament result delay 12s, le produit limite les abus par quotas, plafonds ou fréquence.

### LOBBY.06 — Accès configuration bots
- **LOBBY.06.1** — *Objectif & périmètre.* Pour le cron tournament progression, le produit documente les préconditions et postconditions attendues.
- **LOBBY.06.2** — *Entrées & contrats (API / UI).* Pour le degraded redis fallback memory, le produit permet l’observabilité (latence, codes, corrélation).
- **LOBBY.06.3** — *État, persistance & intégrité.* Pour la page Profile et EditProfile, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOBBY.06.4** — *Temps réel & synchronisation.* Pour le accept friend loan crédit, le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.06.5** — *Sécurité, rôles & conformité.* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.06.6** — *Erreurs, limites & dégradation.* Pour le gamification cap bet by level, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOBBY.06.7** — *Exploitation & évolutivité.* Pour le tournament prize formatting locale, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.06.8** — *Objectif & périmètre.* Pour la validation stricte des actions IA, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.06.9** — *Entrées & contrats (API / UI).* Pour le loan paid off celebration si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.06.10** — *État, persistance & intégrité.* Pour les questions secrètes de récupération de compte, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOBBY.06.11** — *Temps réel & synchronisation.* Pour le friend not found search, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.06.12** — *Sécurité, rôles & conformité.* Pour la cotation et le placement de tickets, le produit maintient la compatibilité mobile et navigateur.

### LOBBY.07 — Accès tournois
- **LOBBY.07.1** — *Objectif & périmètre.* Pour le game page key pathname search reset, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.07.2** — *Entrées & contrats (API / UI).* Pour le latency metric histogram si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.07.3** — *État, persistance & intégrité.* Pour le tournament prize formatting locale, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.07.4** — *Temps réel & synchronisation.* Pour le capacitor status bar style si mobile, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOBBY.07.5** — *Sécurité, rôles & conformité.* Pour les questions secrètes de récupération de compte, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOBBY.07.6** — *Erreurs, limites & dégradation.* Pour le tournament navigate back lobby, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOBBY.07.7** — *Exploitation & évolutivité.* Pour le loan exceeds allowed rate error, le produit isole les données par utilisateur et par partie.
- **LOBBY.07.8** — *Objectif & périmètre.* Pour la configuration trust proxy, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOBBY.07.9** — *Entrées & contrats (API / UI).* Pour le endpoint createGame / joinGame RTK, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOBBY.07.10** — *État, persistance & intégrité.* Pour le socket global (auth token, connect_error), le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.07.11** — *Temps réel & synchronisation.* Pour le retry réseau avec backoff sur erreurs transitoires, le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.07.12** — *Sécurité, rôles & conformité.* Pour les invitations à une table blackjack, le produit s’appuie sur la validation serveur comme source de vérité.

### LOBBY.08 — Accès blackjack multi
- **LOBBY.08.1** — *Objectif & périmètre.* Pour le latency metric histogram si prévu, le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.08.2** — *Entrées & contrats (API / UI).* Pour le composant GameWithKey (reset état route), le produit distingue erreurs réseau, auth et serveur côté client.
- **LOBBY.08.3** — *État, persistance & intégrité.* Pour le tournament result delay 12s, le produit maintient la compatibilité mobile et navigateur.
- **LOBBY.08.4** — *Temps réel & synchronisation.* Pour le expert bot python grpc or http si prévu, le produit documente les préconditions et postconditions attendues.
- **LOBBY.08.5** — *Sécurité, rôles & conformité.* Pour la page HiddenBetsResult, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOBBY.08.6** — *Erreurs, limites & dégradation.* Pour la résolution des paris cachés en fin de main, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.08.7** — *Exploitation & évolutivité.* Pour le player action log structured, le produit expose des erreurs métier stables pour i18n et support.
- **LOBBY.08.8** — *Objectif & périmètre.* Pour le calcul rang personnel leaderboard, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOBBY.08.9** — *Entrées & contrats (API / UI).* Pour le mobile touch targets buttons, le produit propage l’état via Socket.IO de façon agrégée.
- **LOBBY.08.10** — *État, persistance & intégrité.* Pour le navigation bottom bar si mobile, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOBBY.08.11** — *Temps réel & synchronisation.* Pour la file spectateur cash pleine, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOBBY.08.12** — *Sécurité, rôles & conformité.* Pour le expert bot python grpc or http si prévu, le produit maintient la compatibilité mobile et navigateur.

## Waiting rooms poker
_Balise `WRM` — logique fonctionnelle, sans code source._

### WRM.01 — Création salle
- **WRM.01.1** — *Objectif & périmètre.* Pour le lobby principal et ses onglets, le produit expose des erreurs métier stables pour i18n et support.
- **WRM.01.2** — *Entrées & contrats (API / UI).* Pour le locale date formatting leaderboard, le produit propage l’état via Socket.IO de façon agrégée.
- **WRM.01.3** — *État, persistance & intégrité.* Pour le call amount computed server, le produit maintient la compatibilité mobile et navigateur.
- **WRM.01.4** — *Temps réel & synchronisation.* Pour le serveur HTTP + Socket.IO partagé, le produit maintient la compatibilité mobile et navigateur.
- **WRM.01.5** — *Sécurité, rôles & conformité.* Pour le socket path /socket.io, le produit vérifie les montants et soldes avant persistance.
- **WRM.01.6** — *Erreurs, limites & dégradation.* Pour le join game error banned si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.01.7** — *Exploitation & évolutivité.* Pour le quantum bluff branding start screen, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.01.8** — *Objectif & périmètre.* Pour le runout cartes après all-in, le produit expose des erreurs métier stables pour i18n et support.
- **WRM.01.9** — *Entrées & contrats (API / UI).* Pour le color blind mode tritanopia, le produit minimise la fuite d’information entre rôles.
- **WRM.01.10** — *État, persistance & intégrité.* Pour la page tournois (liste / inscription), le produit permet l’observabilité (latence, codes, corrélation).
- **WRM.01.11** — *Temps réel & synchronisation.* Pour la file spectateur cash pleine, le produit maintient la compatibilité mobile et navigateur.
- **WRM.01.12** — *Sécurité, rôles & conformité.* Pour le mode spectateur et la file de reprise siège, le produit minimise la fuite d’information entre rôles.

### WRM.02 — Visibilité publique/privée
- **WRM.02.1** — *Objectif & périmètre.* Les tournois planifiés ou manuels déclenchent des broadcasts d’état quand les phases changent (inscription fermée, table finale, etc.).
- **WRM.02.2** — *Entrées & contrats (API / UI).* Pour les Webhooks ou jobs async optionnels, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **WRM.02.3** — *État, persistance & intégrité.* Pour le report submitted acknowledgment, le produit limite les abus par quotas, plafonds ou fréquence.
- **WRM.02.4** — *Temps réel & synchronisation.* Pour les friend requests entrantes/sortantes, le produit s’appuie sur la validation serveur comme source de vérité.
- **WRM.02.5** — *Sécurité, rôles & conformité.* Pour le practice bot expert wallet policy, le produit minimise la fuite d’information entre rôles.
- **WRM.02.6** — *Erreurs, limites & dégradation.* Pour le slot reels animation client only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.02.7** — *Exploitation & évolutivité.* Pour la résolution paris cachés après showdown, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **WRM.02.8** — *Objectif & périmètre.* Pour les toasts tournament-countdown, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.02.9** — *Entrées & contrats (API / UI).* Pour le leaderboard self rank highlight, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **WRM.02.10** — *État, persistance & intégrité.* Pour le calcul rang personnel leaderboard, le produit reste désactivable ou restreint en production si sensible.
- **WRM.02.11** — *Temps réel & synchronisation.* Pour le last action log poker UI, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.02.12** — *Sécurité, rôles & conformité.* Pour le action buttons disabled wrong turn, le produit maintient la compatibilité mobile et navigateur.

### WRM.03 — Rejoindre / capacité
- **WRM.03.1** — *Objectif & périmètre.* Pour l’en-tête x-idempotency-key sur les mutations, le produit documente les préconditions et postconditions attendues.
- **WRM.03.2** — *Entrées & contrats (API / UI).* Pour le friend not found search, le produit s’appuie sur la validation serveur comme source de vérité.
- **WRM.03.3** — *État, persistance & intégrité.* Pour le tournament elimination zero chips, le produit propage l’état via Socket.IO de façon agrégée.
- **WRM.03.4** — *Temps réel & synchronisation.* Pour le JSON body limit (avatars data URL), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **WRM.03.5** — *Sécurité, rôles & conformité.* Pour la téléportation socket vers table de tournoi, le produit journalise les transitions sensibles pour audit.
- **WRM.03.6** — *Erreurs, limites & dégradation.* Pour le live flop market transition, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.03.7** — *Exploitation & évolutivité.* Pour le loan list filter active, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.03.8** — *Objectif & périmètre.* Pour l’administration des tournois (page dédiée), le produit isole les données par utilisateur et par partie.
- **WRM.03.9** — *Entrées & contrats (API / UI).* Pour les routes /api/waiting-room, le produit documente les préconditions et postconditions attendues.
- **WRM.03.10** — *État, persistance & intégrité.* Pour le success toast friend accepted, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **WRM.03.11** — *Temps réel & synchronisation.* Pour les invitations socket room blackjack, le produit isole les données par utilisateur et par partie.
- **WRM.03.12** — *Sécurité, rôles & conformité.* Pour les niveaux XP seuils, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### WRM.04 — Prêt collectif
- **WRM.04.1** — *Objectif & périmètre.* Pour le start screen CTA login register, le produit expose des erreurs métier stables pour i18n et support.
- **WRM.04.2** — *Entrées & contrats (API / UI).* Pour le game gateway constructor side effects, le produit minimise la fuite d’information entre rôles.
- **WRM.04.3** — *État, persistance & intégrité.* Pour le 2FA backup codes si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **WRM.04.4** — *Temps réel & synchronisation.* Pour le provider TableThemeProvider, le produit vérifie les montants et soldes avant persistance.
- **WRM.04.5** — *Sécurité, rôles & conformité.* Pour le latency metric histogram si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.04.6** — *Erreurs, limites & dégradation.* Pour la téléportation socket vers table de tournoi, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.04.7** — *Exploitation & évolutivité.* Pour le xp grant failure tolerance, le produit maintient la compatibilité mobile et navigateur.
- **WRM.04.8** — *Objectif & périmètre.* Pour le basename Capacitor vs web, le produit minimise la fuite d’information entre rôles.
- **WRM.04.9** — *Entrées & contrats (API / UI).* Pour le socket global (auth token, connect_error), le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.04.10** — *État, persistance & intégrité.* Pour l’anti-cheat middleware HTTP, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.04.11** — *Temps réel & synchronisation.* Pour le basename Capacitor vs web, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **WRM.04.12** — *Sécurité, rôles & conformité.* Pour le model inference timeout, le produit propage l’état via Socket.IO de façon agrégée.

### WRM.05 — Démarrage vers gameId
- **WRM.05.1** — *Objectif & périmètre.* Pour le tournament rebuy addon si supporté tournoi, le produit vérifie les montants et soldes avant persistance.
- **WRM.05.2** — *Entrées & contrats (API / UI).* Pour le tournament leave before start refund, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.05.3** — *État, persistance & intégrité.* Pour le gateway poker (événements temps réel), le produit journalise les transitions sensibles pour audit.
- **WRM.05.4** — *Temps réel & synchronisation.* Pour la gamification (niveaux, badges, plafonds de mise), le produit expose des erreurs métier stables pour i18n et support.
- **WRM.05.5** — *Sécurité, rôles & conformité.* Pour l’administration des tournois (page dédiée), le produit expose des erreurs métier stables pour i18n et support.
- **WRM.05.6** — *Erreurs, limites & dégradation.* Pour le fold forcé ou check auto si timer, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **WRM.05.7** — *Exploitation & évolutivité.* Pour le blackjack table gameId param, le produit propage l’état via Socket.IO de façon agrégée.
- **WRM.05.8** — *Objectif & périmètre.* Pour le tournament result delay 12s, le produit documente les préconditions et postconditions attendues.
- **WRM.05.9** — *Entrées & contrats (API / UI).* Pour le runout cartes après all-in, le produit isole les données par utilisateur et par partie.
- **WRM.05.10** — *État, persistance & intégrité.* Pour la waiting room poker (création / rejoindre), le produit expose des erreurs métier stables pour i18n et support.
- **WRM.05.11** — *Temps réel & synchronisation.* Pour le error boundary reset state, le produit minimise la fuite d’information entre rôles.
- **WRM.05.12** — *Sécurité, rôles & conformité.* Pour GameExample (démo / test intégration), le produit limite les abus par quotas, plafonds ou fréquence.

### WRM.06 — Demandes join salle privée
- **WRM.06.1** — *Objectif & périmètre.* Pour les défis quotidiens et la réclamation de récompense, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.06.2** — *Entrées & contrats (API / UI).* Pour le daily challenge streak bonus si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **WRM.06.3** — *État, persistance & intégrité.* Pour la salle d’attente tournoi et le watcher cron, le produit isole les données par utilisateur et par partie.
- **WRM.06.4** — *Temps réel & synchronisation.* Pour le cash sit-out / rebuy / leave, le produit maintient la compatibilité mobile et navigateur.
- **WRM.06.5** — *Sécurité, rôles & conformité.* Pour la finale, l’élimination et le mode spectateur tournoi, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.06.6** — *Erreurs, limites & dégradation.* Pour les toasts tournament-countdown, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.06.7** — *Exploitation & évolutivité.* Pour la page Profile et EditProfile, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **WRM.06.8** — *Objectif & périmètre.* Pour le stockage token localStorage, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.06.9** — *Entrées & contrats (API / UI).* Pour le bot action server driven timing, le produit documente les préconditions et postconditions attendues.
- **WRM.06.10** — *État, persistance & intégrité.* Pour le socket auth handshake token, le produit minimise la fuite d’information entre rôles.
- **WRM.06.11** — *Temps réel & synchronisation.* Pour le game gateway constructor side effects, le produit journalise les transitions sensibles pour audit.
- **WRM.06.12** — *Sécurité, rôles & conformité.* Pour le socket rejoin après refresh page, le produit vérifie les montants et soldes avant persistance.

### WRM.07 — Rematch
- **WRM.07.1** — *Objectif & périmètre.* Pour le wallet history append only, le produit expose des erreurs métier stables pour i18n et support.
- **WRM.07.2** — *Entrées & contrats (API / UI).* Pour le waiting room ready toggle, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.07.3** — *État, persistance & intégrité.* Pour le board burn card animation serveur logique, le produit maintient la compatibilité mobile et navigateur.
- **WRM.07.4** — *Temps réel & synchronisation.* Pour le protected redirect login if no token, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **WRM.07.5** — *Sécurité, rôles & conformité.* Pour le color blind mode tritanopia, le produit permet l’observabilité (latence, codes, corrélation).
- **WRM.07.6** — *Erreurs, limites & dégradation.* Pour le tournament satellite ticket si supporté, le produit permet l’observabilité (latence, codes, corrélation).
- **WRM.07.7** — *Exploitation & évolutivité.* Pour le showdown evaluation HTTP internal, le produit minimise la fuite d’information entre rôles.
- **WRM.07.8** — *Objectif & périmètre.* Pour le moteur de distribution et d’enchères, le produit documente les préconditions et postconditions attendues.
- **WRM.07.9** — *Entrées & contrats (API / UI).* Pour le connectSrc self socket url, le produit isole les données par utilisateur et par partie.
- **WRM.07.10** — *État, persistance & intégrité.* Pour le action buttons disabled wrong turn, le produit maintient la compatibilité mobile et navigateur.
- **WRM.07.11** — *Temps réel & synchronisation.* Pour la résolution paris cachés après showdown, le produit vérifie les montants et soldes avant persistance.
- **WRM.07.12** — *Sécurité, rôles & conformité.* Pour la 2FA TOTP et les endpoints dédiés, le produit distingue erreurs réseau, auth et serveur côté client.

### WRM.08 — Quitter / suppression
- **WRM.08.1** — *Objectif & périmètre.* Pour le tournament satellite ticket si supporté, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **WRM.08.2** — *Entrées & contrats (API / UI).* Pour le calcul meilleure main showdown, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **WRM.08.3** — *État, persistance & intégrité.* Pour le game example route isolation, le produit distingue erreurs réseau, auth et serveur côté client.
- **WRM.08.4** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit s’appuie sur la validation serveur comme source de vérité.
- **WRM.08.5** — *Sécurité, rôles & conformité.* Pour le tournament prize pool calculation, le produit respecte l’idempotence ou les clés d’unicité métier.
- **WRM.08.6** — *Erreurs, limites & dégradation.* Pour le join_game payload gameId, le produit propage l’état via Socket.IO de façon agrégée.
- **WRM.08.7** — *Exploitation & évolutivité.* Pour le quantum bluff branding start screen, le produit isole les données par utilisateur et par partie.
- **WRM.08.8** — *Objectif & périmètre.* Pour le cash sit-out / rebuy / leave, le produit minimise la fuite d’information entre rôles.
- **WRM.08.9** — *Entrées & contrats (API / UI).* Pour le small blind big blind labels i18n, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **WRM.08.10** — *État, persistance & intégrité.* Pour les invitations socket room blackjack, le produit applique les règles de remboursement de prêt actif.
- **WRM.08.11** — *Temps réel & synchronisation.* Pour le high contrast token colors, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **WRM.08.12** — *Sécurité, rôles & conformité.* Pour la page Friends et flux social, le produit refuse les actions si le rôle ne correspond pas au contexte.

## Poker en ligne temps réel
_Balise `POK_RT` — logique fonctionnelle, sans code source._

### POK_RT.01 — Handshake socket & auth
- **POK_RT.01.1** — *Objectif & périmètre.* Pour les réponses 403 / 401 uniformisées, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_RT.01.2** — *Entrées & contrats (API / UI).* Pour les questions secrètes de récupération de compte, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.01.3** — *État, persistance & intégrité.* Pour la page Leaderboard filtrable, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_RT.01.4** — *Temps réel & synchronisation.* Pour les toasts tournament-countdown, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_RT.01.5** — *Sécurité, rôles & conformité.* Pour le reject friend loan, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_RT.01.6** — *Erreurs, limites & dégradation.* Pour le latency metric histogram si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_RT.01.7** — *Exploitation & évolutivité.* Pour le tournament spectate delay 5s, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.01.8** — *Objectif & périmètre.* Pour la navigation /tournaments et /tournament-waiting, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_RT.01.9** — *Entrées & contrats (API / UI).* Pour le loan list filter active, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.01.10** — *État, persistance & intégrité.* Pour le number formatting chips locale, le produit documente les préconditions et postconditions attendues.
- **POK_RT.01.11** — *Temps réel & synchronisation.* Pour le http 500 show stack dev, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_RT.01.12** — *Sécurité, rôles & conformité.* Pour le runout cartes après all-in, le produit limite les abus par quotas, plafonds ou fréquence.

### POK_RT.02 — JOIN_GAME & room gameId
- **POK_RT.02.1** — *Objectif & périmètre.* Pour la page HiddenBetsResult, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.02.2** — *Entrées & contrats (API / UI).* Pour les query params spectate=1 sur Game, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_RT.02.3** — *État, persistance & intégrité.* Pour l’écran d’accueil (StartScreen), le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.02.4** — *Temps réel & synchronisation.* Pour les invitation party poker, le produit documente les préconditions et postconditions attendues.
- **POK_RT.02.5** — *Sécurité, rôles & conformité.* Pour le tie-break sur identifiant affiché, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_RT.02.6** — *Erreurs, limites & dégradation.* Pour le console admin filter by status, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_RT.02.7** — *Exploitation & évolutivité.* Pour le cash queue promote spectator, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.02.8** — *Objectif & périmètre.* Pour le thème de table (felt / couleurs), le produit reste désactivable ou restreint en production si sensible.
- **POK_RT.02.9** — *Entrées & contrats (API / UI).* Pour le loan list filter active, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_RT.02.10** — *État, persistance & intégrité.* Pour le clipboard copy room code, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.02.11** — *Temps réel & synchronisation.* Pour le friend request duplicate prevention, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_RT.02.12** — *Sécurité, rôles & conformité.* Pour les blinds et le bouton dealer, le produit permet l’observabilité (latence, codes, corrélation).

### POK_RT.03 — PLAYER_ACTION
- **POK_RT.03.1** — *Objectif & périmètre.* Pour les routes /api/leaderboard, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.03.2** — *Entrées & contrats (API / UI).* Pour le state tournamentPlayers passé en navigation, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.03.3** — *État, persistance & intégrité.* Pour le side pot UI lecture état serveur, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.03.4** — *Temps réel & synchronisation.* Pour le small blind big blind labels i18n, le produit journalise les transitions sensibles pour audit.
- **POK_RT.03.5** — *Sécurité, rôles & conformité.* Pour le note player tag si prévu, le produit documente les préconditions et postconditions attendues.
- **POK_RT.03.6** — *Erreurs, limites & dégradation.* Pour le leaderboard anti cheat stats validation, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_RT.03.7** — *Exploitation & évolutivité.* Pour le bot decision log structured, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.03.8** — *Objectif & périmètre.* Pour le hidden bets result route params, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.03.9** — *Entrées & contrats (API / UI).* Pour le emit personalized snapshot per userId, le produit isole les données par utilisateur et par partie.
- **POK_RT.03.10** — *État, persistance & intégrité.* Pour le practice bot expert wallet policy, le produit documente les préconditions et postconditions attendues.
- **POK_RT.03.11** — *Temps réel & synchronisation.* Pour les catégories victoires vs jetons vs XP, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.03.12** — *Sécurité, rôles & conformité.* Pour le admin redirect if not admin jwt, le produit expose des erreurs métier stables pour i18n et support.

### POK_RT.04 — Snapshots personnalisés
- **POK_RT.04.1** — *Objectif & périmètre.* Pour le http access log middleware, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.04.2** — *Entrées & contrats (API / UI).* Pour la gamification (niveaux, badges, plafonds de mise), le produit vérifie les montants et soldes avant persistance.
- **POK_RT.04.3** — *État, persistance & intégrité.* Pour le http 500 hide stack prod, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.04.4** — *Temps réel & synchronisation.* Pour les niveaux XP seuils, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.04.5** — *Sécurité, rôles & conformité.* Pour le http 500 hide stack prod, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.04.6** — *Erreurs, limites & dégradation.* Pour le solo blackjack settlement push state, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.04.7** — *Exploitation & évolutivité.* Pour le min buy cash table, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.04.8** — *Objectif & périmètre.* Pour le avatar image/jpeg size cap, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.04.9** — *Entrées & contrats (API / UI).* Pour les streets préflop à river, le produit minimise la fuite d’information entre rôles.
- **POK_RT.04.10** — *État, persistance & intégrité.* Pour le persist chips expert bot path, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_RT.04.11** — *Temps réel & synchronisation.* Pour le transaction isolation read committed, le produit isole les données par utilisateur et par partie.
- **POK_RT.04.12** — *Sécurité, rôles & conformité.* Pour le console admin assign moderator si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.

### POK_RT.05 — Timer & anti-bot réaction
- **POK_RT.05.1** — *Objectif & périmètre.* Pour le leave table forfeit uncalled si règles, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.05.2** — *Entrées & contrats (API / UI).* Pour le runout cartes après all-in, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.05.3** — *État, persistance & intégrité.* Pour le cash sit-out / rebuy / leave, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_RT.05.4** — *Temps réel & synchronisation.* Pour le leave friend loan cancel, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.05.5** — *Sécurité, rôles & conformité.* Pour les routes /api/hidden-bets avec rate limit dédié, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.05.6** — *Erreurs, limites & dégradation.* Pour le game deal route isolation, le produit isole les données par utilisateur et par partie.
- **POK_RT.05.7** — *Exploitation & évolutivité.* Pour le practice bot non-expert jetons virtuels, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.05.8** — *Objectif & périmètre.* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit distingue erreurs réseau, auth et serveur côté client.
- **POK_RT.05.9** — *Entrées & contrats (API / UI).* Pour la page WaitingRoom dédiée, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.05.10** — *État, persistance & intégrité.* Pour le tournament trophy asset display, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_RT.05.11** — *Temps réel & synchronisation.* Pour le remboursement automatique sur gains casino, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.05.12** — *Sécurité, rôles & conformité.* Pour la configuration trust proxy, le produit s’appuie sur la validation serveur comme source de vérité.

### POK_RT.06 — Showdown & pots
- **POK_RT.06.1** — *Objectif & périmètre.* Pour le emit personalized snapshot per userId, le produit applique les règles de remboursement de prêt actif.
- **POK_RT.06.2** — *Entrées & contrats (API / UI).* Pour le join game error room full, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_RT.06.3** — *État, persistance & intégrité.* Pour les toasts tournament-countdown, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.06.4** — *Temps réel & synchronisation.* Pour le partage pot égalité, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_RT.06.5** — *Sécurité, rôles & conformité.* Pour le protected redirect login if no token, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.06.6** — *Erreurs, limites & dégradation.* Pour le connectSrc self socket url, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.06.7** — *Exploitation & évolutivité.* Pour les query params spectate=1 sur Game, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.06.8** — *Objectif & périmètre.* Pour le tournament service static io, le produit journalise les transitions sensibles pour audit.
- **POK_RT.06.9** — *Entrées & contrats (API / UI).* Pour le message friend realtime poll or socket si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.06.10** — *État, persistance & intégrité.* Pour le leaderboard SQL ORDER BY, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.06.11** — *Temps réel & synchronisation.* Pour le game example route isolation, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.06.12** — *Sécurité, rôles & conformité.* Pour le helmet frame ancestors self, le produit vérifie les montants et soldes avant persistance.

### POK_RT.07 — Cash sit/rebuy/leave
- **POK_RT.07.1** — *Objectif & périmètre.* Pour le xp anti farm cooldown server, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.07.2** — *Entrées & contrats (API / UI).* Pour l’anti-cheat middleware HTTP, le produit isole les données par utilisateur et par partie.
- **POK_RT.07.3** — *État, persistance & intégrité.* Pour les timeouts HTTP globaux, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_RT.07.4** — *Temps réel & synchronisation.* Pour les classes CSS racine accessibilité, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.07.5** — *Sécurité, rôles & conformité.* Pour le moteur de distribution et d’enchères, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_RT.07.6** — *Erreurs, limites & dégradation.* Pour le recovery question list server, le produit minimise la fuite d’information entre rôles.
- **POK_RT.07.7** — *Exploitation & évolutivité.* Pour le tournament spectate delay 5s, le produit minimise la fuite d’information entre rôles.
- **POK_RT.07.8** — *Objectif & périmètre.* Pour le tutorial lobby page dédiée, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.07.9** — *Entrées & contrats (API / UI).* Pour le fallback reason code IA, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.07.10** — *État, persistance & intégrité.* Pour le timer table poker côté serveur, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.07.11** — *Temps réel & synchronisation.* Pour le tournament rebuy addon si supporté tournoi, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.07.12** — *Sécurité, rôles & conformité.* Pour le console admin assign moderator si prévu, le produit maintient la compatibilité mobile et navigateur.

### POK_RT.08 — File spectateur rejoin
- **POK_RT.08.1** — *Objectif & périmètre.* Pour le screen reader labels cards, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.08.2** — *Entrées & contrats (API / UI).* Pour le gamification cap bet by level, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.08.3** — *État, persistance & intégrité.* Pour les invitation party blackjack, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.08.4** — *Temps réel & synchronisation.* Pour le service tournoi et broadcasts Socket.IO, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_RT.08.5** — *Sécurité, rôles & conformité.* Pour la téléportation socket vers table de tournoi, le produit distingue erreurs réseau, auth et serveur côté client.
- **POK_RT.08.6** — *Erreurs, limites & dégradation.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.08.7** — *Exploitation & évolutivité.* Pour le nettoyage planifié (cleanup jobs), le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.08.8** — *Objectif & périmètre.* Pour le straddle optional toggle room config, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.08.9** — *Entrées & contrats (API / UI).* Pour le quantum bluff branding start screen, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_RT.08.10** — *État, persistance & intégrité.* Pour le raise slider max stack bound, le produit isole les données par utilisateur et par partie.
- **POK_RT.08.11** — *Temps réel & synchronisation.* Pour le report chat message si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_RT.08.12** — *Sécurité, rôles & conformité.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit journalise les transitions sensibles pour audit.

### POK_RT.09 — Chat table
- **POK_RT.09.1** — *Objectif & périmètre.* Pour le tournament break schedule si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_RT.09.2** — *Entrées & contrats (API / UI).* Pour les blinds et le bouton dealer, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.09.3** — *État, persistance & intégrité.* Les WebSockets se reconnectent avec backoff exponentiel côté client pour ne pas saturer le serveur après une panne réseau.
- **POK_RT.09.4** — *Temps réel & synchronisation.* Pour les avis / notes post-partie, le produit expose des erreurs métier stables pour i18n et support.
- **POK_RT.09.5** — *Sécurité, rôles & conformité.* Pour le color blind mode protanopia, le produit isole les données par utilisateur et par partie.
- **POK_RT.09.6** — *Erreurs, limites & dégradation.* Pour le destroy room cascade sockets, le produit documente les préconditions et postconditions attendues.
- **POK_RT.09.7** — *Exploitation & évolutivité.* Pour le requestId propagation logs, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_RT.09.8** — *Objectif & périmètre.* Pour le rate limit metric counter si prévu, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.09.9** — *Entrées & contrats (API / UI).* Pour le feedback text max length, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_RT.09.10** — *État, persistance & intégrité.* Pour le report submitted acknowledgment, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.09.11** — *Temps réel & synchronisation.* Pour le roulette wheel animation client only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_RT.09.12** — *Sécurité, rôles & conformité.* Pour le waiting room list GET, le produit applique les règles de remboursement de prêt actif.

### POK_RT.10 — Reconnect & resync
- **POK_RT.10.1** — *Objectif & périmètre.* Pour la progression challenge stockée DB, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_RT.10.2** — *Entrées & contrats (API / UI).* Pour le state tournamentPlayers passé en navigation, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_RT.10.3** — *État, persistance & intégrité.* Pour le i18n namespace game labels, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_RT.10.4** — *Temps réel & synchronisation.* Pour le fallback heuristique Node si IA KO, le produit journalise les transitions sensibles pour audit.
- **POK_RT.10.5** — *Sécurité, rôles & conformité.* Pour le player action log structured, le produit documente les préconditions et postconditions attendues.
- **POK_RT.10.6** — *Erreurs, limites & dégradation.* Pour le friend not found search, le produit vérifie les montants et soldes avant persistance.
- **POK_RT.10.7** — *Exploitation & évolutivité.* Pour le board burn card animation serveur logique, le produit reste désactivable ou restreint en production si sensible.
- **POK_RT.10.8** — *Objectif & périmètre.* Pour le feedback text max length, le produit minimise la fuite d’information entre rôles.
- **POK_RT.10.9** — *Entrées & contrats (API / UI).* Pour le protected redirect login if no token, le produit isole les données par utilisateur et par partie.
- **POK_RT.10.10** — *État, persistance & intégrité.* Pour le waiting room ready toggle, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.10.11** — *Temps réel & synchronisation.* Pour les Webhooks ou jobs async optionnels, le produit maintient la compatibilité mobile et navigateur.
- **POK_RT.10.12** — *Sécurité, rôles & conformité.* Pour le practice difficulty query param, le produit permet l’observabilité (latence, codes, corrélation).

## Moteur de table poker
_Balise `POK_MOT` — logique fonctionnelle, sans code source._

### POK_MOT.01 — Distribution & blinds
- **POK_MOT.01.1** — *Objectif & périmètre.* Pour le client socket auth object, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.01.2** — *Entrées & contrats (API / UI).* Pour le idempotency actionId casino round, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.01.3** — *État, persistance & intégrité.* Pour la file spectateur cash pleine, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.01.4** — *Temps réel & synchronisation.* Pour les streets préflop à river, le produit reste désactivable ou restreint en production si sensible.
- **POK_MOT.01.5** — *Sécurité, rôles & conformité.* Pour la résolution paris cachés après showdown, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.01.6** — *Erreurs, limites & dégradation.* Pour le waiting room list GET, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_MOT.01.7** — *Exploitation & évolutivité.* Pour le admin tournaments UI fields, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.01.8** — *Objectif & périmètre.* Pour l’administration des tournois (page dédiée), le produit reste désactivable ou restreint en production si sensible.
- **POK_MOT.01.9** — *Entrées & contrats (API / UI).* Pour le dealer button rotation animation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.01.10** — *État, persistance & intégrité.* Pour le roulette result authoritative number, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.01.11** — *Temps réel & synchronisation.* Pour le game state sanitization avant emit, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.01.12** — *Sécurité, rôles & conformité.* Pour la pagination et filtres leaderboard, le produit applique les règles de remboursement de prêt actif.

### POK_MOT.02 — Ordre d’action
- **POK_MOT.02.1** — *Objectif & périmètre.* Pour le rematch same players flag, le produit journalise les transitions sensibles pour audit.
- **POK_MOT.02.2** — *Entrées & contrats (API / UI).* Pour les handlers socket.off au démontage, le produit reste désactivable ou restreint en production si sensible.
- **POK_MOT.02.3** — *État, persistance & intégrité.* Pour le min raise increment server, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.02.4** — *Temps réel & synchronisation.* Pour le board burn card animation serveur logique, le produit journalise les transitions sensibles pour audit.
- **POK_MOT.02.5** — *Sécurité, rôles & conformité.* Pour le partage pot égalité, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.02.6** — *Erreurs, limites & dégradation.* L’accessibilité côté client (contraste, alertes, daltonisme) s’applique via des classes ou thèmes locaux et ne change pas les règles de jeu côté serveur.
- **POK_MOT.02.7** — *Exploitation & évolutivité.* Pour le capacitor status bar style si mobile, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.02.8** — *Objectif & périmètre.* Pour les signalements joueur, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.02.9** — *Entrées & contrats (API / UI).* Pour l’endpoint /metrics protégé par bearer optionnel, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.02.10** — *État, persistance & intégrité.* Pour le roulette result authoritative number, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.02.11** — *Temps réel & synchronisation.* Pour la page Profile et EditProfile, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.02.12** — *Sécurité, rôles & conformité.* Pour le waiting room ready toggle, le produit expose des erreurs métier stables pour i18n et support.

### POK_MOT.03 — Streets & board
- **POK_MOT.03.1** — *Objectif & périmètre.* Pour la page MiniGames, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.03.2** — *Entrées & contrats (API / UI).* Pour le slot loan repayment order, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.03.3** — *État, persistance & intégrité.* Les messages système de table (joueur déconnecté) informent sans révéler la stratégie interne de reconnexion automatique.
- **POK_MOT.03.4** — *Temps réel & synchronisation.* Pour le bot decision log structured, le produit distingue erreurs réseau, auth et serveur côté client.
- **POK_MOT.03.5** — *Sécurité, rôles & conformité.* Pour le info toast player joined room, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.03.6** — *Erreurs, limites & dégradation.* Pour GameExample (démo / test intégration), le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.03.7** — *Exploitation & évolutivité.* Pour le model inference timeout, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.03.8** — *Objectif & périmètre.* Pour les badges profil liés niveaux, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.03.9** — *Entrées & contrats (API / UI).* Pour le practice bot non-expert jetons virtuels, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.03.10** — *État, persistance & intégrité.* Pour le requestId propagation logs, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.03.11** — *Temps réel & synchronisation.* Pour le emit personalized snapshot per userId, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.03.12** — *Sécurité, rôles & conformité.* Pour le player turn highlight UI, le produit respecte l’idempotence ou les clés d’unicité métier.

### POK_MOT.04 — Fenêtre paris live optionnelle
- **POK_MOT.04.1** — *Objectif & périmètre.* Pour le state tournamentPlayers passé en navigation, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.04.2** — *Entrées & contrats (API / UI).* Pour le accessibility skip link si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_MOT.04.3** — *État, persistance & intégrité.* Pour le requestId propagation logs, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.04.4** — *Temps réel & synchronisation.* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit minimise la fuite d’information entre rôles.
- **POK_MOT.04.5** — *Sécurité, rôles & conformité.* Pour le blocked user list si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.04.6** — *Erreurs, limites & dégradation.* Pour le solo blackjack deck shuffle server, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.04.7** — *Exploitation & évolutivité.* Pour la séparation practice / cash / casino / tournoi, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.04.8** — *Objectif & périmètre.* Pour le reject friend loan, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.04.9** — *Entrées & contrats (API / UI).* Pour le solo blackjack settlement push state, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.04.10** — *État, persistance & intégrité.* Pour le client RTK Query et invalidation de tags, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.04.11** — *Temps réel & synchronisation.* Pour les niveaux XP seuils, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.04.12** — *Sécurité, rôles & conformité.* Pour le persist chips expert bot path, le produit minimise la fuite d’information entre rôles.

### POK_MOT.05 — All-in runout auto
- **POK_MOT.05.1** — *Objectif & périmètre.* Pour le sound effects mute accessibility tie in si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.05.2** — *Entrées & contrats (API / UI).* Pour le game page key pathname search reset, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.05.3** — *État, persistance & intégrité.* Pour le updates check new version banner si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.05.4** — *Temps réel & synchronisation.* Pour le requestId propagation logs, le produit journalise les transitions sensibles pour audit.
- **POK_MOT.05.5** — *Sécurité, rôles & conformité.* Pour le loader show on route transition, le produit maintient la compatibilité mobile et navigateur.
- **POK_MOT.05.6** — *Erreurs, limites & dégradation.* Pour les mises à jour applicatives (route updates), le produit minimise la fuite d’information entre rôles.
- **POK_MOT.05.7** — *Exploitation & évolutivité.* Pour le protected redirect login if no token, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.05.8** — *Objectif & périmètre.* Pour le moteur de distribution et d’enchères, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **POK_MOT.05.9** — *Entrées & contrats (API / UI).* Pour le claim reward challenge, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.05.10** — *État, persistance & intégrité.* Pour le practice difficulty query param, le produit reste désactivable ou restreint en production si sensible.
- **POK_MOT.05.11** — *Temps réel & synchronisation.* Pour le side pot display order smallest first, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_MOT.05.12** — *Sécurité, rôles & conformité.* Pour le ready check database ping, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### POK_MOT.06 — Side pots
- **POK_MOT.06.1** — *Objectif & périmètre.* Pour les daily challenges reset journalier, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.06.2** — *Entrées & contrats (API / UI).* Pour le tournament ranking scroll area, le produit documente les préconditions et postconditions attendues.
- **POK_MOT.06.3** — *État, persistance & intégrité.* Pour la recherche de joueurs, le produit isole les données par utilisateur et par partie.
- **POK_MOT.06.4** — *Temps réel & synchronisation.* Pour le results alias route same page, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_MOT.06.5** — *Sécurité, rôles & conformité.* Pour le leaderboard self rank highlight, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.06.6** — *Erreurs, limites & dégradation.* Pour le stats increment async post commit, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.06.7** — *Exploitation & évolutivité.* Pour le color blind mode protanopia, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_MOT.06.8** — *Objectif & périmètre.* Pour le claim reward challenge, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.06.9** — *Entrées & contrats (API / UI).* Pour le pot odds hint display optional client only, le produit permet l’observabilité (latence, codes, corrélation).
- **POK_MOT.06.10** — *État, persistance & intégrité.* Pour le tournament ranking by chips, le produit respecte l’idempotence ou les clés d’unicité métier.
- **POK_MOT.06.11** — *Temps réel & synchronisation.* Pour le leaderboard anti cheat stats validation, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **POK_MOT.06.12** — *Sécurité, rôles & conformité.* Pour la récupération blackjack au boot serveur, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### POK_MOT.07 — Sanitisation état
- **POK_MOT.07.1** — *Objectif & périmètre.* Pour les invitation party poker, le produit applique les règles de remboursement de prêt actif.
- **POK_MOT.07.2** — *Entrées & contrats (API / UI).* Pour le dealer button rotation animation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **POK_MOT.07.3** — *État, persistance & intégrité.* Pour le cash queue promote spectator, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **POK_MOT.07.4** — *Temps réel & synchronisation.* Pour le record hand result practice API, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.07.5** — *Sécurité, rôles & conformité.* Pour les routes /api/blackjack-tables, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.07.6** — *Erreurs, limites & dégradation.* Pour le persist chips expert bot path, le produit isole les données par utilisateur et par partie.
- **POK_MOT.07.7** — *Exploitation & évolutivité.* Pour les routes /api/blackjack-tables, le produit documente les préconditions et postconditions attendues.
- **POK_MOT.07.8** — *Objectif & périmètre.* Pour le tournament final table merge, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.07.9** — *Entrées & contrats (API / UI).* Pour le message friend realtime poll or socket si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_MOT.07.10** — *État, persistance & intégrité.* Pour le side pot display order smallest first, le produit limite les abus par quotas, plafonds ou fréquence.
- **POK_MOT.07.11** — *Temps réel & synchronisation.* Pour la pagination et filtres leaderboard, le produit distingue erreurs réseau, auth et serveur côté client.
- **POK_MOT.07.12** — *Sécurité, rôles & conformité.* Pour le accept friend loan crédit, le produit respecte l’idempotence ou les clés d’unicité métier.

### POK_MOT.08 — Journal dernière action
- **POK_MOT.08.1** — *Objectif & périmètre.* Pour le updates static route behavior, le produit journalise les transitions sensibles pour audit.
- **POK_MOT.08.2** — *Entrées & contrats (API / UI).* Pour la page résultats paris cachés, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_MOT.08.3** — *État, persistance & intégrité.* Pour le model response schema validation, le produit propage l’état via Socket.IO de façon agrégée.
- **POK_MOT.08.4** — *Temps réel & synchronisation.* Pour la finale, l’élimination et le mode spectateur tournoi, le produit minimise la fuite d’information entre rôles.
- **POK_MOT.08.5** — *Sécurité, rôles & conformité.* Pour le blackjack bet limits table, le produit applique les règles de remboursement de prêt actif.
- **POK_MOT.08.6** — *Erreurs, limites & dégradation.* Pour le multi blackjack start host only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **POK_MOT.08.7** — *Exploitation & évolutivité.* Le classement (leaderboard) s’appuie sur des requêtes triées et paginées ; les ex-aequo sont départagés par un critère secondaire stable (par ex. identifiant affiché).
- **POK_MOT.08.8** — *Objectif & périmètre.* Pour le previous hand history sidebar si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.08.9** — *Entrées & contrats (API / UI).* Pour le info toast player joined room, le produit expose des erreurs métier stables pour i18n et support.
- **POK_MOT.08.10** — *État, persistance & intégrité.* Pour le tournament scheduled cron trigger, le produit s’appuie sur la validation serveur comme source de vérité.
- **POK_MOT.08.11** — *Temps réel & synchronisation.* Pour le socket error ack client toast, le produit minimise la fuite d’information entre rôles.
- **POK_MOT.08.12** — *Sécurité, rôles & conformité.* Pour le TournamentTeleporter dans App, le produit synchronise l’UI sur le snapshot officiel après mutation.

## Spectateurs
_Balise `SPEC` — logique fonctionnelle, sans code source._

### SPEC.01 — Mode spectateur poker
- **SPEC.01.1** — *Objectif & périmètre.* Pour le degraded redis fallback memory, le produit expose des erreurs métier stables pour i18n et support.
- **SPEC.01.2** — *Entrées & contrats (API / UI).* Pour le accessibility skip link si prévu, le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.01.3** — *État, persistance & intégrité.* Pour le start screen CTA login register, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SPEC.01.4** — *Temps réel & synchronisation.* Pour le register password strength, le produit permet l’observabilité (latence, codes, corrélation).
- **SPEC.01.5** — *Sécurité, rôles & conformité.* Pour le socket error ack client toast, le produit isole les données par utilisateur et par partie.
- **SPEC.01.6** — *Erreurs, limites & dégradation.* Pour le report category enum, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SPEC.01.7** — *Exploitation & évolutivité.* Pour la page BotConfiguration, le produit minimise la fuite d’information entre rôles.
- **SPEC.01.8** — *Objectif & périmètre.* Pour la gamification (niveaux, badges, plafonds de mise), le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.01.9** — *Entrées & contrats (API / UI).* Pour le ante table optional si supporté, le produit reste désactivable ou restreint en production si sensible.
- **SPEC.01.10** — *État, persistance & intégrité.* Pour le high contrast token colors, le produit expose des erreurs métier stables pour i18n et support.
- **SPEC.01.11** — *Temps réel & synchronisation.* Pour le waiting room ready toggle, le produit applique les règles de remboursement de prêt actif.
- **SPEC.01.12** — *Sécurité, rôles & conformité.* Pour le serveur HTTP + Socket.IO partagé, le produit respecte l’idempotence ou les clés d’unicité métier.

### SPEC.02 — Visibilité cartes restreinte
- **SPEC.02.1** — *Objectif & périmètre.* Pour la page Leaderboard filtrable, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SPEC.02.2** — *Entrées & contrats (API / UI).* Pour le rematch same players flag, le produit expose des erreurs métier stables pour i18n et support.
- **SPEC.02.3** — *État, persistance & intégrité.* Pour le socket global (auth token, connect_error), le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.02.4** — *Temps réel & synchronisation.* Pour le port listen env PORT, le produit maintient la compatibilité mobile et navigateur.
- **SPEC.02.5** — *Sécurité, rôles & conformité.* Pour le chat de table, le produit maintient la compatibilité mobile et navigateur.
- **SPEC.02.6** — *Erreurs, limites & dégradation.* Pour les statistiques de fin de main practice, le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.02.7** — *Exploitation & évolutivité.* Pour le admin tournament delete cascade, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SPEC.02.8** — *Objectif & périmètre.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit expose des erreurs métier stables pour i18n et support.
- **SPEC.02.9** — *Entrées & contrats (API / UI).* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit s’appuie sur la validation serveur comme source de vérité.
- **SPEC.02.10** — *État, persistance & intégrité.* Pour les streets préflop à river, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SPEC.02.11** — *Temps réel & synchronisation.* Pour les invitation party blackjack, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SPEC.02.12** — *Sécurité, rôles & conformité.* Pour le spectate card masking rules, le produit respecte l’idempotence ou les clés d’unicité métier.

### SPEC.03 — Queue rejoin cash
- **SPEC.03.1** — *Objectif & périmètre.* Pour le bot action server driven timing, le produit minimise la fuite d’information entre rôles.
- **SPEC.03.2** — *Entrées & contrats (API / UI).* Pour le tournament result delay 12s, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SPEC.03.3** — *État, persistance & intégrité.* Pour le model inference timeout, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SPEC.03.4** — *Temps réel & synchronisation.* Pour le showdown evaluation HTTP internal, le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.03.5** — *Sécurité, rôles & conformité.* Pour le tournament result delay 12s, le produit propage l’état via Socket.IO de façon agrégée.
- **SPEC.03.6** — *Erreurs, limites & dégradation.* Pour les invitations à une table blackjack, le produit journalise les transitions sensibles pour audit.
- **SPEC.03.7** — *Exploitation & évolutivité.* Pour la waiting room poker (création / rejoindre), le produit isole les données par utilisateur et par partie.
- **SPEC.03.8** — *Objectif & périmètre.* Pour le hidden bet live window timing, le produit limite les abus par quotas, plafonds ou fréquence.
- **SPEC.03.9** — *Entrées & contrats (API / UI).* Pour le loan exceeds allowed rate error, le produit maintient la compatibilité mobile et navigateur.
- **SPEC.03.10** — *État, persistance & intégrité.* Pour les invitation party poker, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SPEC.03.11** — *Temps réel & synchronisation.* Pour les timeouts HTTP globaux, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SPEC.03.12** — *Sécurité, rôles & conformité.* Pour le latency metric histogram si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.

### SPEC.04 — Contrôles d’identité socket
- **SPEC.04.1** — *Objectif & périmètre.* Pour le color blind mode protanopia, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SPEC.04.2** — *Entrées & contrats (API / UI).* Pour le pot odds hint display optional client only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SPEC.04.3** — *État, persistance & intégrité.* Pour le thème de table (felt / couleurs), le produit expose des erreurs métier stables pour i18n et support.
- **SPEC.04.4** — *Temps réel & synchronisation.* Pour le loan banner active on casino pages, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SPEC.04.5** — *Sécurité, rôles & conformité.* Pour la table poker temps réel (Game), le produit s’appuie sur la validation serveur comme source de vérité.
- **SPEC.04.6** — *Erreurs, limites & dégradation.* Pour le self friend request block, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SPEC.04.7** — *Exploitation & évolutivité.* Pour le leave table forfeit uncalled si règles, le produit applique les règles de remboursement de prêt actif.
- **SPEC.04.8** — *Objectif & périmètre.* Pour le live check always true, le produit isole les données par utilisateur et par partie.
- **SPEC.04.9** — *Entrées & contrats (API / UI).* Pour le feedback route séparée reports, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SPEC.04.10** — *État, persistance & intégrité.* Pour le report chat message si prévu, le produit maintient la compatibilité mobile et navigateur.
- **SPEC.04.11** — *Temps réel & synchronisation.* Pour le timeout per route override, le produit maintient la compatibilité mobile et navigateur.
- **SPEC.04.12** — *Sécurité, rôles & conformité.* Pour le level up notification, le produit permet l’observabilité (latence, codes, corrélation).

## Paris cachés
_Balise `HB` — logique fonctionnelle, sans code source._

### HB.01 — Contexte table cash mémoire
- **HB.01.1** — *Objectif & périmètre.* Pour la file spectateur cash pleine, le produit documente les préconditions et postconditions attendues.
- **HB.01.2** — *Entrées & contrats (API / UI).* Pour le provider AccessibilityProvider, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.01.3** — *État, persistance & intégrité.* Pour le leaderboard OFFSET pagination, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **HB.01.4** — *Temps réel & synchronisation.* Pour le cors preflight OPTIONS 200, le produit expose des erreurs métier stables pour i18n et support.
- **HB.01.5** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.01.6** — *Erreurs, limites & dégradation.* Pour le spectate card masking rules, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.01.7** — *Exploitation & évolutivité.* Pour le disconnect grace period joueur, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.01.8** — *Objectif & périmètre.* Pour le min buy cash table, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.01.9** — *Entrées & contrats (API / UI).* Pour le straddle optional toggle room config, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **HB.01.10** — *État, persistance & intégrité.* Pour le leave friend loan cancel, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.01.11** — *Temps réel & synchronisation.* Pour le ante table optional si supporté, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.01.12** — *Sécurité, rôles & conformité.* Pour le small blind big blind labels i18n, le produit limite les abus par quotas, plafonds ou fréquence.

### HB.02 — Phases marché PRE_HAND / LIVE_*
- **HB.02.1** — *Objectif & périmètre.* Pour le nettoyage planifié (cleanup jobs), le produit expose des erreurs métier stables pour i18n et support.
- **HB.02.2** — *Entrées & contrats (API / UI).* Pour le démarrage de partie vers un gameId, le produit maintient la compatibilité mobile et navigateur.
- **HB.02.3** — *État, persistance & intégrité.* Pour le flux register → lobby, le produit maintient la compatibilité mobile et navigateur.
- **HB.02.4** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit propage l’état via Socket.IO de façon agrégée.
- **HB.02.5** — *Sécurité, rôles & conformité.* Pour le admin runtime blackjack dev-only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.02.6** — *Erreurs, limites & dégradation.* Pour les routes /api/bot avec rate limit dédié, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.02.7** — *Exploitation & évolutivité.* Le shuffle est effectué côté serveur avant distribution ; le client reçoit uniquement les cartes de son siège.
- **HB.02.8** — *Objectif & périmètre.* Pour le xp grant failure tolerance, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.02.9** — *Entrées & contrats (API / UI).* Pour le TournamentTeleporter dans App, le produit journalise les transitions sensibles pour audit.
- **HB.02.10** — *État, persistance & intégrité.* Pour le timeout per route override, le produit expose des erreurs métier stables pour i18n et support.
- **HB.02.11** — *Temps réel & synchronisation.* Pour les invitations socket room blackjack, le produit vérifie les montants et soldes avant persistance.
- **HB.02.12** — *Sécurité, rôles & conformité.* Pour le tournament satellite ticket si supporté, le produit permet l’observabilité (latence, codes, corrélation).

### HB.03 — Cotation serveur
- **HB.03.1** — *Objectif & périmètre.* Pour le waiting room join POST, le produit distingue erreurs réseau, auth et serveur côté client.
- **HB.03.2** — *Entrées & contrats (API / UI).* Pour le taux prêt borne min max, le produit maintient la compatibilité mobile et navigateur.
- **HB.03.3** — *État, persistance & intégrité.* Pour le leaderboard self rank highlight, le produit documente les préconditions et postconditions attendues.
- **HB.03.4** — *Temps réel & synchronisation.* Pour le anti-cheat body inspection light, le produit maintient la compatibilité mobile et navigateur.
- **HB.03.5** — *Sécurité, rôles & conformité.* Pour le slot max bet config, le produit propage l’état via Socket.IO de façon agrégée.
- **HB.03.6** — *Erreurs, limites & dégradation.* Pour le record hand result practice API, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.03.7** — *Exploitation & évolutivité.* Pour le showdown evaluation HTTP internal, le produit maintient la compatibilité mobile et navigateur.
- **HB.03.8** — *Objectif & périmètre.* Pour le helmet frame ancestors self, le produit expose des erreurs métier stables pour i18n et support.
- **HB.03.9** — *Entrées & contrats (API / UI).* Pour le provider AccessibilityProvider, le produit maintient la compatibilité mobile et navigateur.
- **HB.03.10** — *État, persistance & intégrité.* Pour la pagination et filtres leaderboard, le produit propage l’état via Socket.IO de façon agrégée.
- **HB.03.11** — *Temps réel & synchronisation.* Pour le model inference timeout, le produit expose des erreurs métier stables pour i18n et support.
- **HB.03.12** — *Sécurité, rôles & conformité.* Pour le message friend realtime poll or socket si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.

### HB.04 — Quote hash & versioning
- **HB.04.1** — *Objectif & périmètre.* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.04.2** — *Entrées & contrats (API / UI).* Pour le game state sanitization avant emit, le produit isole les données par utilisateur et par partie.
- **HB.04.3** — *État, persistance & intégrité.* Pour le thème de table (felt / couleurs), le produit s’appuie sur la validation serveur comme source de vérité.
- **HB.04.4** — *Temps réel & synchronisation.* Pour le tournament rebuy addon si supporté tournoi, le produit isole les données par utilisateur et par partie.
- **HB.04.5** — *Sécurité, rôles & conformité.* Pour le roulette max bet config, le produit maintient la compatibilité mobile et navigateur.
- **HB.04.6** — *Erreurs, limites & dégradation.* Pour le game state sanitization avant emit, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.04.7** — *Exploitation & évolutivité.* Pour les friend messages pagination, le produit s’appuie sur la validation serveur comme source de vérité.
- **HB.04.8** — *Objectif & périmètre.* Pour les messages privés entre amis, le produit maintient la compatibilité mobile et navigateur.
- **HB.04.9** — *Entrées & contrats (API / UI).* Pour les routes /api/bot avec rate limit dédié, le produit expose des erreurs métier stables pour i18n et support.
- **HB.04.10** — *État, persistance & intégrité.* Pour le quantum bluff branding start screen, le produit isole les données par utilisateur et par partie.
- **HB.04.11** — *Temps réel & synchronisation.* Pour le model response schema validation, le produit documente les préconditions et postconditions attendues.
- **HB.04.12** — *Sécurité, rôles & conformité.* Pour le tournament prize formatting locale, le produit limite les abus par quotas, plafonds ou fréquence.

### HB.05 — Placement ticket
- **HB.05.1** — *Objectif & périmètre.* Pour les streets préflop à river, le produit minimise la fuite d’information entre rôles.
- **HB.05.2** — *Entrées & contrats (API / UI).* Pour le game page key pathname search reset, le produit minimise la fuite d’information entre rôles.
- **HB.05.3** — *État, persistance & intégrité.* Pour le remboursement automatique sur gains casino, le produit expose des erreurs métier stables pour i18n et support.
- **HB.05.4** — *Temps réel & synchronisation.* Pour le moteur de distribution et d’enchères, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.05.5** — *Sécurité, rôles & conformité.* Pour les handlers socket.off au démontage, le produit expose des erreurs métier stables pour i18n et support.
- **HB.05.6** — *Erreurs, limites & dégradation.* Pour le cors credentials true socket, le produit journalise les transitions sensibles pour audit.
- **HB.05.7** — *Exploitation & évolutivité.* Pour le practice bot non-expert jetons virtuels, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.05.8** — *Objectif & périmètre.* Pour le sound effects mute accessibility tie in si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.05.9** — *Entrées & contrats (API / UI).* Pour le destroy room cascade sockets, le produit reste désactivable ou restreint en production si sensible.
- **HB.05.10** — *État, persistance & intégrité.* Pour le runout cartes après all-in, le produit journalise les transitions sensibles pour audit.
- **HB.05.11** — *Temps réel & synchronisation.* Pour le console admin filter by status, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.05.12** — *Sécurité, rôles & conformité.* Pour le solo blackjack deck shuffle server, le produit isole les données par utilisateur et par partie.

### HB.06 — Résolution en fin de main
- **HB.06.1** — *Objectif & périmètre.* Pour le blackjack bet limits table, le produit reste désactivable ou restreint en production si sensible.
- **HB.06.2** — *Entrées & contrats (API / UI).* Pour le waiting room ready toggle, le produit expose des erreurs métier stables pour i18n et support.
- **HB.06.3** — *État, persistance & intégrité.* Pour le provider AccessibilityProvider, le produit journalise les transitions sensibles pour audit.
- **HB.06.4** — *Temps réel & synchronisation.* Pour le recovery service blackjack tables, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **HB.06.5** — *Sécurité, rôles & conformité.* Pour le join game error wrong password private, le produit documente les préconditions et postconditions attendues.
- **HB.06.6** — *Erreurs, limites & dégradation.* Pour la page résultats paris cachés, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.06.7** — *Exploitation & évolutivité.* Pour le tournament blind level schedule, le produit permet l’observabilité (latence, codes, corrélation).
- **HB.06.8** — *Objectif & périmètre.* Pour la cotation et le placement de tickets, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.06.9** — *Entrées & contrats (API / UI).* Pour les salles privées et demandes d’adhésion, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.06.10** — *État, persistance & intégrité.* Pour l’écran d’accueil (StartScreen), le produit propage l’état via Socket.IO de façon agrégée.
- **HB.06.11** — *Temps réel & synchronisation.* Pour le tournament prize formatting locale, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **HB.06.12** — *Sécurité, rôles & conformité.* Pour l’endpoint /api/health/live, le produit propage l’état via Socket.IO de façon agrégée.

### HB.07 — Historique par partie
- **HB.07.1** — *Objectif & périmètre.* Pour la page HiddenBetsResult, le produit documente les préconditions et postconditions attendues.
- **HB.07.2** — *Entrées & contrats (API / UI).* Pour la recherche searchUsers avec terme, le produit s’appuie sur la validation serveur comme source de vérité.
- **HB.07.3** — *État, persistance & intégrité.* Pour le username profanity filter si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.07.4** — *Temps réel & synchronisation.* Pour le call amount computed server, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.07.5** — *Sécurité, rôles & conformité.* Pour le number formatting chips locale, le produit limite les abus par quotas, plafonds ou fréquence.
- **HB.07.6** — *Erreurs, limites & dégradation.* Pour le basename Capacitor vs web, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.07.7** — *Exploitation & évolutivité.* Pour le leaderboard self rank highlight, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **HB.07.8** — *Objectif & périmètre.* Pour le tournament service static io, le produit journalise les transitions sensibles pour audit.
- **HB.07.9** — *Entrées & contrats (API / UI).* Pour le leave friend loan cancel, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **HB.07.10** — *État, persistance & intégrité.* Pour le host kick si implémenté, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.07.11** — *Temps réel & synchronisation.* Pour les player reports motifs, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.07.12** — *Sécurité, rôles & conformité.* Pour le tournament satellite ticket si supporté, le produit maintient la compatibilité mobile et navigateur.

### HB.08 — Historique par joueur
- **HB.08.1** — *Objectif & périmètre.* Pour le provider AccessibilityProvider, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.08.2** — *Entrées & contrats (API / UI).* Pour le leaderboard (XP, jetons, victoires), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **HB.08.3** — *État, persistance & intégrité.* Pour les loans actifs vs historiques, le produit minimise la fuite d’information entre rôles.
- **HB.08.4** — *Temps réel & synchronisation.* Pour l’historique des mains practice, le produit vérifie les montants et soldes avant persistance.
- **HB.08.5** — *Sécurité, rôles & conformité.* Pour le flux login → invalidation User, le produit respecte l’idempotence ou les clés d’unicité métier.
- **HB.08.6** — *Erreurs, limites & dégradation.* Pour le player action validation amounts, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HB.08.7** — *Exploitation & évolutivité.* Pour le i18n namespace game labels, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.08.8** — *Objectif & périmètre.* Pour le cash sit-out / rebuy / leave, le produit journalise les transitions sensibles pour audit.
- **HB.08.9** — *Entrées & contrats (API / UI).* Pour le socket global (auth token, connect_error), le produit permet l’observabilité (latence, codes, corrélation).
- **HB.08.10** — *État, persistance & intégrité.* Pour le cron tournament progression, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HB.08.11** — *Temps réel & synchronisation.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit propage l’état via Socket.IO de façon agrégée.
- **HB.08.12** — *Sécurité, rôles & conformité.* Pour le error toast network french copy, le produit synchronise l’UI sur le snapshot officiel après mutation.

## Practice bots — socle
_Balise `BOT` — logique fonctionnelle, sans code source._

### BOT.01 — Création partie practice-bot
- **BOT.01.1** — *Objectif & périmètre.* Pour le socket global (auth token, connect_error), le produit expose des erreurs métier stables pour i18n et support.
- **BOT.01.2** — *Entrées & contrats (API / UI).* Pour la 2FA TOTP et les endpoints dédiés, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.01.3** — *État, persistance & intégrité.* Pour le cors preflight OPTIONS 200, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.01.4** — *Temps réel & synchronisation.* Pour le provider TableThemeProvider, le produit documente les préconditions et postconditions attendues.
- **BOT.01.5** — *Sécurité, rôles & conformité.* Pour le http 500 show stack dev, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT.01.6** — *Erreurs, limites & dégradation.* Pour les invitations socket room blackjack, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.01.7** — *Exploitation & évolutivité.* Pour le last action log poker UI, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT.01.8** — *Objectif & périmètre.* Pour le live check always true, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.01.9** — *Entrées & contrats (API / UI).* Pour le min raise increment server, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT.01.10** — *État, persistance & intégrité.* Pour le practice bot expert wallet policy, le produit minimise la fuite d’information entre rôles.
- **BOT.01.11** — *Temps réel & synchronisation.* Pour le tournament cancelled refund policy, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT.01.12** — *Sécurité, rôles & conformité.* Pour le note player tag si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### BOT.02 — Enregistrement difficulté
- **BOT.02.1** — *Objectif & périmètre.* Pour la navigation /tournaments et /tournament-waiting, le produit minimise la fuite d’information entre rôles.
- **BOT.02.2** — *Entrées & contrats (API / UI).* Pour le accessibility skip link si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT.02.3** — *État, persistance & intégrité.* Pour le sit out flag siège poker, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.02.4** — *Temps réel & synchronisation.* Pour le calcul meilleure main showdown, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.02.5** — *Sécurité, rôles & conformité.* Pour le dealer button rotation animation, le produit journalise les transitions sensibles pour audit.
- **BOT.02.6** — *Erreurs, limites & dégradation.* Pour l’administration des tournois (page dédiée), le produit expose des erreurs métier stables pour i18n et support.
- **BOT.02.7** — *Exploitation & évolutivité.* Pour les streets préflop à river, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT.02.8** — *Objectif & périmètre.* Pour le protected redirect login if no token, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT.02.9** — *Entrées & contrats (API / UI).* Pour le feedback thank you acknowledgment, le produit journalise les transitions sensibles pour audit.
- **BOT.02.10** — *État, persistance & intégrité.* Pour la finale, l’élimination et le mode spectateur tournoi, le produit journalise les transitions sensibles pour audit.
- **BOT.02.11** — *Temps réel & synchronisation.* Pour le daily challenge rollover timezone UTC, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT.02.12** — *Sécurité, rôles & conformité.* Pour le live check always true, le produit limite les abus par quotas, plafonds ou fréquence.

### BOT.03 — Chaîne async anti-race
- **BOT.03.1** — *Objectif & périmètre.* Pour le roulette loan repayment order, le produit maintient la compatibilité mobile et navigateur.
- **BOT.03.2** — *Entrées & contrats (API / UI).* Pour la room blackjack multi et les sièges, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT.03.3** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.03.4** — *Temps réel & synchronisation.* Pour le leaderboard OFFSET pagination, le produit reste désactivable ou restreint en production si sensible.
- **BOT.03.5** — *Sécurité, rôles & conformité.* Pour l’administration des tournois (page dédiée), le produit isole les données par utilisateur et par partie.
- **BOT.03.6** — *Erreurs, limites & dégradation.* Pour le tournament prize formatting locale, le produit journalise les transitions sensibles pour audit.
- **BOT.03.7** — *Exploitation & évolutivité.* Pour le blackjack table gameId param, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.03.8** — *Objectif & périmètre.* Pour les routes /api/leaderboard, le produit applique les règles de remboursement de prêt actif.
- **BOT.03.9** — *Entrées & contrats (API / UI).* Pour le friends online presence indicator, le produit expose des erreurs métier stables pour i18n et support.
- **BOT.03.10** — *État, persistance & intégrité.* Pour la page BotConfiguration, le produit journalise les transitions sensibles pour audit.
- **BOT.03.11** — *Temps réel & synchronisation.* Pour la table poker temps réel (Game), le produit documente les préconditions et postconditions attendues.
- **BOT.03.12** — *Sécurité, rôles & conformité.* Pour le broadcast io vers room tournoi, le produit respecte l’idempotence ou les clés d’unicité métier.

### BOT.04 — Délai réflexion bot
- **BOT.04.1** — *Objectif & périmètre.* Pour le degraded redis fallback memory, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT.04.2** — *Entrées & contrats (API / UI).* Pour les loans actifs vs historiques, le produit minimise la fuite d’information entre rôles.
- **BOT.04.3** — *État, persistance & intégrité.* Pour le transaction isolation read committed, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT.04.4** — *Temps réel & synchronisation.* Pour le persist chips expert bot path, le produit minimise la fuite d’information entre rôles.
- **BOT.04.5** — *Sécurité, rôles & conformité.* Pour le hidden bet history query by game, le produit minimise la fuite d’information entre rôles.
- **BOT.04.6** — *Erreurs, limites & dégradation.* Pour la page MiniGames, le produit journalise les transitions sensibles pour audit.
- **BOT.04.7** — *Exploitation & évolutivité.* Pour le tournament rebuy addon si supporté tournoi, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.04.8** — *Objectif & périmètre.* Pour le locale date formatting leaderboard, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT.04.9** — *Entrées & contrats (API / UI).* Pour le emit personalized snapshot per userId, le produit journalise les transitions sensibles pour audit.
- **BOT.04.10** — *État, persistance & intégrité.* Pour le service tournoi et broadcasts Socket.IO, le produit minimise la fuite d’information entre rôles.
- **BOT.04.11** — *Temps réel & synchronisation.* Pour le broadcast io vers room tournoi, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT.04.12** — *Sécurité, rôles & conformité.* Pour le bot action server driven timing, le produit s’appuie sur la validation serveur comme source de vérité.

### BOT.05 — Émission états type multi
- **BOT.05.1** — *Objectif & périmètre.* Pour le mode spectateur et la file de reprise siège, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT.05.2** — *Entrées & contrats (API / UI).* Pour le last action log poker UI, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT.05.3** — *État, persistance & intégrité.* Pour la page BotConfiguration, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT.05.4** — *Temps réel & synchronisation.* Pour le destroy room cascade sockets, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT.05.5** — *Sécurité, rôles & conformité.* Pour le admin runtime blackjack dev-only, le produit maintient la compatibilité mobile et navigateur.
- **BOT.05.6** — *Erreurs, limites & dégradation.* Les erreurs métier sont renvoyées avec un message stable côté API pour permettre une traduction et un diagnostic sans exposer d’implémentation interne.
- **BOT.05.7** — *Exploitation & évolutivité.* Pour les routes /api/waiting-room, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT.05.8** — *Objectif & périmètre.* Pour le waiting room join POST, le produit expose des erreurs métier stables pour i18n et support.
- **BOT.05.9** — *Entrées & contrats (API / UI).* Pour le idempotency actionId casino round, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.05.10** — *État, persistance & intégrité.* Pour le waiting room ready toggle, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT.05.11** — *Temps réel & synchronisation.* Pour le dealer button rotation animation, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.05.12** — *Sécurité, rôles & conformité.* Pour l’endpoint /metrics protégé par bearer optionnel, le produit journalise les transitions sensibles pour audit.

### BOT.06 — Évaluation showdown HTTP
- **BOT.06.1** — *Objectif & périmètre.* Pour le hidden bet live window timing, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.06.2** — *Entrées & contrats (API / UI).* Pour le blackjack bet limits table, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.06.3** — *État, persistance & intégrité.* Pour le small blind big blind labels i18n, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.06.4** — *Temps réel & synchronisation.* Pour le language switcher component, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.06.5** — *Sécurité, rôles & conformité.* Pour la déconnexion socket si token invalide, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT.06.6** — *Erreurs, limites & dégradation.* Pour les blinds et le bouton dealer, le produit minimise la fuite d’information entre rôles.
- **BOT.06.7** — *Exploitation & évolutivité.* Pour le state tournamentPlayers passé en navigation, le produit minimise la fuite d’information entre rôles.
- **BOT.06.8** — *Objectif & périmètre.* Pour le tournament prize pool calculation, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.06.9** — *Entrées & contrats (API / UI).* Pour la résolution paris cachés après showdown, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT.06.10** — *État, persistance & intégrité.* Pour le flux Auth / Register / Login, le produit maintient la compatibilité mobile et navigateur.
- **BOT.06.11** — *Temps réel & synchronisation.* Pour le leave friend loan cancel, le produit expose des erreurs métier stables pour i18n et support.
- **BOT.06.12** — *Sécurité, rôles & conformité.* Pour GameExample (démo / test intégration), le produit expose des erreurs métier stables pour i18n et support.

### BOT.07 — Persistance stats fin de main
- **BOT.07.1** — *Objectif & périmètre.* Pour la configuration des bots avant practice, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT.07.2** — *Entrées & contrats (API / UI).* Pour le process exit boot failure, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT.07.3** — *État, persistance & intégrité.* Pour les statistiques de fin de main practice, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.07.4** — *Temps réel & synchronisation.* Pour le claim reward challenge, le produit journalise les transitions sensibles pour audit.
- **BOT.07.5** — *Sécurité, rôles & conformité.* Pour la gamification (niveaux, badges, plafonds de mise), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT.07.6** — *Erreurs, limites & dégradation.* Pour le pot odds hint display optional client only, le produit vérifie les montants et soldes avant persistance.
- **BOT.07.7** — *Exploitation & évolutivité.* Pour le slot reels animation client only, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT.07.8** — *Objectif & périmètre.* Pour le transaction isolation read committed, le produit maintient la compatibilité mobile et navigateur.
- **BOT.07.9** — *Entrées & contrats (API / UI).* Pour le tournament bounty si supporté, le produit isole les données par utilisateur et par partie.
- **BOT.07.10** — *État, persistance & intégrité.* Pour le host kick si implémenté, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT.07.11** — *Temps réel & synchronisation.* Pour le expert bot python grpc or http si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT.07.12** — *Sécurité, rôles & conformité.* Pour les logs structurés et requestId, le produit propage l’état via Socket.IO de façon agrégée.

### BOT.08 — Politique wallet expert vs autres
- **BOT.08.1** — *Objectif & périmètre.* Pour les routes /api/blackjack-tables, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT.08.2** — *Entrées & contrats (API / UI).* Pour le message friend realtime poll or socket si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT.08.3** — *État, persistance & intégrité.* Pour la page HiddenBetsResult, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.08.4** — *Temps réel & synchronisation.* Pour le waiting room ready toggle, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT.08.5** — *Sécurité, rôles & conformité.* Pour GameDeal et flux de distribution démo, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT.08.6** — *Erreurs, limites & dégradation.* Pour le room subscription socket join, le produit applique les règles de remboursement de prêt actif.
- **BOT.08.7** — *Exploitation & évolutivité.* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit minimise la fuite d’information entre rôles.
- **BOT.08.8** — *Objectif & périmètre.* Pour le friend not found search, le produit minimise la fuite d’information entre rôles.
- **BOT.08.9** — *Entrées & contrats (API / UI).* Pour le accessibility skip link si prévu, le produit isole les données par utilisateur et par partie.
- **BOT.08.10** — *État, persistance & intégrité.* Pour le mute player chat si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT.08.11** — *Temps réel & synchronisation.* Pour les invitation party poker, le produit journalise les transitions sensibles pour audit.
- **BOT.08.12** — *Sécurité, rôles & conformité.* Pour la recherche searchUsers avec terme, le produit journalise les transitions sensibles pour audit.

## Bot EASY
_Balise `BOT_E` — logique fonctionnelle, sans code source._

### BOT_E.01 — Comportement loose
- **BOT_E.01.1** — *Objectif & périmètre.* Pour le login rate limit auth routes, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_E.01.2** — *Entrées & contrats (API / UI).* Pour le pot display multi-devises jetons, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_E.01.3** — *État, persistance & intégrité.* Pour le tournament satellite ticket si supporté, le produit maintient la compatibilité mobile et navigateur.
- **BOT_E.01.4** — *Temps réel & synchronisation.* Pour le mapping playerToGameId au start, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_E.01.5** — *Sécurité, rôles & conformité.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_E.01.6** — *Erreurs, limites & dégradation.* Pour le game gateway constructor side effects, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_E.01.7** — *Exploitation & évolutivité.* Pour le report category enum, le produit maintient la compatibilité mobile et navigateur.
- **BOT_E.01.8** — *Objectif & périmètre.* Pour les paris cachés et leurs phases de marché, le produit isole les données par utilisateur et par partie.
- **BOT_E.01.9** — *Entrées & contrats (API / UI).* Pour le nettoyage planifié (cleanup jobs), le produit documente les préconditions et postconditions attendues.
- **BOT_E.01.10** — *État, persistance & intégrité.* Pour les invitation party poker, le produit maintient la compatibilité mobile et navigateur.
- **BOT_E.01.11** — *Temps réel & synchronisation.* Pour le protected redirect login if no token, le produit maintient la compatibilité mobile et navigateur.
- **BOT_E.01.12** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.

### BOT_E.02 — Randomisation
- **BOT_E.02.1** — *Objectif & périmètre.* Pour le mute player chat si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_E.02.2** — *Entrées & contrats (API / UI).* Pour le serveur HTTP + Socket.IO partagé, le produit maintient la compatibilité mobile et navigateur.
- **BOT_E.02.3** — *État, persistance & intégrité.* Pour le color blind mode protanopia, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_E.02.4** — *Temps réel & synchronisation.* Pour GameExample (démo / test intégration), le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_E.02.5** — *Sécurité, rôles & conformité.* Pour le taux prêt borne min max, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_E.02.6** — *Erreurs, limites & dégradation.* Pour le leave_game cleanup seat, le produit documente les préconditions et postconditions attendues.
- **BOT_E.02.7** — *Exploitation & évolutivité.* Pour le solo blackjack deck shuffle server, le produit vérifie les montants et soldes avant persistance.
- **BOT_E.02.8** — *Objectif & périmètre.* Pour le thème de table (felt / couleurs), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_E.02.9** — *Entrées & contrats (API / UI).* Pour le socket global (auth token, connect_error), le produit journalise les transitions sensibles pour audit.
- **BOT_E.02.10** — *État, persistance & intégrité.* Pour le mini games hub cards layout, le produit documente les préconditions et postconditions attendues.
- **BOT_E.02.11** — *Temps réel & synchronisation.* Pour le server socketAuth middleware order, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_E.02.12** — *Sécurité, rôles & conformité.* Pour le pot odds hint display optional client only, le produit permet l’observabilité (latence, codes, corrélation).

### BOT_E.03 — Sizing relances
- **BOT_E.03.1** — *Objectif & périmètre.* Pour le fallback heuristique Node si IA KO, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_E.03.2** — *Entrées & contrats (API / UI).* Pour le practice difficulty query param, le produit reste désactivable ou restreint en production si sensible.
- **BOT_E.03.3** — *État, persistance & intégrité.* Pour la banque blackjack multi tour par tour, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_E.03.4** — *Temps réel & synchronisation.* Pour le provider TableThemeProvider, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_E.03.5** — *Sécurité, rôles & conformité.* Pour le leaderboard SQL ORDER BY, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_E.03.6** — *Erreurs, limites & dégradation.* Pour le tournament break schedule si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_E.03.7** — *Exploitation & évolutivité.* Pour le nettoyage planifié (cleanup jobs), le produit documente les préconditions et postconditions attendues.
- **BOT_E.03.8** — *Objectif & périmètre.* Pour le process exit boot failure, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_E.03.9** — *Entrées & contrats (API / UI).* Pour le state tournamentPlayers passé en navigation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_E.03.10** — *État, persistance & intégrité.* Pour le démarrage de partie vers un gameId, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_E.03.11** — *Temps réel & synchronisation.* Pour le tournament trophy asset display, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_E.03.12** — *Sécurité, rôles & conformité.* Pour les query params spectate=1 sur Game, le produit assure la cohérence wallet ↔ table ↔ tournoi.

## Bot MEDIUM
_Balise `BOT_M` — logique fonctionnelle, sans code source._

### BOT_M.01 — Équilibre risque/récompense
- **BOT_M.01.1** — *Objectif & périmètre.* Pour le tournament trophy asset display, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_M.01.2** — *Entrées & contrats (API / UI).* Pour la persistance difficulté bot en session, le produit journalise les transitions sensibles pour audit.
- **BOT_M.01.3** — *État, persistance & intégrité.* Pour le port listen env PORT, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_M.01.4** — *Temps réel & synchronisation.* Pour la console admin web (JWT rôle admin), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_M.01.5** — *Sécurité, rôles & conformité.* Pour le spectate card masking rules, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_M.01.6** — *Erreurs, limites & dégradation.* Pour le loan exceeds allowed rate error, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_M.01.7** — *Exploitation & évolutivité.* Pour le web share api invite link si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_M.01.8** — *Objectif & périmètre.* Pour le socket rejoin après refresh page, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_M.01.9** — *Entrées & contrats (API / UI).* Pour le max players waiting room, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_M.01.10** — *État, persistance & intégrité.* Pour le friend request duplicate prevention, le produit minimise la fuite d’information entre rôles.
- **BOT_M.01.11** — *Temps réel & synchronisation.* Pour le number formatting chips locale, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_M.01.12** — *Sécurité, rôles & conformité.* Pour le tournament prize formatting locale, le produit documente les préconditions et postconditions attendues.

### BOT_M.02 — Bluffs modérés
- **BOT_M.02.1** — *Objectif & périmètre.* Pour le screen reader labels cards, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_M.02.2** — *Entrées & contrats (API / UI).* Pour le practice difficulty query param, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_M.02.3** — *État, persistance & intégrité.* Pour le error toast network french copy, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_M.02.4** — *Temps réel & synchronisation.* Pour le chat rate limit soft, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_M.02.5** — *Sécurité, rôles & conformité.* Pour le socket global (auth token, connect_error), le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_M.02.6** — *Erreurs, limites & dégradation.* Pour le warning toast tournament soon, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_M.02.7** — *Exploitation & évolutivité.* Pour le hidden bet history query by game, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_M.02.8** — *Objectif & périmètre.* Pour les salles privées et demandes d’adhésion, le produit maintient la compatibilité mobile et navigateur.
- **BOT_M.02.9** — *Entrées & contrats (API / UI).* Pour les toasts tournament-countdown, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_M.02.10** — *État, persistance & intégrité.* Pour le game state sanitization avant emit, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_M.02.11** — *Temps réel & synchronisation.* Pour le tournament cancelled refund policy, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_M.02.12** — *Sécurité, rôles & conformité.* Pour le emoji reaction chat si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.

### BOT_M.03 — Sizing plus structuré
- **BOT_M.03.1** — *Objectif & périmètre.* Pour les questions secrètes de récupération de compte, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_M.03.2** — *Entrées & contrats (API / UI).* Pour le destroy room cascade sockets, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_M.03.3** — *État, persistance & intégrité.* Pour le tournament bounty si supporté, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_M.03.4** — *Temps réel & synchronisation.* Pour les timeouts HTTP globaux, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_M.03.5** — *Sécurité, rôles & conformité.* Pour le accept friend loan crédit, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_M.03.6** — *Erreurs, limites & dégradation.* Pour le language switcher component, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_M.03.7** — *Exploitation & évolutivité.* Pour le flux register → lobby, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_M.03.8** — *Objectif & périmètre.* Pour les streets préflop à river, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_M.03.9** — *Entrées & contrats (API / UI).* Pour le tournament bounty si supporté, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_M.03.10** — *État, persistance & intégrité.* Pour le fold forcé ou check auto si timer, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_M.03.11** — *Temps réel & synchronisation.* Pour le process exit boot failure, le produit minimise la fuite d’information entre rôles.
- **BOT_M.03.12** — *Sécurité, rôles & conformité.* Pour le socket error ack client toast, le produit isole les données par utilisateur et par partie.

## Bot HARD
_Balise `BOT_H` — logique fonctionnelle, sans code source._

### BOT_H.01 — Pot odds
- **BOT_H.01.1** — *Objectif & périmètre.* Pour le model inference timeout, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_H.01.2** — *Entrées & contrats (API / UI).* Pour le practice bot expert wallet policy, le produit isole les données par utilisateur et par partie.
- **BOT_H.01.3** — *État, persistance & intégrité.* Pour le level up notification, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_H.01.4** — *Temps réel & synchronisation.* Pour le connectSrc self socket url, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_H.01.5** — *Sécurité, rôles & conformité.* Pour les friend messages pagination, le produit isole les données par utilisateur et par partie.
- **BOT_H.01.6** — *Erreurs, limites & dégradation.* Pour le note player tag si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_H.01.7** — *Exploitation & évolutivité.* Pour GameExample (démo / test intégration), le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_H.01.8** — *Objectif & périmètre.* Pour le TournamentTeleporter dans App, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_H.01.9** — *Entrées & contrats (API / UI).* Pour le waiting room start POST gameId response, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_H.01.10** — *État, persistance & intégrité.* Pour le client socket auth object, le produit documente les préconditions et postconditions attendues.
- **BOT_H.01.11** — *Temps réel & synchronisation.* Pour le dev socket.onAny pour debug, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_H.01.12** — *Sécurité, rôles & conformité.* Pour les routes /api/daily-challenges, le produit synchronise l’UI sur le snapshot officiel après mutation.

### BOT_H.02 — Bluffs structurés
- **BOT_H.02.1** — *Objectif & périmètre.* Pour le socket reconnect exponential backoff client, le produit documente les préconditions et postconditions attendues.
- **BOT_H.02.2** — *Entrées & contrats (API / UI).* Pour les questions secrètes de récupération de compte, le produit minimise la fuite d’information entre rôles.
- **BOT_H.02.3** — *État, persistance & intégrité.* Pour le tournament elimination zero chips, le produit documente les préconditions et postconditions attendues.
- **BOT_H.02.4** — *Temps réel & synchronisation.* Pour le report category enum, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_H.02.5** — *Sécurité, rôles & conformité.* Pour les classes CSS racine accessibilité, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_H.02.6** — *Erreurs, limites & dégradation.* Pour le number formatting chips locale, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_H.02.7** — *Exploitation & évolutivité.* Pour le cash sit-out / rebuy / leave, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_H.02.8** — *Objectif & périmètre.* Pour le join game error banned si prévu, le produit journalise les transitions sensibles pour audit.
- **BOT_H.02.9** — *Entrées & contrats (API / UI).* Pour le loader show on route transition, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_H.02.10** — *État, persistance & intégrité.* Pour le mapping playerToGameId au start, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_H.02.11** — *Temps réel & synchronisation.* Pour le leave table forfeit uncalled si règles, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_H.02.12** — *Sécurité, rôles & conformité.* Pour le success toast friend accepted, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### BOT_H.03 — Moins d’erreurs grossières
- **BOT_H.03.1** — *Objectif & périmètre.* Pour la validation stricte des actions IA, le produit minimise la fuite d’information entre rôles.
- **BOT_H.03.2** — *Entrées & contrats (API / UI).* Pour la pagination et filtres leaderboard, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_H.03.3** — *État, persistance & intégrité.* Pour le hidden bet live window timing, le produit journalise les transitions sensibles pour audit.
- **BOT_H.03.4** — *Temps réel & synchronisation.* Pour le multi blackjack start host only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_H.03.5** — *Sécurité, rôles & conformité.* Pour la page résultats paris cachés, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_H.03.6** — *Erreurs, limites & dégradation.* Pour le chat de table, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_H.03.7** — *Exploitation & évolutivité.* Pour la route racine updatesRouter, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_H.03.8** — *Objectif & périmètre.* Pour le runout cartes après all-in, le produit minimise la fuite d’information entre rôles.
- **BOT_H.03.9** — *Entrées & contrats (API / UI).* Pour le tournament medal display top3, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_H.03.10** — *État, persistance & intégrité.* Pour le slot result authoritative symbols, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_H.03.11** — *Temps réel & synchronisation.* Pour le expert bot python grpc or http si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_H.03.12** — *Sécurité, rôles & conformité.* Pour le feedback text max length, le produit expose des erreurs métier stables pour i18n et support.

## Bot EXPERT + IA
_Balise `BOT_X` — logique fonctionnelle, sans code source._

### BOT_X.01 — Heuristique Node de secours
- **BOT_X.01.1** — *Objectif & périmètre.* Pour les routes /api/bot avec rate limit dédié, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_X.01.2** — *Entrées & contrats (API / UI).* Pour le waiting room list GET, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_X.01.3** — *État, persistance & intégrité.* Pour l’historique des mains practice, le produit isole les données par utilisateur et par partie.
- **BOT_X.01.4** — *Temps réel & synchronisation.* Pour le cash sit-out / rebuy / leave, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.01.5** — *Sécurité, rôles & conformité.* Les paris cachés s’appuient sur des phases de marché (avant main, pendant les mises, etc.) : les cotes et tickets sont versionnés pour éviter les contestations rétroactives.
- **BOT_X.01.6** — *Erreurs, limites & dégradation.* Pour le server socketAuth middleware order, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.01.7** — *Exploitation & évolutivité.* Pour le slot result authoritative symbols, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_X.01.8** — *Objectif & périmètre.* Pour le loan list filter active, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.01.9** — *Entrées & contrats (API / UI).* Pour le port listen env PORT, le produit documente les préconditions et postconditions attendues.
- **BOT_X.01.10** — *État, persistance & intégrité.* Pour les métriques Prometheus et endpoint /metrics, le produit minimise la fuite d’information entre rôles.
- **BOT_X.01.11** — *Temps réel & synchronisation.* Pour le helmet frame ancestors self, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.01.12** — *Sécurité, rôles & conformité.* Pour le fallback heuristique Node si IA KO, le produit expose des erreurs métier stables pour i18n et support.

### BOT_X.02 — Appel microservice Python
- **BOT_X.02.1** — *Objectif & périmètre.* Pour le mini games hub cards layout, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_X.02.2** — *Entrées & contrats (API / UI).* Pour le flux register → lobby, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.02.3** — *État, persistance & intégrité.* Pour le success toast friend accepted, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_X.02.4** — *Temps réel & synchronisation.* Pour la déconnexion socket si token invalide, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_X.02.5** — *Sécurité, rôles & conformité.* Pour la page WaitingRoom dédiée, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_X.02.6** — *Erreurs, limites & dégradation.* Pour le hook useUser et synchronisation token, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_X.02.7** — *Exploitation & évolutivité.* Pour l’écran de résultat tournoi et le classement gains, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_X.02.8** — *Objectif & périmètre.* Pour la page Login / Register / Auth, le produit reste désactivable ou restreint en production si sensible.
- **BOT_X.02.9** — *Entrées & contrats (API / UI).* Pour le tournament ranking by chips, le produit documente les préconditions et postconditions attendues.
- **BOT_X.02.10** — *État, persistance & intégrité.* Pour le ready check database ping, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_X.02.11** — *Temps réel & synchronisation.* Pour le leaderboard self rank highlight, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.02.12** — *Sécurité, rôles & conformité.* Pour le friend not found search, le produit respecte l’idempotence ou les clés d’unicité métier.

### BOT_X.03 — Validation réponse IA
- **BOT_X.03.1** — *Objectif & périmètre.* Pour le flux login → invalidation User, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.03.2** — *Entrées & contrats (API / UI).* Pour le min raise increment server, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_X.03.3** — *État, persistance & intégrité.* Pour l’endpoint /api/health/live, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_X.03.4** — *Temps réel & synchronisation.* Pour le leaderboard OFFSET pagination, le produit applique les règles de remboursement de prêt actif.
- **BOT_X.03.5** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit journalise les transitions sensibles pour audit.
- **BOT_X.03.6** — *Erreurs, limites & dégradation.* Pour le lobby quick actions row, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.03.7** — *Exploitation & évolutivité.* Pour la résolution des paris cachés en fin de main, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_X.03.8** — *Objectif & périmètre.* Pour le color blind mode tritanopia, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_X.03.9** — *Entrées & contrats (API / UI).* Pour le multi blackjack leave mid hand rules, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_X.03.10** — *État, persistance & intégrité.* Pour le updates static route behavior, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.03.11** — *Temps réel & synchronisation.* Pour le pot odds hint display optional client only, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_X.03.12** — *Sécurité, rôles & conformité.* Pour le practice difficulty query param, le produit vérifie les montants et soldes avant persistance.

### BOT_X.04 — Fallback silencieux
- **BOT_X.04.1** — *Objectif & périmètre.* Pour la séparation practice / cash / casino / tournoi, le produit minimise la fuite d’information entre rôles.
- **BOT_X.04.2** — *Entrées & contrats (API / UI).* Pour la page WaitingRoom dédiée, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_X.04.3** — *État, persistance & intégrité.* Pour le ante table optional si supporté, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_X.04.4** — *Temps réel & synchronisation.* Pour les routes /api/bot avec rate limit dédié, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.04.5** — *Sécurité, rôles & conformité.* Pour les routes /api/blackjack-tables, le produit minimise la fuite d’information entre rôles.
- **BOT_X.04.6** — *Erreurs, limites & dégradation.* Pour le color blind mode protanopia, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_X.04.7** — *Exploitation & évolutivité.* Pour le waiting room join POST, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_X.04.8** — *Objectif & périmètre.* La latence mesurée sur l’appel IA permet de basculer plus vite vers l’heuristique si un seuil est dépassé.
- **BOT_X.04.9** — *Entrées & contrats (API / UI).* Pour le lobby principal et ses onglets, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_X.04.10** — *État, persistance & intégrité.* Pour le admin tournament delete cascade, le produit reste désactivable ou restreint en production si sensible.
- **BOT_X.04.11** — *Temps réel & synchronisation.* Pour le hidden bet history query by user, le produit reste désactivable ou restreint en production si sensible.
- **BOT_X.04.12** — *Sécurité, rôles & conformité.* Pour le leaderboard self rank highlight, le produit permet l’observabilité (latence, codes, corrélation).

### BOT_X.05 — Journalisation QoS
- **BOT_X.05.1** — *Objectif & périmètre.* Pour le reset token single use, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.05.2** — *Entrées & contrats (API / UI).* Pour le quantum bluff branding start screen, le produit permet l’observabilité (latence, codes, corrélation).
- **BOT_X.05.3** — *État, persistance & intégrité.* Pour l’anti-cheat middleware HTTP, le produit propage l’état via Socket.IO de façon agrégée.
- **BOT_X.05.4** — *Temps réel & synchronisation.* Pour la récupération blackjack au boot serveur, le produit reste désactivable ou restreint en production si sensible.
- **BOT_X.05.5** — *Sécurité, rôles & conformité.* Pour le reject friend loan, le produit minimise la fuite d’information entre rôles.
- **BOT_X.05.6** — *Erreurs, limites & dégradation.* Pour les niveaux XP seuils, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.05.7** — *Exploitation & évolutivité.* Pour le tournament satellite ticket si supporté, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_X.05.8** — *Objectif & périmètre.* Pour le tournament satellite ticket si supporté, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.05.9** — *Entrées & contrats (API / UI).* Pour le moteur de distribution et d’enchères, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_X.05.10** — *État, persistance & intégrité.* Pour l’override roulette numéro forcé dev-only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOT_X.05.11** — *Temps réel & synchronisation.* Pour la validation stricte des actions IA, le produit journalise les transitions sensibles pour audit.
- **BOT_X.05.12** — *Sécurité, rôles & conformité.* Pour le live flop market transition, le produit permet l’observabilité (latence, codes, corrélation).

### BOT_X.06 — Contexte étendu (rue, stacks)
- **BOT_X.06.1** — *Objectif & périmètre.* Pour la persistance difficulté bot en session, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_X.06.2** — *Entrées & contrats (API / UI).* Pour le bot action server driven timing, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.06.3** — *État, persistance & intégrité.* Pour le flux register → lobby, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.06.4** — *Temps réel & synchronisation.* Pour le provider TableThemeProvider, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_X.06.5** — *Sécurité, rôles & conformité.* Pour le expert bot python grpc or http si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_X.06.6** — *Erreurs, limites & dégradation.* Pour le flux register → lobby, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_X.06.7** — *Exploitation & évolutivité.* Pour le socket auth handshake token, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOT_X.06.8** — *Objectif & périmètre.* Pour les healthchecks live / ready et dépendances, le produit vérifie les montants et soldes avant persistance.
- **BOT_X.06.9** — *Entrées & contrats (API / UI).* Pour la machine à sous (tour, symboles, payout), le produit reste désactivable ou restreint en production si sensible.
- **BOT_X.06.10** — *État, persistance & intégrité.* Pour les loans actifs vs historiques, le produit maintient la compatibilité mobile et navigateur.
- **BOT_X.06.11** — *Temps réel & synchronisation.* Pour le socket rejoin après refresh page, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOT_X.06.12** — *Sécurité, rôles & conformité.* Pour le waiting room join POST, le produit refuse les actions si le rôle ne correspond pas au contexte.

### BOT_X.07 — Conformité non-triche
- **BOT_X.07.1** — *Objectif & périmètre.* Pour le tournament service static io, le produit isole les données par utilisateur et par partie.
- **BOT_X.07.2** — *Entrées & contrats (API / UI).* Pour le tie-break sur identifiant affiché, le produit minimise la fuite d’information entre rôles.
- **BOT_X.07.3** — *État, persistance & intégrité.* Pour le max players waiting room, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_X.07.4** — *Temps réel & synchronisation.* Pour le cors credentials true socket, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOT_X.07.5** — *Sécurité, rôles & conformité.* Pour le ante table optional si supporté, le produit journalise les transitions sensibles pour audit.
- **BOT_X.07.6** — *Erreurs, limites & dégradation.* Pour l’endpoint /api/health/ready et l’état dégradé, le produit minimise la fuite d’information entre rôles.
- **BOT_X.07.7** — *Exploitation & évolutivité.* Pour le updates check new version banner si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOT_X.07.8** — *Objectif & périmètre.* Pour le tournament prize formatting locale, le produit documente les préconditions et postconditions attendues.
- **BOT_X.07.9** — *Entrées & contrats (API / UI).* Pour la finale, l’élimination et le mode spectateur tournoi, le produit applique les règles de remboursement de prêt actif.
- **BOT_X.07.10** — *État, persistance & intégrité.* Pour les invitation party poker, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.07.11** — *Temps réel & synchronisation.* Pour le practice bot expert wallet policy, le produit vérifie les montants et soldes avant persistance.
- **BOT_X.07.12** — *Sécurité, rôles & conformité.* Pour l’endpoint /metrics protégé par bearer optionnel, le produit respecte l’idempotence ou les clés d’unicité métier.

### BOT_X.08 — Sanitisation décision
- **BOT_X.08.1** — *Objectif & périmètre.* Pour le admin redirect if not admin jwt, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.08.2** — *Entrées & contrats (API / UI).* Pour les loans actifs vs historiques, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOT_X.08.3** — *État, persistance & intégrité.* Pour les signalements joueur, le produit expose des erreurs métier stables pour i18n et support.
- **BOT_X.08.4** — *Temps réel & synchronisation.* Pour le feedback thank you acknowledgment, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.08.5** — *Sécurité, rôles & conformité.* Pour le game state sanitization avant emit, le produit documente les préconditions et postconditions attendues.
- **BOT_X.08.6** — *Erreurs, limites & dégradation.* Pour le ledger casino atomique, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BOT_X.08.7** — *Exploitation & évolutivité.* Pour le raise slider max stack bound, le produit isole les données par utilisateur et par partie.
- **BOT_X.08.8** — *Objectif & périmètre.* Les CORS stricts refusent les origines non listées même si le token serait valide, pour limiter les appels depuis sites tiers.
- **BOT_X.08.9** — *Entrées & contrats (API / UI).* Pour le hidden bet history query by game, le produit isole les données par utilisateur et par partie.
- **BOT_X.08.10** — *État, persistance & intégrité.* Pour le endpoint createGame / joinGame RTK, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOT_X.08.11** — *Temps réel & synchronisation.* Pour le leaderboard self rank highlight, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOT_X.08.12** — *Sécurité, rôles & conformité.* Pour le cash sit-out / rebuy / leave, le produit refuse les actions si le rôle ne correspond pas au contexte.

## Roulette
_Balise `ROU` — logique fonctionnelle, sans code source._

### ROU.01 — Contexte tour casino
- **ROU.01.1** — *Objectif & périmètre.* Pour le socket auth handshake token, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.01.2** — *Entrées & contrats (API / UI).* Pour la persistance difficulté bot en session, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ROU.01.3** — *État, persistance & intégrité.* Pour le all in call auto partial amount, le produit vérifie les montants et soldes avant persistance.
- **ROU.01.4** — *Temps réel & synchronisation.* Pour le socket global (auth token, connect_error), le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.01.5** — *Sécurité, rôles & conformité.* Pour le game deal route isolation, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.01.6** — *Erreurs, limites & dégradation.* Pour le self friend request block, le produit vérifie les montants et soldes avant persistance.
- **ROU.01.7** — *Exploitation & évolutivité.* Pour le tie-break sur identifiant affiché, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.01.8** — *Objectif & périmètre.* Pour l’avatar (fichier ou URL) et quotas taille, le produit vérifie les montants et soldes avant persistance.
- **ROU.01.9** — *Entrées & contrats (API / UI).* Pour les catégories victoires vs jetons vs XP, le produit vérifie les montants et soldes avant persistance.
- **ROU.01.10** — *État, persistance & intégrité.* Pour le root quantum bluff api message, le produit vérifie les montants et soldes avant persistance.
- **ROU.01.11** — *Temps réel & synchronisation.* Pour le board burn card animation serveur logique, le produit propage l’état via Socket.IO de façon agrégée.
- **ROU.01.12** — *Sécurité, rôles & conformité.* Pour le top-up réservé au développement, le produit applique les règles de remboursement de prêt actif.

### ROU.02 — Idempotence actionId
- **ROU.02.1** — *Objectif & périmètre.* Pour le leaderboard SQL ORDER BY, le produit vérifie les montants et soldes avant persistance.
- **ROU.02.2** — *Entrées & contrats (API / UI).* Pour le tournament join wallet lock, le produit vérifie les montants et soldes avant persistance.
- **ROU.02.3** — *État, persistance & intégrité.* Pour le taux prêt borne min max, le produit vérifie les montants et soldes avant persistance.
- **ROU.02.4** — *Temps réel & synchronisation.* Pour les pages Roulette et SlotMachine, le produit reste désactivable ou restreint en production si sensible.
- **ROU.02.5** — *Sécurité, rôles & conformité.* Pour le admin console action audit, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.02.6** — *Erreurs, limites & dégradation.* Pour la page Login / Register / Auth, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.02.7** — *Exploitation & évolutivité.* Pour le tournament medal display top3, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ROU.02.8** — *Objectif & périmètre.* Pour le practice bot expert wallet policy, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.02.9** — *Entrées & contrats (API / UI).* Pour la room blackjack multi et les sièges, le produit reste désactivable ou restreint en production si sensible.
- **ROU.02.10** — *État, persistance & intégrité.* Pour la machine à sous (tour, symboles, payout), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.02.11** — *Temps réel & synchronisation.* Pour le expert bot python grpc or http si prévu, le produit documente les préconditions et postconditions attendues.
- **ROU.02.12** — *Sécurité, rôles & conformité.* Pour le prisma error map user facing, le produit documente les préconditions et postconditions attendues.

### ROU.03 — Validation mises & plafonds
- **ROU.03.1** — *Objectif & périmètre.* Pour le tournament cancelled refund policy, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.03.2** — *Entrées & contrats (API / UI).* Pour la room blackjack multi et les sièges, le produit vérifie les montants et soldes avant persistance.
- **ROU.03.3** — *État, persistance & intégrité.* Pour le login rate limit auth routes, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.03.4** — *Temps réel & synchronisation.* Pour les avis / notes post-partie, le produit distingue erreurs réseau, auth et serveur côté client.
- **ROU.03.5** — *Sécurité, rôles & conformité.* Pour le flux register → lobby, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.03.6** — *Erreurs, limites & dégradation.* Pour la page HiddenBetsResult, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.03.7** — *Exploitation & évolutivité.* Pour le hub mini-jeux (roulette, slot, blackjack), le produit minimise la fuite d’information entre rôles.
- **ROU.03.8** — *Objectif & périmètre.* Pour le tournament result delay 12s, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.03.9** — *Entrées & contrats (API / UI).* Pour la page WaitingRoom dédiée, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.03.10** — *État, persistance & intégrité.* Pour les notifications prêt accepté/refusé, le produit vérifie les montants et soldes avant persistance.
- **ROU.03.11** — *Temps réel & synchronisation.* Pour le block user social si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.03.12** — *Sécurité, rôles & conformité.* Pour le logging confidence IA, le produit applique les règles de remboursement de prêt actif.

### ROU.04 — Transaction débit
- **ROU.04.1** — *Objectif & périmètre.* Pour le tournament final table merge, le produit applique les règles de remboursement de prêt actif.
- **ROU.04.2** — *Entrées & contrats (API / UI).* Pour le blackjack table gameId param, le produit distingue erreurs réseau, auth et serveur côté client.
- **ROU.04.3** — *État, persistance & intégrité.* Pour la liste d’amis et les demandes, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ROU.04.4** — *Temps réel & synchronisation.* Pour le admin tournaments UI fields, le produit vérifie les montants et soldes avant persistance.
- **ROU.04.5** — *Sécurité, rôles & conformité.* Pour le leaderboard anti cheat stats validation, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.04.6** — *Erreurs, limites & dégradation.* Pour la configuration des bots avant practice, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.04.7** — *Exploitation & évolutivité.* Pour le admin runtime blackjack dev-only, le produit isole les données par utilisateur et par partie.
- **ROU.04.8** — *Objectif & périmètre.* Pour la route admin générique dev-only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.04.9** — *Entrées & contrats (API / UI).* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit reste désactivable ou restreint en production si sensible.
- **ROU.04.10** — *État, persistance & intégrité.* Pour le xp anti farm cooldown server, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.04.11** — *Temps réel & synchronisation.* Pour le blocked user list si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.04.12** — *Sécurité, rôles & conformité.* Pour le serveur HTTP + Socket.IO partagé, le produit respecte l’idempotence ou les clés d’unicité métier.

### ROU.05 — Tirage résultat serveur
- **ROU.05.1** — *Objectif & périmètre.* Pour le solo blackjack deck shuffle server, le produit documente les préconditions et postconditions attendues.
- **ROU.05.2** — *Entrées & contrats (API / UI).* Pour le admin tournament delete cascade, le produit vérifie les montants et soldes avant persistance.
- **ROU.05.3** — *État, persistance & intégrité.* Pour le waiting room list GET, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.05.4** — *Temps réel & synchronisation.* Pour les notifications prêt accepté/refusé, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ROU.05.5** — *Sécurité, rôles & conformité.* Pour le requestId propagation logs, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.05.6** — *Erreurs, limites & dégradation.* Pour les stats agrégées slot, le produit documente les préconditions et postconditions attendues.
- **ROU.05.7** — *Exploitation & évolutivité.* Pour les notifications prêt accepté/refusé, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.05.8** — *Objectif & périmètre.* Pour la recherche de joueurs, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.05.9** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.05.10** — *État, persistance & intégrité.* Pour le multi blackjack leave mid hand rules, le produit vérifie les montants et soldes avant persistance.
- **ROU.05.11** — *Temps réel & synchronisation.* Pour le port listen env PORT, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.05.12** — *Sécurité, rôles & conformité.* Pour le min raise increment server, le produit gère la concurrence par transactions courtes ou verrous logiques.

### ROU.06 — Résolution gains
- **ROU.06.1** — *Objectif & périmètre.* Pour le private room join request timeout, le produit applique les règles de remboursement de prêt actif.
- **ROU.06.2** — *Entrées & contrats (API / UI).* Pour le degraded redis fallback memory, le produit journalise les transitions sensibles pour audit.
- **ROU.06.3** — *État, persistance & intégrité.* Pour le street advance server event broadcast, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.06.4** — *Temps réel & synchronisation.* Pour le recovery question list server, le produit minimise la fuite d’information entre rôles.
- **ROU.06.5** — *Sécurité, rôles & conformité.* Pour le reconnect same seat if free, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.06.6** — *Erreurs, limites & dégradation.* Pour la quote hash exposée au client, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ROU.06.7** — *Exploitation & évolutivité.* Pour le profile badges grid, le produit propage l’état via Socket.IO de façon agrégée.
- **ROU.06.8** — *Objectif & périmètre.* Pour la progression challenge stockée DB, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.06.9** — *Entrées & contrats (API / UI).* Pour le raise slider max stack bound, le produit applique les règles de remboursement de prêt actif.
- **ROU.06.10** — *État, persistance & intégrité.* Pour le results alias route same page, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.06.11** — *Temps réel & synchronisation.* Pour le all in call auto partial amount, le produit documente les préconditions et postconditions attendues.
- **ROU.06.12** — *Sécurité, rôles & conformité.* Pour le dealer button rotation animation, le produit applique les règles de remboursement de prêt actif.

### ROU.07 — Crédit & ledger
- **ROU.07.1** — *Objectif & périmètre.* Pour le tournament clock server synced si prévu, le produit applique les règles de remboursement de prêt actif.
- **ROU.07.2** — *Entrées & contrats (API / UI).* Pour le slot reels animation client only, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ROU.07.3** — *État, persistance & intégrité.* Pour le hidden bet history query by user, le produit journalise les transitions sensibles pour audit.
- **ROU.07.4** — *Temps réel & synchronisation.* Pour le friends online presence indicator, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.07.5** — *Sécurité, rôles & conformité.* Pour le locale date formatting leaderboard, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.07.6** — *Erreurs, limites & dégradation.* Pour les avis / notes post-partie, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.07.7** — *Exploitation & évolutivité.* Pour le stats increment async post commit, le produit vérifie les montants et soldes avant persistance.
- **ROU.07.8** — *Objectif & périmètre.* Pour la gamification (niveaux, badges, plafonds de mise), le produit propage l’état via Socket.IO de façon agrégée.
- **ROU.07.9** — *Entrées & contrats (API / UI).* Pour le updates static route behavior, le produit minimise la fuite d’information entre rôles.
- **ROU.07.10** — *État, persistance & intégrité.* Pour la séparation practice / cash / casino / tournoi, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.07.11** — *Temps réel & synchronisation.* Pour le tournament medal display top3, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.07.12** — *Sécurité, rôles & conformité.* Pour le mini games hub cards layout, le produit respecte l’idempotence ou les clés d’unicité métier.

### ROU.08 — Prêt actif & priorité remboursement
- **ROU.08.1** — *Objectif & périmètre.* Pour le tournament result delay 12s, le produit applique les règles de remboursement de prêt actif.
- **ROU.08.2** — *Entrées & contrats (API / UI).* Pour le taux prêt borne min max, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.08.3** — *État, persistance & intégrité.* Pour le error boundary reset state, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.08.4** — *Temps réel & synchronisation.* Pour le ready check database ping, le produit isole les données par utilisateur et par partie.
- **ROU.08.5** — *Sécurité, rôles & conformité.* Pour le root quantum bluff api message, le produit propage l’état via Socket.IO de façon agrégée.
- **ROU.08.6** — *Erreurs, limites & dégradation.* Pour les invitation party blackjack, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.08.7** — *Exploitation & évolutivité.* Pour le admin runtime poker dev-only, le produit applique les règles de remboursement de prêt actif.
- **ROU.08.8** — *Objectif & périmètre.* Pour le join game error wrong password private, le produit isole les données par utilisateur et par partie.
- **ROU.08.9** — *Entrées & contrats (API / UI).* Pour le tournament result delay 12s, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.08.10** — *État, persistance & intégrité.* Pour le hidden bets result route params, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.08.11** — *Temps réel & synchronisation.* Pour le register password strength, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.08.12** — *Sécurité, rôles & conformité.* Pour GameExample (démo / test intégration), le produit isole les données par utilisateur et par partie.

### ROU.09 — XP & tolérance erreur XP
- **ROU.09.1** — *Objectif & périmètre.* Pour le number formatting chips locale, le produit isole les données par utilisateur et par partie.
- **ROU.09.2** — *Entrées & contrats (API / UI).* Pour le taux prêt borne min max, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ROU.09.3** — *État, persistance & intégrité.* Pour le socket reconnect exponential backoff client, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.09.4** — *Temps réel & synchronisation.* Pour l’en-tête x-idempotency-key sur les mutations, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.09.5** — *Sécurité, rôles & conformité.* Pour le tournament elimination zero chips, le produit documente les préconditions et postconditions attendues.
- **ROU.09.6** — *Erreurs, limites & dégradation.* Pour le imgSrc blob data https, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.09.7** — *Exploitation & évolutivité.* Pour le tournament bounty si supporté, le produit applique les règles de remboursement de prêt actif.
- **ROU.09.8** — *Objectif & périmètre.* Pour le port listen env PORT, le produit s’appuie sur la validation serveur comme source de vérité.
- **ROU.09.9** — *Entrées & contrats (API / UI).* Pour le service tournoi et broadcasts Socket.IO, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ROU.09.10** — *État, persistance & intégrité.* Pour le loan banner active on casino pages, le produit applique les règles de remboursement de prêt actif.
- **ROU.09.11** — *Temps réel & synchronisation.* Pour la pagination et filtres leaderboard, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.09.12** — *Sécurité, rôles & conformité.* Pour les métriques Prometheus et endpoint /metrics, le produit applique les règles de remboursement de prêt actif.

### ROU.10 — Stats agrégées
- **ROU.10.1** — *Objectif & périmètre.* Pour les invitations socket room blackjack, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ROU.10.2** — *Entrées & contrats (API / UI).* Pour le practice bot expert wallet policy, le produit reste désactivable ou restreint en production si sensible.
- **ROU.10.3** — *État, persistance & intégrité.* Pour GameDeal et flux de distribution démo, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.10.4** — *Temps réel & synchronisation.* Pour le tournament rebuy addon si supporté tournoi, le produit expose des erreurs métier stables pour i18n et support.
- **ROU.10.5** — *Sécurité, rôles & conformité.* La récupération de mot de passe s’appuie sur un jeton à usage limité et une expiration courte ; aucune divulgation ne confirme l’existence d’un email.
- **ROU.10.6** — *Erreurs, limites & dégradation.* Pour l’avatar (fichier ou URL) et quotas taille, le produit applique les règles de remboursement de prêt actif.
- **ROU.10.7** — *Exploitation & évolutivité.* Pour le JSON body limit (avatars data URL), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ROU.10.8** — *Objectif & périmètre.* Pour le number formatting chips locale, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ROU.10.9** — *Entrées & contrats (API / UI).* Pour le screen reader labels cards, le produit limite les abus par quotas, plafonds ou fréquence.
- **ROU.10.10** — *État, persistance & intégrité.* Pour le game deal route isolation, le produit applique les règles de remboursement de prêt actif.
- **ROU.10.11** — *Temps réel & synchronisation.* Pour la route racine updatesRouter, le produit permet l’observabilité (latence, codes, corrélation).
- **ROU.10.12** — *Sécurité, rôles & conformité.* Pour les invitation party poker, le produit gère la concurrence par transactions courtes ou verrous logiques.

## Machine à sous
_Balise `SLOT` — logique fonctionnelle, sans code source._

### SLOT.01 — Contexte tour & idempotence
- **SLOT.01.1** — *Objectif & périmètre.* Pour le recovery service blackjack tables, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.01.2** — *Entrées & contrats (API / UI).* Pour le state tournamentPlayers passé en navigation, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.01.3** — *État, persistance & intégrité.* Pour les pages Roulette et SlotMachine, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SLOT.01.4** — *Temps réel & synchronisation.* Pour le solo blackjack deck shuffle server, le produit propage l’état via Socket.IO de façon agrégée.
- **SLOT.01.5** — *Sécurité, rôles & conformité.* Pour le tournament name branding header, le produit expose des erreurs métier stables pour i18n et support.
- **SLOT.01.6** — *Erreurs, limites & dégradation.* Pour la gamification (niveaux, badges, plafonds de mise), le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.01.7** — *Exploitation & évolutivité.* Pour le latency metric histogram si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.01.8** — *Objectif & périmètre.* Pour le rebuy max table enforcement, le produit applique les règles de remboursement de prêt actif.
- **SLOT.01.9** — *Entrées & contrats (API / UI).* Pour le TournamentTeleporter dans App, le produit isole les données par utilisateur et par partie.
- **SLOT.01.10** — *État, persistance & intégrité.* Pour le microservice Python pour décisions expert bot, le produit journalise les transitions sensibles pour audit.
- **SLOT.01.11** — *Temps réel & synchronisation.* Pour les prêts entre amis (demande, taux, acceptation), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.01.12** — *Sécurité, rôles & conformité.* Pour la liste d’amis et les demandes, le produit propage l’état via Socket.IO de façon agrégée.

### SLOT.02 — Validation mise max
- **SLOT.02.1** — *Objectif & périmètre.* Pour le feedback text max length, le produit applique les règles de remboursement de prêt actif.
- **SLOT.02.2** — *Entrées & contrats (API / UI).* Pour le logging confidence IA, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.02.3** — *État, persistance & intégrité.* Pour les pages Roulette et SlotMachine, le produit documente les préconditions et postconditions attendues.
- **SLOT.02.4** — *Temps réel & synchronisation.* Pour la politique Helmet CSP et fonts externes, le produit vérifie les montants et soldes avant persistance.
- **SLOT.02.5** — *Sécurité, rôles & conformité.* Pour le calcul rang personnel leaderboard, le produit applique les règles de remboursement de prêt actif.
- **SLOT.02.6** — *Erreurs, limites & dégradation.* Pour le blackjack bet limits table, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.02.7** — *Exploitation & évolutivité.* Pour le microservice Python pour décisions expert bot, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.02.8** — *Objectif & périmètre.* Pour le 2FA enable verify steps, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.02.9** — *Entrées & contrats (API / UI).* Pour l’endpoint /metrics protégé par bearer optionnel, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.02.10** — *État, persistance & intégrité.* Pour le console admin filter by status, le produit applique les règles de remboursement de prêt actif.
- **SLOT.02.11** — *Temps réel & synchronisation.* Pour le login rate limit auth routes, le produit applique les règles de remboursement de prêt actif.
- **SLOT.02.12** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit journalise les transitions sensibles pour audit.

### SLOT.03 — Transaction débit
- **SLOT.03.1** — *Objectif & périmètre.* Pour le state tournamentPlayers passé en navigation, le produit minimise la fuite d’information entre rôles.
- **SLOT.03.2** — *Entrées & contrats (API / UI).* Pour les stats agrégées roulette, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SLOT.03.3** — *État, persistance & intégrité.* Pour le duplicate action reject same round, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.03.4** — *Temps réel & synchronisation.* Pour le ante table optional si supporté, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.03.5** — *Sécurité, rôles & conformité.* Pour le taux prêt borne min max, le produit isole les données par utilisateur et par partie.
- **SLOT.03.6** — *Erreurs, limites & dégradation.* Pour le results alias route same page, le produit s’appuie sur la validation serveur comme source de vérité.
- **SLOT.03.7** — *Exploitation & évolutivité.* Pour le multi blackjack start host only, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.03.8** — *Objectif & périmètre.* Pour le admin runtime blackjack dev-only, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.03.9** — *Entrées & contrats (API / UI).* Pour le tournament name branding header, le produit applique les règles de remboursement de prêt actif.
- **SLOT.03.10** — *État, persistance & intégrité.* Pour le feedback text max length, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.03.11** — *Temps réel & synchronisation.* Pour le blackjack table gameId param, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SLOT.03.12** — *Sécurité, rôles & conformité.* Pour le navigation bottom bar si mobile, le produit gère la concurrence par transactions courtes ou verrous logiques.

### SLOT.04 — Tirage symboles
- **SLOT.04.1** — *Objectif & périmètre.* Pour le server socketAuth middleware order, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.04.2** — *Entrées & contrats (API / UI).* Pour le composant GameWithKey (reset état route), le produit vérifie les montants et soldes avant persistance.
- **SLOT.04.3** — *État, persistance & intégrité.* Pour le top-up réservé au développement, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.04.4** — *Temps réel & synchronisation.* Le blackjack multi synchronise des sièges et un état de room ; les actions REST ou messages WS reflètent toujours l’état courant après validation.
- **SLOT.04.5** — *Sécurité, rôles & conformité.* Pour le quantum bluff branding start screen, le produit vérifie les montants et soldes avant persistance.
- **SLOT.04.6** — *Erreurs, limites & dégradation.* Pour la validation stricte des actions IA, le produit s’appuie sur la validation serveur comme source de vérité.
- **SLOT.04.7** — *Exploitation & évolutivité.* Pour les loans actifs vs historiques, le produit applique les règles de remboursement de prêt actif.
- **SLOT.04.8** — *Objectif & périmètre.* Pour le private room join request timeout, le produit isole les données par utilisateur et par partie.
- **SLOT.04.9** — *Entrées & contrats (API / UI).* Pour le microservice Python pour décisions expert bot, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SLOT.04.10** — *État, persistance & intégrité.* Pour le results alias route same page, le produit isole les données par utilisateur et par partie.
- **SLOT.04.11** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.04.12** — *Sécurité, rôles & conformité.* Pour la documentation Swagger /api-docs, le produit expose des erreurs métier stables pour i18n et support.

### SLOT.05 — Calcul payout
- **SLOT.05.1** — *Objectif & périmètre.* Pour le friends online presence indicator, le produit journalise les transitions sensibles pour audit.
- **SLOT.05.2** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit permet l’observabilité (latence, codes, corrélation).
- **SLOT.05.3** — *État, persistance & intégrité.* Pour le friends online presence indicator, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.05.4** — *Temps réel & synchronisation.* Pour le slot loan repayment order, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.05.5** — *Sécurité, rôles & conformité.* Pour les invitation party blackjack, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.05.6** — *Erreurs, limites & dégradation.* Pour le profil utilisateur et l’édition, le produit reste désactivable ou restreint en production si sensible.
- **SLOT.05.7** — *Exploitation & évolutivité.* Pour le mapping playerToGameId au start, le produit applique les règles de remboursement de prêt actif.
- **SLOT.05.8** — *Objectif & périmètre.* Pour le profile stats wins losses hands, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.05.9** — *Entrées & contrats (API / UI).* Pour le game state sanitization avant emit, le produit s’appuie sur la validation serveur comme source de vérité.
- **SLOT.05.10** — *État, persistance & intégrité.* Pour la quote hash exposée au client, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SLOT.05.11** — *Temps réel & synchronisation.* Pour le reconnect same seat if free, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.05.12** — *Sécurité, rôles & conformité.* Pour le composant GameWithKey (reset état route), le produit vérifie les montants et soldes avant persistance.

### SLOT.06 — Crédit & ledger
- **SLOT.06.1** — *Objectif & périmètre.* Pour le socket auth handshake token, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.06.2** — *Entrées & contrats (API / UI).* Pour le slot max bet config, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SLOT.06.3** — *État, persistance & intégrité.* Pour l’override roulette numéro forcé dev-only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SLOT.06.4** — *Temps réel & synchronisation.* Pour le taux prêt borne min max, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.06.5** — *Sécurité, rôles & conformité.* Pour les catégories victoires vs jetons vs XP, le produit maintient la compatibilité mobile et navigateur.
- **SLOT.06.6** — *Erreurs, limites & dégradation.* Pour la configuration trust proxy, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.06.7** — *Exploitation & évolutivité.* Pour le slot result authoritative symbols, le produit journalise les transitions sensibles pour audit.
- **SLOT.06.8** — *Objectif & périmètre.* Pour le transaction isolation read committed, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.06.9** — *Entrées & contrats (API / UI).* Pour les stats agrégées slot, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.06.10** — *État, persistance & intégrité.* Pour le basename Capacitor vs web, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.06.11** — *Temps réel & synchronisation.* Pour le record hand result practice API, le produit applique les règles de remboursement de prêt actif.
- **SLOT.06.12** — *Sécurité, rôles & conformité.* Pour l’écran d’accueil (StartScreen), le produit respecte l’idempotence ou les clés d’unicité métier.

### SLOT.07 — Prêt actif
- **SLOT.07.1** — *Objectif & périmètre.* Pour le game socket join after HTTP start, le produit vérifie les montants et soldes avant persistance.
- **SLOT.07.2** — *Entrées & contrats (API / UI).* Pour les badges profil liés niveaux, le produit documente les préconditions et postconditions attendues.
- **SLOT.07.3** — *État, persistance & intégrité.* Pour le tournament break schedule si prévu, le produit documente les préconditions et postconditions attendues.
- **SLOT.07.4** — *Temps réel & synchronisation.* Pour l’acceptation de liens d’invitation, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.07.5** — *Sécurité, rôles & conformité.* Pour le updates check new version banner si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.07.6** — *Erreurs, limites & dégradation.* Pour les invitations à une table blackjack, le produit expose des erreurs métier stables pour i18n et support.
- **SLOT.07.7** — *Exploitation & évolutivité.* Pour le process exit boot failure, le produit documente les préconditions et postconditions attendues.
- **SLOT.07.8** — *Objectif & périmètre.* Pour l’upload avatar mutation séparée, le produit propage l’état via Socket.IO de façon agrégée.
- **SLOT.07.9** — *Entrées & contrats (API / UI).* Pour la persistance difficulté bot en session, le produit expose des erreurs métier stables pour i18n et support.
- **SLOT.07.10** — *État, persistance & intégrité.* Pour les réponses 403 / 401 uniformisées, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.07.11** — *Temps réel & synchronisation.* Pour le previous hand history sidebar si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.07.12** — *Sécurité, rôles & conformité.* Pour le nettoyage planifié (cleanup jobs), le produit permet l’observabilité (latence, codes, corrélation).

### SLOT.08 — XP
- **SLOT.08.1** — *Objectif & périmètre.* Pour le hidden bet live window timing, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.08.2** — *Entrées & contrats (API / UI).* Pour les routes /api/leaderboard, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.08.3** — *État, persistance & intégrité.* Pour le cors credentials true socket, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.08.4** — *Temps réel & synchronisation.* Pour le stats increment async post commit, le produit s’appuie sur la validation serveur comme source de vérité.
- **SLOT.08.5** — *Sécurité, rôles & conformité.* Pour le tournament name branding header, le produit documente les préconditions et postconditions attendues.
- **SLOT.08.6** — *Erreurs, limites & dégradation.* Pour le pot odds hint display optional client only, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.08.7** — *Exploitation & évolutivité.* Pour les tags RTK FriendLoan et invalidations croisées, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SLOT.08.8** — *Objectif & périmètre.* Pour le multi blackjack leave mid hand rules, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.08.9** — *Entrées & contrats (API / UI).* Pour le mapping playerToGameId au start, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.08.10** — *État, persistance & intégrité.* Pour le lobby blackjack multi, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.08.11** — *Temps réel & synchronisation.* Pour le updates static route behavior, le produit limite les abus par quotas, plafonds ou fréquence.
- **SLOT.08.12** — *Sécurité, rôles & conformité.* Pour le dev socket.onAny pour debug, le produit applique les règles de remboursement de prêt actif.

### SLOT.09 — Stats agrégées
- **SLOT.09.1** — *Objectif & périmètre.* Pour la room blackjack multi et les sièges, le produit minimise la fuite d’information entre rôles.
- **SLOT.09.2** — *Entrées & contrats (API / UI).* Pour la persistance difficulté bot en session, le produit reste désactivable ou restreint en production si sensible.
- **SLOT.09.3** — *État, persistance & intégrité.* Pour le last action log poker UI, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.09.4** — *Temps réel & synchronisation.* Pour le stockage token localStorage, le produit vérifie les montants et soldes avant persistance.
- **SLOT.09.5** — *Sécurité, rôles & conformité.* Pour le skipSuccessfulRequests sur rate limit global, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.09.6** — *Erreurs, limites & dégradation.* Pour le mode spectateur et la file de reprise siège, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.09.7** — *Exploitation & évolutivité.* Pour les badges profil liés niveaux, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SLOT.09.8** — *Objectif & périmètre.* Pour le composant GameWithKey (reset état route), le produit journalise les transitions sensibles pour audit.
- **SLOT.09.9** — *Entrées & contrats (API / UI).* Pour les invitations socket room blackjack, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SLOT.09.10** — *État, persistance & intégrité.* Pour le process exit boot failure, le produit vérifie les montants et soldes avant persistance.
- **SLOT.09.11** — *Temps réel & synchronisation.* Pour le emit personalized snapshot per userId, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SLOT.09.12** — *Sécurité, rôles & conformité.* Pour le transaction isolation read committed, le produit documente les préconditions et postconditions attendues.

## Blackjack solo
_Balise `BJ1` — logique fonctionnelle, sans code source._

### BJ1.01 — Session
- **BJ1.01.1** — *Objectif & périmètre.* Pour le daily challenge streak bonus si prévu, le produit documente les préconditions et postconditions attendues.
- **BJ1.01.2** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BJ1.01.3** — *État, persistance & intégrité.* Pour le slot reels animation client only, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJ1.01.4** — *Temps réel & synchronisation.* Pour le endpoint createGame / joinGame RTK, le produit isole les données par utilisateur et par partie.
- **BJ1.01.5** — *Sécurité, rôles & conformité.* Pour le admin runtime blackjack dev-only, le produit isole les données par utilisateur et par partie.
- **BJ1.01.6** — *Erreurs, limites & dégradation.* Pour le fallback reason code IA, le produit journalise les transitions sensibles pour audit.
- **BJ1.01.7** — *Exploitation & évolutivité.* Pour l’override roulette numéro forcé dev-only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BJ1.01.8** — *Objectif & périmètre.* Pour le démarrage de partie vers un gameId, le produit limite les abus par quotas, plafonds ou fréquence.
- **BJ1.01.9** — *Entrées & contrats (API / UI).* Pour les daily challenges reset journalier, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BJ1.01.10** — *État, persistance & intégrité.* Pour la récupération blackjack au boot serveur, le produit propage l’état via Socket.IO de façon agrégée.
- **BJ1.01.11** — *Temps réel & synchronisation.* Pour la configuration trust proxy, le produit isole les données par utilisateur et par partie.
- **BJ1.01.12** — *Sécurité, rôles & conformité.* Pour la page Friends et flux social, le produit limite les abus par quotas, plafonds ou fréquence.

### BJ1.02 — Actions joueur
- **BJ1.02.1** — *Objectif & périmètre.* Pour le prisma error map user facing, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.02.2** — *Entrées & contrats (API / UI).* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit maintient la compatibilité mobile et navigateur.
- **BJ1.02.3** — *État, persistance & intégrité.* Pour le mute player chat si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.02.4** — *Temps réel & synchronisation.* Pour le slot reels animation client only, le produit minimise la fuite d’information entre rôles.
- **BJ1.02.5** — *Sécurité, rôles & conformité.* Pour le player turn highlight UI, le produit permet l’observabilité (latence, codes, corrélation).
- **BJ1.02.6** — *Erreurs, limites & dégradation.* Pour le blackjack bet limits table, le produit journalise les transitions sensibles pour audit.
- **BJ1.02.7** — *Exploitation & évolutivité.* Pour le rate limit metric counter si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.02.8** — *Objectif & périmètre.* Pour la banque blackjack multi tour par tour, le produit distingue erreurs réseau, auth et serveur côté client.
- **BJ1.02.9** — *Entrées & contrats (API / UI).* Pour le nettoyage planifié (cleanup jobs), le produit isole les données par utilisateur et par partie.
- **BJ1.02.10** — *État, persistance & intégrité.* Pour le slot max bet config, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJ1.02.11** — *Temps réel & synchronisation.* Pour le claim reward challenge, le produit isole les données par utilisateur et par partie.
- **BJ1.02.12** — *Sécurité, rôles & conformité.* Pour l’override roulette numéro forcé dev-only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### BJ1.03 — Settlement
- **BJ1.03.1** — *Objectif & périmètre.* Pour le solo blackjack settlement push state, le produit vérifie les montants et soldes avant persistance.
- **BJ1.03.2** — *Entrées & contrats (API / UI).* Pour le logging confidence IA, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.03.3** — *État, persistance & intégrité.* Pour le success toast friend accepted, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.03.4** — *Temps réel & synchronisation.* Pour le accept friend loan crédit, le produit isole les données par utilisateur et par partie.
- **BJ1.03.5** — *Sécurité, rôles & conformité.* Pour le lobby blackjack multi, le produit journalise les transitions sensibles pour audit.
- **BJ1.03.6** — *Erreurs, limites & dégradation.* Pour les pages Roulette et SlotMachine, le produit applique les règles de remboursement de prêt actif.
- **BJ1.03.7** — *Exploitation & évolutivité.* Pour le model inference timeout, le produit permet l’observabilité (latence, codes, corrélation).
- **BJ1.03.8** — *Objectif & périmètre.* Pour les invitations socket room blackjack, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJ1.03.9** — *Entrées & contrats (API / UI).* Pour le multi blackjack leave mid hand rules, le produit vérifie les montants et soldes avant persistance.
- **BJ1.03.10** — *État, persistance & intégrité.* Pour le number formatting chips locale, le produit permet l’observabilité (latence, codes, corrélation).
- **BJ1.03.11** — *Temps réel & synchronisation.* Pour le private room join request timeout, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJ1.03.12** — *Sécurité, rôles & conformité.* Pour le leave friend loan cancel, le produit isole les données par utilisateur et par partie.

### BJ1.04 — Stats
- **BJ1.04.1** — *Objectif & périmètre.* Pour le hand strength display optional client only, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJ1.04.2** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJ1.04.3** — *État, persistance & intégrité.* Pour le loan paid off celebration si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJ1.04.4** — *Temps réel & synchronisation.* Pour les salles privées et demandes d’adhésion, le produit minimise la fuite d’information entre rôles.
- **BJ1.04.5** — *Sécurité, rôles & conformité.* Pour le board burn card animation serveur logique, le produit minimise la fuite d’information entre rôles.
- **BJ1.04.6** — *Erreurs, limites & dégradation.* Pour le tournament overlay z-index full screen, le produit journalise les transitions sensibles pour audit.
- **BJ1.04.7** — *Exploitation & évolutivité.* Pour le idempotency actionId casino round, le produit limite les abus par quotas, plafonds ou fréquence.
- **BJ1.04.8** — *Objectif & périmètre.* Pour le solo blackjack settlement push state, le produit reste désactivable ou restreint en production si sensible.
- **BJ1.04.9** — *Entrées & contrats (API / UI).* Pour le port listen env PORT, le produit permet l’observabilité (latence, codes, corrélation).
- **BJ1.04.10** — *État, persistance & intégrité.* Pour le stats increment async post commit, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BJ1.04.11** — *Temps réel & synchronisation.* Les files spectateur vers siège joueur respectent l’ordre d’arrivée et la capacité ; un joueur qui quitte libère un slot exploitable.
- **BJ1.04.12** — *Sécurité, rôles & conformité.* Pour les tags RTK FriendLoan et invalidations croisées, le produit respecte l’idempotence ou les clés d’unicité métier.

## Blackjack multi
_Balise `BJN` — logique fonctionnelle, sans code source._

### BJN.01 — Room & sièges
- **BJN.01.1** — *Objectif & périmètre.* Pour le solo blackjack deck shuffle server, le produit permet l’observabilité (latence, codes, corrélation).
- **BJN.01.2** — *Entrées & contrats (API / UI).* Pour les limites express.json pour payloads, le produit permet l’observabilité (latence, codes, corrélation).
- **BJN.01.3** — *État, persistance & intégrité.* Pour le friends list sort online first, le produit applique les règles de remboursement de prêt actif.
- **BJN.01.4** — *Temps réel & synchronisation.* Pour le results alias route same page, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.01.5** — *Sécurité, rôles & conformité.* Pour le hidden bet history query by game, le produit documente les préconditions et postconditions attendues.
- **BJN.01.6** — *Erreurs, limites & dégradation.* Pour la page tournois (liste / inscription), le produit expose des erreurs métier stables pour i18n et support.
- **BJN.01.7** — *Exploitation & évolutivité.* Pour la waiting room poker (création / rejoindre), le produit minimise la fuite d’information entre rôles.
- **BJN.01.8** — *Objectif & périmètre.* Pour le cash sit-out / rebuy / leave, le produit documente les préconditions et postconditions attendues.
- **BJN.01.9** — *Entrées & contrats (API / UI).* Pour le socket auth handshake token, le produit reste désactivable ou restreint en production si sensible.
- **BJN.01.10** — *État, persistance & intégrité.* Pour le blackjack bet limits table, le produit documente les préconditions et postconditions attendues.
- **BJN.01.11** — *Temps réel & synchronisation.* Pour le JSON body limit (avatars data URL), le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.01.12** — *Sécurité, rôles & conformité.* Pour les streets préflop à river, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### BJN.02 — Invitations amis
- **BJN.02.1** — *Objectif & périmètre.* Pour le updates check new version banner si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BJN.02.2** — *Entrées & contrats (API / UI).* Pour les invitations socket room blackjack, le produit vérifie les montants et soldes avant persistance.
- **BJN.02.3** — *État, persistance & intégrité.* Pour le accept friend loan crédit, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.02.4** — *Temps réel & synchronisation.* Pour le accept friend loan crédit, le produit minimise la fuite d’information entre rôles.
- **BJN.02.5** — *Sécurité, rôles & conformité.* Pour le duplicate action reject same round, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.02.6** — *Erreurs, limites & dégradation.* Pour le min raise increment server, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.02.7** — *Exploitation & évolutivité.* Pour le live flop market transition, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.02.8** — *Objectif & périmètre.* Pour le email verification optional flow, le produit documente les préconditions et postconditions attendues.
- **BJN.02.9** — *Entrées & contrats (API / UI).* Pour le emoji reaction chat si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.02.10** — *État, persistance & intégrité.* Pour le admin tournament force start si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.02.11** — *Temps réel & synchronisation.* Pour la console admin web (JWT rôle admin), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.02.12** — *Sécurité, rôles & conformité.* Pour le latency metric histogram si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.

### BJN.03 — Machine état room
- **BJN.03.1** — *Objectif & périmètre.* Pour le leaderboard SQL ORDER BY, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.03.2** — *Entrées & contrats (API / UI).* Pour la politique Helmet CSP et fonts externes, le produit maintient la compatibilité mobile et navigateur.
- **BJN.03.3** — *État, persistance & intégrité.* Pour le lobby blackjack multi, le produit reste désactivable ou restreint en production si sensible.
- **BJN.03.4** — *Temps réel & synchronisation.* Pour le waiting room start POST gameId response, le produit isole les données par utilisateur et par partie.
- **BJN.03.5** — *Sécurité, rôles & conformité.* Pour le game deal route isolation, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.03.6** — *Erreurs, limites & dégradation.* Pour le imgSrc blob data https, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.03.7** — *Exploitation & évolutivité.* Pour la cotation et le placement de tickets, le produit expose des erreurs métier stables pour i18n et support.
- **BJN.03.8** — *Objectif & périmètre.* Pour le tournament navigate back lobby, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.03.9** — *Entrées & contrats (API / UI).* Pour le timeout per route override, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.03.10** — *État, persistance & intégrité.* Pour le game page key pathname search reset, le produit journalise les transitions sensibles pour audit.
- **BJN.03.11** — *Temps réel & synchronisation.* Pour le hidden bet history query by user, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BJN.03.12** — *Sécurité, rôles & conformité.* Pour le runout cartes après all-in, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### BJN.04 — Start vers gameId
- **BJN.04.1** — *Objectif & périmètre.* Pour GameDeal et flux de distribution démo, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BJN.04.2** — *Entrées & contrats (API / UI).* Pour le avatar image/jpeg size cap, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.04.3** — *État, persistance & intégrité.* Pour le flux Auth / Register / Login, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.04.4** — *Temps réel & synchronisation.* Pour le waiting room start POST gameId response, le produit expose des erreurs métier stables pour i18n et support.
- **BJN.04.5** — *Sécurité, rôles & conformité.* Pour le socket error ack client toast, le produit expose des erreurs métier stables pour i18n et support.
- **BJN.04.6** — *Erreurs, limites & dégradation.* Pour le admin runtime blackjack dev-only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BJN.04.7** — *Exploitation & évolutivité.* Pour la configuration trust proxy, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.04.8** — *Objectif & périmètre.* Pour le board burn card animation serveur logique, le produit applique les règles de remboursement de prêt actif.
- **BJN.04.9** — *Entrées & contrats (API / UI).* Pour le endpoint createGame / joinGame RTK, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.04.10** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.04.11** — *Temps réel & synchronisation.* Pour le wallet history append only, le produit maintient la compatibilité mobile et navigateur.
- **BJN.04.12** — *Sécurité, rôles & conformité.* Pour l’écran de résultat tournoi et le classement gains, le produit applique les règles de remboursement de prêt actif.

### BJN.05 — REST actions
- **BJN.05.1** — *Objectif & périmètre.* Pour le thème de table (felt / couleurs), le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.05.2** — *Entrées & contrats (API / UI).* Pour le i18n namespace auth labels, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.05.3** — *État, persistance & intégrité.* Pour le pot odds hint display optional client only, le produit expose des erreurs métier stables pour i18n et support.
- **BJN.05.4** — *Temps réel & synchronisation.* Pour le loader show on route transition, le produit applique les règles de remboursement de prêt actif.
- **BJN.05.5** — *Sécurité, rôles & conformité.* Pour le flux login → invalidation User, le produit propage l’état via Socket.IO de façon agrégée.
- **BJN.05.6** — *Erreurs, limites & dégradation.* Pour la recherche de joueurs, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BJN.05.7** — *Exploitation & évolutivité.* Pour le cash queue promote spectator, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.05.8** — *Objectif & périmètre.* Pour la persistance difficulté bot en session, le produit journalise les transitions sensibles pour audit.
- **BJN.05.9** — *Entrées & contrats (API / UI).* Pour les catégories victoires vs jetons vs XP, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BJN.05.10** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit limite les abus par quotas, plafonds ou fréquence.
- **BJN.05.11** — *Temps réel & synchronisation.* Pour le bot action server driven timing, le produit minimise la fuite d’information entre rôles.
- **BJN.05.12** — *Sécurité, rôles & conformité.* Pour les toasts tournament-countdown, le produit synchronise l’UI sur le snapshot officiel après mutation.

### BJN.06 — WS snapshots
- **BJN.06.1** — *Objectif & périmètre.* Pour le tournament trophy asset display, le produit isole les données par utilisateur et par partie.
- **BJN.06.2** — *Entrées & contrats (API / UI).* Pour l’acceptation de liens d’invitation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BJN.06.3** — *État, persistance & intégrité.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit maintient la compatibilité mobile et navigateur.
- **BJN.06.4** — *Temps réel & synchronisation.* Pour le démarrage de partie vers un gameId, le produit documente les préconditions et postconditions attendues.
- **BJN.06.5** — *Sécurité, rôles & conformité.* Pour la recherche searchUsers avec terme, le produit maintient la compatibilité mobile et navigateur.
- **BJN.06.6** — *Erreurs, limites & dégradation.* Pour le multi blackjack seat claim atomic, le produit documente les préconditions et postconditions attendues.
- **BJN.06.7** — *Exploitation & évolutivité.* Pour le disconnect socket leave room, le produit applique les règles de remboursement de prêt actif.
- **BJN.06.8** — *Objectif & périmètre.* Pour le language switcher component, le produit expose des erreurs métier stables pour i18n et support.
- **BJN.06.9** — *Entrées & contrats (API / UI).* Pour le tournament service static io, le produit s’appuie sur la validation serveur comme source de vérité.
- **BJN.06.10** — *État, persistance & intégrité.* Pour le logout blacklist token id, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BJN.06.11** — *Temps réel & synchronisation.* Pour le profil utilisateur et l’édition, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **BJN.06.12** — *Sécurité, rôles & conformité.* Pour les blinds et le bouton dealer, le produit journalise les transitions sensibles pour audit.

## Tournois
_Balise `TRN` — logique fonctionnelle, sans code source._

### TRN.01 — Création
- **TRN.01.1** — *Objectif & périmètre.* Pour le leaderboard self rank highlight, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.01.2** — *Entrées & contrats (API / UI).* Pour le cron tournament progression, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.01.3** — *État, persistance & intégrité.* Pour le hidden bet history query by user, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.01.4** — *Temps réel & synchronisation.* Pour les messages privés entre amis, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **TRN.01.5** — *Sécurité, rôles & conformité.* Pour les invitations socket room blackjack, le produit propage l’état via Socket.IO de façon agrégée.
- **TRN.01.6** — *Erreurs, limites & dégradation.* Pour le waiting room create POST, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TRN.01.7** — *Exploitation & évolutivité.* Pour le provider TableThemeProvider, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.01.8** — *Objectif & périmètre.* Pour les niveaux XP seuils, le produit isole les données par utilisateur et par partie.
- **TRN.01.9** — *Entrées & contrats (API / UI).* Pour le gestionnaire d’erreurs HTTP global Express, le produit limite les abus par quotas, plafonds ou fréquence.
- **TRN.01.10** — *État, persistance & intégrité.* Pour le join game error banned si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **TRN.01.11** — *Temps réel & synchronisation.* Pour le wallet insufficient funds message, le produit maintient la compatibilité mobile et navigateur.
- **TRN.01.12** — *Sécurité, rôles & conformité.* Pour le blackjack bet limits table, le produit refuse les actions si le rôle ne correspond pas au contexte.

### TRN.02 — Join/leave
- **TRN.02.1** — *Objectif & périmètre.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit isole les données par utilisateur et par partie.
- **TRN.02.2** — *Entrées & contrats (API / UI).* Pour le reset token single use, le produit propage l’état via Socket.IO de façon agrégée.
- **TRN.02.3** — *État, persistance & intégrité.* Pour le tournament trophy asset display, le produit limite les abus par quotas, plafonds ou fréquence.
- **TRN.02.4** — *Temps réel & synchronisation.* Pour le claim reward challenge, le produit permet l’observabilité (latence, codes, corrélation).
- **TRN.02.5** — *Sécurité, rôles & conformité.* Pour le slot loan repayment order, le produit maintient la compatibilité mobile et navigateur.
- **TRN.02.6** — *Erreurs, limites & dégradation.* Pour la cotation et le placement de tickets, le produit reste désactivable ou restreint en production si sensible.
- **TRN.02.7** — *Exploitation & évolutivité.* Pour le qr code room invite si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **TRN.02.8** — *Objectif & périmètre.* Pour le tournament medal display top3, le produit limite les abus par quotas, plafonds ou fréquence.
- **TRN.02.9** — *Entrées & contrats (API / UI).* Pour le TournamentTeleporter dans App, le produit s’appuie sur la validation serveur comme source de vérité.
- **TRN.02.10** — *État, persistance & intégrité.* Pour les healthchecks live / ready et dépendances, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.02.11** — *Temps réel & synchronisation.* Pour le tournament result delay 12s, le produit expose des erreurs métier stables pour i18n et support.
- **TRN.02.12** — *Sécurité, rôles & conformité.* Pour le socket rejoin après refresh page, le produit permet l’observabilité (latence, codes, corrélation).

### TRN.03 — Start
- **TRN.03.1** — *Objectif & périmètre.* Pour le microservice Python pour décisions expert bot, le produit documente les préconditions et postconditions attendues.
- **TRN.03.2** — *Entrées & contrats (API / UI).* Pour le timeout per route override, le produit expose des erreurs métier stables pour i18n et support.
- **TRN.03.3** — *État, persistance & intégrité.* Pour le trust proxy et CORS allowlist, le produit maintient la compatibilité mobile et navigateur.
- **TRN.03.4** — *Temps réel & synchronisation.* Pour le multi blackjack seat claim atomic, le produit expose des erreurs métier stables pour i18n et support.
- **TRN.03.5** — *Sécurité, rôles & conformité.* Pour la progression challenge stockée DB, le produit limite les abus par quotas, plafonds ou fréquence.
- **TRN.03.6** — *Erreurs, limites & dégradation.* Pour le clipboard copy room code, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TRN.03.7** — *Exploitation & évolutivité.* Pour le capacitor status bar style si mobile, le produit expose des erreurs métier stables pour i18n et support.
- **TRN.03.8** — *Objectif & périmètre.* Pour le pre_hand market quotes, le produit vérifie les montants et soldes avant persistance.
- **TRN.03.9** — *Entrées & contrats (API / UI).* Pour le waiting room list GET, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.03.10** — *État, persistance & intégrité.* Pour le client socket auth object, le produit isole les données par utilisateur et par partie.
- **TRN.03.11** — *Temps réel & synchronisation.* Pour le note player tag si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TRN.03.12** — *Sécurité, rôles & conformité.* Pour le raise slider max stack bound, le produit distingue erreurs réseau, auth et serveur côté client.

### TRN.04 — Buy-in wallet
- **TRN.04.1** — *Objectif & périmètre.* Pour le message friend realtime poll or socket si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **TRN.04.2** — *Entrées & contrats (API / UI).* Pour le degraded redis fallback memory, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **TRN.04.3** — *État, persistance & intégrité.* Pour la table poker temps réel (Game), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.04.4** — *Temps réel & synchronisation.* Pour le rate limit metric counter si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.04.5** — *Sécurité, rôles & conformité.* Pour les métriques Prometheus et endpoint /metrics, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TRN.04.6** — *Erreurs, limites & dégradation.* Pour le game socket join after HTTP start, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.04.7** — *Exploitation & évolutivité.* Pour les Webhooks ou jobs async optionnels, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.04.8** — *Objectif & périmètre.* Pour le blackjack lobby room id param, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TRN.04.9** — *Entrées & contrats (API / UI).* Pour le 2FA enable verify steps, le produit expose des erreurs métier stables pour i18n et support.
- **TRN.04.10** — *État, persistance & intégrité.* Pour le skipSuccessfulRequests sur rate limit global, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.04.11** — *Temps réel & synchronisation.* Pour les défis quotidiens et la réclamation de récompense, le produit journalise les transitions sensibles pour audit.
- **TRN.04.12** — *Sécurité, rôles & conformité.* Pour le protected redirect login if no token, le produit s’appuie sur la validation serveur comme source de vérité.

### TRN.05 — Cron serveur
- **TRN.05.1** — *Objectif & périmètre.* Pour le call amount computed server, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **TRN.05.2** — *Entrées & contrats (API / UI).* Pour la table poker temps réel (Game), le produit respecte l’idempotence ou les clés d’unicité métier.
- **TRN.05.3** — *État, persistance & intégrité.* Pour le straddle optional toggle room config, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TRN.05.4** — *Temps réel & synchronisation.* Pour GameExample (démo / test intégration), le produit applique les règles de remboursement de prêt actif.
- **TRN.05.5** — *Sécurité, rôles & conformité.* Pour le leave_game cleanup seat, le produit permet l’observabilité (latence, codes, corrélation).
- **TRN.05.6** — *Erreurs, limites & dégradation.* Pour le game gateway constructor side effects, le produit propage l’état via Socket.IO de façon agrégée.
- **TRN.05.7** — *Exploitation & évolutivité.* Pour l’écran d’accueil (StartScreen), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.05.8** — *Objectif & périmètre.* Pour la recherche searchUsers avec terme, le produit propage l’état via Socket.IO de façon agrégée.
- **TRN.05.9** — *Entrées & contrats (API / UI).* Pour le 2FA backup codes si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TRN.05.10** — *État, persistance & intégrité.* Pour le flux Auth / Register / Login, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.05.11** — *Temps réel & synchronisation.* Pour le edit profile validation email unique, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.05.12** — *Sécurité, rôles & conformité.* Pour la réinitialisation de mot de passe par jeton, le produit vérifie les montants et soldes avant persistance.

### TRN.06 — Broadcast état
- **TRN.06.1** — *Objectif & périmètre.* Pour le roulette result authoritative number, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.06.2** — *Entrées & contrats (API / UI).* Pour le moteur de distribution et d’enchères, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TRN.06.3** — *État, persistance & intégrité.* Pour le flux register → lobby, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TRN.06.4** — *Temps réel & synchronisation.* Pour le accept friend loan crédit, le produit s’appuie sur la validation serveur comme source de vérité.
- **TRN.06.5** — *Sécurité, rôles & conformité.* Pour le player action log structured, le produit vérifie les montants et soldes avant persistance.
- **TRN.06.6** — *Erreurs, limites & dégradation.* Les erreurs Prisma de contrainte unique sont traduites en conflit utilisateur (pseudo pris, etc.).
- **TRN.06.7** — *Exploitation & évolutivité.* Pour le color blind mode tritanopia, le produit documente les préconditions et postconditions attendues.
- **TRN.06.8** — *Objectif & périmètre.* Pour le tournament trophy asset display, le produit maintient la compatibilité mobile et navigateur.
- **TRN.06.9** — *Entrées & contrats (API / UI).* Pour la déconnexion socket si token invalide, le produit isole les données par utilisateur et par partie.
- **TRN.06.10** — *État, persistance & intégrité.* Pour le message friend realtime poll or socket si prévu, le produit minimise la fuite d’information entre rôles.
- **TRN.06.11** — *Temps réel & synchronisation.* Pour l’historique des mains practice, le produit applique les règles de remboursement de prêt actif.
- **TRN.06.12** — *Sécurité, rôles & conformité.* Pour le admin redirect if not admin jwt, le produit respecte l’idempotence ou les clés d’unicité métier.

## Amis & social
_Balise `FRD` — logique fonctionnelle, sans code source._

### FRD.01 — Demandes ami
- **FRD.01.1** — *Objectif & périmètre.* Pour le max players waiting room, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.01.2** — *Entrées & contrats (API / UI).* Pour le join game error room full, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **FRD.01.3** — *État, persistance & intégrité.* Pour le chat de table, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **FRD.01.4** — *Temps réel & synchronisation.* Pour le min buy cash table, le produit permet l’observabilité (latence, codes, corrélation).
- **FRD.01.5** — *Sécurité, rôles & conformité.* Pour le level up notification, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.01.6** — *Erreurs, limites & dégradation.* Pour le game state sanitization avant emit, le produit permet l’observabilité (latence, codes, corrélation).
- **FRD.01.7** — *Exploitation & évolutivité.* Pour le hook useUser et synchronisation token, le produit distingue erreurs réseau, auth et serveur côté client.
- **FRD.01.8** — *Objectif & périmètre.* Pour le previous hand history sidebar si prévu, le produit propage l’état via Socket.IO de façon agrégée.
- **FRD.01.9** — *Entrées & contrats (API / UI).* Pour le 2FA enable verify steps, le produit respecte l’idempotence ou les clés d’unicité métier.
- **FRD.01.10** — *État, persistance & intégrité.* Pour les réponses 403 / 401 uniformisées, le produit s’appuie sur la validation serveur comme source de vérité.
- **FRD.01.11** — *Temps réel & synchronisation.* Pour le hidden bets result route params, le produit journalise les transitions sensibles pour audit.
- **FRD.01.12** — *Sécurité, rôles & conformité.* Pour le duplicate action reject same round, le produit minimise la fuite d’information entre rôles.

### FRD.02 — Acceptation/refus
- **FRD.02.1** — *Objectif & périmètre.* Pour l’écran d’accueil (StartScreen), le produit minimise la fuite d’information entre rôles.
- **FRD.02.2** — *Entrées & contrats (API / UI).* Pour le profil utilisateur et l’édition, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.02.3** — *État, persistance & intégrité.* Pour les streets préflop à river, le produit isole les données par utilisateur et par partie.
- **FRD.02.4** — *Temps réel & synchronisation.* Pour le xp anti farm cooldown server, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FRD.02.5** — *Sécurité, rôles & conformité.* Pour le hand strength display optional client only, le produit documente les préconditions et postconditions attendues.
- **FRD.02.6** — *Erreurs, limites & dégradation.* Pour le basename Capacitor vs web, le produit journalise les transitions sensibles pour audit.
- **FRD.02.7** — *Exploitation & évolutivité.* Pour le live check always true, le produit journalise les transitions sensibles pour audit.
- **FRD.02.8** — *Objectif & périmètre.* Pour le socket auth handshake token, le produit vérifie les montants et soldes avant persistance.
- **FRD.02.9** — *Entrées & contrats (API / UI).* Pour les classes CSS racine accessibilité, le produit respecte l’idempotence ou les clés d’unicité métier.
- **FRD.02.10** — *État, persistance & intégrité.* Pour le calcul rang personnel leaderboard, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.02.11** — *Temps réel & synchronisation.* Pour le tournament satellite ticket si supporté, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.02.12** — *Sécurité, rôles & conformité.* Pour la récupération blackjack au boot serveur, le produit respecte l’idempotence ou les clés d’unicité métier.

### FRD.03 — Recherche joueurs
- **FRD.03.1** — *Objectif & périmètre.* Pour les prêts entre amis (demande, taux, acceptation), le produit propage l’état via Socket.IO de façon agrégée.
- **FRD.03.2** — *Entrées & contrats (API / UI).* Pour le token expiry refresh flow si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **FRD.03.3** — *État, persistance & intégrité.* Pour les invitations socket room blackjack, le produit journalise les transitions sensibles pour audit.
- **FRD.03.4** — *Temps réel & synchronisation.* Pour le thème de table (felt / couleurs), le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **FRD.03.5** — *Sécurité, rôles & conformité.* Pour le tutorial lobby page dédiée, le produit permet l’observabilité (latence, codes, corrélation).
- **FRD.03.6** — *Erreurs, limites & dégradation.* Pour le service tournoi et broadcasts Socket.IO, le produit s’appuie sur la validation serveur comme source de vérité.
- **FRD.03.7** — *Exploitation & évolutivité.* Pour le error toast network french copy, le produit applique les règles de remboursement de prêt actif.
- **FRD.03.8** — *Objectif & périmètre.* Pour l’en-tête x-idempotency-key sur les mutations, le produit s’appuie sur la validation serveur comme source de vérité.
- **FRD.03.9** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit documente les préconditions et postconditions attendues.
- **FRD.03.10** — *État, persistance & intégrité.* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit minimise la fuite d’information entre rôles.
- **FRD.03.11** — *Temps réel & synchronisation.* Pour le badge unlock notification, le produit minimise la fuite d’information entre rôles.
- **FRD.03.12** — *Sécurité, rôles & conformité.* Pour les limites express.json pour payloads, le produit expose des erreurs métier stables pour i18n et support.

### FRD.04 — Présence socket
- **FRD.04.1** — *Objectif & périmètre.* Pour le wallet history append only, le produit distingue erreurs réseau, auth et serveur côté client.
- **FRD.04.2** — *Entrées & contrats (API / UI).* Pour le microservice Python pour décisions expert bot, le produit reste désactivable ou restreint en production si sensible.
- **FRD.04.3** — *État, persistance & intégrité.* Pour le leave table forfeit uncalled si règles, le produit minimise la fuite d’information entre rôles.
- **FRD.04.4** — *Temps réel & synchronisation.* Pour le tournament min players start check, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **FRD.04.5** — *Sécurité, rôles & conformité.* Pour les mises à jour applicatives (route updates), le produit distingue erreurs réseau, auth et serveur côté client.
- **FRD.04.6** — *Erreurs, limites & dégradation.* Pour le live check always true, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FRD.04.7** — *Exploitation & évolutivité.* Pour la page Leaderboard filtrable, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **FRD.04.8** — *Objectif & périmètre.* Pour le xp grant failure tolerance, le produit respecte l’idempotence ou les clés d’unicité métier.
- **FRD.04.9** — *Entrées & contrats (API / UI).* Pour le model inference timeout, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FRD.04.10** — *État, persistance & intégrité.* Pour le host kick si implémenté, le produit documente les préconditions et postconditions attendues.
- **FRD.04.11** — *Temps réel & synchronisation.* Pour le leaderboard anti cheat stats validation, le produit minimise la fuite d’information entre rôles.
- **FRD.04.12** — *Sécurité, rôles & conformité.* Pour le leaderboard anti cheat stats validation, le produit gère la concurrence par transactions courtes ou verrous logiques.

### FRD.05 — Invitations parties
- **FRD.05.1** — *Objectif & périmètre.* Pour le last action log poker UI, le produit isole les données par utilisateur et par partie.
- **FRD.05.2** — *Entrées & contrats (API / UI).* Pour le cors preflight OPTIONS 200, le produit maintient la compatibilité mobile et navigateur.
- **FRD.05.3** — *État, persistance & intégrité.* Pour le expert bot python grpc or http si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FRD.05.4** — *Temps réel & synchronisation.* Pour le gamification cap bet by level, le produit documente les préconditions et postconditions attendues.
- **FRD.05.5** — *Sécurité, rôles & conformité.* Pour le tournament service static io, le produit maintient la compatibilité mobile et navigateur.
- **FRD.05.6** — *Erreurs, limites & dégradation.* Pour le join game error room full, le produit isole les données par utilisateur et par partie.
- **FRD.05.7** — *Exploitation & évolutivité.* Pour le thème de table (felt / couleurs), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **FRD.05.8** — *Objectif & périmètre.* Pour les toasts tournament-countdown, le produit reste désactivable ou restreint en production si sensible.
- **FRD.05.9** — *Entrées & contrats (API / UI).* Pour les signalements joueur, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FRD.05.10** — *État, persistance & intégrité.* Pour l’AdminAuth isolé de l’auth joueur, le produit propage l’état via Socket.IO de façon agrégée.
- **FRD.05.11** — *Temps réel & synchronisation.* Pour le tournament cancelled refund policy, le produit permet l’observabilité (latence, codes, corrélation).
- **FRD.05.12** — *Sécurité, rôles & conformité.* Pour les avis / notes post-partie, le produit assure la cohérence wallet ↔ table ↔ tournoi.

## Prêts entre amis
_Balise `LOAN` — logique fonctionnelle, sans code source._

### LOAN.01 — Création demande
- **LOAN.01.1** — *Objectif & périmètre.* Pour le retry réseau avec backoff sur erreurs transitoires, le produit vérifie les montants et soldes avant persistance.
- **LOAN.01.2** — *Entrées & contrats (API / UI).* Pour le success toast friend accepted, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.01.3** — *État, persistance & intégrité.* Pour le tournament leave before start refund, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.01.4** — *Temps réel & synchronisation.* Pour les routes /api/hidden-bets avec rate limit dédié, le produit vérifie les montants et soldes avant persistance.
- **LOAN.01.5** — *Sécurité, rôles & conformité.* Pour le practice bot expert wallet policy, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.01.6** — *Erreurs, limites & dégradation.* Pour le prisma transaction interactive poker cash, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.01.7** — *Exploitation & évolutivité.* Pour le ledger casino atomique, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOAN.01.8** — *Objectif & périmètre.* Pour les friend messages pagination, le produit vérifie les montants et soldes avant persistance.
- **LOAN.01.9** — *Entrées & contrats (API / UI).* Pour le game page key pathname search reset, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOAN.01.10** — *État, persistance & intégrité.* Pour le emoji reaction chat si prévu, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.01.11** — *Temps réel & synchronisation.* Pour le locale date formatting leaderboard, le produit minimise la fuite d’information entre rôles.
- **LOAN.01.12** — *Sécurité, rôles & conformité.* Pour le http 500 show stack dev, le produit maintient la compatibilité mobile et navigateur.

### LOAN.02 — Taux autorisés
- **LOAN.02.1** — *Objectif & périmètre.* Pour le edit profile change password current required, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOAN.02.2** — *Entrées & contrats (API / UI).* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit expose des erreurs métier stables pour i18n et support.
- **LOAN.02.3** — *État, persistance & intégrité.* Pour le loan banner active on casino pages, le produit reste désactivable ou restreint en production si sensible.
- **LOAN.02.4** — *Temps réel & synchronisation.* Pour le waiting room ready toggle, le produit expose des erreurs métier stables pour i18n et support.
- **LOAN.02.5** — *Sécurité, rôles & conformité.* Pour la recherche de joueurs, le produit applique les règles de remboursement de prêt actif.
- **LOAN.02.6** — *Erreurs, limites & dégradation.* Pour les routes /api/leaderboard, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.02.7** — *Exploitation & évolutivité.* Pour le logging confidence IA, le produit vérifie les montants et soldes avant persistance.
- **LOAN.02.8** — *Objectif & périmètre.* Pour le thème de table (felt / couleurs), le produit applique les règles de remboursement de prêt actif.
- **LOAN.02.9** — *Entrées & contrats (API / UI).* Pour la route racine updatesRouter, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.02.10** — *État, persistance & intégrité.* Pour le remboursement automatique sur gains casino, le produit distingue erreurs réseau, auth et serveur côté client.
- **LOAN.02.11** — *Temps réel & synchronisation.* Pour le multi blackjack seat claim atomic, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOAN.02.12** — *Sécurité, rôles & conformité.* Pour le practice difficulty query param, le produit expose des erreurs métier stables pour i18n et support.

### LOAN.03 — Accept/refus/cancel
- **LOAN.03.1** — *Objectif & périmètre.* Pour l’avatar (fichier ou URL) et quotas taille, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.03.2** — *Entrées & contrats (API / UI).* Pour les erreurs Prisma mappées en conflits utilisateur, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOAN.03.3** — *État, persistance & intégrité.* Pour le serveur HTTP + Socket.IO partagé, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOAN.03.4** — *Temps réel & synchronisation.* Pour le loan paid off celebration si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.03.5** — *Sécurité, rôles & conformité.* Pour GameDeal et flux de distribution démo, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOAN.03.6** — *Erreurs, limites & dégradation.* Pour le hidden bet live window timing, le produit journalise les transitions sensibles pour audit.
- **LOAN.03.7** — *Exploitation & évolutivité.* Pour les réponses 403 / 401 uniformisées, le produit isole les données par utilisateur et par partie.
- **LOAN.03.8** — *Objectif & périmètre.* Pour le blackjack table gameId param, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.03.9** — *Entrées & contrats (API / UI).* Pour le hidden bet live window timing, le produit documente les préconditions et postconditions attendues.
- **LOAN.03.10** — *État, persistance & intégrité.* Pour la persistance difficulté bot en session, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.03.11** — *Temps réel & synchronisation.* Pour le leave friend loan cancel, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOAN.03.12** — *Sécurité, rôles & conformité.* Pour les loans actifs vs historiques, le produit documente les préconditions et postconditions attendues.

### LOAN.04 — Notifications socket
- **LOAN.04.1** — *Objectif & périmètre.* Pour les player reports motifs, le produit s’appuie sur la validation serveur comme source de vérité.
- **LOAN.04.2** — *Entrées & contrats (API / UI).* Pour le edit profile validation email unique, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.04.3** — *État, persistance & intégrité.* Pour le error boundary reset state, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.04.4** — *Temps réel & synchronisation.* Pour GameDeal et flux de distribution démo, le produit vérifie les montants et soldes avant persistance.
- **LOAN.04.5** — *Sécurité, rôles & conformité.* Pour le socket error ack client toast, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.04.6** — *Erreurs, limites & dégradation.* Pour le capacitor status bar style si mobile, le produit expose des erreurs métier stables pour i18n et support.
- **LOAN.04.7** — *Exploitation & évolutivité.* Pour le cron tournament progression, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.04.8** — *Objectif & périmètre.* Pour les routes /api/blackjack-tables, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOAN.04.9** — *Entrées & contrats (API / UI).* Pour le avatar image/jpeg size cap, le produit maintient la compatibilité mobile et navigateur.
- **LOAN.04.10** — *État, persistance & intégrité.* Pour les défis quotidiens et la réclamation de récompense, le produit journalise les transitions sensibles pour audit.
- **LOAN.04.11** — *Temps réel & synchronisation.* Pour le slot loan repayment order, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **LOAN.04.12** — *Sécurité, rôles & conformité.* Pour le game state sanitization avant emit, le produit limite les abus par quotas, plafonds ou fréquence.

### LOAN.05 — Remboursement auto sur gains casino
- **LOAN.05.1** — *Objectif & périmètre.* Pour le composant GameWithKey (reset état route), le produit expose des erreurs métier stables pour i18n et support.
- **LOAN.05.2** — *Entrées & contrats (API / UI).* Pour le recovery service blackjack tables, le produit journalise les transitions sensibles pour audit.
- **LOAN.05.3** — *État, persistance & intégrité.* Pour les réponses 403 / 401 uniformisées, le produit vérifie les montants et soldes avant persistance.
- **LOAN.05.4** — *Temps réel & synchronisation.* Pour les catégories victoires vs jetons vs XP, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.05.5** — *Sécurité, rôles & conformité.* Pour le error boundary reset state, le produit minimise la fuite d’information entre rôles.
- **LOAN.05.6** — *Erreurs, limites & dégradation.* Pour le runout cartes après all-in, le produit applique les règles de remboursement de prêt actif.
- **LOAN.05.7** — *Exploitation & évolutivité.* Pour le hub mini-jeux (roulette, slot, blackjack), le produit reste désactivable ou restreint en production si sensible.
- **LOAN.05.8** — *Objectif & périmètre.* Pour la récupération blackjack au boot serveur, le produit documente les préconditions et postconditions attendues.
- **LOAN.05.9** — *Entrées & contrats (API / UI).* Pour le street advance server event broadcast, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LOAN.05.10** — *État, persistance & intégrité.* Pour les invitation party poker, le produit propage l’état via Socket.IO de façon agrégée.
- **LOAN.05.11** — *Temps réel & synchronisation.* Pour le game gateway constructor side effects, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LOAN.05.12** — *Sécurité, rôles & conformité.* Pour le player turn highlight UI, le produit vérifie les montants et soldes avant persistance.

### LOAN.06 — Ledger prêt
- **LOAN.06.1** — *Objectif & périmètre.* Pour le http 500 show stack dev, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LOAN.06.2** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit isole les données par utilisateur et par partie.
- **LOAN.06.3** — *État, persistance & intégrité.* Pour les signalements joueur, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LOAN.06.4** — *Temps réel & synchronisation.* Pour la recherche de joueurs, le produit documente les préconditions et postconditions attendues.
- **LOAN.06.5** — *Sécurité, rôles & conformité.* Pour le disconnect grace period joueur, le produit limite les abus par quotas, plafonds ou fréquence.
- **LOAN.06.6** — *Erreurs, limites & dégradation.* Pour les stats agrégées roulette, le produit permet l’observabilité (latence, codes, corrélation).
- **LOAN.06.7** — *Exploitation & évolutivité.* Pour les mises à jour applicatives (route updates), le produit vérifie les montants et soldes avant persistance.
- **LOAN.06.8** — *Objectif & périmètre.* Pour la page HiddenBetsResult, le produit permet l’observabilité (latence, codes, corrélation).
- **LOAN.06.9** — *Entrées & contrats (API / UI).* Pour le TournamentTeleporter dans App, le produit isole les données par utilisateur et par partie.
- **LOAN.06.10** — *État, persistance & intégrité.* Pour le socket rejoin après refresh page, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LOAN.06.11** — *Temps réel & synchronisation.* Pour le TournamentTeleporter dans App, le produit documente les préconditions et postconditions attendues.
- **LOAN.06.12** — *Sécurité, rôles & conformité.* Pour le practice create bot game HTTP, le produit distingue erreurs réseau, auth et serveur côté client.

## Leaderboard
_Balise `LDB` — logique fonctionnelle, sans code source._

### LDB.01 — Catégories XP/jetons/victoires
- **LDB.01.1** — *Objectif & périmètre.* Pour l’upload avatar mutation séparée, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.01.2** — *Entrées & contrats (API / UI).* Pour le avatar image/jpeg size cap, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.01.3** — *État, persistance & intégrité.* Pour l’upload avatar mutation séparée, le produit vérifie les montants et soldes avant persistance.
- **LDB.01.4** — *Temps réel & synchronisation.* Pour le game gateway constructor side effects, le produit limite les abus par quotas, plafonds ou fréquence.
- **LDB.01.5** — *Sécurité, rôles & conformité.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit maintient la compatibilité mobile et navigateur.
- **LDB.01.6** — *Erreurs, limites & dégradation.* Pour le blackjack hit stand double split si supporté, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.01.7** — *Exploitation & évolutivité.* Pour le sound effects mute accessibility tie in si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LDB.01.8** — *Objectif & périmètre.* Pour le tournament elimination zero chips, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.01.9** — *Entrées & contrats (API / UI).* Pour le wallet history append only, le produit vérifie les montants et soldes avant persistance.
- **LDB.01.10** — *État, persistance & intégrité.* Pour le game socket join after HTTP start, le produit reste désactivable ou restreint en production si sensible.
- **LDB.01.11** — *Temps réel & synchronisation.* Pour la room blackjack multi et les sièges, le produit applique les règles de remboursement de prêt actif.
- **LDB.01.12** — *Sécurité, rôles & conformité.* Pour le root quantum bluff api message, le produit minimise la fuite d’information entre rôles.

### LDB.02 — Tri SQL
- **LDB.02.1** — *Objectif & périmètre.* Pour le stockage token localStorage, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.02.2** — *Entrées & contrats (API / UI).* Pour le practice bot non-expert jetons virtuels, le produit applique les règles de remboursement de prêt actif.
- **LDB.02.3** — *État, persistance & intégrité.* Pour les prêts entre amis (demande, taux, acceptation), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **LDB.02.4** — *Temps réel & synchronisation.* Pour le multi blackjack leave mid hand rules, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.02.5** — *Sécurité, rôles & conformité.* Pour le rematch same players flag, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LDB.02.6** — *Erreurs, limites & dégradation.* Pour les signalements joueur, le produit vérifie les montants et soldes avant persistance.
- **LDB.02.7** — *Exploitation & évolutivité.* Pour le hidden bets result route params, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.02.8** — *Objectif & périmètre.* Pour le microservice Python pour décisions expert bot, le produit documente les préconditions et postconditions attendues.
- **LDB.02.9** — *Entrées & contrats (API / UI).* Pour le http access log middleware, le produit distingue erreurs réseau, auth et serveur côté client.
- **LDB.02.10** — *État, persistance & intégrité.* Pour la pagination et filtres leaderboard, le produit limite les abus par quotas, plafonds ou fréquence.
- **LDB.02.11** — *Temps réel & synchronisation.* Pour le practice bot expert wallet policy, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LDB.02.12** — *Sécurité, rôles & conformité.* Pour le sync XP post-mini-jeu, le produit respecte l’idempotence ou les clés d’unicité métier.

### LDB.03 — Pagination
- **LDB.03.1** — *Objectif & périmètre.* Pour le friend request duplicate prevention, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.03.2** — *Entrées & contrats (API / UI).* Pour la vérification d’email avant inscription, le produit applique les règles de remboursement de prêt actif.
- **LDB.03.3** — *État, persistance & intégrité.* Pour les routes /api/blackjack-tables, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.03.4** — *Temps réel & synchronisation.* Pour les routes /api/waiting-room, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.03.5** — *Sécurité, rôles & conformité.* Pour le feedback thank you acknowledgment, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.03.6** — *Erreurs, limites & dégradation.* Pour le http access log middleware, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **LDB.03.7** — *Exploitation & évolutivité.* Pour le web share api invite link si prévu, le produit vérifie les montants et soldes avant persistance.
- **LDB.03.8** — *Objectif & périmètre.* Pour les routes /api/leaderboard, le produit journalise les transitions sensibles pour audit.
- **LDB.03.9** — *Entrées & contrats (API / UI).* Pour le wallet et l’historique des mouvements, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.03.10** — *État, persistance & intégrité.* Pour le process exit boot failure, le produit isole les données par utilisateur et par partie.
- **LDB.03.11** — *Temps réel & synchronisation.* Pour le all in call auto partial amount, le produit s’appuie sur la validation serveur comme source de vérité.
- **LDB.03.12** — *Sécurité, rôles & conformité.* Pour le JSON body limit (avatars data URL), le produit permet l’observabilité (latence, codes, corrélation).

### LDB.04 — Rang personnel avec bearer
- **LDB.04.1** — *Objectif & périmètre.* Pour le profile stats wins losses hands, le produit respecte l’idempotence ou les clés d’unicité métier.
- **LDB.04.2** — *Entrées & contrats (API / UI).* Pour les avis / notes post-partie, le produit documente les préconditions et postconditions attendues.
- **LDB.04.3** — *État, persistance & intégrité.* Pour les invitations à une table blackjack, le produit applique les règles de remboursement de prêt actif.
- **LDB.04.4** — *Temps réel & synchronisation.* Pour l’acceptation de liens d’invitation, le produit journalise les transitions sensibles pour audit.
- **LDB.04.5** — *Sécurité, rôles & conformité.* Pour le warning toast tournament soon, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.04.6** — *Erreurs, limites & dégradation.* Pour le expert bot python grpc or http si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.04.7** — *Exploitation & évolutivité.* Pour le tournament service static io, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.04.8** — *Objectif & périmètre.* Pour le capacitor splash screen si mobile, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **LDB.04.9** — *Entrées & contrats (API / UI).* Pour les loans actifs vs historiques, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **LDB.04.10** — *État, persistance & intégrité.* Pour les signalements joueur, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.04.11** — *Temps réel & synchronisation.* Pour le cron tournament progression, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.04.12** — *Sécurité, rôles & conformité.* Pour le error boundary reset state, le produit expose des erreurs métier stables pour i18n et support.

### LDB.05 — Tie-break username
- **LDB.05.1** — *Objectif & périmètre.* Pour le http 500 show stack dev, le produit maintient la compatibilité mobile et navigateur.
- **LDB.05.2** — *Entrées & contrats (API / UI).* Pour les notifications prêt accepté/refusé, le produit vérifie les montants et soldes avant persistance.
- **LDB.05.3** — *État, persistance & intégrité.* Pour le feedback thank you acknowledgment, le produit limite les abus par quotas, plafonds ou fréquence.
- **LDB.05.4** — *Temps réel & synchronisation.* Pour le fallback reason code IA, le produit vérifie les montants et soldes avant persistance.
- **LDB.05.5** — *Sécurité, rôles & conformité.* Pour le provider AccessibilityMenuOpenContext, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.05.6** — *Erreurs, limites & dégradation.* Pour les messages privés entre amis, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.05.7** — *Exploitation & évolutivité.* Pour la documentation Swagger /api-docs, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.05.8** — *Objectif & périmètre.* Pour le feedback route séparée reports, le produit s’appuie sur la validation serveur comme source de vérité.
- **LDB.05.9** — *Entrées & contrats (API / UI).* Pour le note player tag si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **LDB.05.10** — *État, persistance & intégrité.* Pour la configuration des bots avant practice, le produit expose des erreurs métier stables pour i18n et support.
- **LDB.05.11** — *Temps réel & synchronisation.* Pour le recovery question list server, le produit vérifie les montants et soldes avant persistance.
- **LDB.05.12** — *Sécurité, rôles & conformité.* Pour le note player tag si prévu, le produit minimise la fuite d’information entre rôles.

## Profil
_Balise `PROF` — logique fonctionnelle, sans code source._

### PROF.01 — Lecture agrégée
- **PROF.01.1** — *Objectif & périmètre.* Pour le edit profile change password current required, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **PROF.01.2** — *Entrées & contrats (API / UI).* Pour la progression challenge stockée DB, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **PROF.01.3** — *État, persistance & intégrité.* Pour la gamification (niveaux, badges, plafonds de mise), le produit propage l’état via Socket.IO de façon agrégée.
- **PROF.01.4** — *Temps réel & synchronisation.* Pour le patch profil email/username/password, le produit vérifie les montants et soldes avant persistance.
- **PROF.01.5** — *Sécurité, rôles & conformité.* Pour le game gateway constructor side effects, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.01.6** — *Erreurs, limites & dégradation.* Pour le helmet frame ancestors self, le produit vérifie les montants et soldes avant persistance.
- **PROF.01.7** — *Exploitation & évolutivité.* Pour le invitation accept deep link route, le produit journalise les transitions sensibles pour audit.
- **PROF.01.8** — *Objectif & périmètre.* Pour les prêts entre amis (demande, taux, acceptation), le produit minimise la fuite d’information entre rôles.
- **PROF.01.9** — *Entrées & contrats (API / UI).* Pour le profil utilisateur et l’édition, le produit respecte l’idempotence ou les clés d’unicité métier.
- **PROF.01.10** — *État, persistance & intégrité.* Pour le waiting room join POST, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.01.11** — *Temps réel & synchronisation.* Pour les mises à jour applicatives (route updates), le produit journalise les transitions sensibles pour audit.
- **PROF.01.12** — *Sécurité, rôles & conformité.* Pour le microservice Python pour décisions expert bot, le produit documente les préconditions et postconditions attendues.

### PROF.02 — Édition contrôlée
- **PROF.02.1** — *Objectif & périmètre.* Pour la validation stricte des actions IA, le produit s’appuie sur la validation serveur comme source de vérité.
- **PROF.02.2** — *Entrées & contrats (API / UI).* Pour le nettoyage planifié (cleanup jobs), le produit applique les règles de remboursement de prêt actif.
- **PROF.02.3** — *État, persistance & intégrité.* Pour le hidden bet live window timing, le produit isole les données par utilisateur et par partie.
- **PROF.02.4** — *Temps réel & synchronisation.* Pour le join_game payload gameId, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **PROF.02.5** — *Sécurité, rôles & conformité.* Pour le logout blacklist token id, le produit journalise les transitions sensibles pour audit.
- **PROF.02.6** — *Erreurs, limites & dégradation.* Pour le pot display multi-devises jetons, le produit expose des erreurs métier stables pour i18n et support.
- **PROF.02.7** — *Exploitation & évolutivité.* Pour le profil utilisateur et l’édition, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **PROF.02.8** — *Objectif & périmètre.* Pour le nettoyage planifié (cleanup jobs), le produit documente les préconditions et postconditions attendues.
- **PROF.02.9** — *Entrées & contrats (API / UI).* Pour le join game error banned si prévu, le produit minimise la fuite d’information entre rôles.
- **PROF.02.10** — *État, persistance & intégrité.* Pour le loan list filter active, le produit isole les données par utilisateur et par partie.
- **PROF.02.11** — *Temps réel & synchronisation.* Pour le board burn card animation serveur logique, le produit vérifie les montants et soldes avant persistance.
- **PROF.02.12** — *Sécurité, rôles & conformité.* Pour le street advance server event broadcast, le produit vérifie les montants et soldes avant persistance.

### PROF.03 — Avatar binaire ou URL
- **PROF.03.1** — *Objectif & périmètre.* Pour le tournament service static io, le produit documente les préconditions et postconditions attendues.
- **PROF.03.2** — *Entrées & contrats (API / UI).* Pour le tournament rebuy addon si supporté tournoi, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.03.3** — *État, persistance & intégrité.* Pour le tournament navigate back lobby, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **PROF.03.4** — *Temps réel & synchronisation.* Pour le login rate limit auth routes, le produit applique les règles de remboursement de prêt actif.
- **PROF.03.5** — *Sécurité, rôles & conformité.* Pour le server socketAuth middleware order, le produit limite les abus par quotas, plafonds ou fréquence.
- **PROF.03.6** — *Erreurs, limites & dégradation.* Pour le login rate limit auth routes, le produit isole les données par utilisateur et par partie.
- **PROF.03.7** — *Exploitation & évolutivité.* Pour les tags RTK FriendLoan et invalidations croisées, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **PROF.03.8** — *Objectif & périmètre.* Pour le protected redirect login if no token, le produit documente les préconditions et postconditions attendues.
- **PROF.03.9** — *Entrées & contrats (API / UI).* Pour les routes /api/hidden-bets avec rate limit dédié, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.03.10** — *État, persistance & intégrité.* Pour la 2FA TOTP et les endpoints dédiés, le produit minimise la fuite d’information entre rôles.
- **PROF.03.11** — *Temps réel & synchronisation.* Pour le socket reconnect exponential backoff client, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.03.12** — *Sécurité, rôles & conformité.* Pour le mapping playerToGameId au start, le produit expose des erreurs métier stables pour i18n et support.

### PROF.04 — Badges liés gamification
- **PROF.04.1** — *Objectif & périmètre.* Pour le feedback thank you acknowledgment, le produit permet l’observabilité (latence, codes, corrélation).
- **PROF.04.2** — *Entrées & contrats (API / UI).* Pour le idempotency middleware scope, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **PROF.04.3** — *État, persistance & intégrité.* Pour le recovery question list server, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **PROF.04.4** — *Temps réel & synchronisation.* Pour le report category enum, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **PROF.04.5** — *Sécurité, rôles & conformité.* Pour la page Login / Register / Auth, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **PROF.04.6** — *Erreurs, limites & dégradation.* Pour les daily challenges reset journalier, le produit isole les données par utilisateur et par partie.
- **PROF.04.7** — *Exploitation & évolutivité.* Pour le destroy room cascade sockets, le produit vérifie les montants et soldes avant persistance.
- **PROF.04.8** — *Objectif & périmètre.* Pour la liste d’amis et les demandes, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **PROF.04.9** — *Entrées & contrats (API / UI).* Pour l’avatar (fichier ou URL) et quotas taille, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **PROF.04.10** — *État, persistance & intégrité.* Pour le admin redirect if not admin jwt, le produit distingue erreurs réseau, auth et serveur côté client.
- **PROF.04.11** — *Temps réel & synchronisation.* Pour la séparation practice / cash / casino / tournoi, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **PROF.04.12** — *Sécurité, rôles & conformité.* Pour le xp anti farm cooldown server, le produit reste désactivable ou restreint en production si sensible.

## Défis quotidiens
_Balise `DCH` — logique fonctionnelle, sans code source._

### DCH.01 — Progression
- **DCH.01.1** — *Objectif & périmètre.* Pour les loans actifs vs historiques, le produit journalise les transitions sensibles pour audit.
- **DCH.01.2** — *Entrées & contrats (API / UI).* Pour le tournament clock server synced si prévu, le produit isole les données par utilisateur et par partie.
- **DCH.01.3** — *État, persistance & intégrité.* Pour le game page key pathname search reset, le produit permet l’observabilité (latence, codes, corrélation).
- **DCH.01.4** — *Temps réel & synchronisation.* Pour l’administration des tournois (page dédiée), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **DCH.01.5** — *Sécurité, rôles & conformité.* Pour les notifications prêt accepté/refusé, le produit propage l’état via Socket.IO de façon agrégée.
- **DCH.01.6** — *Erreurs, limites & dégradation.* Pour le rematch same players flag, le produit applique les règles de remboursement de prêt actif.
- **DCH.01.7** — *Exploitation & évolutivité.* Pour le pre_hand market quotes, le produit permet l’observabilité (latence, codes, corrélation).
- **DCH.01.8** — *Objectif & périmètre.* Les rooms blackjack multi peuvent inviter par lien ou liste d’amis ; l’hôte contrôle le démarrage quand les sièges requis sont pourvus.
- **DCH.01.9** — *Entrées & contrats (API / UI).* Pour la progression challenge stockée DB, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **DCH.01.10** — *État, persistance & intégrité.* Pour le spectate card masking rules, le produit permet l’observabilité (latence, codes, corrélation).
- **DCH.01.11** — *Temps réel & synchronisation.* Pour le reject friend loan, le produit documente les préconditions et postconditions attendues.
- **DCH.01.12** — *Sécurité, rôles & conformité.* Pour le blackjack lobby room id param, le produit vérifie les montants et soldes avant persistance.

### DCH.02 — Claim récompense
- **DCH.02.1** — *Objectif & périmètre.* Pour le socket reconnect exponential backoff client, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **DCH.02.2** — *Entrées & contrats (API / UI).* Pour la page résultats paris cachés, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **DCH.02.3** — *État, persistance & intégrité.* Pour le dealer button rotation animation, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **DCH.02.4** — *Temps réel & synchronisation.* Pour le hook useUser et synchronisation token, le produit s’appuie sur la validation serveur comme source de vérité.
- **DCH.02.5** — *Sécurité, rôles & conformité.* Pour le gamification cap bet by level, le produit vérifie les montants et soldes avant persistance.
- **DCH.02.6** — *Erreurs, limites & dégradation.* Pour le xp grant failure tolerance, le produit limite les abus par quotas, plafonds ou fréquence.
- **DCH.02.7** — *Exploitation & évolutivité.* Pour le start screen CTA login register, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **DCH.02.8** — *Objectif & périmètre.* Pour le tournament scheduled cron trigger, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **DCH.02.9** — *Entrées & contrats (API / UI).* Pour le hand strength display optional client only, le produit vérifie les montants et soldes avant persistance.
- **DCH.02.10** — *État, persistance & intégrité.* Pour le lobby principal et ses onglets, le produit vérifie les montants et soldes avant persistance.
- **DCH.02.11** — *Temps réel & synchronisation.* Pour le practice create bot game HTTP, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **DCH.02.12** — *Sécurité, rôles & conformité.* Pour le serveur HTTP + Socket.IO partagé, le produit synchronise l’UI sur le snapshot officiel après mutation.

### DCH.03 — Persistance par utilisateur
- **DCH.03.1** — *Objectif & périmètre.* Pour le friend request duplicate prevention, le produit s’appuie sur la validation serveur comme source de vérité.
- **DCH.03.2** — *Entrées & contrats (API / UI).* Pour la gamification (niveaux, badges, plafonds de mise), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **DCH.03.3** — *État, persistance & intégrité.* Pour le admin console action audit, le produit expose des erreurs métier stables pour i18n et support.
- **DCH.03.4** — *Temps réel & synchronisation.* Pour le invitation accept deep link route, le produit documente les préconditions et postconditions attendues.
- **DCH.03.5** — *Sécurité, rôles & conformité.* Pour le profile badges grid, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **DCH.03.6** — *Erreurs, limites & dégradation.* Pour la route racine updatesRouter, le produit expose des erreurs métier stables pour i18n et support.
- **DCH.03.7** — *Exploitation & évolutivité.* Pour l’endpoint /metrics protégé par bearer optionnel, le produit vérifie les montants et soldes avant persistance.
- **DCH.03.8** — *Objectif & périmètre.* Pour le JSON body limit (avatars data URL), le produit limite les abus par quotas, plafonds ou fréquence.
- **DCH.03.9** — *Entrées & contrats (API / UI).* Pour le timeout per route override, le produit applique les règles de remboursement de prêt actif.
- **DCH.03.10** — *État, persistance & intégrité.* Pour le socket reconnect exponential backoff client, le produit propage l’état via Socket.IO de façon agrégée.
- **DCH.03.11** — *Temps réel & synchronisation.* Pour le action buttons disabled wrong turn, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **DCH.03.12** — *Sécurité, rôles & conformité.* Pour le leaderboard (XP, jetons, victoires), le produit journalise les transitions sensibles pour audit.

## Gamification
_Balise `GAM` — logique fonctionnelle, sans code source._

### GAM.01 — XP & niveaux
- **GAM.01.1** — *Objectif & périmètre.* Pour les invitations socket room blackjack, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **GAM.01.2** — *Entrées & contrats (API / UI).* Le classement (leaderboard) s’appuie sur des requêtes triées et paginées ; les ex-aequo sont départagés par un critère secondaire stable (par ex. identifiant affiché).
- **GAM.01.3** — *État, persistance & intégrité.* Pour le board burn card animation serveur logique, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAM.01.4** — *Temps réel & synchronisation.* Pour le bot action server driven timing, le produit applique les règles de remboursement de prêt actif.
- **GAM.01.5** — *Sécurité, rôles & conformité.* Pour le tournament bounty si supporté, le produit permet l’observabilité (latence, codes, corrélation).
- **GAM.01.6** — *Erreurs, limites & dégradation.* Pour le patch profil email/username/password, le produit documente les préconditions et postconditions attendues.
- **GAM.01.7** — *Exploitation & évolutivité.* Pour le number formatting chips locale, le produit permet l’observabilité (latence, codes, corrélation).
- **GAM.01.8** — *Objectif & périmètre.* Pour les logs structurés et requestId, le produit s’appuie sur la validation serveur comme source de vérité.
- **GAM.01.9** — *Entrées & contrats (API / UI).* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GAM.01.10** — *État, persistance & intégrité.* Pour le process exit boot failure, le produit documente les préconditions et postconditions attendues.
- **GAM.01.11** — *Temps réel & synchronisation.* Pour l’avatar (fichier ou URL) et quotas taille, le produit vérifie les montants et soldes avant persistance.
- **GAM.01.12** — *Sécurité, rôles & conformité.* Pour le feedback thank you acknowledgment, le produit respecte l’idempotence ou les clés d’unicité métier.

### GAM.02 — Badges
- **GAM.02.1** — *Objectif & périmètre.* Pour le blackjack table gameId param, le produit maintient la compatibilité mobile et navigateur.
- **GAM.02.2** — *Entrées & contrats (API / UI).* Pour le gestionnaire d’erreurs HTTP global Express, le produit applique les règles de remboursement de prêt actif.
- **GAM.02.3** — *État, persistance & intégrité.* Pour les notifications prêt accepté/refusé, le produit permet l’observabilité (latence, codes, corrélation).
- **GAM.02.4** — *Temps réel & synchronisation.* Pour le model inference timeout, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.02.5** — *Sécurité, rôles & conformité.* Pour le recovery question list server, le produit minimise la fuite d’information entre rôles.
- **GAM.02.6** — *Erreurs, limites & dégradation.* Pour le loan reminder notification si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GAM.02.7** — *Exploitation & évolutivité.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit limite les abus par quotas, plafonds ou fréquence.
- **GAM.02.8** — *Objectif & périmètre.* Pour le remboursement automatique sur gains casino, le produit applique les règles de remboursement de prêt actif.
- **GAM.02.9** — *Entrées & contrats (API / UI).* Pour le service tournoi et broadcasts Socket.IO, le produit applique les règles de remboursement de prêt actif.
- **GAM.02.10** — *État, persistance & intégrité.* Pour le results alias route same page, le produit documente les préconditions et postconditions attendues.
- **GAM.02.11** — *Temps réel & synchronisation.* Pour le cron tournament progression, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAM.02.12** — *Sécurité, rôles & conformité.* Pour le leaderboard (XP, jetons, victoires), le produit applique les règles de remboursement de prêt actif.

### GAM.03 — Plafonds effectifs mini-jeux
- **GAM.03.1** — *Objectif & périmètre.* Pour le hidden bet history query by game, le produit s’appuie sur la validation serveur comme source de vérité.
- **GAM.03.2** — *Entrées & contrats (API / UI).* Pour l’écran de résultat tournoi et le classement gains, le produit permet l’observabilité (latence, codes, corrélation).
- **GAM.03.3** — *État, persistance & intégrité.* Pour les pages Roulette et SlotMachine, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.03.4** — *Temps réel & synchronisation.* Pour le spectate join as observer, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GAM.03.5** — *Sécurité, rôles & conformité.* Pour le error boundary reset state, le produit expose des erreurs métier stables pour i18n et support.
- **GAM.03.6** — *Erreurs, limites & dégradation.* Pour la documentation Swagger /api-docs, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.03.7** — *Exploitation & évolutivité.* Pour le profile aggregate stats query, le produit documente les préconditions et postconditions attendues.
- **GAM.03.8** — *Objectif & périmètre.* Pour le fallback heuristique Node si IA KO, le produit applique les règles de remboursement de prêt actif.
- **GAM.03.9** — *Entrées & contrats (API / UI).* Pour le blocked user list si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **GAM.03.10** — *État, persistance & intégrité.* Pour les invitations à une table blackjack, le produit maintient la compatibilité mobile et navigateur.
- **GAM.03.11** — *Temps réel & synchronisation.* Pour le token expiry refresh flow si prévu, le produit isole les données par utilisateur et par partie.
- **GAM.03.12** — *Sécurité, rôles & conformité.* Pour le lobby blackjack multi, le produit refuse les actions si le rôle ne correspond pas au contexte.

### GAM.04 — Mises à jour transactionnelles sécurisées
- **GAM.04.1** — *Objectif & périmètre.* Pour le disconnect socket leave room, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.04.2** — *Entrées & contrats (API / UI).* Pour les logs structurés et requestId, le produit journalise les transitions sensibles pour audit.
- **GAM.04.3** — *État, persistance & intégrité.* Pour la progression challenge stockée DB, le produit permet l’observabilité (latence, codes, corrélation).
- **GAM.04.4** — *Temps réel & synchronisation.* Pour le email verification optional flow, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.04.5** — *Sécurité, rôles & conformité.* Pour le dev socket.onAny pour debug, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.04.6** — *Erreurs, limites & dégradation.* Pour les statistiques de fin de main practice, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAM.04.7** — *Exploitation & évolutivité.* Pour le email verification optional flow, le produit applique les règles de remboursement de prêt actif.
- **GAM.04.8** — *Objectif & périmètre.* Pour le cron tournament progression, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **GAM.04.9** — *Entrées & contrats (API / UI).* Pour le board burn card animation serveur logique, le produit minimise la fuite d’information entre rôles.
- **GAM.04.10** — *État, persistance & intégrité.* Pour le leaderboard SQL ORDER BY, le produit isole les données par utilisateur et par partie.
- **GAM.04.11** — *Temps réel & synchronisation.* Pour le multi blackjack seat claim atomic, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GAM.04.12** — *Sécurité, rôles & conformité.* La suppression de room nettoie les sockets rattachés et refuse les nouvelles actions avec un code d’erreur explicite.

## Modération & qualité
_Balise `MOD` — logique fonctionnelle, sans code source._

### MOD.01 — Signalement joueur
- **MOD.01.1** — *Objectif & périmètre.* Pour le token expiry refresh flow si prévu, le produit reste désactivable ou restreint en production si sensible.
- **MOD.01.2** — *Entrées & contrats (API / UI).* Pour la pagination et filtres leaderboard, le produit applique les règles de remboursement de prêt actif.
- **MOD.01.3** — *État, persistance & intégrité.* Pour l’avatar (fichier ou URL) et quotas taille, le produit vérifie les montants et soldes avant persistance.
- **MOD.01.4** — *Temps réel & synchronisation.* Pour les routes /api/leaderboard, le produit documente les préconditions et postconditions attendues.
- **MOD.01.5** — *Sécurité, rôles & conformité.* Pour le clipboard copy room code, le produit reste désactivable ou restreint en production si sensible.
- **MOD.01.6** — *Erreurs, limites & dégradation.* Pour le high contrast token colors, le produit minimise la fuite d’information entre rôles.
- **MOD.01.7** — *Exploitation & évolutivité.* Pour le destroy room cascade sockets, le produit reste désactivable ou restreint en production si sensible.
- **MOD.01.8** — *Objectif & périmètre.* Pour les catégories victoires vs jetons vs XP, le produit permet l’observabilité (latence, codes, corrélation).
- **MOD.01.9** — *Entrées & contrats (API / UI).* Pour la page Swagger /api-docs, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **MOD.01.10** — *État, persistance & intégrité.* Pour le badge unlock notification, le produit limite les abus par quotas, plafonds ou fréquence.
- **MOD.01.11** — *Temps réel & synchronisation.* Pour le tournament bounty si supporté, le produit minimise la fuite d’information entre rôles.
- **MOD.01.12** — *Sécurité, rôles & conformité.* Pour le anti-cheat body inspection light, le produit gère la concurrence par transactions courtes ou verrous logiques.

### MOD.02 — Avis partie (rating)
- **MOD.02.1** — *Objectif & périmètre.* Pour les healthchecks live / ready et dépendances, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **MOD.02.2** — *Entrées & contrats (API / UI).* Pour le practice bot non-expert jetons virtuels, le produit s’appuie sur la validation serveur comme source de vérité.
- **MOD.02.3** — *État, persistance & intégrité.* Pour la page WaitingRoom dédiée, le produit reste désactivable ou restreint en production si sensible.
- **MOD.02.4** — *Temps réel & synchronisation.* Pour le admin tournament force start si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **MOD.02.5** — *Sécurité, rôles & conformité.* Pour le admin runtime poker dev-only, le produit maintient la compatibilité mobile et navigateur.
- **MOD.02.6** — *Erreurs, limites & dégradation.* Pour la page Profile et EditProfile, le produit applique les règles de remboursement de prêt actif.
- **MOD.02.7** — *Exploitation & évolutivité.* Pour les métriques Prometheus et endpoint /metrics, le produit propage l’état via Socket.IO de façon agrégée.
- **MOD.02.8** — *Objectif & périmètre.* Pour les invitations socket room blackjack, le produit distingue erreurs réseau, auth et serveur côté client.
- **MOD.02.9** — *Entrées & contrats (API / UI).* Pour le min raise increment server, le produit expose des erreurs métier stables pour i18n et support.
- **MOD.02.10** — *État, persistance & intégrité.* Pour le join game error room full, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **MOD.02.11** — *Temps réel & synchronisation.* Pour le quantum bluff branding start screen, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **MOD.02.12** — *Sécurité, rôles & conformité.* Pour le call amount computed server, le produit isole les données par utilisateur et par partie.

### MOD.03 — Console admin lecture/traitement
- **MOD.03.1** — *Objectif & périmètre.* Pour le tournament name branding header, le produit isole les données par utilisateur et par partie.
- **MOD.03.2** — *Entrées & contrats (API / UI).* Pour le results alias route same page, le produit journalise les transitions sensibles pour audit.
- **MOD.03.3** — *État, persistance & intégrité.* Pour le xp grant failure tolerance, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **MOD.03.4** — *Temps réel & synchronisation.* Pour le provider AccessibilityProvider, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **MOD.03.5** — *Sécurité, rôles & conformité.* Pour la documentation Swagger /api-docs, le produit reste désactivable ou restreint en production si sensible.
- **MOD.03.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by game, le produit applique les règles de remboursement de prêt actif.
- **MOD.03.7** — *Exploitation & évolutivité.* Pour le warning toast tournament soon, le produit expose des erreurs métier stables pour i18n et support.
- **MOD.03.8** — *Objectif & périmètre.* Pour le tournament overlay z-index full screen, le produit minimise la fuite d’information entre rôles.
- **MOD.03.9** — *Entrées & contrats (API / UI).* Pour le join game error room full, le produit limite les abus par quotas, plafonds ou fréquence.
- **MOD.03.10** — *État, persistance & intégrité.* Pour les streets préflop à river, le produit expose des erreurs métier stables pour i18n et support.
- **MOD.03.11** — *Temps réel & synchronisation.* Pour le flux login → invalidation User, le produit limite les abus par quotas, plafonds ou fréquence.
- **MOD.03.12** — *Sécurité, rôles & conformité.* Pour le results alias route same page, le produit documente les préconditions et postconditions attendues.

## Administration
_Balise `ADM` — logique fonctionnelle, sans code source._

### ADM.01 — Console JWT admin
- **ADM.01.1** — *Objectif & périmètre.* Pour la résolution des paris cachés en fin de main, le produit isole les données par utilisateur et par partie.
- **ADM.01.2** — *Entrées & contrats (API / UI).* Pour le practice bot non-expert jetons virtuels, le produit permet l’observabilité (latence, codes, corrélation).
- **ADM.01.3** — *État, persistance & intégrité.* Pour les friend requests entrantes/sortantes, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM.01.4** — *Temps réel & synchronisation.* Pour le duplicate action reject same round, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ADM.01.5** — *Sécurité, rôles & conformité.* Pour le mini games hub cards layout, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM.01.6** — *Erreurs, limites & dégradation.* Pour le idempotency middleware scope, le produit reste désactivable ou restreint en production si sensible.
- **ADM.01.7** — *Exploitation & évolutivité.* Pour la table poker temps réel (Game), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM.01.8** — *Objectif & périmètre.* Pour l’override roulette numéro forcé dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **ADM.01.9** — *Entrées & contrats (API / UI).* Pour le socket rejoin après refresh page, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM.01.10** — *État, persistance & intégrité.* Pour la file spectateur cash pleine, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM.01.11** — *Temps réel & synchronisation.* Pour le roulette wheel animation client only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ADM.01.12** — *Sécurité, rôles & conformité.* Pour la machine à sous (tour, symboles, payout), le produit respecte l’idempotence ou les clés d’unicité métier.

### ADM.02 — Routes runtime dev poker/bj
- **ADM.02.1** — *Objectif & périmètre.* Pour le latency metric histogram si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **ADM.02.2** — *Entrées & contrats (API / UI).* Pour le live flop market transition, le produit documente les préconditions et postconditions attendues.
- **ADM.02.3** — *État, persistance & intégrité.* Pour le tie-break sur identifiant affiché, le produit s’appuie sur la validation serveur comme source de vérité.
- **ADM.02.4** — *Temps réel & synchronisation.* Pour la page WaitingRoom dédiée, le produit expose des erreurs métier stables pour i18n et support.
- **ADM.02.5** — *Sécurité, rôles & conformité.* Pour les healthchecks live / ready et dépendances, le produit expose des erreurs métier stables pour i18n et support.
- **ADM.02.6** — *Erreurs, limites & dégradation.* Pour le practice create bot game HTTP, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM.02.7** — *Exploitation & évolutivité.* Pour le emit personalized snapshot per userId, le produit journalise les transitions sensibles pour audit.
- **ADM.02.8** — *Objectif & périmètre.* Pour le color blind mode protanopia, le produit isole les données par utilisateur et par partie.
- **ADM.02.9** — *Entrées & contrats (API / UI).* Pour le color blind mode deuteranopia, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM.02.10** — *État, persistance & intégrité.* Pour le claim reward challenge, le produit reste désactivable ou restreint en production si sensible.
- **ADM.02.11** — *Temps réel & synchronisation.* Pour les stats agrégées roulette, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM.02.12** — *Sécurité, rôles & conformité.* Pour le badge unlock notification, le produit respecte l’idempotence ou les clés d’unicité métier.

### ADM.03 — Override roulette dev
- **ADM.03.1** — *Objectif & périmètre.* Pour le sit out flag siège poker, le produit applique les règles de remboursement de prêt actif.
- **ADM.03.2** — *Entrées & contrats (API / UI).* Pour le updates check new version banner si prévu, le produit maintient la compatibilité mobile et navigateur.
- **ADM.03.3** — *État, persistance & intégrité.* Pour le pot display multi-devises jetons, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM.03.4** — *Temps réel & synchronisation.* Pour le multi blackjack start host only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM.03.5** — *Sécurité, rôles & conformité.* Pour le skipSuccessfulRequests sur rate limit global, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM.03.6** — *Erreurs, limites & dégradation.* Pour le destroy room cascade sockets, le produit isole les données par utilisateur et par partie.
- **ADM.03.7** — *Exploitation & évolutivité.* Pour le leaderboard OFFSET pagination, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM.03.8** — *Objectif & périmètre.* Pour le admin redirect if not admin jwt, le produit expose des erreurs métier stables pour i18n et support.
- **ADM.03.9** — *Entrées & contrats (API / UI).* Pour le email verification optional flow, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM.03.10** — *État, persistance & intégrité.* Pour le room subscription socket join, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM.03.11** — *Temps réel & synchronisation.* Pour les blinds et le bouton dealer, le produit isole les données par utilisateur et par partie.
- **ADM.03.12** — *Sécurité, rôles & conformité.* Pour les invitation party poker, le produit synchronise l’UI sur le snapshot officiel après mutation.

### ADM.04 — Désactivation stricte en production
- **ADM.04.1** — *Objectif & périmètre.* Pour le thème de table (felt / couleurs), le produit applique les règles de remboursement de prêt actif.
- **ADM.04.2** — *Entrées & contrats (API / UI).* Pour l’acceptation de liens d’invitation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM.04.3** — *État, persistance & intégrité.* Pour la roulette (tour, mises, tirage, gains), le produit expose des erreurs métier stables pour i18n et support.
- **ADM.04.4** — *Temps réel & synchronisation.* Pour la waiting room poker (création / rejoindre), le produit expose des erreurs métier stables pour i18n et support.
- **ADM.04.5** — *Sécurité, rôles & conformité.* Pour le timeout per route override, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM.04.6** — *Erreurs, limites & dégradation.* Pour le démarrage de partie vers un gameId, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM.04.7** — *Exploitation & évolutivité.* Pour l’acceptation de liens d’invitation, le produit propage l’état via Socket.IO de façon agrégée.
- **ADM.04.8** — *Objectif & périmètre.* Pour le disconnect socket leave room, le produit applique les règles de remboursement de prêt actif.
- **ADM.04.9** — *Entrées & contrats (API / UI).* Pour le friend not found search, le produit propage l’état via Socket.IO de façon agrégée.
- **ADM.04.10** — *État, persistance & intégrité.* Pour le requestId propagation logs, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM.04.11** — *Temps réel & synchronisation.* Pour les statistiques de fin de main practice, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ADM.04.12** — *Sécurité, rôles & conformité.* Pour le tournament clock server synced si prévu, le produit expose des erreurs métier stables pour i18n et support.

## Sécurité réseau
_Balise `SEC` — logique fonctionnelle, sans code source._

### SEC.01 — CORS allowlist
- **SEC.01.1** — *Objectif & périmètre.* Pour le blackjack table gameId param, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.01.2** — *Entrées & contrats (API / UI).* Pour les catégories victoires vs jetons vs XP, le produit reste désactivable ou restreint en production si sensible.
- **SEC.01.3** — *État, persistance & intégrité.* Pour le slot result authoritative symbols, le produit isole les données par utilisateur et par partie.
- **SEC.01.4** — *Temps réel & synchronisation.* Pour le xp anti farm cooldown server, le produit vérifie les montants et soldes avant persistance.
- **SEC.01.5** — *Sécurité, rôles & conformité.* Pour le private room join request timeout, le produit minimise la fuite d’information entre rôles.
- **SEC.01.6** — *Erreurs, limites & dégradation.* Pour l’anti-cheat middleware HTTP, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.01.7** — *Exploitation & évolutivité.* Pour le swagger hide topbar, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SEC.01.8** — *Objectif & périmètre.* Pour le tournament medal display top3, le produit s’appuie sur la validation serveur comme source de vérité.
- **SEC.01.9** — *Entrées & contrats (API / UI).* Pour le hidden bet live window timing, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SEC.01.10** — *État, persistance & intégrité.* Pour le all in call auto partial amount, le produit journalise les transitions sensibles pour audit.
- **SEC.01.11** — *Temps réel & synchronisation.* Pour le daily challenge streak bonus si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.01.12** — *Sécurité, rôles & conformité.* Pour le logout blacklist token id, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### SEC.02 — Helmet CSP
- **SEC.02.1** — *Objectif & périmètre.* Pour le admin runtime poker dev-only, le produit s’appuie sur la validation serveur comme source de vérité.
- **SEC.02.2** — *Entrées & contrats (API / UI).* Pour le game example route isolation, le produit s’appuie sur la validation serveur comme source de vérité.
- **SEC.02.3** — *État, persistance & intégrité.* Pour le practice bot expert wallet policy, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.02.4** — *Temps réel & synchronisation.* Pour le cors preflight OPTIONS 200, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SEC.02.5** — *Sécurité, rôles & conformité.* Pour le leave friend loan cancel, le produit limite les abus par quotas, plafonds ou fréquence.
- **SEC.02.6** — *Erreurs, limites & dégradation.* Pour le server socketAuth middleware order, le produit s’appuie sur la validation serveur comme source de vérité.
- **SEC.02.7** — *Exploitation & évolutivité.* Pour le dev socket.onAny pour debug, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.02.8** — *Objectif & périmètre.* Pour le showdown evaluation HTTP internal, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.02.9** — *Entrées & contrats (API / UI).* Pour le tournament result delay 12s, le produit reste désactivable ou restreint en production si sensible.
- **SEC.02.10** — *État, persistance & intégrité.* Pour le all in call auto partial amount, le produit journalise les transitions sensibles pour audit.
- **SEC.02.11** — *Temps réel & synchronisation.* Pour le tournament min players start check, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SEC.02.12** — *Sécurité, rôles & conformité.* Pour le loader global et les toasts, le produit vérifie les montants et soldes avant persistance.

### SEC.03 — Rate limits
- **SEC.03.1** — *Objectif & périmètre.* Pour les routes /api/leaderboard, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.03.2** — *Entrées & contrats (API / UI).* Pour le results alias route same page, le produit isole les données par utilisateur et par partie.
- **SEC.03.3** — *État, persistance & intégrité.* Pour le info toast player joined room, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.03.4** — *Temps réel & synchronisation.* Pour le tournament result delay 12s, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.03.5** — *Sécurité, rôles & conformité.* Pour le locale date formatting leaderboard, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.03.6** — *Erreurs, limites & dégradation.* Pour la room blackjack multi et les sièges, le produit reste désactivable ou restreint en production si sensible.
- **SEC.03.7** — *Exploitation & évolutivité.* Pour la configuration trust proxy, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.03.8** — *Objectif & périmètre.* Pour le leaderboard anti cheat stats validation, le produit vérifie les montants et soldes avant persistance.
- **SEC.03.9** — *Entrées & contrats (API / UI).* Pour les statistiques de fin de main practice, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.03.10** — *État, persistance & intégrité.* Pour l’AdminAuth isolé de l’auth joueur, le produit isole les données par utilisateur et par partie.
- **SEC.03.11** — *Temps réel & synchronisation.* Pour le admin redirect if not admin jwt, le produit vérifie les montants et soldes avant persistance.
- **SEC.03.12** — *Sécurité, rôles & conformité.* Pour le console admin filter by status, le produit reste désactivable ou restreint en production si sensible.

### SEC.04 — JWT & blacklist
- **SEC.04.1** — *Objectif & périmètre.* Pour le solo blackjack deck shuffle server, le produit vérifie les montants et soldes avant persistance.
- **SEC.04.2** — *Entrées & contrats (API / UI).* Pour la page tournois (liste / inscription), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.04.3** — *État, persistance & intégrité.* Pour le locale date formatting leaderboard, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.4** — *Temps réel & synchronisation.* Pour le live check always true, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.5** — *Sécurité, rôles & conformité.* Pour la console admin web (JWT rôle admin), le produit vérifie les montants et soldes avant persistance.
- **SEC.04.6** — *Erreurs, limites & dégradation.* Pour le xp anti farm cooldown server, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.7** — *Exploitation & évolutivité.* Pour le hidden bet history query by user, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.8** — *Objectif & périmètre.* Pour la pagination et filtres leaderboard, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.9** — *Entrées & contrats (API / UI).* Pour le cors credentials true socket, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.10** — *État, persistance & intégrité.* Pour le moteur de distribution et d’enchères, le produit reste désactivable ou restreint en production si sensible.
- **SEC.04.11** — *Temps réel & synchronisation.* Pour le tournament ranking scroll area, le produit isole les données par utilisateur et par partie.
- **SEC.04.12** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit vérifie les montants et soldes avant persistance.

### SEC.05 — Idempotency casino
- **SEC.05.1** — *Objectif & périmètre.* Pour le spectate card masking rules, le produit reste désactivable ou restreint en production si sensible.
- **SEC.05.2** — *Entrées & contrats (API / UI).* Pour le game deal route isolation, le produit documente les préconditions et postconditions attendues.
- **SEC.05.3** — *État, persistance & intégrité.* Pour les healthchecks live / ready et dépendances, le produit isole les données par utilisateur et par partie.
- **SEC.05.4** — *Temps réel & synchronisation.* Pour le chat rate limit soft, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.05.5** — *Sécurité, rôles & conformité.* Pour l’anti-cheat middleware HTTP, le produit documente les préconditions et postconditions attendues.
- **SEC.05.6** — *Erreurs, limites & dégradation.* Pour le updates static route behavior, le produit permet l’observabilité (latence, codes, corrélation).
- **SEC.05.7** — *Exploitation & évolutivité.* Pour le timeout per route override, le produit journalise les transitions sensibles pour audit.
- **SEC.05.8** — *Objectif & périmètre.* Pour le admin tournaments UI fields, le produit minimise la fuite d’information entre rôles.
- **SEC.05.9** — *Entrées & contrats (API / UI).* Pour le admin runtime poker dev-only, le produit isole les données par utilisateur et par partie.
- **SEC.05.10** — *État, persistance & intégrité.* Pour le admin runtime blackjack dev-only, le produit documente les préconditions et postconditions attendues.
- **SEC.05.11** — *Temps réel & synchronisation.* Pour les player reports motifs, le produit s’appuie sur la validation serveur comme source de vérité.
- **SEC.05.12** — *Sécurité, rôles & conformité.* Pour la configuration des bots avant practice, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### SEC.06 — Timeouts HTTP
- **SEC.06.1** — *Objectif & périmètre.* Pour le leaderboard OFFSET pagination, le produit vérifie les montants et soldes avant persistance.
- **SEC.06.2** — *Entrées & contrats (API / UI).* Pour le mini games hub cards layout, le produit documente les préconditions et postconditions attendues.
- **SEC.06.3** — *État, persistance & intégrité.* Pour le feedback text max length, le produit minimise la fuite d’information entre rôles.
- **SEC.06.4** — *Temps réel & synchronisation.* Pour le leaderboard SQL ORDER BY, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.06.5** — *Sécurité, rôles & conformité.* Pour le chat rate limit soft, le produit propage l’état via Socket.IO de façon agrégée.
- **SEC.06.6** — *Erreurs, limites & dégradation.* Pour le broadcast io vers room tournoi, le produit vérifie les montants et soldes avant persistance.
- **SEC.06.7** — *Exploitation & évolutivité.* Pour le admin tournaments UI fields, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SEC.06.8** — *Objectif & périmètre.* Pour le language switcher component, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SEC.06.9** — *Entrées & contrats (API / UI).* Pour le color blind mode protanopia, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.06.10** — *État, persistance & intégrité.* Pour le spectate join as observer, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.06.11** — *Temps réel & synchronisation.* Pour le cors preflight OPTIONS 200, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.06.12** — *Sécurité, rôles & conformité.* Pour le tournament break schedule si prévu, le produit s’appuie sur la validation serveur comme source de vérité.

### SEC.07 — Anti-cheat
- **SEC.07.1** — *Objectif & périmètre.* Pour le screen reader labels cards, le produit minimise la fuite d’information entre rôles.
- **SEC.07.2** — *Entrées & contrats (API / UI).* Pour la route racine updatesRouter, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SEC.07.3** — *État, persistance & intégrité.* Pour la persistance difficulté bot en session, le produit permet l’observabilité (latence, codes, corrélation).
- **SEC.07.4** — *Temps réel & synchronisation.* Pour le live check always true, le produit limite les abus par quotas, plafonds ou fréquence.
- **SEC.07.5** — *Sécurité, rôles & conformité.* Pour le join game error wrong password private, le produit journalise les transitions sensibles pour audit.
- **SEC.07.6** — *Erreurs, limites & dégradation.* Pour le console admin filter by status, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.07.7** — *Exploitation & évolutivité.* Pour le friends online presence indicator, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SEC.07.8** — *Objectif & périmètre.* Pour les invitation party poker, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.07.9** — *Entrées & contrats (API / UI).* Pour l’acceptation de liens d’invitation, le produit vérifie les montants et soldes avant persistance.
- **SEC.07.10** — *État, persistance & intégrité.* Pour le leaderboard anti cheat stats validation, le produit distingue erreurs réseau, auth et serveur côté client.
- **SEC.07.11** — *Temps réel & synchronisation.* Pour le endpoint createGame / joinGame RTK, le produit vérifie les montants et soldes avant persistance.
- **SEC.07.12** — *Sécurité, rôles & conformité.* Pour la table poker temps réel (Game), le produit reste désactivable ou restreint en production si sensible.

## Exploitation
_Balise `OPS` — logique fonctionnelle, sans code source._

### OPS.01 — Health live/ready
- **OPS.01.1** — *Objectif & périmètre.* Pour le mapping playerToGameId au start, le produit permet l’observabilité (latence, codes, corrélation).
- **OPS.01.2** — *Entrées & contrats (API / UI).* Pour le tournament break schedule si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **OPS.01.3** — *État, persistance & intégrité.* Pour les métriques Prometheus et endpoint /metrics, le produit maintient la compatibilité mobile et navigateur.
- **OPS.01.4** — *Temps réel & synchronisation.* Pour le profile badges grid, le produit vérifie les montants et soldes avant persistance.
- **OPS.01.5** — *Sécurité, rôles & conformité.* Pour le mode spectateur et la file de reprise siège, le produit reste désactivable ou restreint en production si sensible.
- **OPS.01.6** — *Erreurs, limites & dégradation.* Pour le port listen env PORT, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **OPS.01.7** — *Exploitation & évolutivité.* Pour le port listen env PORT, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.01.8** — *Objectif & périmètre.* Pour le tournament elimination zero chips, le produit documente les préconditions et postconditions attendues.
- **OPS.01.9** — *Entrées & contrats (API / UI).* Pour le join game error wrong password private, le produit journalise les transitions sensibles pour audit.
- **OPS.01.10** — *État, persistance & intégrité.* Pour le side pot display order smallest first, le produit reste désactivable ou restreint en production si sensible.
- **OPS.01.11** — *Temps réel & synchronisation.* Pour le call amount computed server, le produit documente les préconditions et postconditions attendues.
- **OPS.01.12** — *Sécurité, rôles & conformité.* Pour le prisma error map user facing, le produit expose des erreurs métier stables pour i18n et support.

### OPS.02 — Métriques prometheus
- **OPS.02.1** — *Objectif & périmètre.* Pour le broadcast io vers room tournoi, le produit reste désactivable ou restreint en production si sensible.
- **OPS.02.2** — *Entrées & contrats (API / UI).* Pour le waiting room join POST, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.02.3** — *État, persistance & intégrité.* Pour le game example route isolation, le produit limite les abus par quotas, plafonds ou fréquence.
- **OPS.02.4** — *Temps réel & synchronisation.* Pour la séparation practice / cash / casino / tournoi, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.02.5** — *Sécurité, rôles & conformité.* Pour le prisma error map user facing, le produit propage l’état via Socket.IO de façon agrégée.
- **OPS.02.6** — *Erreurs, limites & dégradation.* Pour la waiting room poker (création / rejoindre), le produit vérifie les montants et soldes avant persistance.
- **OPS.02.7** — *Exploitation & évolutivité.* Pour les player reports motifs, le produit s’appuie sur la validation serveur comme source de vérité.
- **OPS.02.8** — *Objectif & périmètre.* Pour le message friend realtime poll or socket si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.02.9** — *Entrées & contrats (API / UI).* Pour la configuration trust proxy, le produit minimise la fuite d’information entre rôles.
- **OPS.02.10** — *État, persistance & intégrité.* Pour la recherche searchUsers avec terme, le produit minimise la fuite d’information entre rôles.
- **OPS.02.11** — *Temps réel & synchronisation.* Pour le tournament scheduled cron trigger, le produit journalise les transitions sensibles pour audit.
- **OPS.02.12** — *Sécurité, rôles & conformité.* Pour le tournament prize pool calculation, le produit vérifie les montants et soldes avant persistance.

### OPS.03 — Swagger contrats
- **OPS.03.1** — *Objectif & périmètre.* Pour la page Swagger /api-docs, le produit respecte l’idempotence ou les clés d’unicité métier.
- **OPS.03.2** — *Entrées & contrats (API / UI).* Pour les tags RTK FriendLoan et invalidations croisées, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **OPS.03.3** — *État, persistance & intégrité.* Pour le latency metric histogram si prévu, le produit journalise les transitions sensibles pour audit.
- **OPS.03.4** — *Temps réel & synchronisation.* Pour le admin runtime poker dev-only, le produit respecte l’idempotence ou les clés d’unicité métier.
- **OPS.03.5** — *Sécurité, rôles & conformité.* Pour le reset token single use, le produit limite les abus par quotas, plafonds ou fréquence.
- **OPS.03.6** — *Erreurs, limites & dégradation.* Pour le root quantum bluff api message, le produit s’appuie sur la validation serveur comme source de vérité.
- **OPS.03.7** — *Exploitation & évolutivité.* Pour le tournament final table merge, le produit vérifie les montants et soldes avant persistance.
- **OPS.03.8** — *Objectif & périmètre.* Pour le level up notification, le produit minimise la fuite d’information entre rôles.
- **OPS.03.9** — *Entrées & contrats (API / UI).* Pour le error boundary reset state, le produit journalise les transitions sensibles pour audit.
- **OPS.03.10** — *État, persistance & intégrité.* Pour le loader show on route transition, le produit documente les préconditions et postconditions attendues.
- **OPS.03.11** — *Temps réel & synchronisation.* Pour le start screen CTA login register, le produit minimise la fuite d’information entre rôles.
- **OPS.03.12** — *Sécurité, rôles & conformité.* Pour le reconnect same seat if free, le produit gère la concurrence par transactions courtes ou verrous logiques.

### OPS.04 — Logs structurés
- **OPS.04.1** — *Objectif & périmètre.* Pour le multi blackjack leave mid hand rules, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.04.2** — *Entrées & contrats (API / UI).* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit reste désactivable ou restreint en production si sensible.
- **OPS.04.3** — *État, persistance & intégrité.* Pour le game page key pathname search reset, le produit isole les données par utilisateur et par partie.
- **OPS.04.4** — *Temps réel & synchronisation.* Pour le tournament navigate back lobby, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **OPS.04.5** — *Sécurité, rôles & conformité.* Pour la politique Helmet CSP et fonts externes, le produit documente les préconditions et postconditions attendues.
- **OPS.04.6** — *Erreurs, limites & dégradation.* Pour le chat rate limit soft, le produit applique les règles de remboursement de prêt actif.
- **OPS.04.7** — *Exploitation & évolutivité.* Pour les erreurs Prisma mappées en conflits utilisateur, le produit vérifie les montants et soldes avant persistance.
- **OPS.04.8** — *Objectif & périmètre.* Pour les routes /api/hidden-bets avec rate limit dédié, le produit permet l’observabilité (latence, codes, corrélation).
- **OPS.04.9** — *Entrées & contrats (API / UI).* Pour la page MiniGames, le produit s’appuie sur la validation serveur comme source de vérité.
- **OPS.04.10** — *État, persistance & intégrité.* Pour le game gateway constructor side effects, le produit reste désactivable ou restreint en production si sensible.
- **OPS.04.11** — *Temps réel & synchronisation.* Pour le lobby blackjack multi, le produit vérifie les montants et soldes avant persistance.
- **OPS.04.12** — *Sécurité, rôles & conformité.* Pour le friends list sort online first, le produit journalise les transitions sensibles pour audit.

## Internationalisation
_Balise `I18N` — logique fonctionnelle, sans code source._

### I18N.01 — Fichiers par langue
- **I18N.01.1** — *Objectif & périmètre.* Pour le player turn highlight UI, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **I18N.01.2** — *Entrées & contrats (API / UI).* Pour le routage React (basename Capacitor), le produit refuse les actions si le rôle ne correspond pas au contexte.
- **I18N.01.3** — *État, persistance & intégrité.* Pour la route racine updatesRouter, le produit documente les préconditions et postconditions attendues.
- **I18N.01.4** — *Temps réel & synchronisation.* Pour le disconnect grace period joueur, le produit limite les abus par quotas, plafonds ou fréquence.
- **I18N.01.5** — *Sécurité, rôles & conformité.* Pour le tournament name branding header, le produit isole les données par utilisateur et par partie.
- **I18N.01.6** — *Erreurs, limites & dégradation.* Pour le friend not found search, le produit limite les abus par quotas, plafonds ou fréquence.
- **I18N.01.7** — *Exploitation & évolutivité.* Pour le remboursement automatique sur gains casino, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.01.8** — *Objectif & périmètre.* Pour les routes /api/daily-challenges, le produit distingue erreurs réseau, auth et serveur côté client.
- **I18N.01.9** — *Entrées & contrats (API / UI).* Pour le fallback reason code IA, le produit permet l’observabilité (latence, codes, corrélation).
- **I18N.01.10** — *État, persistance & intégrité.* Pour les daily challenges reset journalier, le produit maintient la compatibilité mobile et navigateur.
- **I18N.01.11** — *Temps réel & synchronisation.* Pour le badge unlock notification, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.01.12** — *Sécurité, rôles & conformité.* Pour le loader global et les toasts, le produit journalise les transitions sensibles pour audit.

### I18N.02 — Clés par domaine fonctionnel
- **I18N.02.1** — *Objectif & périmètre.* Pour le tutorial lobby page dédiée, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **I18N.02.2** — *Entrées & contrats (API / UI).* Pour le slot reels animation client only, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **I18N.02.3** — *État, persistance & intégrité.* Pour le navigation bottom bar si mobile, le produit isole les données par utilisateur et par partie.
- **I18N.02.4** — *Temps réel & synchronisation.* Pour le live check always true, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **I18N.02.5** — *Sécurité, rôles & conformité.* Pour le rematch same players flag, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.02.6** — *Erreurs, limites & dégradation.* Pour le quantum bluff branding start screen, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.02.7** — *Exploitation & évolutivité.* Pour le démarrage de partie vers un gameId, le produit isole les données par utilisateur et par partie.
- **I18N.02.8** — *Objectif & périmètre.* Pour le error toast network french copy, le produit distingue erreurs réseau, auth et serveur côté client.
- **I18N.02.9** — *Entrées & contrats (API / UI).* Pour le player action log structured, le produit s’appuie sur la validation serveur comme source de vérité.
- **I18N.02.10** — *État, persistance & intégrité.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit maintient la compatibilité mobile et navigateur.
- **I18N.02.11** — *Temps réel & synchronisation.* Pour le daily challenge streak bonus si prévu, le produit documente les préconditions et postconditions attendues.
- **I18N.02.12** — *Sécurité, rôles & conformité.* Pour l’administration des tournois (page dédiée), le produit distingue erreurs réseau, auth et serveur côté client.

### I18N.03 — Rafraîchissement UI sur changement langue
- **I18N.03.1** — *Objectif & périmètre.* Pour le lobby quick actions row, le produit applique les règles de remboursement de prêt actif.
- **I18N.03.2** — *Entrées & contrats (API / UI).* Pour le xp anti farm cooldown server, le produit distingue erreurs réseau, auth et serveur côté client.
- **I18N.03.3** — *État, persistance & intégrité.* Pour le spectate card masking rules, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.03.4** — *Temps réel & synchronisation.* Pour le min raise increment server, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.03.5** — *Sécurité, rôles & conformité.* Pour la séparation practice / cash / casino / tournoi, le produit maintient la compatibilité mobile et navigateur.
- **I18N.03.6** — *Erreurs, limites & dégradation.* Pour le pre_hand market quotes, le produit distingue erreurs réseau, auth et serveur côté client.
- **I18N.03.7** — *Exploitation & évolutivité.* Pour la quote hash exposée au client, le produit s’appuie sur la validation serveur comme source de vérité.
- **I18N.03.8** — *Objectif & périmètre.* Pour le error toast network french copy, le produit isole les données par utilisateur et par partie.
- **I18N.03.9** — *Entrées & contrats (API / UI).* Pour le leave_game cleanup seat, le produit minimise la fuite d’information entre rôles.
- **I18N.03.10** — *État, persistance & intégrité.* Pour la téléportation socket vers table de tournoi, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.03.11** — *Temps réel & synchronisation.* Pour le gamification cap bet by level, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.03.12** — *Sécurité, rôles & conformité.* Pour le model inference timeout, le produit journalise les transitions sensibles pour audit.

### I18N.04 — Fallback langue par défaut
- **I18N.04.1** — *Objectif & périmètre.* Pour le feedback text max length, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.04.2** — *Entrées & contrats (API / UI).* Pour le basename Capacitor vs web, le produit s’appuie sur la validation serveur comme source de vérité.
- **I18N.04.3** — *État, persistance & intégrité.* Pour le hidden bets result route params, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.04.4** — *Temps réel & synchronisation.* Pour les routes /api/waiting-room, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.04.5** — *Sécurité, rôles & conformité.* Pour l’écran d’accueil (StartScreen), le produit maintient la compatibilité mobile et navigateur.
- **I18N.04.6** — *Erreurs, limites & dégradation.* Pour les mises à jour applicatives (route updates), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.04.7** — *Exploitation & évolutivité.* Pour le tournament prize formatting locale, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.04.8** — *Objectif & périmètre.* Pour le tournament ranking by chips, le produit expose des erreurs métier stables pour i18n et support.
- **I18N.04.9** — *Entrées & contrats (API / UI).* Pour le flux login → invalidation User, le produit limite les abus par quotas, plafonds ou fréquence.
- **I18N.04.10** — *État, persistance & intégrité.* Pour le report submitted acknowledgment, le produit distingue erreurs réseau, auth et serveur côté client.
- **I18N.04.11** — *Temps réel & synchronisation.* Pour le leaderboard (XP, jetons, victoires), le produit synchronise l’UI sur le snapshot officiel après mutation.
- **I18N.04.12** — *Sécurité, rôles & conformité.* Pour les Webhooks ou jobs async optionnels, le produit distingue erreurs réseau, auth et serveur côté client.

## Client — API RTK Query & cache
_Balise `CLI` — logique fonctionnelle, sans code source._

### CLI.01 — Configuration baseUrl /api
- **CLI.01.1** — *Objectif & périmètre.* Pour les métriques Prometheus et endpoint /metrics, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.01.2** — *Entrées & contrats (API / UI).* Pour le partage pot égalité, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.01.3** — *État, persistance & intégrité.* Pour le hand strength display optional client only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.01.4** — *Temps réel & synchronisation.* Pour le server socketAuth middleware order, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.01.5** — *Sécurité, rôles & conformité.* Pour la persistance difficulté bot en session, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.01.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by user, le produit minimise la fuite d’information entre rôles.
- **CLI.01.7** — *Exploitation & évolutivité.* Pour le microservice Python pour décisions expert bot, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.01.8** — *Objectif & périmètre.* Pour le practice bot non-expert jetons virtuels, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.01.9** — *Entrées & contrats (API / UI).* Pour les invitation party blackjack, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CLI.01.10** — *État, persistance & intégrité.* Pour le pre_hand market quotes, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.01.11** — *Temps réel & synchronisation.* Pour le lobby quick actions row, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLI.01.12** — *Sécurité, rôles & conformité.* Pour le player action log structured, le produit journalise les transitions sensibles pour audit.

### CLI.02 — Bearer Authorization depuis localStorage
- **CLI.02.1** — *Objectif & périmètre.* Pour le protected redirect login if no token, le produit vérifie les montants et soldes avant persistance.
- **CLI.02.2** — *Entrées & contrats (API / UI).* Pour le gateway poker (événements temps réel), le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.02.3** — *État, persistance & intégrité.* Pour le gestionnaire d’erreurs HTTP global Express, le produit journalise les transitions sensibles pour audit.
- **CLI.02.4** — *Temps réel & synchronisation.* Pour les timeouts HTTP globaux, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLI.02.5** — *Sécurité, rôles & conformité.* Pour le player action validation amounts, le produit documente les préconditions et postconditions attendues.
- **CLI.02.6** — *Erreurs, limites & dégradation.* Pour le daily challenge rollover timezone UTC, le produit isole les données par utilisateur et par partie.
- **CLI.02.7** — *Exploitation & évolutivité.* Pour le blocked user list si prévu, le produit minimise la fuite d’information entre rôles.
- **CLI.02.8** — *Objectif & périmètre.* Pour le slot reels animation client only, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.02.9** — *Entrées & contrats (API / UI).* Pour le street advance server event broadcast, le produit minimise la fuite d’information entre rôles.
- **CLI.02.10** — *État, persistance & intégrité.* Pour le gateway poker (événements temps réel), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.02.11** — *Temps réel & synchronisation.* Pour le warning toast tournament soon, le produit minimise la fuite d’information entre rôles.
- **CLI.02.12** — *Sécurité, rôles & conformité.* Pour le http access log middleware, le produit journalise les transitions sensibles pour audit.

### CLI.03 — En-tête x-idempotency-key par mutation
- **CLI.03.1** — *Objectif & périmètre.* Pour les logs structurés et requestId, le produit vérifie les montants et soldes avant persistance.
- **CLI.03.2** — *Entrées & contrats (API / UI).* Pour le lobby principal et ses onglets, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLI.03.3** — *État, persistance & intégrité.* Pour la recherche de joueurs, le produit documente les préconditions et postconditions attendues.
- **CLI.03.4** — *Temps réel & synchronisation.* Pour les invitations socket room blackjack, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CLI.03.5** — *Sécurité, rôles & conformité.* Pour le http 500 show stack dev, le produit journalise les transitions sensibles pour audit.
- **CLI.03.6** — *Erreurs, limites & dégradation.* Pour la configuration trust proxy, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.03.7** — *Exploitation & évolutivité.* Pour le game socket join after HTTP start, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.03.8** — *Objectif & périmètre.* Pour le success toast friend accepted, le produit applique les règles de remboursement de prêt actif.
- **CLI.03.9** — *Entrées & contrats (API / UI).* Pour le http 500 show stack dev, le produit reste désactivable ou restreint en production si sensible.
- **CLI.03.10** — *État, persistance & intégrité.* Pour le game gateway constructor side effects, le produit documente les préconditions et postconditions attendues.
- **CLI.03.11** — *Temps réel & synchronisation.* Pour le level up notification, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CLI.03.12** — *Sécurité, rôles & conformité.* Pour le tournament elimination zero chips, le produit gère la concurrence par transactions courtes ou verrous logiques.

### CLI.04 — Retry exponentiel / staggeredBaseQuery
- **CLI.04.1** — *Objectif & périmètre.* Pour les pages Roulette et SlotMachine, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.04.2** — *Entrées & contrats (API / UI).* Pour la recherche searchUsers avec terme, le produit documente les préconditions et postconditions attendues.
- **CLI.04.3** — *État, persistance & intégrité.* Pour le solo blackjack deck shuffle server, le produit vérifie les montants et soldes avant persistance.
- **CLI.04.4** — *Temps réel & synchronisation.* Pour le idempotency actionId casino round, le produit vérifie les montants et soldes avant persistance.
- **CLI.04.5** — *Sécurité, rôles & conformité.* Pour le admin runtime poker dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.04.6** — *Erreurs, limites & dégradation.* Pour le blocked user list si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.04.7** — *Exploitation & évolutivité.* Pour le loan reminder notification si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CLI.04.8** — *Objectif & périmètre.* Pour le host kick si implémenté, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.04.9** — *Entrées & contrats (API / UI).* Pour le gestionnaire d’erreurs HTTP global Express, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.04.10** — *État, persistance & intégrité.* Pour le tournament spectate delay 5s, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.04.11** — *Temps réel & synchronisation.* Pour le imgSrc blob data https, le produit journalise les transitions sensibles pour audit.
- **CLI.04.12** — *Sécurité, rôles & conformité.* Pour le destroy room cascade sockets, le produit vérifie les montants et soldes avant persistance.

### CLI.05 — TagTypes User, Game, Friend, FriendRequest, FriendMessage, FriendLoan
- **CLI.05.1** — *Objectif & périmètre.* Pour le http 500 show stack dev, le produit journalise les transitions sensibles pour audit.
- **CLI.05.2** — *Entrées & contrats (API / UI).* Pour les friend requests entrantes/sortantes, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.05.3** — *État, persistance & intégrité.* Pour l’écran de résultat tournoi et le classement gains, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.05.4** — *Temps réel & synchronisation.* Pour le error boundary reset state, le produit minimise la fuite d’information entre rôles.
- **CLI.05.5** — *Sécurité, rôles & conformité.* Pour le tournament prize pool calculation, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.05.6** — *Erreurs, limites & dégradation.* Pour le accessibility skip link si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **CLI.05.7** — *Exploitation & évolutivité.* Pour le client RTK Query et invalidation de tags, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLI.05.8** — *Objectif & périmètre.* Pour le accept friend loan crédit, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.05.9** — *Entrées & contrats (API / UI).* Pour le emit personalized snapshot per userId, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.05.10** — *État, persistance & intégrité.* Pour le join game error wrong password private, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.05.11** — *Temps réel & synchronisation.* Pour le requestId propagation logs, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.05.12** — *Sécurité, rôles & conformité.* Pour la liste d’amis et les demandes, le produit gère la concurrence par transactions courtes ou verrous logiques.

### CLI.06 — Invalidation après login/register/profile
- **CLI.06.1** — *Objectif & périmètre.* Pour le latency metric histogram si prévu, le produit maintient la compatibilité mobile et navigateur.
- **CLI.06.2** — *Entrées & contrats (API / UI).* Pour le broadcast io vers room tournoi, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.06.3** — *État, persistance & intégrité.* Pour le timeout per route override, le produit maintient la compatibilité mobile et navigateur.
- **CLI.06.4** — *Temps réel & synchronisation.* Pour le hand strength display optional client only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.06.5** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.06.6** — *Erreurs, limites & dégradation.* Pour la page Swagger /api-docs, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.06.7** — *Exploitation & évolutivité.* Pour le tournament spectate delay 5s, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.06.8** — *Objectif & périmètre.* Pour le endpoint createGame / joinGame RTK, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.06.9** — *Entrées & contrats (API / UI).* Pour le cash queue promote spectator, le produit isole les données par utilisateur et par partie.
- **CLI.06.10** — *État, persistance & intégrité.* Pour le http 500 show stack dev, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLI.06.11** — *Temps réel & synchronisation.* Pour le street advance server event broadcast, le produit vérifie les montants et soldes avant persistance.
- **CLI.06.12** — *Sécurité, rôles & conformité.* Pour le tournament leave before start refund, le produit refuse les actions si le rôle ne correspond pas au contexte.

### CLI.07 — check-email avant inscription
- **CLI.07.1** — *Objectif & périmètre.* Pour le note player tag si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **CLI.07.2** — *Entrées & contrats (API / UI).* Pour les salles privées et demandes d’adhésion, le produit permet l’observabilité (latence, codes, corrélation).
- **CLI.07.3** — *État, persistance & intégrité.* Pour le prisma error map user facing, le produit documente les préconditions et postconditions attendues.
- **CLI.07.4** — *Temps réel & synchronisation.* Pour le disconnect grace period joueur, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLI.07.5** — *Sécurité, rôles & conformité.* Pour le loan paid off celebration si prévu, le produit minimise la fuite d’information entre rôles.
- **CLI.07.6** — *Erreurs, limites & dégradation.* Pour la cotation et le placement de tickets, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.07.7** — *Exploitation & évolutivité.* Pour le tournament ranking by chips, le produit minimise la fuite d’information entre rôles.
- **CLI.07.8** — *Objectif & périmètre.* Pour le toast stack max visible, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CLI.07.9** — *Entrées & contrats (API / UI).* Pour les query params spectate=1 sur Game, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.07.10** — *État, persistance & intégrité.* Pour les player reports motifs, le produit minimise la fuite d’information entre rôles.
- **CLI.07.11** — *Temps réel & synchronisation.* Pour le navigation bottom bar si mobile, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.07.12** — *Sécurité, rôles & conformité.* Pour le provider d’accessibilité et menu, le produit isole les données par utilisateur et par partie.

### CLI.08 — recovery-question + resetPassword
- **CLI.08.1** — *Objectif & périmètre.* Pour le number formatting chips locale, le produit vérifie les montants et soldes avant persistance.
- **CLI.08.2** — *Entrées & contrats (API / UI).* Pour les invitations à une table blackjack, le produit maintient la compatibilité mobile et navigateur.
- **CLI.08.3** — *État, persistance & intégrité.* Pour le flux login → invalidation User, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.08.4** — *Temps réel & synchronisation.* Pour le roulette result authoritative number, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CLI.08.5** — *Sécurité, rôles & conformité.* Pour le tournament medal display top3, le produit minimise la fuite d’information entre rôles.
- **CLI.08.6** — *Erreurs, limites & dégradation.* Pour le self friend request block, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.08.7** — *Exploitation & évolutivité.* Pour le toast stack max visible, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.08.8** — *Objectif & périmètre.* Pour le loan paid off celebration si prévu, le produit maintient la compatibilité mobile et navigateur.
- **CLI.08.9** — *Entrées & contrats (API / UI).* Pour le register password strength, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.08.10** — *État, persistance & intégrité.* Pour le gateway poker (événements temps réel), le produit maintient la compatibilité mobile et navigateur.
- **CLI.08.11** — *Temps réel & synchronisation.* Pour le transaction isolation read committed, le produit isole les données par utilisateur et par partie.
- **CLI.08.12** — *Sécurité, rôles & conformité.* Pour le feedback text max length, le produit s’appuie sur la validation serveur comme source de vérité.

### CLI.09 — Endpoints friends, loans, invitations
- **CLI.09.1** — *Objectif & périmètre.* Pour l’invalidation JWT / blacklist au logout, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.09.2** — *Entrées & contrats (API / UI).* Pour le min raise increment server, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.09.3** — *État, persistance & intégrité.* Pour la banque blackjack multi tour par tour, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLI.09.4** — *Temps réel & synchronisation.* Pour le prisma transaction interactive poker cash, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLI.09.5** — *Sécurité, rôles & conformité.* Pour les query params spectate=1 sur Game, le produit documente les préconditions et postconditions attendues.
- **CLI.09.6** — *Erreurs, limites & dégradation.* Pour le provider AccessibilityProvider, le produit limite les abus par quotas, plafonds ou fréquence.
- **CLI.09.7** — *Exploitation & évolutivité.* Pour les routes /api/daily-challenges, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CLI.09.8** — *Objectif & périmètre.* Pour les routes /api/leaderboard, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.09.9** — *Entrées & contrats (API / UI).* Pour les catégories victoires vs jetons vs XP, le produit expose des erreurs métier stables pour i18n et support.
- **CLI.09.10** — *État, persistance & intégrité.* Pour le stockage token localStorage, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.09.11** — *Temps réel & synchronisation.* Pour le report chat message si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLI.09.12** — *Sécurité, rôles & conformité.* Pour le duplicate action reject same round, le produit documente les préconditions et postconditions attendues.

## Coquille application (shell)
_Balise `SHL` — logique fonctionnelle, sans code source._

### SHL.01 — Layout commun et navigation
- **SHL.01.1** — *Objectif & périmètre.* Pour le 2FA enable verify steps, le produit documente les préconditions et postconditions attendues.
- **SHL.01.2** — *Entrées & contrats (API / UI).* Pour le previous hand history sidebar si prévu, le produit minimise la fuite d’information entre rôles.
- **SHL.01.3** — *État, persistance & intégrité.* Pour le endpoint createGame / joinGame RTK, le produit isole les données par utilisateur et par partie.
- **SHL.01.4** — *Temps réel & synchronisation.* Pour la documentation Swagger /api-docs, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.01.5** — *Sécurité, rôles & conformité.* Pour le cors preflight OPTIONS 200, le produit vérifie les montants et soldes avant persistance.
- **SHL.01.6** — *Erreurs, limites & dégradation.* Pour le error toast network french copy, le produit isole les données par utilisateur et par partie.
- **SHL.01.7** — *Exploitation & évolutivité.* Pour le blackjack solo contre banque, le produit maintient la compatibilité mobile et navigateur.
- **SHL.01.8** — *Objectif & périmètre.* Pour le last action log poker UI, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.01.9** — *Entrées & contrats (API / UI).* Pour le tournament prize pool calculation, le produit maintient la compatibilité mobile et navigateur.
- **SHL.01.10** — *État, persistance & intégrité.* Pour les niveaux XP seuils, le produit vérifie les montants et soldes avant persistance.
- **SHL.01.11** — *Temps réel & synchronisation.* Pour le previous hand history sidebar si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.01.12** — *Sécurité, rôles & conformité.* Pour la validation stricte des actions IA, le produit maintient la compatibilité mobile et navigateur.

### SHL.02 — ProtectedRoute utilisateur
- **SHL.02.1** — *Objectif & périmètre.* Pour la quote hash exposée au client, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.02.2** — *Entrées & contrats (API / UI).* Pour les handlers socket.off au démontage, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.02.3** — *État, persistance & intégrité.* Pour le lobby principal et ses onglets, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.02.4** — *Temps réel & synchronisation.* Pour le success toast friend accepted, le produit isole les données par utilisateur et par partie.
- **SHL.02.5** — *Sécurité, rôles & conformité.* Pour la déconnexion socket si token invalide, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.02.6** — *Erreurs, limites & dégradation.* Pour le daily challenge rollover timezone UTC, le produit journalise les transitions sensibles pour audit.
- **SHL.02.7** — *Exploitation & évolutivité.* Pour la recherche searchUsers avec terme, le produit maintient la compatibilité mobile et navigateur.
- **SHL.02.8** — *Objectif & périmètre.* Pour la machine à sous (tour, symboles, payout), le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.02.9** — *Entrées & contrats (API / UI).* Pour la configuration trust proxy, le produit journalise les transitions sensibles pour audit.
- **SHL.02.10** — *État, persistance & intégrité.* Pour l’endpoint /metrics protégé par bearer optionnel, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.02.11** — *Temps réel & synchronisation.* Pour le join game error wrong password private, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SHL.02.12** — *Sécurité, rôles & conformité.* Pour le hidden bet live window timing, le produit synchronise l’UI sur le snapshot officiel après mutation.

### SHL.03 — AdminProtectedRoute + AdminAuth
- **SHL.03.1** — *Objectif & périmètre.* Pour la page MiniGames, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.03.2** — *Entrées & contrats (API / UI).* Pour le self friend request block, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.03.3** — *État, persistance & intégrité.* Pour le multi blackjack leave mid hand rules, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.03.4** — *Temps réel & synchronisation.* Pour le spectate join as observer, le produit journalise les transitions sensibles pour audit.
- **SHL.03.5** — *Sécurité, rôles & conformité.* Pour le friends online presence indicator, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.03.6** — *Erreurs, limites & dégradation.* Pour la quote hash exposée au client, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.03.7** — *Exploitation & évolutivité.* Pour le qr code room invite si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.03.8** — *Objectif & périmètre.* Pour les paris cachés et leurs phases de marché, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.03.9** — *Entrées & contrats (API / UI).* Pour le tournament clock server synced si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.03.10** — *État, persistance & intégrité.* Pour le reconnect same seat if free, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.03.11** — *Temps réel & synchronisation.* Pour le pot odds hint display optional client only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.03.12** — *Sécurité, rôles & conformité.* Pour le updates check new version banner si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### SHL.04 — ErrorBoundary global
- **SHL.04.1** — *Objectif & périmètre.* Pour le capacitor splash screen si mobile, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.04.2** — *Entrées & contrats (API / UI).* Pour le tournament clock server synced si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.04.3** — *État, persistance & intégrité.* Pour le game deal route isolation, le produit minimise la fuite d’information entre rôles.
- **SHL.04.4** — *Temps réel & synchronisation.* Pour les invitation party poker, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.04.5** — *Sécurité, rôles & conformité.* Pour la recherche searchUsers avec terme, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SHL.04.6** — *Erreurs, limites & dégradation.* Pour les niveaux XP seuils, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.04.7** — *Exploitation & évolutivité.* Pour le screen reader labels cards, le produit journalise les transitions sensibles pour audit.
- **SHL.04.8** — *Objectif & périmètre.* Pour le wallet insufficient funds message, le produit applique les règles de remboursement de prêt actif.
- **SHL.04.9** — *Entrées & contrats (API / UI).* Pour le reject friend loan, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.04.10** — *État, persistance & intégrité.* Pour le spectate join as observer, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.04.11** — *Temps réel & synchronisation.* Pour le updates check new version banner si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.04.12** — *Sécurité, rôles & conformité.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit expose des erreurs métier stables pour i18n et support.

### SHL.05 — LoaderProvider (chargements)
- **SHL.05.1** — *Objectif & périmètre.* Pour le street advance server event broadcast, le produit isole les données par utilisateur et par partie.
- **SHL.05.2** — *Entrées & contrats (API / UI).* Pour le recovery question list server, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SHL.05.3** — *État, persistance & intégrité.* Pour le tournament ranking scroll area, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.05.4** — *Temps réel & synchronisation.* Pour l’override roulette numéro forcé dev-only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.05.5** — *Sécurité, rôles & conformité.* Pour le port listen env PORT, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.05.6** — *Erreurs, limites & dégradation.* Pour le accessibility skip link si prévu, le produit maintient la compatibilité mobile et navigateur.
- **SHL.05.7** — *Exploitation & évolutivité.* Pour le pot odds hint display optional client only, le produit s’appuie sur la validation serveur comme source de vérité.
- **SHL.05.8** — *Objectif & périmètre.* Pour la route racine updatesRouter, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.05.9** — *Entrées & contrats (API / UI).* Pour le disconnect socket leave room, le produit vérifie les montants et soldes avant persistance.
- **SHL.05.10** — *État, persistance & intégrité.* Pour la téléportation socket vers table de tournoi, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.05.11** — *Temps réel & synchronisation.* Pour le tournament trophy asset display, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.05.12** — *Sécurité, rôles & conformité.* Pour le hidden bet history query by user, le produit isole les données par utilisateur et par partie.

### SHL.06 — ToastContext (retours utilisateur)
- **SHL.06.1** — *Objectif & périmètre.* Pour la configuration des bots avant practice, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.06.2** — *Entrées & contrats (API / UI).* Pour le tie-break sur identifiant affiché, le produit isole les données par utilisateur et par partie.
- **SHL.06.3** — *État, persistance & intégrité.* Pour le sound effects mute accessibility tie in si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.06.4** — *Temps réel & synchronisation.* Pour le tournament medal display top3, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.06.5** — *Sécurité, rôles & conformité.* Pour le http 500 hide stack prod, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.06.6** — *Erreurs, limites & dégradation.* Pour le leave friend loan cancel, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SHL.06.7** — *Exploitation & évolutivité.* Pour le loan paid off celebration si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **SHL.06.8** — *Objectif & périmètre.* Pour les friend requests entrantes/sortantes, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.06.9** — *Entrées & contrats (API / UI).* Pour les query params spectate=1 sur Game, le produit journalise les transitions sensibles pour audit.
- **SHL.06.10** — *État, persistance & intégrité.* Pour la déconnexion socket si token invalide, le produit vérifie les montants et soldes avant persistance.
- **SHL.06.11** — *Temps réel & synchronisation.* Pour le previous hand history sidebar si prévu, le produit journalise les transitions sensibles pour audit.
- **SHL.06.12** — *Sécurité, rôles & conformité.* Pour le previous hand history sidebar si prévu, le produit limite les abus par quotas, plafonds ou fréquence.

### SHL.07 — InvitationAcceptProvider (liens d’invitation)
- **SHL.07.1** — *Objectif & périmètre.* Pour le error boundary reset state, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.07.2** — *Entrées & contrats (API / UI).* Pour le practice bot expert wallet policy, le produit permet l’observabilité (latence, codes, corrélation).
- **SHL.07.3** — *État, persistance & intégrité.* Pour le block user social si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.07.4** — *Temps réel & synchronisation.* Pour les invitation party poker, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.07.5** — *Sécurité, rôles & conformité.* Pour le protected redirect login if no token, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.07.6** — *Erreurs, limites & dégradation.* Pour la quote hash exposée au client, le produit limite les abus par quotas, plafonds ou fréquence.
- **SHL.07.7** — *Exploitation & évolutivité.* Les alertes visuelles supplémentaires signalent tour à soi, timer critique ou gros pot sans son, pour l’accessibilité auditif partielle.
- **SHL.07.8** — *Objectif & périmètre.* Pour le hidden bet live window timing, le produit minimise la fuite d’information entre rôles.
- **SHL.07.9** — *Entrées & contrats (API / UI).* Pour les loans actifs vs historiques, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.07.10** — *État, persistance & intégrité.* Pour le all in call auto partial amount, le produit documente les préconditions et postconditions attendues.
- **SHL.07.11** — *Temps réel & synchronisation.* Pour le call amount computed server, le produit vérifie les montants et soldes avant persistance.
- **SHL.07.12** — *Sécurité, rôles & conformité.* Pour le skipSuccessfulRequests sur rate limit global, le produit synchronise l’UI sur le snapshot officiel après mutation.

### SHL.08 — Socket singleton et logs dev connect_error
- **SHL.08.1** — *Objectif & périmètre.* Pour le tournament spectate delay 5s, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SHL.08.2** — *Entrées & contrats (API / UI).* Pour le imgSrc blob data https, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.08.3** — *État, persistance & intégrité.* Pour le xp grant failure tolerance, le produit maintient la compatibilité mobile et navigateur.
- **SHL.08.4** — *Temps réel & synchronisation.* Pour le 2FA enable verify steps, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SHL.08.5** — *Sécurité, rôles & conformité.* Pour le cron tournament progression, le produit distingue erreurs réseau, auth et serveur côté client.
- **SHL.08.6** — *Erreurs, limites & dégradation.* Pour le navigation bottom bar si mobile, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.08.7** — *Exploitation & évolutivité.* Pour le reconnect same seat if free, le produit journalise les transitions sensibles pour audit.
- **SHL.08.8** — *Objectif & périmètre.* Pour la recherche searchUsers avec terme, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SHL.08.9** — *Entrées & contrats (API / UI).* Pour le feedback text max length, le produit expose des erreurs métier stables pour i18n et support.
- **SHL.08.10** — *État, persistance & intégrité.* Pour le requestId propagation logs, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SHL.08.11** — *Temps réel & synchronisation.* Pour les défis quotidiens et la réclamation de récompense, le produit vérifie les montants et soldes avant persistance.
- **SHL.08.12** — *Sécurité, rôles & conformité.* Toute action critique est rejetée si l’utilisateur n’est pas authentifié ou si le rôle (joueur, spectateur, bot) ne correspond pas au contexte socket.

## Tournoi — expérience client temps réel
_Balise `TOU_CLI` — logique fonctionnelle, sans code source._

### TOU_CLI.01 — Socket tournament-started → navigation gameId
- **TOU_CLI.01.1** — *Objectif & périmètre.* Pour le warning toast tournament soon, le produit expose des erreurs métier stables pour i18n et support.
- **TOU_CLI.01.2** — *Entrées & contrats (API / UI).* Pour les routes /api/blackjack-tables, le produit journalise les transitions sensibles pour audit.
- **TOU_CLI.01.3** — *État, persistance & intégrité.* Pour le console admin assign moderator si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TOU_CLI.01.4** — *Temps réel & synchronisation.* Pour la liste d’amis et les demandes, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.01.5** — *Sécurité, rôles & conformité.* Pour la réinitialisation de mot de passe par jeton, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.01.6** — *Erreurs, limites & dégradation.* Pour le bot action server driven timing, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **TOU_CLI.01.7** — *Exploitation & évolutivité.* Pour le qr code room invite si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TOU_CLI.01.8** — *Objectif & périmètre.* Pour les pages Roulette et SlotMachine, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.01.9** — *Entrées & contrats (API / UI).* Pour le username profanity filter si prévu, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.01.10** — *État, persistance & intégrité.* Pour le pot display multi-devises jetons, le produit limite les abus par quotas, plafonds ou fréquence.
- **TOU_CLI.01.11** — *Temps réel & synchronisation.* Pour le client RTK Query et invalidation de tags, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.01.12** — *Sécurité, rôles & conformité.* Pour la table poker temps réel (Game), le produit applique les règles de remboursement de prêt actif.

### TOU_CLI.02 — tournament-countdown → toasts
- **TOU_CLI.02.1** — *Objectif & périmètre.* Pour le friend request duplicate prevention, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **TOU_CLI.02.2** — *Entrées & contrats (API / UI).* Pour le mute player chat si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **TOU_CLI.02.3** — *État, persistance & intégrité.* Pour la banque blackjack multi tour par tour, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.02.4** — *Temps réel & synchronisation.* Pour le fold forcé ou check auto si timer, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.02.5** — *Sécurité, rôles & conformité.* Pour le service tournoi et broadcasts Socket.IO, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.02.6** — *Erreurs, limites & dégradation.* Pour le loan list filter active, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.02.7** — *Exploitation & évolutivité.* Pour le trust proxy et CORS allowlist, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.02.8** — *Objectif & périmètre.* Pour le degraded redis fallback memory, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.02.9** — *Entrées & contrats (API / UI).* Pour le small blind big blind labels i18n, le produit vérifie les montants et soldes avant persistance.
- **TOU_CLI.02.10** — *État, persistance & intégrité.* Pour le socket rejoin après refresh page, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.02.11** — *Temps réel & synchronisation.* Pour la page Friends et flux social, le produit documente les préconditions et postconditions attendues.
- **TOU_CLI.02.12** — *Sécurité, rôles & conformité.* Pour le tournament service static io, le produit respecte l’idempotence ou les clés d’unicité métier.

### TOU_CLI.03 — tournament-cancelled
- **TOU_CLI.03.1** — *Objectif & périmètre.* Pour le avatar image/jpeg size cap, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.03.2** — *Entrées & contrats (API / UI).* Pour la persistance difficulté bot en session, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.03.3** — *État, persistance & intégrité.* Pour le game socket join after HTTP start, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **TOU_CLI.03.4** — *Temps réel & synchronisation.* Pour le loader show on route transition, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.03.5** — *Sécurité, rôles & conformité.* Pour le socket auth handshake token, le produit permet l’observabilité (latence, codes, corrélation).
- **TOU_CLI.03.6** — *Erreurs, limites & dégradation.* Pour le wallet history append only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.03.7** — *Exploitation & évolutivité.* Pour le provider TableThemeProvider, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.03.8** — *Objectif & périmètre.* Pour le report submitted acknowledgment, le produit journalise les transitions sensibles pour audit.
- **TOU_CLI.03.9** — *Entrées & contrats (API / UI).* Pour le swagger hide topbar, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.03.10** — *État, persistance & intégrité.* Pour le color blind mode tritanopia, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.03.11** — *Temps réel & synchronisation.* Pour le game state sanitization avant emit, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.03.12** — *Sécurité, rôles & conformité.* Pour le provider AccessibilityMenuOpenContext, le produit refuse les actions si le rôle ne correspond pas au contexte.

### TOU_CLI.04 — tournament-player-joined
- **TOU_CLI.04.1** — *Objectif & périmètre.* Pour le min buy cash table, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.04.2** — *Entrées & contrats (API / UI).* Pour le report submitted acknowledgment, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.04.3** — *État, persistance & intégrité.* Pour le chat rate limit soft, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.04.4** — *Temps réel & synchronisation.* Pour le recovery service blackjack tables, le produit vérifie les montants et soldes avant persistance.
- **TOU_CLI.04.5** — *Sécurité, rôles & conformité.* Pour le tournament rebuy addon si supporté tournoi, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.04.6** — *Erreurs, limites & dégradation.* Pour le tournament blind level schedule, le produit limite les abus par quotas, plafonds ou fréquence.
- **TOU_CLI.04.7** — *Exploitation & évolutivité.* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit s’appuie sur la validation serveur comme source de vérité.
- **TOU_CLI.04.8** — *Objectif & périmètre.* Pour le previous hand history sidebar si prévu, le produit documente les préconditions et postconditions attendues.
- **TOU_CLI.04.9** — *Entrées & contrats (API / UI).* Pour le sound effects mute accessibility tie in si prévu, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.04.10** — *État, persistance & intégrité.* Pour le thème de table (felt / couleurs), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.04.11** — *Temps réel & synchronisation.* Pour le info toast player joined room, le produit expose des erreurs métier stables pour i18n et support.
- **TOU_CLI.04.12** — *Sécurité, rôles & conformité.* Pour le process exit boot failure, le produit documente les préconditions et postconditions attendues.

### TOU_CLI.05 — tournament-won / qualification finale
- **TOU_CLI.05.1** — *Objectif & périmètre.* Pour le logging confidence IA, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **TOU_CLI.05.2** — *Entrées & contrats (API / UI).* Les statistiques agrégées (victoires, mains jouées) sont incrémentées après coup validé ; les annulations ou rollbacks sont rares et tracées.
- **TOU_CLI.05.3** — *État, persistance & intégrité.* Pour le max players waiting room, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TOU_CLI.05.4** — *Temps réel & synchronisation.* Pour le navigation bottom bar si mobile, le produit documente les préconditions et postconditions attendues.
- **TOU_CLI.05.5** — *Sécurité, rôles & conformité.* Pour la quote hash exposée au client, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **TOU_CLI.05.6** — *Erreurs, limites & dégradation.* Pour le calcul meilleure main showdown, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TOU_CLI.05.7** — *Exploitation & évolutivité.* Pour les routes /api/leaderboard, le produit s’appuie sur la validation serveur comme source de vérité.
- **TOU_CLI.05.8** — *Objectif & périmètre.* Pour l’administration des tournois (page dédiée), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TOU_CLI.05.9** — *Entrées & contrats (API / UI).* Helmet renforce les en-têtes HTTP ; la politique CSP doit être alignée avec les origines des assets front et les WebSockets.
- **TOU_CLI.05.10** — *État, persistance & intégrité.* Pour le tournament leave before start refund, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.05.11** — *Temps réel & synchronisation.* Pour le persist chips expert bot path, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TOU_CLI.05.12** — *Sécurité, rôles & conformité.* Pour le tournament join wallet lock, le produit distingue erreurs réseau, auth et serveur côté client.

### TOU_CLI.06 — tournament-waiting-final
- **TOU_CLI.06.1** — *Objectif & périmètre.* Pour la page Profile et EditProfile, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.06.2** — *Entrées & contrats (API / UI).* Pour le feedback text max length, le produit s’appuie sur la validation serveur comme source de vérité.
- **TOU_CLI.06.3** — *État, persistance & intégrité.* Pour le waiting room join POST, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.06.4** — *Temps réel & synchronisation.* Pour le capacitor status bar style si mobile, le produit limite les abus par quotas, plafonds ou fréquence.
- **TOU_CLI.06.5** — *Sécurité, rôles & conformité.* Pour le 2FA backup codes si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.06.6** — *Erreurs, limites & dégradation.* Pour la page MiniGames, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.06.7** — *Exploitation & évolutivité.* Pour le provider d’accessibilité et menu, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.06.8** — *Objectif & périmètre.* Pour le capacitor status bar style si mobile, le produit expose des erreurs métier stables pour i18n et support.
- **TOU_CLI.06.9** — *Entrées & contrats (API / UI).* Pour le idempotency middleware scope, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TOU_CLI.06.10** — *État, persistance & intégrité.* Pour le tournament blind level schedule, le produit permet l’observabilité (latence, codes, corrélation).
- **TOU_CLI.06.11** — *Temps réel & synchronisation.* Pour le hidden bets result route params, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.06.12** — *Sécurité, rôles & conformité.* Pour les salles privées et demandes d’adhésion, le produit s’appuie sur la validation serveur comme source de vérité.

### TOU_CLI.07 — tournament-final-table + state players
- **TOU_CLI.07.1** — *Objectif & périmètre.* Pour le loan reminder notification si prévu, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.07.2** — *Entrées & contrats (API / UI).* Pour le game example route isolation, le produit permet l’observabilité (latence, codes, corrélation).
- **TOU_CLI.07.3** — *État, persistance & intégrité.* Pour le cors credentials true socket, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.07.4** — *Temps réel & synchronisation.* Pour le blackjack table gameId param, le produit permet l’observabilité (latence, codes, corrélation).
- **TOU_CLI.07.5** — *Sécurité, rôles & conformité.* Pour le message friend realtime poll or socket si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TOU_CLI.07.6** — *Erreurs, limites & dégradation.* Pour GameExample (démo / test intégration), le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.07.7** — *Exploitation & évolutivité.* Pour les défis quotidiens et la réclamation de récompense, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.07.8** — *Objectif & périmètre.* Pour le roulette result authoritative number, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.07.9** — *Entrées & contrats (API / UI).* Pour le tournament elimination zero chips, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.07.10** — *État, persistance & intégrité.* Pour le call amount computed server, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.07.11** — *Temps réel & synchronisation.* Pour le live flop market transition, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.07.12** — *Sécurité, rôles & conformité.* Pour le friends online presence indicator, le produit propage l’état via Socket.IO de façon agrégée.

### TOU_CLI.08 — tournament-eliminated overlay
- **TOU_CLI.08.1** — *Objectif & périmètre.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.08.2** — *Entrées & contrats (API / UI).* Pour l’AdminAuth isolé de l’auth joueur, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.08.3** — *État, persistance & intégrité.* Pour le level up notification, le produit s’appuie sur la validation serveur comme source de vérité.
- **TOU_CLI.08.4** — *Temps réel & synchronisation.* Pour le wallet insufficient funds message, le produit maintient la compatibilité mobile et navigateur.
- **TOU_CLI.08.5** — *Sécurité, rôles & conformité.* Pour le prisma error map user facing, le produit expose des erreurs métier stables pour i18n et support.
- **TOU_CLI.08.6** — *Erreurs, limites & dégradation.* Pour les classes CSS racine accessibilité, le produit applique les règles de remboursement de prêt actif.
- **TOU_CLI.08.7** — *Exploitation & évolutivité.* La pagination du leaderboard évite de charger des milliers de lignes ; le rang personnel est calculé via une requête dédiée avec le même critère de tri.
- **TOU_CLI.08.8** — *Objectif & périmètre.* Pour le loader global et les toasts, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.08.9** — *Entrées & contrats (API / UI).* Pour le join_game payload gameId, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **TOU_CLI.08.10** — *État, persistance & intégrité.* Pour la cotation et le placement de tickets, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.08.11** — *Temps réel & synchronisation.* Pour le hub mini-jeux (roulette, slot, blackjack), le produit expose des erreurs métier stables pour i18n et support.
- **TOU_CLI.08.12** — *Sécurité, rôles & conformité.* Pour le color blind mode deuteranopia, le produit reste désactivable ou restreint en production si sensible.

### TOU_CLI.09 — tournament-spectate délai puis spectate=1
- **TOU_CLI.09.1** — *Objectif & périmètre.* Pour la déconnexion socket si token invalide, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.09.2** — *Entrées & contrats (API / UI).* Pour la banque blackjack multi tour par tour, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.09.3** — *État, persistance & intégrité.* Pour le protected redirect login if no token, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.09.4** — *Temps réel & synchronisation.* Pour le broadcast io vers room tournoi, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.09.5** — *Sécurité, rôles & conformité.* Pour le socket global (auth token, connect_error), le produit vérifie les montants et soldes avant persistance.
- **TOU_CLI.09.6** — *Erreurs, limites & dégradation.* Pour le claim reward challenge, le produit respecte l’idempotence ou les clés d’unicité métier.
- **TOU_CLI.09.7** — *Exploitation & évolutivité.* Pour le i18n namespace auth labels, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **TOU_CLI.09.8** — *Objectif & périmètre.* Pour la résolution des paris cachés en fin de main, le produit distingue erreurs réseau, auth et serveur côté client.
- **TOU_CLI.09.9** — *Entrées & contrats (API / UI).* Pour le ready check database ping, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.09.10** — *État, persistance & intégrité.* Pour le spectate card masking rules, le produit permet l’observabilité (latence, codes, corrélation).
- **TOU_CLI.09.11** — *Temps réel & synchronisation.* Pour le friend request duplicate prevention, le produit journalise les transitions sensibles pour audit.
- **TOU_CLI.09.12** — *Sécurité, rôles & conformité.* Pour le reject friend loan, le produit documente les préconditions et postconditions attendues.

### TOU_CLI.10 — tournament-result overlay classement & gains
- **TOU_CLI.10.1** — *Objectif & périmètre.* Pour le all in call auto partial amount, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.10.2** — *Entrées & contrats (API / UI).* Pour le runout cartes après all-in, le produit isole les données par utilisateur et par partie.
- **TOU_CLI.10.3** — *État, persistance & intégrité.* Pour le admin console read only mode, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.10.4** — *Temps réel & synchronisation.* Pour le nettoyage planifié (cleanup jobs), le produit isole les données par utilisateur et par partie.
- **TOU_CLI.10.5** — *Sécurité, rôles & conformité.* Pour le warning toast tournament soon, le produit limite les abus par quotas, plafonds ou fréquence.
- **TOU_CLI.10.6** — *Erreurs, limites & dégradation.* Pour le updates static route behavior, le produit minimise la fuite d’information entre rôles.
- **TOU_CLI.10.7** — *Exploitation & évolutivité.* Pour le sync XP post-mini-jeu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **TOU_CLI.10.8** — *Objectif & périmètre.* Pour le blackjack lobby room id param, le produit reste désactivable ou restreint en production si sensible.
- **TOU_CLI.10.9** — *Entrées & contrats (API / UI).* Pour le i18n namespace casino labels, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **TOU_CLI.10.10** — *État, persistance & intégrité.* Pour les invitation party blackjack, le produit propage l’état via Socket.IO de façon agrégée.
- **TOU_CLI.10.11** — *Temps réel & synchronisation.* Pour le feedback thank you acknowledgment, le produit s’appuie sur la validation serveur comme source de vérité.
- **TOU_CLI.10.12** — *Sécurité, rôles & conformité.* Pour le calcul rang personnel leaderboard, le produit gère la concurrence par transactions courtes ou verrous logiques.

## Administration tournois (UI)
_Balise `ADM_TOUR` — logique fonctionnelle, sans code source._

### ADM_TOUR.01 — Page /admin/tournaments protégée
- **ADM_TOUR.01.1** — *Objectif & périmètre.* Pour la waiting room poker (création / rejoindre), le produit journalise les transitions sensibles pour audit.
- **ADM_TOUR.01.2** — *Entrées & contrats (API / UI).* Pour le dev socket.onAny pour debug, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM_TOUR.01.3** — *État, persistance & intégrité.* Pour le disconnect socket leave room, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM_TOUR.01.4** — *Temps réel & synchronisation.* Pour le JSON body limit (avatars data URL), le produit expose des erreurs métier stables pour i18n et support.
- **ADM_TOUR.01.5** — *Sécurité, rôles & conformité.* Pour le multi blackjack leave mid hand rules, le produit maintient la compatibilité mobile et navigateur.
- **ADM_TOUR.01.6** — *Erreurs, limites & dégradation.* Pour le profile stats wins losses hands, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **ADM_TOUR.01.7** — *Exploitation & évolutivité.* Pour la séparation practice / cash / casino / tournoi, le produit journalise les transitions sensibles pour audit.
- **ADM_TOUR.01.8** — *Objectif & périmètre.* Pour le xp anti farm cooldown server, le produit maintient la compatibilité mobile et navigateur.
- **ADM_TOUR.01.9** — *Entrées & contrats (API / UI).* Pour le dealer button rotation animation, le produit s’appuie sur la validation serveur comme source de vérité.
- **ADM_TOUR.01.10** — *État, persistance & intégrité.* Pour le tournament blind level schedule, le produit maintient la compatibilité mobile et navigateur.
- **ADM_TOUR.01.11** — *Temps réel & synchronisation.* Pour GameDeal et flux de distribution démo, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.01.12** — *Sécurité, rôles & conformité.* Pour le game gateway constructor side effects, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### ADM_TOUR.02 — Création / édition métadonnées tournoi
- **ADM_TOUR.02.1** — *Objectif & périmètre.* Pour la progression challenge stockée DB, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM_TOUR.02.2** — *Entrées & contrats (API / UI).* Pour l’administration des tournois (page dédiée), le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.02.3** — *État, persistance & intégrité.* Pour le room subscription socket join, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM_TOUR.02.4** — *Temps réel & synchronisation.* Pour le persist chips expert bot path, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM_TOUR.02.5** — *Sécurité, rôles & conformité.* Pour le accept friend loan crédit, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM_TOUR.02.6** — *Erreurs, limites & dégradation.* Pour l’en-tête x-idempotency-key sur les mutations, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM_TOUR.02.7** — *Exploitation & évolutivité.* Pour l’endpoint /api/health/live, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM_TOUR.02.8** — *Objectif & périmètre.* Pour le leave friend loan cancel, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM_TOUR.02.9** — *Entrées & contrats (API / UI).* Pour le swagger hide topbar, le produit expose des erreurs métier stables pour i18n et support.
- **ADM_TOUR.02.10** — *État, persistance & intégrité.* Pour le message friend realtime poll or socket si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **ADM_TOUR.02.11** — *Temps réel & synchronisation.* Pour le persist chips expert bot path, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM_TOUR.02.12** — *Sécurité, rôles & conformité.* Pour le cash queue promote spectator, le produit maintient la compatibilité mobile et navigateur.

### ADM_TOUR.03 — Liaison avec service & cron serveur
- **ADM_TOUR.03.1** — *Objectif & périmètre.* Pour la route admin générique dev-only, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADM_TOUR.03.2** — *Entrées & contrats (API / UI).* Pour le blocked user list si prévu, le produit isole les données par utilisateur et par partie.
- **ADM_TOUR.03.3** — *État, persistance & intégrité.* Pour le roulette loan repayment order, le produit expose des erreurs métier stables pour i18n et support.
- **ADM_TOUR.03.4** — *Temps réel & synchronisation.* Pour l’écran d’accueil (StartScreen), le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADM_TOUR.03.5** — *Sécurité, rôles & conformité.* Pour le ticket idempotent placement, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.03.6** — *Erreurs, limites & dégradation.* Pour le showdown evaluation HTTP internal, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.03.7** — *Exploitation & évolutivité.* Pour le game example route isolation, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.03.8** — *Objectif & périmètre.* Pour le private room join request timeout, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM_TOUR.03.9** — *Entrées & contrats (API / UI).* Pour le prisma transaction interactive poker cash, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM_TOUR.03.10** — *État, persistance & intégrité.* Pour le quantum bluff branding start screen, le produit reste désactivable ou restreint en production si sensible.
- **ADM_TOUR.03.11** — *Temps réel & synchronisation.* Pour le room subscription socket join, le produit distingue erreurs réseau, auth et serveur côté client.
- **ADM_TOUR.03.12** — *Sécurité, rôles & conformité.* Pour le tournament ranking scroll area, le produit reste désactivable ou restreint en production si sensible.

### ADM_TOUR.04 — Communication erreurs vers toasts
- **ADM_TOUR.04.1** — *Objectif & périmètre.* Pour la page WaitingRoom dédiée, le produit propage l’état via Socket.IO de façon agrégée.
- **ADM_TOUR.04.2** — *Entrées & contrats (API / UI).* Pour la recherche de joueurs, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADM_TOUR.04.3** — *État, persistance & intégrité.* Pour le join game error banned si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADM_TOUR.04.4** — *Temps réel & synchronisation.* Pour le admin runtime blackjack dev-only, le produit distingue erreurs réseau, auth et serveur côté client.
- **ADM_TOUR.04.5** — *Sécurité, rôles & conformité.* Les WebSockets se reconnectent avec backoff exponentiel côté client pour ne pas saturer le serveur après une panne réseau.
- **ADM_TOUR.04.6** — *Erreurs, limites & dégradation.* Pour le max players waiting room, le produit reste désactivable ou restreint en production si sensible.
- **ADM_TOUR.04.7** — *Exploitation & évolutivité.* Les Webhooks ou jobs async ne sont pas requis pour le cœur temps réel mais peuvent exister pour analytics externe si configuré.
- **ADM_TOUR.04.8** — *Objectif & périmètre.* Pour le persist chips expert bot path, le produit applique les règles de remboursement de prêt actif.
- **ADM_TOUR.04.9** — *Entrées & contrats (API / UI).* Pour la résolution des paris cachés en fin de main, le produit vérifie les montants et soldes avant persistance.
- **ADM_TOUR.04.10** — *État, persistance & intégrité.* Pour le tournament prize formatting locale, le produit minimise la fuite d’information entre rôles.
- **ADM_TOUR.04.11** — *Temps réel & synchronisation.* Pour le leaderboard (XP, jetons, victoires), le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADM_TOUR.04.12** — *Sécurité, rôles & conformité.* Pour les routes /api/hidden-bets avec rate limit dédié, le produit assure la cohérence wallet ↔ table ↔ tournoi.

## Messagerie entre amis
_Balise `FMSG` — logique fonctionnelle, sans code source._

### FMSG.01 — Liste des messages par conversation
- **FMSG.01.1** — *Objectif & périmètre.* Pour le error toast network french copy, le produit limite les abus par quotas, plafonds ou fréquence.
- **FMSG.01.2** — *Entrées & contrats (API / UI).* Pour le avatar image/jpeg size cap, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **FMSG.01.3** — *État, persistance & intégrité.* Pour le updates static route behavior, le produit s’appuie sur la validation serveur comme source de vérité.
- **FMSG.01.4** — *Temps réel & synchronisation.* Pour la banque blackjack multi tour par tour, le produit expose des erreurs métier stables pour i18n et support.
- **FMSG.01.5** — *Sécurité, rôles & conformité.* Pour le xp anti farm cooldown server, le produit propage l’état via Socket.IO de façon agrégée.
- **FMSG.01.6** — *Erreurs, limites & dégradation.* Pour l’acceptation de liens d’invitation, le produit maintient la compatibilité mobile et navigateur.
- **FMSG.01.7** — *Exploitation & évolutivité.* Pour le roulette result authoritative number, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.01.8** — *Objectif & périmètre.* Pour le xp grant failure tolerance, le produit applique les règles de remboursement de prêt actif.
- **FMSG.01.9** — *Entrées & contrats (API / UI).* Pour le degraded redis fallback memory, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.01.10** — *État, persistance & intégrité.* Pour le game page key pathname search reset, le produit journalise les transitions sensibles pour audit.
- **FMSG.01.11** — *Temps réel & synchronisation.* Pour le mobile touch targets buttons, le produit minimise la fuite d’information entre rôles.
- **FMSG.01.12** — *Sécurité, rôles & conformité.* Pour le recovery question list server, le produit documente les préconditions et postconditions attendues.

### FMSG.02 — Envoi message texte
- **FMSG.02.1** — *Objectif & périmètre.* Pour les player reports motifs, le produit documente les préconditions et postconditions attendues.
- **FMSG.02.2** — *Entrées & contrats (API / UI).* Pour les player reports motifs, le produit isole les données par utilisateur et par partie.
- **FMSG.02.3** — *État, persistance & intégrité.* Pour l’administration des tournois (page dédiée), le produit maintient la compatibilité mobile et navigateur.
- **FMSG.02.4** — *Temps réel & synchronisation.* Pour la page MiniGames, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FMSG.02.5** — *Sécurité, rôles & conformité.* Pour le roulette result authoritative number, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.02.6** — *Erreurs, limites & dégradation.* Pour l’écran de résultat tournoi et le classement gains, le produit journalise les transitions sensibles pour audit.
- **FMSG.02.7** — *Exploitation & évolutivité.* Pour le note player tag si prévu, le produit limite les abus par quotas, plafonds ou fréquence.
- **FMSG.02.8** — *Objectif & périmètre.* Pour le admin tournaments UI fields, le produit permet l’observabilité (latence, codes, corrélation).
- **FMSG.02.9** — *Entrées & contrats (API / UI).* Pour le flux login → invalidation User, le produit limite les abus par quotas, plafonds ou fréquence.
- **FMSG.02.10** — *État, persistance & intégrité.* Pour le waiting room ready toggle, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.02.11** — *Temps réel & synchronisation.* Pour le blocked user list si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.02.12** — *Sécurité, rôles & conformité.* Pour le waiting room list GET, le produit expose des erreurs métier stables pour i18n et support.

### FMSG.03 — Rafraîchissement / cache RTK
- **FMSG.03.1** — *Objectif & périmètre.* Pour le helmet frame ancestors self, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.03.2** — *Entrées & contrats (API / UI).* Pour le tournament trophy asset display, le produit applique les règles de remboursement de prêt actif.
- **FMSG.03.3** — *État, persistance & intégrité.* Pour l’avatar (fichier ou URL) et quotas taille, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FMSG.03.4** — *Temps réel & synchronisation.* Pour le sound effects mute accessibility tie in si prévu, le produit permet l’observabilité (latence, codes, corrélation).
- **FMSG.03.5** — *Sécurité, rôles & conformité.* Pour le pot odds hint display optional client only, le produit permet l’observabilité (latence, codes, corrélation).
- **FMSG.03.6** — *Erreurs, limites & dégradation.* Pour le game page key pathname search reset, le produit s’appuie sur la validation serveur comme source de vérité.
- **FMSG.03.7** — *Exploitation & évolutivité.* Pour le invitation accept deep link route, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.03.8** — *Objectif & périmètre.* Pour les invitation party poker, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.03.9** — *Entrées & contrats (API / UI).* Pour la route racine updatesRouter, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **FMSG.03.10** — *État, persistance & intégrité.* Pour le feedback text max length, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.03.11** — *Temps réel & synchronisation.* Pour le block user social si prévu, le produit documente les préconditions et postconditions attendues.
- **FMSG.03.12** — *Sécurité, rôles & conformité.* Pour le feedback route séparée reports, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### FMSG.04 — Limites anti-spam côté serveur si configurées
- **FMSG.04.1** — *Objectif & périmètre.* Pour le claim reward challenge, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.04.2** — *Entrées & contrats (API / UI).* Pour le solo blackjack settlement push state, le produit distingue erreurs réseau, auth et serveur côté client.
- **FMSG.04.3** — *État, persistance & intégrité.* Pour le tournament prize pool calculation, le produit expose des erreurs métier stables pour i18n et support.
- **FMSG.04.4** — *Temps réel & synchronisation.* Pour le persist chips expert bot path, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **FMSG.04.5** — *Sécurité, rôles & conformité.* Pour le leaderboard (XP, jetons, victoires), le produit permet l’observabilité (latence, codes, corrélation).
- **FMSG.04.6** — *Erreurs, limites & dégradation.* Pour le avatar image/jpeg size cap, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.04.7** — *Exploitation & évolutivité.* Pour le loader show on route transition, le produit journalise les transitions sensibles pour audit.
- **FMSG.04.8** — *Objectif & périmètre.* Pour la téléportation socket vers table de tournoi, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FMSG.04.9** — *Entrées & contrats (API / UI).* Les WebSockets se reconnectent avec backoff exponentiel côté client pour ne pas saturer le serveur après une panne réseau.
- **FMSG.04.10** — *État, persistance & intégrité.* Pour le microservice Python pour décisions expert bot, le produit journalise les transitions sensibles pour audit.
- **FMSG.04.11** — *Temps réel & synchronisation.* Pour le stats increment async post commit, le produit documente les préconditions et postconditions attendues.
- **FMSG.04.12** — *Sécurité, rôles & conformité.* Pour le last action log poker UI, le produit distingue erreurs réseau, auth et serveur côté client.

## Feedback utilisateur
_Balise `FBK` — logique fonctionnelle, sans code source._

### FBK.01 — Soumission avis / retour UX
- **FBK.01.1** — *Objectif & périmètre.* Pour le admin runtime poker dev-only, le produit maintient la compatibilité mobile et navigateur.
- **FBK.01.2** — *Entrées & contrats (API / UI).* Pour le all in call auto partial amount, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **FBK.01.3** — *État, persistance & intégrité.* Pour le broadcast io vers room tournoi, le produit applique les règles de remboursement de prêt actif.
- **FBK.01.4** — *Temps réel & synchronisation.* Pour le chat de table, le produit reste désactivable ou restreint en production si sensible.
- **FBK.01.5** — *Sécurité, rôles & conformité.* Pour le tournament cancelled refund policy, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FBK.01.6** — *Erreurs, limites & dégradation.* Pour le TournamentTeleporter dans App, le produit reste désactivable ou restreint en production si sensible.
- **FBK.01.7** — *Exploitation & évolutivité.* Pour le sync XP post-mini-jeu, le produit applique les règles de remboursement de prêt actif.
- **FBK.01.8** — *Objectif & périmètre.* Pour le i18n namespace casino labels, le produit reste désactivable ou restreint en production si sensible.
- **FBK.01.9** — *Entrées & contrats (API / UI).* Pour le sound effects mute accessibility tie in si prévu, le produit s’appuie sur la validation serveur comme source de vérité.
- **FBK.01.10** — *État, persistance & intégrité.* Pour les invitation party blackjack, le produit permet l’observabilité (latence, codes, corrélation).
- **FBK.01.11** — *Temps réel & synchronisation.* Pour le gestionnaire d’erreurs HTTP global Express, le produit respecte l’idempotence ou les clés d’unicité métier.
- **FBK.01.12** — *Sécurité, rôles & conformité.* Pour le ledger casino atomique, le produit limite les abus par quotas, plafonds ou fréquence.

### FBK.02 — Stockage pour analyse produit
- **FBK.02.1** — *Objectif & périmètre.* Pour le admin redirect if not admin jwt, le produit isole les données par utilisateur et par partie.
- **FBK.02.2** — *Entrées & contrats (API / UI).* Pour les paris cachés et leurs phases de marché, le produit applique les règles de remboursement de prêt actif.
- **FBK.02.3** — *État, persistance & intégrité.* Pour les routes /api/bot avec rate limit dédié, le produit maintient la compatibilité mobile et navigateur.
- **FBK.02.4** — *Temps réel & synchronisation.* Pour le report submitted acknowledgment, le produit reste désactivable ou restreint en production si sensible.
- **FBK.02.5** — *Sécurité, rôles & conformité.* Pour le small blind big blind labels i18n, le produit applique les règles de remboursement de prêt actif.
- **FBK.02.6** — *Erreurs, limites & dégradation.* Pour la console admin JWT console, le produit maintient la compatibilité mobile et navigateur.
- **FBK.02.7** — *Exploitation & évolutivité.* Pour le game gateway constructor side effects, le produit journalise les transitions sensibles pour audit.
- **FBK.02.8** — *Objectif & périmètre.* Pour le degraded redis fallback memory, le produit isole les données par utilisateur et par partie.
- **FBK.02.9** — *Entrées & contrats (API / UI).* Pour le lobby quick actions row, le produit expose des erreurs métier stables pour i18n et support.
- **FBK.02.10** — *État, persistance & intégrité.* Pour les invitations socket room blackjack, le produit s’appuie sur la validation serveur comme source de vérité.
- **FBK.02.11** — *Temps réel & synchronisation.* Pour le practice bot expert wallet policy, le produit s’appuie sur la validation serveur comme source de vérité.
- **FBK.02.12** — *Sécurité, rôles & conformité.* Pour les prêts entre amis (demande, taux, acceptation), le produit distingue erreurs réseau, auth et serveur côté client.

### FBK.03 — Séparation des données de jeu temps réel
- **FBK.03.1** — *Objectif & périmètre.* Pour la route racine updatesRouter, le produit reste désactivable ou restreint en production si sensible.
- **FBK.03.2** — *Entrées & contrats (API / UI).* Pour les avis / notes post-partie, le produit distingue erreurs réseau, auth et serveur côté client.
- **FBK.03.3** — *État, persistance & intégrité.* Pour le gestionnaire d’erreurs HTTP global Express, le produit propage l’état via Socket.IO de façon agrégée.
- **FBK.03.4** — *Temps réel & synchronisation.* Pour le profil utilisateur et l’édition, le produit propage l’état via Socket.IO de façon agrégée.
- **FBK.03.5** — *Sécurité, rôles & conformité.* Pour le ready check database ping, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FBK.03.6** — *Erreurs, limites & dégradation.* Pour la documentation Swagger /api-docs, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FBK.03.7** — *Exploitation & évolutivité.* Pour les messages privés entre amis, le produit limite les abus par quotas, plafonds ou fréquence.
- **FBK.03.8** — *Objectif & périmètre.* Pour le friend not found search, le produit isole les données par utilisateur et par partie.
- **FBK.03.9** — *Entrées & contrats (API / UI).* Pour le tournament overlay z-index full screen, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **FBK.03.10** — *État, persistance & intégrité.* Pour le leave friend loan cancel, le produit documente les préconditions et postconditions attendues.
- **FBK.03.11** — *Temps réel & synchronisation.* Pour le edit profile change password current required, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **FBK.03.12** — *Sécurité, rôles & conformité.* Pour le tournament min players start check, le produit expose des erreurs métier stables pour i18n et support.

## Signalements joueur (reports)
_Balise `RPT` — logique fonctionnelle, sans code source._

### RPT.01 — Création signalement cible + motif
- **RPT.01.1** — *Objectif & périmètre.* Pour le rematch same players flag, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **RPT.01.2** — *Entrées & contrats (API / UI).* Pour les tags RTK FriendLoan et invalidations croisées, le produit reste désactivable ou restreint en production si sensible.
- **RPT.01.3** — *État, persistance & intégrité.* Pour la configuration trust proxy, le produit s’appuie sur la validation serveur comme source de vérité.
- **RPT.01.4** — *Temps réel & synchronisation.* Pour le tournament elimination zero chips, le produit journalise les transitions sensibles pour audit.
- **RPT.01.5** — *Sécurité, rôles & conformité.* Pour le swagger hide topbar, le produit respecte l’idempotence ou les clés d’unicité métier.
- **RPT.01.6** — *Erreurs, limites & dégradation.* Pour les métriques Prometheus et endpoint /metrics, le produit expose des erreurs métier stables pour i18n et support.
- **RPT.01.7** — *Exploitation & évolutivité.* Pour le protected redirect login if no token, le produit expose des erreurs métier stables pour i18n et support.
- **RPT.01.8** — *Objectif & périmètre.* Pour les Webhooks ou jobs async optionnels, le produit reste désactivable ou restreint en production si sensible.
- **RPT.01.9** — *Entrées & contrats (API / UI).* Pour le number formatting chips locale, le produit limite les abus par quotas, plafonds ou fréquence.
- **RPT.01.10** — *État, persistance & intégrité.* Pour le call amount computed server, le produit journalise les transitions sensibles pour audit.
- **RPT.01.11** — *Temps réel & synchronisation.* Pour le admin tournament force start si prévu, le produit reste désactivable ou restreint en production si sensible.
- **RPT.01.12** — *Sécurité, rôles & conformité.* Pour les défis quotidiens et la réclamation de récompense, le produit journalise les transitions sensibles pour audit.

### RPT.02 — File modération côté admin
- **RPT.02.1** — *Objectif & périmètre.* Pour le idempotency middleware scope, le produit applique les règles de remboursement de prêt actif.
- **RPT.02.2** — *Entrées & contrats (API / UI).* Les parties privées peuvent mémoriser un code ou une liste blanche selon le modèle produit ; le serveur vérifie à chaque tentative de jointure.
- **RPT.02.3** — *État, persistance & intégrité.* Pour le stats increment async post commit, le produit applique les règles de remboursement de prêt actif.
- **RPT.02.4** — *Temps réel & synchronisation.* Pour l’écran de résultat tournoi et le classement gains, le produit reste désactivable ou restreint en production si sensible.
- **RPT.02.5** — *Sécurité, rôles & conformité.* Pour la page Swagger /api-docs, le produit minimise la fuite d’information entre rôles.
- **RPT.02.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by user, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **RPT.02.7** — *Exploitation & évolutivité.* Pour le tournament service static io, le produit journalise les transitions sensibles pour audit.
- **RPT.02.8** — *Objectif & périmètre.* Pour le blackjack bet limits table, le produit applique les règles de remboursement de prêt actif.
- **RPT.02.9** — *Entrées & contrats (API / UI).* Pour le calcul rang personnel leaderboard, le produit maintient la compatibilité mobile et navigateur.
- **RPT.02.10** — *État, persistance & intégrité.* Pour les métriques Prometheus et endpoint /metrics, le produit reste désactivable ou restreint en production si sensible.
- **RPT.02.11** — *Temps réel & synchronisation.* Pour le socket rejoin après refresh page, le produit reste désactivable ou restreint en production si sensible.
- **RPT.02.12** — *Sécurité, rôles & conformité.* Pour le admin tournament delete cascade, le produit reste désactivable ou restreint en production si sensible.

### RPT.03 — Traçabilité pour décisions futures
- **RPT.03.1** — *Objectif & périmètre.* Pour le register password strength, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **RPT.03.2** — *Entrées & contrats (API / UI).* Pour les avis / notes post-partie, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **RPT.03.3** — *État, persistance & intégrité.* Pour la gamification (niveaux, badges, plafonds de mise), le produit reste désactivable ou restreint en production si sensible.
- **RPT.03.4** — *Temps réel & synchronisation.* Pour le daily challenge rollover timezone UTC, le produit journalise les transitions sensibles pour audit.
- **RPT.03.5** — *Sécurité, rôles & conformité.* Pour le quantum bluff branding start screen, le produit journalise les transitions sensibles pour audit.
- **RPT.03.6** — *Erreurs, limites & dégradation.* Pour le loader show on route transition, le produit applique les règles de remboursement de prêt actif.
- **RPT.03.7** — *Exploitation & évolutivité.* Pour la pagination et filtres leaderboard, le produit limite les abus par quotas, plafonds ou fréquence.
- **RPT.03.8** — *Objectif & périmètre.* Pour GameDeal et flux de distribution démo, le produit isole les données par utilisateur et par partie.
- **RPT.03.9** — *Entrées & contrats (API / UI).* Pour le state tournamentPlayers passé en navigation, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **RPT.03.10** — *État, persistance & intégrité.* Pour le hook useUser et synchronisation token, le produit permet l’observabilité (latence, codes, corrélation).
- **RPT.03.11** — *Temps réel & synchronisation.* Pour l’override roulette numéro forcé dev-only, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **RPT.03.12** — *Sécurité, rôles & conformité.* Pour le microservice Python pour décisions expert bot, le produit vérifie les montants et soldes avant persistance.

## Console admin web
_Balise `ADMWEB` — logique fonctionnelle, sans code source._

### ADMWEB.01 — Auth JWT rôle admin dédiée (ADMIN_CONSOLE_*)
- **ADMWEB.01.1** — *Objectif & périmètre.* Pour le reset token single use, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.01.2** — *Entrées & contrats (API / UI).* Pour le tournament overlay z-index full screen, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADMWEB.01.3** — *État, persistance & intégrité.* Pour le tournament name branding header, le produit distingue erreurs réseau, auth et serveur côté client.
- **ADMWEB.01.4** — *Temps réel & synchronisation.* Pour le tournament ranking by chips, le produit permet l’observabilité (latence, codes, corrélation).
- **ADMWEB.01.5** — *Sécurité, rôles & conformité.* Pour le spectate join as observer, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADMWEB.01.6** — *Erreurs, limites & dégradation.* Pour GameDeal et flux de distribution démo, le produit documente les préconditions et postconditions attendues.
- **ADMWEB.01.7** — *Exploitation & évolutivité.* Pour le profile badges grid, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.01.8** — *Objectif & périmètre.* Pour les routes dev-only (runtime poker, blackjack, override roulette), le produit applique les règles de remboursement de prêt actif.
- **ADMWEB.01.9** — *Entrées & contrats (API / UI).* Pour le loan exceeds allowed rate error, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADMWEB.01.10** — *État, persistance & intégrité.* Pour le helmet frame ancestors self, le produit isole les données par utilisateur et par partie.
- **ADMWEB.01.11** — *Temps réel & synchronisation.* Pour les loans actifs vs historiques, le produit journalise les transitions sensibles pour audit.
- **ADMWEB.01.12** — *Sécurité, rôles & conformité.* Pour les signalements joueur, le produit reste désactivable ou restreint en production si sensible.

### ADMWEB.02 — Lecture signalements / feedbacks
- **ADMWEB.02.1** — *Objectif & périmètre.* Pour la page Friends et flux social, le produit journalise les transitions sensibles pour audit.
- **ADMWEB.02.2** — *Entrées & contrats (API / UI).* Pour le tournament overlay z-index full screen, le produit minimise la fuite d’information entre rôles.
- **ADMWEB.02.3** — *État, persistance & intégrité.* Pour le qr code room invite si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADMWEB.02.4** — *Temps réel & synchronisation.* Pour le sound effects mute accessibility tie in si prévu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADMWEB.02.5** — *Sécurité, rôles & conformité.* Pour le action buttons disabled wrong turn, le produit documente les préconditions et postconditions attendues.
- **ADMWEB.02.6** — *Erreurs, limites & dégradation.* Pour le accessibility skip link si prévu, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **ADMWEB.02.7** — *Exploitation & évolutivité.* Pour le min buy cash table, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.02.8** — *Objectif & périmètre.* Pour le basename Capacitor vs web, le produit journalise les transitions sensibles pour audit.
- **ADMWEB.02.9** — *Entrées & contrats (API / UI).* Pour le game state sanitization avant emit, le produit s’appuie sur la validation serveur comme source de vérité.
- **ADMWEB.02.10** — *État, persistance & intégrité.* Pour le hidden bet live window timing, le produit s’appuie sur la validation serveur comme source de vérité.
- **ADMWEB.02.11** — *Temps réel & synchronisation.* Pour le admin tournament delete cascade, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **ADMWEB.02.12** — *Sécurité, rôles & conformité.* Pour l’écran de résultat tournoi et le classement gains, le produit vérifie les montants et soldes avant persistance.

### ADMWEB.03 — Actions de modération si implémentées
- **ADMWEB.03.1** — *Objectif & périmètre.* Pour le rebuy max table enforcement, le produit distingue erreurs réseau, auth et serveur côté client.
- **ADMWEB.03.2** — *Entrées & contrats (API / UI).* Pour l’override roulette numéro forcé dev-only, le produit reste désactivable ou restreint en production si sensible.
- **ADMWEB.03.3** — *État, persistance & intégrité.* Pour le tournament prize formatting locale, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.03.4** — *Temps réel & synchronisation.* Pour le admin console read only mode, le produit limite les abus par quotas, plafonds ou fréquence.
- **ADMWEB.03.5** — *Sécurité, rôles & conformité.* Pour le friends online presence indicator, le produit isole les données par utilisateur et par partie.
- **ADMWEB.03.6** — *Erreurs, limites & dégradation.* Pour le cash sit-out / rebuy / leave, le produit permet l’observabilité (latence, codes, corrélation).
- **ADMWEB.03.7** — *Exploitation & évolutivité.* Pour le i18n namespace casino labels, le produit reste désactivable ou restreint en production si sensible.
- **ADMWEB.03.8** — *Objectif & périmètre.* Pour le tournament leave before start refund, le produit journalise les transitions sensibles pour audit.
- **ADMWEB.03.9** — *Entrées & contrats (API / UI).* Pour les invitations à une table blackjack, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.03.10** — *État, persistance & intégrité.* Pour le warning toast tournament soon, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADMWEB.03.11** — *Temps réel & synchronisation.* Pour le last action log poker UI, le produit reste désactivable ou restreint en production si sensible.
- **ADMWEB.03.12** — *Sécurité, rôles & conformité.* Pour le capacitor splash screen si mobile, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### ADMWEB.04 — Séparation stricte des comptes joueurs
- **ADMWEB.04.1** — *Objectif & périmètre.* Pour le tournament leave before start refund, le produit minimise la fuite d’information entre rôles.
- **ADMWEB.04.2** — *Entrées & contrats (API / UI).* Pour le console admin filter by status, le produit vérifie les montants et soldes avant persistance.
- **ADMWEB.04.3** — *État, persistance & intégrité.* Pour les healthchecks live / ready et dépendances, le produit minimise la fuite d’information entre rôles.
- **ADMWEB.04.4** — *Temps réel & synchronisation.* Pour la réinitialisation de mot de passe par jeton, le produit applique les règles de remboursement de prêt actif.
- **ADMWEB.04.5** — *Sécurité, rôles & conformité.* Pour la console admin JWT console, le produit applique les règles de remboursement de prêt actif.
- **ADMWEB.04.6** — *Erreurs, limites & dégradation.* Pour l’anti-cheat middleware HTTP, le produit respecte l’idempotence ou les clés d’unicité métier.
- **ADMWEB.04.7** — *Exploitation & évolutivité.* Pour le street advance server event broadcast, le produit isole les données par utilisateur et par partie.
- **ADMWEB.04.8** — *Objectif & périmètre.* Pour le server socketAuth middleware order, le produit minimise la fuite d’information entre rôles.
- **ADMWEB.04.9** — *Entrées & contrats (API / UI).* Pour le invitation accept deep link route, le produit reste désactivable ou restreint en production si sensible.
- **ADMWEB.04.10** — *État, persistance & intégrité.* Pour le i18n namespace game labels, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **ADMWEB.04.11** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit isole les données par utilisateur et par partie.
- **ADMWEB.04.12** — *Sécurité, rôles & conformité.* Pour le updates check new version banner si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

## Mises à jour & distribution client
_Balise `UPD` — logique fonctionnelle, sans code source._

### UPD.01 — Route updates racine côté serveur
- **UPD.01.1** — *Objectif & périmètre.* Pour le tournament ranking by chips, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **UPD.01.2** — *Entrées & contrats (API / UI).* Pour le trust proxy et CORS allowlist, le produit propage l’état via Socket.IO de façon agrégée.
- **UPD.01.3** — *État, persistance & intégrité.* Pour le cash queue promote spectator, le produit permet l’observabilité (latence, codes, corrélation).
- **UPD.01.4** — *Temps réel & synchronisation.* Pour le tournament result delay 12s, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **UPD.01.5** — *Sécurité, rôles & conformité.* Pour le join game error wrong password private, le produit limite les abus par quotas, plafonds ou fréquence.
- **UPD.01.6** — *Erreurs, limites & dégradation.* Pour le stockage token localStorage, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **UPD.01.7** — *Exploitation & évolutivité.* Pour le leave_game cleanup seat, le produit expose des erreurs métier stables pour i18n et support.
- **UPD.01.8** — *Objectif & périmètre.* Pour le game deal route isolation, le produit expose des erreurs métier stables pour i18n et support.
- **UPD.01.9** — *Entrées & contrats (API / UI).* Pour les timeouts HTTP globaux, le produit reste désactivable ou restreint en production si sensible.
- **UPD.01.10** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit minimise la fuite d’information entre rôles.
- **UPD.01.11** — *Temps réel & synchronisation.* Pour le taux prêt borne min max, le produit reste désactivable ou restreint en production si sensible.
- **UPD.01.12** — *Sécurité, rôles & conformité.* Pour le leaderboard self rank highlight, le produit reste désactivable ou restreint en production si sensible.

### UPD.02 — Intégration future PWA / binaires Capacitor
- **UPD.02.1** — *Objectif & périmètre.* Pour le socket error ack client toast, le produit maintient la compatibilité mobile et navigateur.
- **UPD.02.2** — *Entrées & contrats (API / UI).* Pour le reject friend loan, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **UPD.02.3** — *État, persistance & intégrité.* Pour le rematch same players flag, le produit maintient la compatibilité mobile et navigateur.
- **UPD.02.4** — *Temps réel & synchronisation.* Pour la progression challenge stockée DB, le produit reste désactivable ou restreint en production si sensible.
- **UPD.02.5** — *Sécurité, rôles & conformité.* Pour l’override roulette numéro forcé dev-only, le produit reste désactivable ou restreint en production si sensible.
- **UPD.02.6** — *Erreurs, limites & dégradation.* Pour le friend not found search, le produit documente les préconditions et postconditions attendues.
- **UPD.02.7** — *Exploitation & évolutivité.* Pour le fallback reason code IA, le produit journalise les transitions sensibles pour audit.
- **UPD.02.8** — *Objectif & périmètre.* Pour le imgSrc blob data https, le produit maintient la compatibilité mobile et navigateur.
- **UPD.02.9** — *Entrées & contrats (API / UI).* Pour le join game error wrong password private, le produit distingue erreurs réseau, auth et serveur côté client.
- **UPD.02.10** — *État, persistance & intégrité.* Pour le tournament cancelled refund policy, le produit expose des erreurs métier stables pour i18n et support.
- **UPD.02.11** — *Temps réel & synchronisation.* Pour le solo blackjack settlement push state, le produit reste désactivable ou restreint en production si sensible.
- **UPD.02.12** — *Sécurité, rôles & conformité.* Pour les prêts entre amis (demande, taux, acceptation), le produit synchronise l’UI sur le snapshot officiel après mutation.

### UPD.03 — Versioning ou changelog exposable
- **UPD.03.1** — *Objectif & périmètre.* Les traductions manquantes retombent sur une langue par défaut avec marquage possible en développement seulement.
- **UPD.03.2** — *Entrées & contrats (API / UI).* Pour l’état WAITING DEAL PLAY BUST blackjack multi, le produit maintient la compatibilité mobile et navigateur.
- **UPD.03.3** — *État, persistance & intégrité.* Pour la persistance difficulté bot en session, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **UPD.03.4** — *Temps réel & synchronisation.* Pour la route admin générique dev-only, le produit applique les règles de remboursement de prêt actif.
- **UPD.03.5** — *Sécurité, rôles & conformité.* Pour le side pot UI lecture état serveur, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **UPD.03.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by game, le produit s’appuie sur la validation serveur comme source de vérité.
- **UPD.03.7** — *Exploitation & évolutivité.* Pour la console admin web (JWT rôle admin), le produit vérifie les montants et soldes avant persistance.
- **UPD.03.8** — *Objectif & périmètre.* Pour le player action validation amounts, le produit reste désactivable ou restreint en production si sensible.
- **UPD.03.9** — *Entrées & contrats (API / UI).* Pour les routes /api/bot avec rate limit dédié, le produit permet l’observabilité (latence, codes, corrélation).
- **UPD.03.10** — *État, persistance & intégrité.* Pour le feedback route séparée reports, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **UPD.03.11** — *Temps réel & synchronisation.* Pour le blackjack lobby room id param, le produit maintient la compatibilité mobile et navigateur.
- **UPD.03.12** — *Sécurité, rôles & conformité.* Pour le tournament leave before start refund, le produit limite les abus par quotas, plafonds ou fréquence.

## Démos & flux GameDeal / GameExample
_Balise `GDE` — logique fonctionnelle, sans code source._

### GDE.01 — GameDeal : scénario de donne / animation
- **GDE.01.1** — *Objectif & périmètre.* Pour la page HiddenBetsResult, le produit minimise la fuite d’information entre rôles.
- **GDE.01.2** — *Entrées & contrats (API / UI).* Pour le service tournoi et broadcasts Socket.IO, le produit journalise les transitions sensibles pour audit.
- **GDE.01.3** — *État, persistance & intégrité.* Pour la page Friends et flux social, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GDE.01.4** — *Temps réel & synchronisation.* Pour le practice bot non-expert jetons virtuels, le produit s’appuie sur la validation serveur comme source de vérité.
- **GDE.01.5** — *Sécurité, rôles & conformité.* Pour le leaderboard SQL ORDER BY, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **GDE.01.6** — *Erreurs, limites & dégradation.* Pour GameExample (démo / test intégration), le produit respecte l’idempotence ou les clés d’unicité métier.
- **GDE.01.7** — *Exploitation & évolutivité.* Pour le tournament ranking by chips, le produit s’appuie sur la validation serveur comme source de vérité.
- **GDE.01.8** — *Objectif & périmètre.* Pour le raise slider max stack bound, le produit permet l’observabilité (latence, codes, corrélation).
- **GDE.01.9** — *Entrées & contrats (API / UI).* Pour le high contrast token colors, le produit expose des erreurs métier stables pour i18n et support.
- **GDE.01.10** — *État, persistance & intégrité.* Pour le capacitor status bar style si mobile, le produit minimise la fuite d’information entre rôles.
- **GDE.01.11** — *Temps réel & synchronisation.* Pour le remboursement automatique sur gains casino, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GDE.01.12** — *Sécurité, rôles & conformité.* Pour le latency metric histogram si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.

### GDE.02 — GameExample : intégration ou démo protégée
- **GDE.02.1** — *Objectif & périmètre.* Pour le color blind mode protanopia, le produit expose des erreurs métier stables pour i18n et support.
- **GDE.02.2** — *Entrées & contrats (API / UI).* Pour la page Friends et flux social, le produit propage l’état via Socket.IO de façon agrégée.
- **GDE.02.3** — *État, persistance & intégrité.* Pour le ready check database ping, le produit minimise la fuite d’information entre rôles.
- **GDE.02.4** — *Temps réel & synchronisation.* Pour le roulette wheel animation client only, le produit documente les préconditions et postconditions attendues.
- **GDE.02.5** — *Sécurité, rôles & conformité.* Pour le client RTK Query et invalidation de tags, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GDE.02.6** — *Erreurs, limites & dégradation.* Pour le calcul meilleure main showdown, le produit minimise la fuite d’information entre rôles.
- **GDE.02.7** — *Exploitation & évolutivité.* Pour les logs structurés et requestId, le produit isole les données par utilisateur et par partie.
- **GDE.02.8** — *Objectif & périmètre.* Pour le leaderboard self rank highlight, le produit permet l’observabilité (latence, codes, corrélation).
- **GDE.02.9** — *Entrées & contrats (API / UI).* Pour le small blind big blind labels i18n, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GDE.02.10** — *État, persistance & intégrité.* Pour le bot decision log structured, le produit documente les préconditions et postconditions attendues.
- **GDE.02.11** — *Temps réel & synchronisation.* Pour la page résultats paris cachés, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GDE.02.12** — *Sécurité, rôles & conformité.* Pour le trust proxy et CORS allowlist, le produit propage l’état via Socket.IO de façon agrégée.

### GDE.03 — Aucun impact wallet hors contexte practice
- **GDE.03.1** — *Objectif & périmètre.* Pour le call amount computed server, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **GDE.03.2** — *Entrées & contrats (API / UI).* Pour la page WaitingRoom dédiée, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GDE.03.3** — *État, persistance & intégrité.* Pour le rematch same players flag, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GDE.03.4** — *Temps réel & synchronisation.* Pour le mode spectateur et la file de reprise siège, le produit vérifie les montants et soldes avant persistance.
- **GDE.03.5** — *Sécurité, rôles & conformité.* Pour le room subscription socket join, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GDE.03.6** — *Erreurs, limites & dégradation.* Pour le report category enum, le produit isole les données par utilisateur et par partie.
- **GDE.03.7** — *Exploitation & évolutivité.* Pour le room subscription socket join, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **GDE.03.8** — *Objectif & périmètre.* Pour le logging confidence IA, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GDE.03.9** — *Entrées & contrats (API / UI).* Pour les logs structurés et requestId, le produit limite les abus par quotas, plafonds ou fréquence.
- **GDE.03.10** — *État, persistance & intégrité.* Pour le blackjack lobby room id param, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GDE.03.11** — *Temps réel & synchronisation.* Pour les classes CSS racine accessibilité, le produit minimise la fuite d’information entre rôles.
- **GDE.03.12** — *Sécurité, rôles & conformité.* Pour le bot decision log structured, le produit maintient la compatibilité mobile et navigateur.

## Page résultats paris cachés
_Balise `HIDPG` — logique fonctionnelle, sans code source._

### HIDPG.01 — Route /results et /hidden-bets-result
- **HIDPG.01.1** — *Objectif & périmètre.* Pour le record hand result practice API, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HIDPG.01.2** — *Entrées & contrats (API / UI).* Pour le capacitor splash screen si mobile, le produit documente les préconditions et postconditions attendues.
- **HIDPG.01.3** — *État, persistance & intégrité.* Pour le prisma transaction interactive poker cash, le produit vérifie les montants et soldes avant persistance.
- **HIDPG.01.4** — *Temps réel & synchronisation.* Pour le tournament spectate delay 5s, le produit expose des erreurs métier stables pour i18n et support.
- **HIDPG.01.5** — *Sécurité, rôles & conformité.* Les messages d’erreur réseau côté client distinguent timeout, 401 et 500 pour guider l’utilisateur sans fuir d’informations sensibles.
- **HIDPG.01.6** — *Erreurs, limites & dégradation.* Pour le practice bot non-expert jetons virtuels, le produit applique les règles de remboursement de prêt actif.
- **HIDPG.01.7** — *Exploitation & évolutivité.* Pour la page résultats paris cachés, le produit permet l’observabilité (latence, codes, corrélation).
- **HIDPG.01.8** — *Objectif & périmètre.* Pour le block user social si prévu, le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.01.9** — *Entrées & contrats (API / UI).* Pour le socket path /socket.io, le produit vérifie les montants et soldes avant persistance.
- **HIDPG.01.10** — *État, persistance & intégrité.* Pour le leave friend loan cancel, le produit s’appuie sur la validation serveur comme source de vérité.
- **HIDPG.01.11** — *Temps réel & synchronisation.* Pour le duplicate action reject same round, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **HIDPG.01.12** — *Sécurité, rôles & conformité.* Pour le practice bot non-expert jetons virtuels, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### HIDPG.02 — Agrégation issue de la dernière main ou session
- **HIDPG.02.1** — *Objectif & périmètre.* Pour la quote hash exposée au client, le produit vérifie les montants et soldes avant persistance.
- **HIDPG.02.2** — *Entrées & contrats (API / UI).* Pour le level up notification, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **HIDPG.02.3** — *État, persistance & intégrité.* Pour le daily challenge rollover timezone UTC, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HIDPG.02.4** — *Temps réel & synchronisation.* Pour le port listen env PORT, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **HIDPG.02.5** — *Sécurité, rôles & conformité.* Pour le badge unlock notification, le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.02.6** — *Erreurs, limites & dégradation.* Pour le tournament blind level schedule, le produit minimise la fuite d’information entre rôles.
- **HIDPG.02.7** — *Exploitation & évolutivité.* Pour le locale date formatting leaderboard, le produit documente les préconditions et postconditions attendues.
- **HIDPG.02.8** — *Objectif & périmètre.* Pour le tournament final table merge, le produit vérifie les montants et soldes avant persistance.
- **HIDPG.02.9** — *Entrées & contrats (API / UI).* Pour le action buttons disabled wrong turn, le produit propage l’état via Socket.IO de façon agrégée.
- **HIDPG.02.10** — *État, persistance & intégrité.* Pour les routes /api/waiting-room, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **HIDPG.02.11** — *Temps réel & synchronisation.* Pour le routage React (basename Capacitor), le produit isole les données par utilisateur et par partie.
- **HIDPG.02.12** — *Sécurité, rôles & conformité.* Pour le basename Capacitor vs web, le produit minimise la fuite d’information entre rôles.

### HIDPG.03 — Navigation depuis table poker
- **HIDPG.03.1** — *Objectif & périmètre.* Pour le taux prêt borne min max, le produit distingue erreurs réseau, auth et serveur côté client.
- **HIDPG.03.2** — *Entrées & contrats (API / UI).* Pour la console admin web (JWT rôle admin), le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.03.3** — *État, persistance & intégrité.* Pour le reconnect same seat if free, le produit limite les abus par quotas, plafonds ou fréquence.
- **HIDPG.03.4** — *Temps réel & synchronisation.* Pour le thème de table (felt / couleurs), le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.03.5** — *Sécurité, rôles & conformité.* Pour le color blind mode tritanopia, le produit isole les données par utilisateur et par partie.
- **HIDPG.03.6** — *Erreurs, limites & dégradation.* Pour le serveur HTTP + Socket.IO partagé, le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.03.7** — *Exploitation & évolutivité.* Pour le emit personalized snapshot per userId, le produit maintient la compatibilité mobile et navigateur.
- **HIDPG.03.8** — *Objectif & périmètre.* Pour le prisma transaction interactive poker cash, le produit limite les abus par quotas, plafonds ou fréquence.
- **HIDPG.03.9** — *Entrées & contrats (API / UI).* Pour le console admin filter by status, le produit expose des erreurs métier stables pour i18n et support.
- **HIDPG.03.10** — *État, persistance & intégrité.* Pour la pagination et filtres leaderboard, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **HIDPG.03.11** — *Temps réel & synchronisation.* Pour le side pot display order smallest first, le produit s’appuie sur la validation serveur comme source de vérité.
- **HIDPG.03.12** — *Sécurité, rôles & conformité.* Pour le i18n namespace casino labels, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

## Thème visuel de table
_Balise `THM` — logique fonctionnelle, sans code source._

### THM.01 — TableThemeProvider
- **THM.01.1** — *Objectif & périmètre.* Pour le join game error banned si prévu, le produit isole les données par utilisateur et par partie.
- **THM.01.2** — *Entrées & contrats (API / UI).* Pour le join game error room full, le produit minimise la fuite d’information entre rôles.
- **THM.01.3** — *État, persistance & intégrité.* Pour les player reports motifs, le produit documente les préconditions et postconditions attendues.
- **THM.01.4** — *Temps réel & synchronisation.* Pour le leave_game cleanup seat, le produit maintient la compatibilité mobile et navigateur.
- **THM.01.5** — *Sécurité, rôles & conformité.* Pour le language switcher component, le produit s’appuie sur la validation serveur comme source de vérité.
- **THM.01.6** — *Erreurs, limites & dégradation.* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit distingue erreurs réseau, auth et serveur côté client.
- **THM.01.7** — *Exploitation & évolutivité.* Pour le mobile touch targets buttons, le produit isole les données par utilisateur et par partie.
- **THM.01.8** — *Objectif & périmètre.* Pour le leave friend loan cancel, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **THM.01.9** — *Entrées & contrats (API / UI).* Pour la politique Helmet CSP et fonts externes, le produit distingue erreurs réseau, auth et serveur côté client.
- **THM.01.10** — *État, persistance & intégrité.* Pour le tournament cancelled refund policy, le produit documente les préconditions et postconditions attendues.
- **THM.01.11** — *Temps réel & synchronisation.* Pour le report chat message si prévu, le produit journalise les transitions sensibles pour audit.
- **THM.01.12** — *Sécurité, rôles & conformité.* Pour le tournament cancelled refund policy, le produit isole les données par utilisateur et par partie.

### THM.02 — Couleurs feutre / tapis
- **THM.02.1** — *Objectif & périmètre.* Pour les signalements joueur, le produit maintient la compatibilité mobile et navigateur.
- **THM.02.2** — *Entrées & contrats (API / UI).* Pour le nettoyage planifié (cleanup jobs), le produit distingue erreurs réseau, auth et serveur côté client.
- **THM.02.3** — *État, persistance & intégrité.* Pour le web share api invite link si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **THM.02.4** — *Temps réel & synchronisation.* Pour le recovery question list server, le produit s’appuie sur la validation serveur comme source de vérité.
- **THM.02.5** — *Sécurité, rôles & conformité.* Pour le gestionnaire d’erreurs HTTP global Express, le produit maintient la compatibilité mobile et navigateur.
- **THM.02.6** — *Erreurs, limites & dégradation.* Pour le feedback thank you acknowledgment, le produit minimise la fuite d’information entre rôles.
- **THM.02.7** — *Exploitation & évolutivité.* Pour le waiting room join POST, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.02.8** — *Objectif & périmètre.* Pour le tournament min players start check, le produit journalise les transitions sensibles pour audit.
- **THM.02.9** — *Entrées & contrats (API / UI).* Pour le start screen CTA login register, le produit limite les abus par quotas, plafonds ou fréquence.
- **THM.02.10** — *État, persistance & intégrité.* Pour l’anti-cheat middleware HTTP, le produit expose des erreurs métier stables pour i18n et support.
- **THM.02.11** — *Temps réel & synchronisation.* Pour le daily challenge rollover timezone UTC, le produit maintient la compatibilité mobile et navigateur.
- **THM.02.12** — *Sécurité, rôles & conformité.* Pour le private room join request timeout, le produit isole les données par utilisateur et par partie.

### THM.03 — Cohérence cartes et jetons
- **THM.03.1** — *Objectif & périmètre.* Pour les query params spectate=1 sur Game, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **THM.03.2** — *Entrées & contrats (API / UI).* Pour le flux register → lobby, le produit documente les préconditions et postconditions attendues.
- **THM.03.3** — *État, persistance & intégrité.* Pour la table poker temps réel (Game), le produit distingue erreurs réseau, auth et serveur côté client.
- **THM.03.4** — *Temps réel & synchronisation.* Pour le admin runtime poker dev-only, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.03.5** — *Sécurité, rôles & conformité.* Pour la récupération blackjack au boot serveur, le produit maintient la compatibilité mobile et navigateur.
- **THM.03.6** — *Erreurs, limites & dégradation.* Pour le error toast network french copy, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.03.7** — *Exploitation & évolutivité.* Pour l’historique des mains practice, le produit expose des erreurs métier stables pour i18n et support.
- **THM.03.8** — *Objectif & périmètre.* Pour le reset token single use, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.03.9** — *Entrées & contrats (API / UI).* Pour le protected redirect login if no token, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **THM.03.10** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit permet l’observabilité (latence, codes, corrélation).
- **THM.03.11** — *Temps réel & synchronisation.* Pour le stats increment async post commit, le produit isole les données par utilisateur et par partie.
- **THM.03.12** — *Sécurité, rôles & conformité.* Pour la page BotConfiguration, le produit permet l’observabilité (latence, codes, corrélation).

### THM.04 — Indépendant des règles serveur
- **THM.04.1** — *Objectif & périmètre.* Pour la console admin JWT console, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.04.2** — *Entrées & contrats (API / UI).* Pour le loader show on route transition, le produit limite les abus par quotas, plafonds ou fréquence.
- **THM.04.3** — *État, persistance & intégrité.* Pour le capacitor splash screen si mobile, le produit minimise la fuite d’information entre rôles.
- **THM.04.4** — *Temps réel & synchronisation.* Pour le client socket auth object, le produit documente les préconditions et postconditions attendues.
- **THM.04.5** — *Sécurité, rôles & conformité.* Pour les invitations socket room blackjack, le produit maintient la compatibilité mobile et navigateur.
- **THM.04.6** — *Erreurs, limites & dégradation.* Pour le mobile touch targets buttons, le produit respecte l’idempotence ou les clés d’unicité métier.
- **THM.04.7** — *Exploitation & évolutivité.* Pour les badges profil liés niveaux, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **THM.04.8** — *Objectif & périmètre.* Pour le live check always true, le produit minimise la fuite d’information entre rôles.
- **THM.04.9** — *Entrées & contrats (API / UI).* Pour le roulette loan repayment order, le produit expose des erreurs métier stables pour i18n et support.
- **THM.04.10** — *État, persistance & intégrité.* Pour le player action log structured, le produit expose des erreurs métier stables pour i18n et support.
- **THM.04.11** — *Temps réel & synchronisation.* Pour les badges profil liés niveaux, le produit expose des erreurs métier stables pour i18n et support.
- **THM.04.12** — *Sécurité, rôles & conformité.* Pour le console admin filter by status, le produit expose des erreurs métier stables pour i18n et support.

## Web, Capacitor & basename
_Balise `CAP` — logique fonctionnelle, sans code source._

### CAP.01 — Détection window.Capacitor
- **CAP.01.1** — *Objectif & périmètre.* Pour le admin tournament delete cascade, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.01.2** — *Entrées & contrats (API / UI).* Pour le loan paid off celebration si prévu, le produit isole les données par utilisateur et par partie.
- **CAP.01.3** — *État, persistance & intégrité.* Pour le dev socket.onAny pour debug, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.01.4** — *Temps réel & synchronisation.* Pour le flux register → lobby, le produit maintient la compatibilité mobile et navigateur.
- **CAP.01.5** — *Sécurité, rôles & conformité.* Pour le live check always true, le produit maintient la compatibilité mobile et navigateur.
- **CAP.01.6** — *Erreurs, limites & dégradation.* Pour le slot reels animation client only, le produit limite les abus par quotas, plafonds ou fréquence.
- **CAP.01.7** — *Exploitation & évolutivité.* Pour le tie-break sur identifiant affiché, le produit maintient la compatibilité mobile et navigateur.
- **CAP.01.8** — *Objectif & périmètre.* Pour le cash sit-out / rebuy / leave, le produit limite les abus par quotas, plafonds ou fréquence.
- **CAP.01.9** — *Entrées & contrats (API / UI).* Pour la vérification d’email avant inscription, le produit distingue erreurs réseau, auth et serveur côté client.
- **CAP.01.10** — *État, persistance & intégrité.* Pour le i18n namespace casino labels, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CAP.01.11** — *Temps réel & synchronisation.* Pour le fallback heuristique Node si IA KO, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.01.12** — *Sécurité, rôles & conformité.* Les alertes visuelles supplémentaires signalent tour à soi, timer critique ou gros pot sans son, pour l’accessibilité auditif partielle.

### CAP.02 — basename Router optionnel
- **CAP.02.1** — *Objectif & périmètre.* Pour le i18n namespace casino labels, le produit documente les préconditions et postconditions attendues.
- **CAP.02.2** — *Entrées & contrats (API / UI).* Pour le dealer button rotation animation, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.02.3** — *État, persistance & intégrité.* Pour le host kick si implémenté, le produit minimise la fuite d’information entre rôles.
- **CAP.02.4** — *Temps réel & synchronisation.* Pour les limites express.json pour payloads, le produit s’appuie sur la validation serveur comme source de vérité.
- **CAP.02.5** — *Sécurité, rôles & conformité.* Pour le http access log middleware, le produit limite les abus par quotas, plafonds ou fréquence.
- **CAP.02.6** — *Erreurs, limites & dégradation.* Pour la page BotConfiguration, le produit maintient la compatibilité mobile et navigateur.
- **CAP.02.7** — *Exploitation & évolutivité.* Pour le reject friend loan, le produit documente les préconditions et postconditions attendues.
- **CAP.02.8** — *Objectif & périmètre.* Pour la page résultats paris cachés, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.02.9** — *Entrées & contrats (API / UI).* Pour le imgSrc blob data https, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **CAP.02.10** — *État, persistance & intégrité.* Pour le tournament ranking scroll area, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CAP.02.11** — *Temps réel & synchronisation.* Pour le player turn highlight UI, le produit permet l’observabilité (latence, codes, corrélation).
- **CAP.02.12** — *Sécurité, rôles & conformité.* Pour le feedback text max length, le produit limite les abus par quotas, plafonds ou fréquence.

### CAP.03 — Chemins relatifs assets
- **CAP.03.1** — *Objectif & périmètre.* Pour le runout cartes après all-in, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.03.2** — *Entrées & contrats (API / UI).* Pour le tournament name branding header, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CAP.03.3** — *État, persistance & intégrité.* Pour le room subscription socket join, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.03.4** — *Temps réel & synchronisation.* Pour le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets), le produit distingue erreurs réseau, auth et serveur côté client.
- **CAP.03.5** — *Sécurité, rôles & conformité.* Pour le capacitor status bar style si mobile, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.03.6** — *Erreurs, limites & dégradation.* Pour le fallback reason code IA, le produit maintient la compatibilité mobile et navigateur.
- **CAP.03.7** — *Exploitation & évolutivité.* Pour le leave friend loan cancel, le produit vérifie les montants et soldes avant persistance.
- **CAP.03.8** — *Objectif & périmètre.* Pour le tournament bounty si supporté, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.03.9** — *Entrées & contrats (API / UI).* Pour la récupération blackjack au boot serveur, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **CAP.03.10** — *État, persistance & intégrité.* Pour le trust proxy et CORS allowlist, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CAP.03.11** — *Temps réel & synchronisation.* Pour le flux login → invalidation User, le produit permet l’observabilité (latence, codes, corrélation).
- **CAP.03.12** — *Sécurité, rôles & conformité.* Pour les avis / notes post-partie, le produit synchronise l’UI sur le snapshot officiel après mutation.

### CAP.04 — Socket URL alignée environnement
- **CAP.04.1** — *Objectif & périmètre.* Pour le success toast friend accepted, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CAP.04.2** — *Entrées & contrats (API / UI).* Pour l’endpoint /api/health/ready et l’état dégradé, le produit maintient la compatibilité mobile et navigateur.
- **CAP.04.3** — *État, persistance & intégrité.* Pour l’écran d’accueil (StartScreen), le produit expose des erreurs métier stables pour i18n et support.
- **CAP.04.4** — *Temps réel & synchronisation.* Pour les logs structurés et requestId, le produit limite les abus par quotas, plafonds ou fréquence.
- **CAP.04.5** — *Sécurité, rôles & conformité.* Pour le toast stack max visible, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **CAP.04.6** — *Erreurs, limites & dégradation.* Pour le mute player chat si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.04.7** — *Exploitation & évolutivité.* Pour le ready check database ping, le produit documente les préconditions et postconditions attendues.
- **CAP.04.8** — *Objectif & périmètre.* Pour le leave_game cleanup seat, le produit expose des erreurs métier stables pour i18n et support.
- **CAP.04.9** — *Entrées & contrats (API / UI).* Pour le spectate join as observer, le produit isole les données par utilisateur et par partie.
- **CAP.04.10** — *État, persistance & intégrité.* Pour le roulette wheel animation client only, le produit applique les règles de remboursement de prêt actif.
- **CAP.04.11** — *Temps réel & synchronisation.* Pour la page BotConfiguration, le produit minimise la fuite d’information entre rôles.
- **CAP.04.12** — *Sécurité, rôles & conformité.* Pour le reconnect same seat if free, le produit isole les données par utilisateur et par partie.

## Démarrage serveur & intégrations
_Balise `BOOT` — logique fonctionnelle, sans code source._

### BOOT.01 — connectDB Prisma
- **BOOT.01.1** — *Objectif & périmètre.* Pour le join game error room full, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.01.2** — *Entrées & contrats (API / UI).* Pour les tags RTK FriendLoan et invalidations croisées, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.01.3** — *État, persistance & intégrité.* Pour les routes /api/bot avec rate limit dédié, le produit maintient la compatibilité mobile et navigateur.
- **BOOT.01.4** — *Temps réel & synchronisation.* Pour le email verification optional flow, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.01.5** — *Sécurité, rôles & conformité.* Pour les limites express.json pour payloads, le produit journalise les transitions sensibles pour audit.
- **BOOT.01.6** — *Erreurs, limites & dégradation.* Pour le small blind big blind labels i18n, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.01.7** — *Exploitation & évolutivité.* Pour le blackjack solo contre banque, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.01.8** — *Objectif & périmètre.* Pour la recherche de joueurs, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **BOOT.01.9** — *Entrées & contrats (API / UI).* Pour le number formatting chips locale, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.01.10** — *État, persistance & intégrité.* Pour le trust proxy et CORS allowlist, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOOT.01.11** — *Temps réel & synchronisation.* Pour les routes /api/hidden-bets avec rate limit dédié, le produit vérifie les montants et soldes avant persistance.
- **BOOT.01.12** — *Sécurité, rôles & conformité.* Pour la progression challenge stockée DB, le produit journalise les transitions sensibles pour audit.

### BOOT.02 — logDegradedStateAtBoot
- **BOOT.02.1** — *Objectif & périmètre.* Pour le tournament trophy asset display, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.02.2** — *Entrées & contrats (API / UI).* Pour le showdown evaluation HTTP internal, le produit maintient la compatibilité mobile et navigateur.
- **BOOT.02.3** — *État, persistance & intégrité.* Pour la console admin JWT console, le produit minimise la fuite d’information entre rôles.
- **BOOT.02.4** — *Temps réel & synchronisation.* Pour le transaction isolation read committed, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOOT.02.5** — *Sécurité, rôles & conformité.* Pour le composant GameWithKey (reset état route), le produit isole les données par utilisateur et par partie.
- **BOOT.02.6** — *Erreurs, limites & dégradation.* Pour le tie-break sur identifiant affiché, le produit vérifie les montants et soldes avant persistance.
- **BOOT.02.7** — *Exploitation & évolutivité.* Pour le tournament result delay 12s, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.02.8** — *Objectif & périmètre.* Pour le console admin assign moderator si prévu, le produit distingue erreurs réseau, auth et serveur côté client.
- **BOOT.02.9** — *Entrées & contrats (API / UI).* Pour le start screen CTA login register, le produit vérifie les montants et soldes avant persistance.
- **BOOT.02.10** — *État, persistance & intégrité.* Pour le endpoint createGame / joinGame RTK, le produit journalise les transitions sensibles pour audit.
- **BOOT.02.11** — *Temps réel & synchronisation.* Pour les routes /api/leaderboard, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.02.12** — *Sécurité, rôles & conformité.* Pour le admin tournaments UI fields, le produit documente les préconditions et postconditions attendues.

### BOOT.03 — recoverBlackjackRuntimeAtBoot
- **BOOT.03.1** — *Objectif & périmètre.* Pour les métriques Prometheus et endpoint /metrics, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.03.2** — *Entrées & contrats (API / UI).* Pour le tournament join wallet lock, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.03.3** — *État, persistance & intégrité.* Pour le game example route isolation, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.03.4** — *Temps réel & synchronisation.* Pour le action buttons disabled wrong turn, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.03.5** — *Sécurité, rôles & conformité.* Pour le report category enum, le produit journalise les transitions sensibles pour audit.
- **BOOT.03.6** — *Erreurs, limites & dégradation.* Pour le cors preflight OPTIONS 200, le produit limite les abus par quotas, plafonds ou fréquence.
- **BOOT.03.7** — *Exploitation & évolutivité.* Pour la politique Helmet CSP et fonts externes, le produit respecte l’idempotence ou les clés d’unicité métier.
- **BOOT.03.8** — *Objectif & périmètre.* Pour le admin redirect if not admin jwt, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **BOOT.03.9** — *Entrées & contrats (API / UI).* Pour le latency metric histogram si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.03.10** — *État, persistance & intégrité.* Pour le admin console action audit, le produit isole les données par utilisateur et par partie.
- **BOOT.03.11** — *Temps réel & synchronisation.* Pour le transaction isolation read committed, le produit expose des erreurs métier stables pour i18n et support.
- **BOOT.03.12** — *Sécurité, rôles & conformité.* Pour les Webhooks ou jobs async optionnels, le produit limite les abus par quotas, plafonds ou fréquence.

### BOOT.04 — TournamentService.setIo + startTournamentWatcher
- **BOOT.04.1** — *Objectif & périmètre.* Pour le updates static route behavior, le produit documente les préconditions et postconditions attendues.
- **BOOT.04.2** — *Entrées & contrats (API / UI).* Pour le client socket auth object, le produit vérifie les montants et soldes avant persistance.
- **BOOT.04.3** — *État, persistance & intégrité.* Pour le mini games hub cards layout, le produit isole les données par utilisateur et par partie.
- **BOOT.04.4** — *Temps réel & synchronisation.* Pour le expert bot python grpc or http si prévu, le produit isole les données par utilisateur et par partie.
- **BOOT.04.5** — *Sécurité, rôles & conformité.* Pour le provider AccessibilityProvider, le produit minimise la fuite d’information entre rôles.
- **BOOT.04.6** — *Erreurs, limites & dégradation.* Pour le admin runtime blackjack dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **BOOT.04.7** — *Exploitation & évolutivité.* Pour le leave_game cleanup seat, le produit journalise les transitions sensibles pour audit.
- **BOOT.04.8** — *Objectif & périmètre.* Pour le tournament cancelled refund policy, le produit journalise les transitions sensibles pour audit.
- **BOOT.04.9** — *Entrées & contrats (API / UI).* Pour le helmet frame ancestors self, le produit isole les données par utilisateur et par partie.
- **BOOT.04.10** — *État, persistance & intégrité.* Pour le qr code room invite si prévu, le produit isole les données par utilisateur et par partie.
- **BOOT.04.11** — *Temps réel & synchronisation.* Pour l’endpoint /api/health/live, le produit documente les préconditions et postconditions attendues.
- **BOOT.04.12** — *Sécurité, rôles & conformité.* Pour le ready check database ping, le produit gère la concurrence par transactions courtes ou verrous logiques.

### BOOT.05 — GameGateway sur serveur HTTP
- **BOOT.05.1** — *Objectif & périmètre.* Pour le xp anti farm cooldown server, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.05.2** — *Entrées & contrats (API / UI).* Pour le join_game payload gameId, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.05.3** — *État, persistance & intégrité.* Pour le flux login → invalidation User, le produit documente les préconditions et postconditions attendues.
- **BOOT.05.4** — *Temps réel & synchronisation.* Pour la route admin générique dev-only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.05.5** — *Sécurité, rôles & conformité.* Pour le reconnect same seat if free, le produit permet l’observabilité (latence, codes, corrélation).
- **BOOT.05.6** — *Erreurs, limites & dégradation.* Pour les tags RTK FriendLoan et invalidations croisées, le produit vérifie les montants et soldes avant persistance.
- **BOOT.05.7** — *Exploitation & évolutivité.* Pour le routage React (basename Capacitor), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **BOOT.05.8** — *Objectif & périmètre.* Pour le game state sanitization avant emit, le produit permet l’observabilité (latence, codes, corrélation).
- **BOOT.05.9** — *Entrées & contrats (API / UI).* Pour le live check always true, le produit minimise la fuite d’information entre rôles.
- **BOOT.05.10** — *État, persistance & intégrité.* Pour le game state sanitization avant emit, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOOT.05.11** — *Temps réel & synchronisation.* Pour la route racine updatesRouter, le produit journalise les transitions sensibles pour audit.
- **BOOT.05.12** — *Sécurité, rôles & conformité.* Pour le recovery question list server, le produit s’appuie sur la validation serveur comme source de vérité.

### BOOT.06 — initCleanupJobs
- **BOOT.06.1** — *Objectif & périmètre.* Pour le admin redirect if not admin jwt, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.06.2** — *Entrées & contrats (API / UI).* Pour le language switcher component, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOOT.06.3** — *État, persistance & intégrité.* Pour le email verification optional flow, le produit documente les préconditions et postconditions attendues.
- **BOOT.06.4** — *Temps réel & synchronisation.* Pour le imgSrc blob data https, le produit applique les règles de remboursement de prêt actif.
- **BOOT.06.5** — *Sécurité, rôles & conformité.* Pour le hook useUser et synchronisation token, le produit journalise les transitions sensibles pour audit.
- **BOOT.06.6** — *Erreurs, limites & dégradation.* Pour le note player tag si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **BOOT.06.7** — *Exploitation & évolutivité.* Pour le chat rate limit soft, le produit isole les données par utilisateur et par partie.
- **BOOT.06.8** — *Objectif & périmètre.* Pour le feedback route séparée reports, le produit reste désactivable ou restreint en production si sensible.
- **BOOT.06.9** — *Entrées & contrats (API / UI).* Pour le service tournoi et broadcasts Socket.IO, le produit vérifie les montants et soldes avant persistance.
- **BOOT.06.10** — *État, persistance & intégrité.* Pour la route admin générique dev-only, le produit expose des erreurs métier stables pour i18n et support.
- **BOOT.06.11** — *Temps réel & synchronisation.* Pour le tournament ranking by chips, le produit s’appuie sur la validation serveur comme source de vérité.
- **BOOT.06.12** — *Sécurité, rôles & conformité.* Pour la résolution des paris cachés en fin de main, le produit reste désactivable ou restreint en production si sensible.

## Nettoyage & maintenance planifiée
_Balise `CLN` — logique fonctionnelle, sans code source._

### CLN.01 — Jobs cleanup invitations / rooms fantômes
- **CLN.01.1** — *Objectif & périmètre.* Pour les routes /api/bot avec rate limit dédié, le produit maintient la compatibilité mobile et navigateur.
- **CLN.01.2** — *Entrées & contrats (API / UI).* Pour le tournament name branding header, le produit minimise la fuite d’information entre rôles.
- **CLN.01.3** — *État, persistance & intégrité.* Pour la documentation Swagger /api-docs, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CLN.01.4** — *Temps réel & synchronisation.* Pour le timer table poker côté serveur, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLN.01.5** — *Sécurité, rôles & conformité.* Pour le cors credentials true socket, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **CLN.01.6** — *Erreurs, limites & dégradation.* Pour le hidden bet history query by game, le produit vérifie les montants et soldes avant persistance.
- **CLN.01.7** — *Exploitation & évolutivité.* Pour le join_game payload gameId, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLN.01.8** — *Objectif & périmètre.* Pour le tournament min players start check, le produit isole les données par utilisateur et par partie.
- **CLN.01.9** — *Entrées & contrats (API / UI).* Pour les salles privées et demandes d’adhésion, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLN.01.10** — *État, persistance & intégrité.* Pour le showdown evaluation HTTP internal, le produit propage l’état via Socket.IO de façon agrégée.
- **CLN.01.11** — *Temps réel & synchronisation.* Pour les invitation party poker, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLN.01.12** — *Sécurité, rôles & conformité.* Pour le swagger hide topbar, le produit refuse les actions si le rôle ne correspond pas au contexte.

### CLN.02 — Expiration tokens ou entités temporaires
- **CLN.02.1** — *Objectif & périmètre.* Pour le basename Capacitor vs web, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLN.02.2** — *Entrées & contrats (API / UI).* Pour le accessibility skip link si prévu, le produit journalise les transitions sensibles pour audit.
- **CLN.02.3** — *État, persistance & intégrité.* Pour le leave friend loan cancel, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLN.02.4** — *Temps réel & synchronisation.* Pour le mini games hub cards layout, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CLN.02.5** — *Sécurité, rôles & conformité.* Pour le fallback reason code IA, le produit vérifie les montants et soldes avant persistance.
- **CLN.02.6** — *Erreurs, limites & dégradation.* Pour le hook useUser et synchronisation token, le produit reste désactivable ou restreint en production si sensible.
- **CLN.02.7** — *Exploitation & évolutivité.* Pour le number formatting chips locale, le produit limite les abus par quotas, plafonds ou fréquence.
- **CLN.02.8** — *Objectif & périmètre.* Pour le destroy room cascade sockets, le produit vérifie les montants et soldes avant persistance.
- **CLN.02.9** — *Entrées & contrats (API / UI).* Pour la documentation Swagger /api-docs, le produit distingue erreurs réseau, auth et serveur côté client.
- **CLN.02.10** — *État, persistance & intégrité.* Pour le tournament result delay 12s, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLN.02.11** — *Temps réel & synchronisation.* Pour le tournament overlay z-index full screen, le produit journalise les transitions sensibles pour audit.
- **CLN.02.12** — *Sécurité, rôles & conformité.* Pour le loan exceeds allowed rate error, le produit s’appuie sur la validation serveur comme source de vérité.

### CLN.03 — Journalisation des purges
- **CLN.03.1** — *Objectif & périmètre.* Pour le login rate limit auth routes, le produit respecte l’idempotence ou les clés d’unicité métier.
- **CLN.03.2** — *Entrées & contrats (API / UI).* Pour le tournament clock server synced si prévu, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLN.03.3** — *État, persistance & intégrité.* Pour le spectate card masking rules, le produit vérifie les montants et soldes avant persistance.
- **CLN.03.4** — *Temps réel & synchronisation.* Pour le action buttons disabled wrong turn, le produit s’appuie sur la validation serveur comme source de vérité.
- **CLN.03.5** — *Sécurité, rôles & conformité.* Pour le recovery question list server, le produit reste désactivable ou restreint en production si sensible.
- **CLN.03.6** — *Erreurs, limites & dégradation.* Pour le endpoint createGame / joinGame RTK, le produit vérifie les montants et soldes avant persistance.
- **CLN.03.7** — *Exploitation & évolutivité.* Pour le leave_game cleanup seat, le produit reste désactivable ou restreint en production si sensible.
- **CLN.03.8** — *Objectif & périmètre.* Pour le level up notification, le produit documente les préconditions et postconditions attendues.
- **CLN.03.9** — *Entrées & contrats (API / UI).* Pour le username profanity filter si prévu, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **CLN.03.10** — *État, persistance & intégrité.* Pour la réinitialisation de mot de passe par jeton, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **CLN.03.11** — *Temps réel & synchronisation.* Pour le mapping playerToGameId au start, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **CLN.03.12** — *Sécurité, rôles & conformité.* Pour le start screen CTA login register, le produit journalise les transitions sensibles pour audit.

## Domaine données (vue métier)
_Balise `SCH` — logique fonctionnelle, sans code source._

### SCH.01 — Utilisateur : auth, profil, solde, stats, gamification
- **SCH.01.1** — *Objectif & périmètre.* Pour les limites express.json pour payloads, le produit journalise les transitions sensibles pour audit.
- **SCH.01.2** — *Entrées & contrats (API / UI).* Pour le tournament scheduled cron trigger, le produit permet l’observabilité (latence, codes, corrélation).
- **SCH.01.3** — *État, persistance & intégrité.* Pour le http access log middleware, le produit isole les données par utilisateur et par partie.
- **SCH.01.4** — *Temps réel & synchronisation.* Pour le reject friend loan, le produit applique les règles de remboursement de prêt actif.
- **SCH.01.5** — *Sécurité, rôles & conformité.* Pour les défis quotidiens et la réclamation de récompense, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.01.6** — *Erreurs, limites & dégradation.* Pour le wallet history append only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SCH.01.7** — *Exploitation & évolutivité.* Pour le solo blackjack deck shuffle server, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.01.8** — *Objectif & périmètre.* Pour le tournament service static io, le produit applique les règles de remboursement de prêt actif.
- **SCH.01.9** — *Entrées & contrats (API / UI).* Pour le socket reconnect exponential backoff client, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SCH.01.10** — *État, persistance & intégrité.* Pour le flux login → invalidation User, le produit documente les préconditions et postconditions attendues.
- **SCH.01.11** — *Temps réel & synchronisation.* Pour le qr code room invite si prévu, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.01.12** — *Sécurité, rôles & conformité.* Pour le prisma transaction interactive poker cash, le produit applique les règles de remboursement de prêt actif.

### SCH.02 — Partie poker : états runtime + persistance sélective
- **SCH.02.1** — *Objectif & périmètre.* Pour le wallet insufficient funds message, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.02.2** — *Entrées & contrats (API / UI).* Pour le tournament spectate delay 5s, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SCH.02.3** — *État, persistance & intégrité.* Pour le loan list filter active, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.02.4** — *Temps réel & synchronisation.* Pour le sync XP post-mini-jeu, le produit permet l’observabilité (latence, codes, corrélation).
- **SCH.02.5** — *Sécurité, rôles & conformité.* Pour le join game error room full, le produit limite les abus par quotas, plafonds ou fréquence.
- **SCH.02.6** — *Erreurs, limites & dégradation.* Pour les défis quotidiens et la réclamation de récompense, le produit documente les préconditions et postconditions attendues.
- **SCH.02.7** — *Exploitation & évolutivité.* Pour le slot max bet config, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.02.8** — *Objectif & périmètre.* Pour le taux prêt borne min max, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SCH.02.9** — *Entrées & contrats (API / UI).* Pour le duplicate action reject same round, le produit journalise les transitions sensibles pour audit.
- **SCH.02.10** — *État, persistance & intégrité.* Pour le profil utilisateur et l’édition, le produit limite les abus par quotas, plafonds ou fréquence.
- **SCH.02.11** — *Temps réel & synchronisation.* Pour le protected redirect login if no token, le produit permet l’observabilité (latence, codes, corrélation).
- **SCH.02.12** — *Sécurité, rôles & conformité.* Pour les salles privées et demandes d’adhésion, le produit assure la cohérence wallet ↔ table ↔ tournoi.

### SCH.03 — Wallet & mouvements : crédits/débits traçables
- **SCH.03.1** — *Objectif & périmètre.* Les straddles ou options maison, si supportées, sont explicitement activées dans la config de table avant la main.
- **SCH.03.2** — *Entrées & contrats (API / UI).* Pour les signalements joueur, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.03.3** — *État, persistance & intégrité.* Pour le requestId propagation logs, le produit documente les préconditions et postconditions attendues.
- **SCH.03.4** — *Temps réel & synchronisation.* Pour le roulette wheel animation client only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.03.5** — *Sécurité, rôles & conformité.* Pour le profil utilisateur et l’édition, le produit propage l’état via Socket.IO de façon agrégée.
- **SCH.03.6** — *Erreurs, limites & dégradation.* Pour le degraded redis fallback memory, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.03.7** — *Exploitation & évolutivité.* Pour le socket auth handshake token, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SCH.03.8** — *Objectif & périmètre.* Pour le blackjack solo contre banque, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.03.9** — *Entrées & contrats (API / UI).* Pour le sit out flag siège poker, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.03.10** — *État, persistance & intégrité.* Pour le practice create bot game HTTP, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SCH.03.11** — *Temps réel & synchronisation.* Pour le i18n namespace auth labels, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SCH.03.12** — *Sécurité, rôles & conformité.* Pour les messages privés entre amis, le produit isole les données par utilisateur et par partie.

### SCH.04 — Amis, prêts, messages, invitations
- **SCH.04.1** — *Objectif & périmètre.* Pour le last action log poker UI, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.04.2** — *Entrées & contrats (API / UI).* Pour le friend not found search, le produit documente les préconditions et postconditions attendues.
- **SCH.04.3** — *État, persistance & intégrité.* Pour le cors preflight OPTIONS 200, le produit applique les règles de remboursement de prêt actif.
- **SCH.04.4** — *Temps réel & synchronisation.* Pour le composant GameWithKey (reset état route), le produit applique les règles de remboursement de prêt actif.
- **SCH.04.5** — *Sécurité, rôles & conformité.* Pour les prêts entre amis (demande, taux, acceptation), le produit expose des erreurs métier stables pour i18n et support.
- **SCH.04.6** — *Erreurs, limites & dégradation.* Pour le socket error ack client toast, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.04.7** — *Exploitation & évolutivité.* Pour le report submitted acknowledgment, le produit journalise les transitions sensibles pour audit.
- **SCH.04.8** — *Objectif & périmètre.* Pour la recherche de joueurs, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.04.9** — *Entrées & contrats (API / UI).* Pour le profile badges grid, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **SCH.04.10** — *État, persistance & intégrité.* Pour le hidden bets result route params, le produit documente les préconditions et postconditions attendues.
- **SCH.04.11** — *Temps réel & synchronisation.* Pour le tournament ranking scroll area, le produit minimise la fuite d’information entre rôles.
- **SCH.04.12** — *Sécurité, rôles & conformité.* Pour la configuration trust proxy, le produit documente les préconditions et postconditions attendues.

### SCH.05 — Tournois : inscriptions, phases, gains
- **SCH.05.1** — *Objectif & périmètre.* Pour l’AdminAuth isolé de l’auth joueur, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **SCH.05.2** — *Entrées & contrats (API / UI).* Pour le provider AccessibilityProvider, le produit applique les règles de remboursement de prêt actif.
- **SCH.05.3** — *État, persistance & intégrité.* Pour le leaderboard anti cheat stats validation, le produit respecte l’idempotence ou les clés d’unicité métier.
- **SCH.05.4** — *Temps réel & synchronisation.* Pour les routes /api/daily-challenges, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SCH.05.5** — *Sécurité, rôles & conformité.* Pour le chat rate limit soft, le produit applique les règles de remboursement de prêt actif.
- **SCH.05.6** — *Erreurs, limites & dégradation.* Pour le timeout per route override, le produit applique les règles de remboursement de prêt actif.
- **SCH.05.7** — *Exploitation & évolutivité.* Pour le waiting room join POST, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.05.8** — *Objectif & périmètre.* Pour le process exit boot failure, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.05.9** — *Entrées & contrats (API / UI).* Pour le game example route isolation, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.05.10** — *État, persistance & intégrité.* Pour l’invalidation JWT / blacklist au logout, le produit limite les abus par quotas, plafonds ou fréquence.
- **SCH.05.11** — *Temps réel & synchronisation.* Pour le mobile touch targets buttons, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.05.12** — *Sécurité, rôles & conformité.* Pour le tournament bounty si supporté, le produit s’appuie sur la validation serveur comme source de vérité.

### SCH.06 — Mini-jeux : tours, mises, résultats, XP
- **SCH.06.1** — *Objectif & périmètre.* Pour les invitation party poker, le produit vérifie les montants et soldes avant persistance.
- **SCH.06.2** — *Entrées & contrats (API / UI).* Pour les invitations socket room blackjack, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.06.3** — *État, persistance & intégrité.* Pour le profile aggregate stats query, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **SCH.06.4** — *Temps réel & synchronisation.* Pour le socket error ack client toast, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.06.5** — *Sécurité, rôles & conformité.* Pour le skipSuccessfulRequests sur rate limit global, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.06.6** — *Erreurs, limites & dégradation.* Pour le leaderboard SQL ORDER BY, le produit vérifie les montants et soldes avant persistance.
- **SCH.06.7** — *Exploitation & évolutivité.* Pour le game deal route isolation, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SCH.06.8** — *Objectif & périmètre.* Pour le xp anti farm cooldown server, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **SCH.06.9** — *Entrées & contrats (API / UI).* Pour le hidden bet live window timing, le produit permet l’observabilité (latence, codes, corrélation).
- **SCH.06.10** — *État, persistance & intégrité.* Pour le color blind mode protanopia, le produit vérifie les montants et soldes avant persistance.
- **SCH.06.11** — *Temps réel & synchronisation.* Pour le pot display multi-devises jetons, le produit applique les règles de remboursement de prêt actif.
- **SCH.06.12** — *Sécurité, rôles & conformité.* Pour le email verification optional flow, le produit expose des erreurs métier stables pour i18n et support.

### SCH.07 — Modération : reports, feedbacks
- **SCH.07.1** — *Objectif & périmètre.* Pour le socket global (auth token, connect_error), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.07.2** — *Entrées & contrats (API / UI).* Pour l’override roulette numéro forcé dev-only, le produit applique les règles de remboursement de prêt actif.
- **SCH.07.3** — *État, persistance & intégrité.* Pour le avatar image/jpeg size cap, le produit permet l’observabilité (latence, codes, corrélation).
- **SCH.07.4** — *Temps réel & synchronisation.* Pour le tournament navigate back lobby, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.07.5** — *Sécurité, rôles & conformité.* Pour le tournament prize pool calculation, le produit isole les données par utilisateur et par partie.
- **SCH.07.6** — *Erreurs, limites & dégradation.* Pour le hook useUser et synchronisation token, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.07.7** — *Exploitation & évolutivité.* Pour le wallet history append only, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **SCH.07.8** — *Objectif & périmètre.* Pour le live check always true, le produit expose des erreurs métier stables pour i18n et support.
- **SCH.07.9** — *Entrées & contrats (API / UI).* Pour les friend requests entrantes/sortantes, le produit s’appuie sur la validation serveur comme source de vérité.
- **SCH.07.10** — *État, persistance & intégrité.* Pour le friends online presence indicator, le produit applique les règles de remboursement de prêt actif.
- **SCH.07.11** — *Temps réel & synchronisation.* Pour le tournament cancelled refund policy, le produit distingue erreurs réseau, auth et serveur côté client.
- **SCH.07.12** — *Sécurité, rôles & conformité.* Pour le loan reminder notification si prévu, le produit limite les abus par quotas, plafonds ou fréquence.

## Invitations (REST + social)
_Balise `INV` — logique fonctionnelle, sans code source._

### INV.01 — Routes /api/invitations et /api/friends
- **INV.01.1** — *Objectif & périmètre.* Pour le invitation accept deep link route, le produit documente les préconditions et postconditions attendues.
- **INV.01.2** — *Entrées & contrats (API / UI).* Pour le tournament elimination zero chips, le produit documente les préconditions et postconditions attendues.
- **INV.01.3** — *État, persistance & intégrité.* Pour le process exit boot failure, le produit respecte l’idempotence ou les clés d’unicité métier.
- **INV.01.4** — *Temps réel & synchronisation.* Pour le live flop market transition, le produit reste désactivable ou restreint en production si sensible.
- **INV.01.5** — *Sécurité, rôles & conformité.* Pour l’upload avatar mutation séparée, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **INV.01.6** — *Erreurs, limites & dégradation.* Pour le sit out flag siège poker, le produit isole les données par utilisateur et par partie.
- **INV.01.7** — *Exploitation & évolutivité.* Pour le edit profile change password current required, le produit propage l’état via Socket.IO de façon agrégée.
- **INV.01.8** — *Objectif & périmètre.* Pour le recovery question list server, le produit expose des erreurs métier stables pour i18n et support.
- **INV.01.9** — *Entrées & contrats (API / UI).* Pour le bot decision log structured, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **INV.01.10** — *État, persistance & intégrité.* Pour le mute player chat si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **INV.01.11** — *Temps réel & synchronisation.* Pour le side pot UI lecture état serveur, le produit applique les règles de remboursement de prêt actif.
- **INV.01.12** — *Sécurité, rôles & conformité.* Pour le email verification optional flow, le produit expose des erreurs métier stables pour i18n et support.

### INV.02 — Acceptation depuis lien ou UI
- **INV.02.1** — *Objectif & périmètre.* Pour le tournament clock server synced si prévu, le produit isole les données par utilisateur et par partie.
- **INV.02.2** — *Entrées & contrats (API / UI).* Pour le game example route isolation, le produit journalise les transitions sensibles pour audit.
- **INV.02.3** — *État, persistance & intégrité.* Pour le partage pot égalité, le produit permet l’observabilité (latence, codes, corrélation).
- **INV.02.4** — *Temps réel & synchronisation.* Pour la gamification (niveaux, badges, plafonds de mise), le produit gère la concurrence par transactions courtes ou verrous logiques.
- **INV.02.5** — *Sécurité, rôles & conformité.* Pour le taux prêt borne min max, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **INV.02.6** — *Erreurs, limites & dégradation.* Pour le color blind mode protanopia, le produit vérifie les montants et soldes avant persistance.
- **INV.02.7** — *Exploitation & évolutivité.* Pour le board burn card animation serveur logique, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **INV.02.8** — *Objectif & périmètre.* Pour le street advance server event broadcast, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **INV.02.9** — *Entrées & contrats (API / UI).* Pour le note player tag si prévu, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **INV.02.10** — *État, persistance & intégrité.* Pour le live check always true, le produit journalise les transitions sensibles pour audit.
- **INV.02.11** — *Temps réel & synchronisation.* Pour la pagination et filtres leaderboard, le produit s’appuie sur la validation serveur comme source de vérité.
- **INV.02.12** — *Sécurité, rôles & conformité.* Pour le record hand result practice API, le produit permet l’observabilité (latence, codes, corrélation).

### INV.03 — Intégration blackjack multi & poker
- **INV.03.1** — *Objectif & périmètre.* Pour le tournament scheduled cron trigger, le produit limite les abus par quotas, plafonds ou fréquence.
- **INV.03.2** — *Entrées & contrats (API / UI).* Pour les métriques Prometheus et endpoint /metrics, le produit maintient la compatibilité mobile et navigateur.
- **INV.03.3** — *État, persistance & intégrité.* Pour les overlays tournoi (finaliste, éliminé, résultat), le produit documente les préconditions et postconditions attendues.
- **INV.03.4** — *Temps réel & synchronisation.* Pour le console admin assign moderator si prévu, le produit applique les règles de remboursement de prêt actif.
- **INV.03.5** — *Sécurité, rôles & conformité.* Pour le multi blackjack start host only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **INV.03.6** — *Erreurs, limites & dégradation.* Pour le color blind mode protanopia, le produit permet l’observabilité (latence, codes, corrélation).
- **INV.03.7** — *Exploitation & évolutivité.* Pour le swagger hide topbar, le produit maintient la compatibilité mobile et navigateur.
- **INV.03.8** — *Objectif & périmètre.* Pour le socket error ack client toast, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **INV.03.9** — *Entrées & contrats (API / UI).* Pour le tournament cancelled refund policy, le produit documente les préconditions et postconditions attendues.
- **INV.03.10** — *État, persistance & intégrité.* CORS, CSP, rate limiting et JWT blacklist forment une couche défense en profondeur autour des routes sensibles et des sockets.
- **INV.03.11** — *Temps réel & synchronisation.* Pour les invitations socket room blackjack, le produit minimise la fuite d’information entre rôles.
- **INV.03.12** — *Sécurité, rôles & conformité.* Pour le microservice Python pour décisions expert bot, le produit respecte l’idempotence ou les clés d’unicité métier.

### INV.04 — Notifications socket associées
- **INV.04.1** — *Objectif & périmètre.* Pour le stockage token localStorage, le produit respecte l’idempotence ou les clés d’unicité métier.
- **INV.04.2** — *Entrées & contrats (API / UI).* Pour la quote hash exposée au client, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **INV.04.3** — *État, persistance & intégrité.* Pour le pre_hand market quotes, le produit maintient la compatibilité mobile et navigateur.
- **INV.04.4** — *Temps réel & synchronisation.* Pour le street advance server event broadcast, le produit journalise les transitions sensibles pour audit.
- **INV.04.5** — *Sécurité, rôles & conformité.* Pour le loan exceeds allowed rate error, le produit isole les données par utilisateur et par partie.
- **INV.04.6** — *Erreurs, limites & dégradation.* Pour le prisma error map user facing, le produit respecte l’idempotence ou les clés d’unicité métier.
- **INV.04.7** — *Exploitation & évolutivité.* Pour les friend messages pagination, le produit refuse les actions si le rôle ne correspond pas au contexte.
- **INV.04.8** — *Objectif & périmètre.* Pour le admin runtime blackjack dev-only, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **INV.04.9** — *Entrées & contrats (API / UI).* Pour la page Login / Register / Auth, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **INV.04.10** — *État, persistance & intégrité.* Pour le reset token single use, le produit expose des erreurs métier stables pour i18n et support.
- **INV.04.11** — *Temps réel & synchronisation.* Pour le edit profile validation email unique, le produit respecte l’idempotence ou les clés d’unicité métier.
- **INV.04.12** — *Sécurité, rôles & conformité.* Pour le game state sanitization avant emit, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

## API REST poker hors socket
_Balise `GAME_API` — logique fonctionnelle, sans code source._

### GAME_API.01 — Routes /api/game pour actions ou état complémentaire
- **GAME_API.01.1** — *Objectif & périmètre.* Pour le flux login → invalidation User, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.01.2** — *Entrées & contrats (API / UI).* Pour le rebuy max table enforcement, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **GAME_API.01.3** — *État, persistance & intégrité.* Pour le error boundary reset state, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GAME_API.01.4** — *Temps réel & synchronisation.* Pour la page Leaderboard filtrable, le produit maintient la compatibilité mobile et navigateur.
- **GAME_API.01.5** — *Sécurité, rôles & conformité.* Pour le basename Capacitor vs web, le produit permet l’observabilité (latence, codes, corrélation).
- **GAME_API.01.6** — *Erreurs, limites & dégradation.* Pour le admin redirect if not admin jwt, le produit maintient la compatibilité mobile et navigateur.
- **GAME_API.01.7** — *Exploitation & évolutivité.* Pour le i18n namespace auth labels, le produit gère la concurrence par transactions courtes ou verrous logiques.
- **GAME_API.01.8** — *Objectif & périmètre.* Pour le practice create bot game HTTP, le produit maintient la compatibilité mobile et navigateur.
- **GAME_API.01.9** — *Entrées & contrats (API / UI).* Pour le hidden bet live window timing, le produit respecte l’idempotence ou les clés d’unicité métier.
- **GAME_API.01.10** — *État, persistance & intégrité.* Pour les pages Roulette et SlotMachine, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GAME_API.01.11** — *Temps réel & synchronisation.* Pour le board burn card animation serveur logique, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.01.12** — *Sécurité, rôles & conformité.* Pour le leave friend loan cancel, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.

### GAME_API.02 — Cohérence avec gateway temps réel
- **GAME_API.02.1** — *Objectif & périmètre.* Pour le service tournoi et broadcasts Socket.IO, le produit vérifie les montants et soldes avant persistance.
- **GAME_API.02.2** — *Entrées & contrats (API / UI).* Pour le admin tournament delete cascade, le produit expose des erreurs métier stables pour i18n et support.
- **GAME_API.02.3** — *État, persistance & intégrité.* Pour le sync XP post-mini-jeu, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GAME_API.02.4** — *Temps réel & synchronisation.* Pour la page HiddenBetsResult, le produit isole les données par utilisateur et par partie.
- **GAME_API.02.5** — *Sécurité, rôles & conformité.* Pour le practice bot non-expert jetons virtuels, le produit s’appuie sur la validation serveur comme source de vérité.
- **GAME_API.02.6** — *Erreurs, limites & dégradation.* Pour le server socketAuth middleware order, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.02.7** — *Exploitation & évolutivité.* Pour le blackjack bet limits table, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.02.8** — *Objectif & périmètre.* Pour les signalements joueur, le produit expose des erreurs métier stables pour i18n et support.
- **GAME_API.02.9** — *Entrées & contrats (API / UI).* Pour le solo blackjack settlement push state, le produit assure la cohérence wallet ↔ table ↔ tournoi.
- **GAME_API.02.10** — *État, persistance & intégrité.* Pour le practice difficulty query param, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GAME_API.02.11** — *Temps réel & synchronisation.* Pour les classes CSS racine accessibilité, le produit expose des erreurs métier stables pour i18n et support.
- **GAME_API.02.12** — *Sécurité, rôles & conformité.* Pour le root quantum bluff api message, le produit limite les abus par quotas, plafonds ou fréquence.

### GAME_API.03 — Même modèle d’auth JWT
- **GAME_API.03.1** — *Objectif & périmètre.* Pour le lobby blackjack multi, le produit maintient la compatibilité mobile et navigateur.
- **GAME_API.03.2** — *Entrées & contrats (API / UI).* Pour le prisma transaction interactive poker cash, le produit minimise la fuite d’information entre rôles.
- **GAME_API.03.3** — *État, persistance & intégrité.* Pour la salle d’attente tournoi et le watcher cron, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.03.4** — *Temps réel & synchronisation.* Pour le friend not found search, le produit permet l’observabilité (latence, codes, corrélation).
- **GAME_API.03.5** — *Sécurité, rôles & conformité.* Pour le error boundary reset state, le produit dégrade proprement en cas d’indisponibilité d’une dépendance.
- **GAME_API.03.6** — *Erreurs, limites & dégradation.* Pour le patch profil email/username/password, le produit synchronise l’UI sur le snapshot officiel après mutation.
- **GAME_API.03.7** — *Exploitation & évolutivité.* Pour le recovery question list server, le produit vérifie les montants et soldes avant persistance.
- **GAME_API.03.8** — *Objectif & périmètre.* Pour le blackjack bet limits table, le produit vérifie les montants et soldes avant persistance.
- **GAME_API.03.9** — *Entrées & contrats (API / UI).* Pour les loans actifs vs historiques, le produit journalise les transitions sensibles pour audit.
- **GAME_API.03.10** — *État, persistance & intégrité.* Pour le leave_game cleanup seat, le produit expose des erreurs métier stables pour i18n et support.
- **GAME_API.03.11** — *Temps réel & synchronisation.* Pour le disconnect grace period joueur, le produit limite les abus par quotas, plafonds ou fréquence.
- **GAME_API.03.12** — *Sécurité, rôles & conformité.* Pour le success toast friend accepted, le produit propage l’état via Socket.IO de façon agrégée.

## Index fonctionnel A → Z
_Synthèse exhaustive du périmètre livré (routes, sockets, pages, données, garde-fous)._

### A
**Accessibilité** : contrastes élevés, alertes visuelles pour événements critiques, modes daltoniens paramétrables, persistance navigateur. **Admin** : routes d’override et runtime poker/blackjack/roulette uniquement hors production ; console admin JWT séparée. **API** : surface REST sous `/api`, limites JSON pour avatars, timeouts globaux, anti-cheat HTTP.

### B
**Blackjack solo** : session locale contre banque, règles codifiées, settlement et stats. **Blackjack multi** : rooms, sièges, invitations, REST pour actions, WebSocket pour état partagé, récupération d’état au boot serveur. **Bots** : EASY / MEDIUM / HARD / EXPERT+IA, practice séparé du wallet, délais humains, persistance stats de fin de main.

### C
**Cash poker** : sit-out, rebuy, leave, conversion stack↔wallet. **Chat** table filtrable. **Classement** : leaderboard multi-métriques, pagination, rang personnel. **CORS / CSP / credentials** : origines contrôlées, Helmet, headers autorisés pour idempotency et requestId.

### D
**Défis quotidiens** : progression, réclamation idempotente. **Données** : Prisma/PostgreSQL, contraintes d’unicité, migrations hors requête joueur. **Distribution** cartes poker côté serveur uniquement.

### E
**Erreurs** : mapping Zod/conflits, messages utilisateur, distinction 401/timeout/500 côté client. **Événements tournoi** : countdown, annulation, joueur rejoint, attente finale, table finale, élimination, spectate, résultat global.

### F
**Feedback** post-expérience via `/api/feedback`. **Amis** : demandes, acceptation/refus, recherche limitée, présence. **Prêts** : création, taux plafonnés, accept/refus/cancel, notifications temps réel, remboursement prioritaire sur gains casino.

### G
**Gamification** : XP, niveaux, badges, plafonds de mise liés au niveau. **Gateway Socket.IO** : auth middleware, rooms par gameId, événements poker et tournois. **GameDeal / GameExample** : flux de démonstration ou d’intégration sans impacter le wallet production.

### H
**Health** : `/api/health/live`, `/api/health/ready` avec état DB/dégradation. **Paris cachés** : phases marché, quotes versionnées, tickets, historiques par partie et par joueur. **HiddenBetsResult** : page de synthèse côté client.

### I
**I18n** : fichiers par langue, clés par domaine, rechargement UI. **Idempotence** : middleware + clés côté client pour casino et actions sensibles. **Invitations** : routes dédiées, acceptation in-app, intégration lobby et blackjack multi.

### J
**Jetons** : wallet, stack table, jetons virtuels practice, jetons tournoi après buy-in. **Jobs** : cron tournoi, nettoyage planifié des entités temporaires.

### K
**Clés d’API** et **JWT** : bearer utilisateur vs admin console ; refresh/logout et blacklist pour révoquer l’accès.

### L
**Loader** global et **Layout** : navigation commune, barre de solde, points d’entrée vers poker, mini-jeux, tournois, social. **Lobby** : tutoriel, onglets, deep-links.

### M
**Messages amis** : liste paginée, envoi, invalidation RTK. **Machine à sous** : tour, débit, tirage symboles, crédit, XP, stats, prêt actif. **Métriques** Prometheus et endpoint protégé si bearer configuré.

### N
**Notifications** : toasts (succès, info, warning, erreur), événements socket prêts/invitations/tournoi. **Navigation** React Router avec basename Capacitor optionnel.

### O
**Observabilité** : requestId, logs HTTP, logs d’actions IA (latence, fallback). **Overrides** roulette dev et runtime admin strictement environnement développement.

### P
**Poker** : waiting rooms, partie temps réel, moteur rue/pot/sidepots, showdown, spectateurs, paris cachés intégrés table cash. **Profil** : lecture agrégée, patch contrôlé, avatar, badges.

### Q
**Qualité** : ErrorBoundary client, tests d’intégration blackjack multi, Swagger pour contrats. **Quotas** : rate limits par famille d’endpoints (bot, casino, hidden-bets).

### R
**Roulette** : tour, mises multiples, tirage serveur, gains, ledger, XP, prêt actif, stats. **Récupération mot de passe** : question + reset token. **Reports joueur** via `/api/reports`.

### S
**Sécurité** : trust proxy, rate limit global, Helmet, séparation prod/dev pour admin. **Socket** : même auth que REST, gestion connect_error token invalide. **Slot & stats** agrégées mini-jeux.

### T
**Tournois** : création, join/leave, buy-in wallet, watcher, téléportation vers tables, phases finales, spectateur forcé, écran résultat avec bourse. **Thème de table** : personnalisation visuelle feutre/couleurs.

### U
**Updates** : route racine pour livraison d’informations de version ou assets selon implémentation. **Utilisateur** : `useUser`, routes protégées, déconnexion socket si JWT rejeté.

### V
**Validation** systématique des montants, des transitions de rue poker, des sièges blackjack, des capacités de room. **Victoires** et métriques leaderboard.

### W
**Waiting room** poker : prêt collectif, rematch, suppression, visibilité publique/privée, transition gameId. **Wallet** : historique, sync après opérations.

### X
**Cross-cutting** : idempotency-key sur mutations RTK, retry staggered, tags `User`/`Game`/`Friend`/loans pour cohérence cache client.

### Y
**Yield / performance** : transactions DB courtes, pagination leaderboard, limites payload socket, health ready pour ne pas router trafic sur instance non prête.

### Z
**Zéro-trust côté client** : aucune logique monétaire ou RNG critique ; toute règle d’argent ou de hasard appliquée et prouvée côté serveur ; snapshots masquant les secrets adverses.

## Référence — surface HTTP & temps réel
_Préfixes montés dans `server/src/index.ts` ; les limites de débit différenciées s’appliquent aux familles casino/bot/hidden-bets._

- **`/api`** — Routes jeu poker HTTP complémentaires (`game.routes`).
- **`/api/auth`** — Inscription, login, profil, wallet, vérifications email, reset mot de passe.
- **`/api/auth/2fa`** — Activation / vérification TOTP.
- **`/api/friends`** — Amis, messages, prêts, invitations sociales (sous-chemins combinés).
- **`/api/waiting-room`** — Création / gestion des salles d’attente poker.
- **`/api/game`** — API état ou actions poker hors flux socket principal.
- **`/api/bot`** — Création / pilotage parties practice contre bots (rate limit dédié).
- **`/api/slot`** — Tours machine à sous (rate limit dédié).
- **`/api/roulette`** — Tours roulette (rate limit dédié).
- **`/api/blackjack`** — Blackjack solo (rate limit dédié).
- **`/api/hidden-bets`** — Marchés et tickets paris cachés (rate limit dédié).
- **`/api/feedback`** — Retours utilisateur qualité / UX.
- **`/api/reports`** — Signalements joueur.
- **`/api/admin/console`** — Console admin web JWT rôle admin.
- **`/api/blackjack-tables`** — Tables blackjack multijoueur (rate limit dédié).
- **`/api/leaderboard`** — Classements paginés et rang personnel.
- **`/api/invitations`** — Acceptation / gestion invitations (alias monté sur friends).
- **`/api/daily-challenges`** — Progression et réclamation défis quotidiens.
- **`/api/tournaments`** — Cycle de vie tournois côté REST.
- **`/api/admin/blackjack/runtime`** — **Dev uniquement** — introspection / contrôle runtime blackjack.
- **`/api/admin/poker/runtime`** — **Dev uniquement** — introspection / contrôle runtime poker.
- **`/api/admin/roulette/override`** — **Dev uniquement** — forçage résultat roulette.
- **`/api/admin`** — **Dev uniquement** — routes admin génériques.
- **`/` (updatesRouter)** — Mises à jour / assets ou métadonnées de livraison client.
- **`/api/health/live`** — Liveness Kubernetes / load balancer.
- **`/api/health/ready`** — Readiness + état composants (DB, dégradation).
- **`/api/health`** — Santé texte compacte pour probes simples.
- **`/metrics`** — Prometheus (optionnellement protégé par bearer).
- **`/api-docs`** — Swagger UI + spec OpenAPI.
- ****Socket.IO** `path=/socket.io`** — Gateway poker & tournois ; auth middleware `socketAuth` ; CORS aligné REST.

## Référence — routes React protégées
_Chemins sous `BrowserRouter` ; la plupart sous `ProtectedRoute` utilisateur sauf Start/Auth/AdminAuth._

- **`/`** — StartScreen — point d’entrée branding / CTA.
- **`/auth`** — Auth — login / register combinés.
- **`/auth/admin`** — AdminAuth — authentification console admin.
- **`/admin/console`** — AdminConsole — outils modération / métadonnées (protégé).
- **`/lobby`** — Lobby hub poker & mini-jeux.
- **`/bot-configuration`** — Choix difficulté bots practice.
- **`/minigames`** — Hub roulette / slot / blackjack solo.
- **`/blackjack`** — Blackjack solo.
- **`/blackjack/lobby`** — Lobby tables multi (+ `:roomId` optionnel).
- **`/blackjack/table/:gameId`** — Table blackjack multi temps réel.
- **`/waiting-room`** — Waiting rooms poker.
- **`/game`** — Table poker principale (`GameWithKey` + query `gameId`, `spectate`).
- **`/game-deal`** — GameDeal — démo flux de donne.
- **`/game-example`** — GameExample — démo / test.
- **`/results, /hidden-bets-result`** — Synthèse paris cachés.
- **`/leaderboard`** — Classements.
- **`/profile`** — Profil joueur.
- **`/friends`** — Social — amis, prêts, messages.
- **`/edit-profile`** — Édition profil / avatar / mot de passe.
- **`/tutorial-lobby`** — Tutoriel lobby.
- **`/tournaments`** — Liste / inscription tournois.
- **`/tournament-waiting`** — Salle d’attente tournoi & événements socket.
- **`/admin/tournaments`** — Admin UI tournois.

## Annexes — principes transverses
_Une seule passe, pas de cycles répétitifs._

- **ANN.01** — Toute règle qui touche à l’argent ou au hasard doit être appliquée côté serveur et résister aux manipulations client.
- **ANN.02** — Les états de partie sont diffusés pour minimiser la fuite d’information entre spectateur, joueur assis et bot.
- **ANN.03** — Les identifiants stables (`gameId`, `roomId`, `actionId`) servent traçabilité et support.
- **ANN.04** — Les erreurs réseau ne doivent pas laisser l’UI dans un état monétaire incohérent : resynchronisation ou annulation d’affichage optimiste.
- **ANN.05** — Les limites de taux et de taille protègent l’infrastructure et évitent des tables ou payloads disproportionnés.
- **ANN.06** — La configuration sépare développement (overrides, top-up) et production.
- **ANN.07** — Les dépendances optionnelles (microservice IA) ont un chemin de dégradation testé et observable.
- **ANN.08** — La sécurité des sockets se aligne sur celle des routes HTTP pour les actions sensibles.
- **ANN.09** — L’accessibilité reste une couche de présentation : elle ne déplace pas la logique métier.
- **ANN.10** — La modularité poker / casino / social limite les régressions croisées.
- **ANN.11** — Les transactions DB courtes réduisent deadlocks et contention sur les comptes.
- **ANN.12** — Les logs excluent les secrets ; la corrélation utilise des identifiants techniques non sensibles.
- **ANN.13** — Les contrats API documentés limitent les ruptures pour clients mobiles ou tiers.
- **ANN.14** — Les tests priorisent les chemins financiers et les fins de main poker.
- **ANN.15** — Les politiques mot de passe / session équilibrent sécurité et friction utilisateur.
- **ANN.16** — Les contenus joueur (chat, pseudo) peuvent être filtrés selon les règles communautaires.
- **ANN.17** — Les WebSockets multi-nœuds impliquent affinité de room ou bus interne pour cohérence d’état.
- **ANN.18** — Les feature toggles permettent de couper un mode ou un pari en incident sans rollback complet.
- **ANN.19** — Les SLI (latence d’action, 5xx) nourrissent des objectifs de fiabilité internes.
- **ANN.20** — Les runbooks d’incident couvrent coupure IA, maintenance et fermeture des mises.
- **ANN.21** — Une version minimale de client peut être exigée pour rester compatible avec le protocole socket/HTTP.
- **ANN.22** — Les migrations de schéma conditionnent les champs exposés mais ne s’exécutent pas dans le chemin critique d’une main.
- **ANN.23** — La documentation fonctionnelle doit suivre le produit : divergence document/code = risque.
- **ANN.24** — Le RGPD ou équivalent s’applique aux exports et suppressions de données personnelles selon déploiement.
- **ANN.25** — La charge prévisible (soirée, tournoi) se absorbée par montée en charge HTTP derrière load balancer stateless.

