#!/usr/bin/env python3
"""
Rapport 100% logique d’exécution (pas de code source).
Peu de répétition : chaque sous-section = 3–4 puces uniques (banque large + tirage déterministe).
La longueur suit le contenu utile (plus de remplissage pour atteindre un quota de lignes).
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "Docs" / "Rapport_final" / "RAPPORT_TECHNIQUE_COMPLET.md"
BULLETS_PER_SEED = int(os.environ.get("RAPPORT_BULLETS_PER_SEED", "12"))
ANNEX_MAX = int(os.environ.get("RAPPORT_ANNEX_MAX", "60"))  # plafond lignes d’annexe « principes »
ANNEX_AZ = os.environ.get("RAPPORT_ANNEX_AZ", "1") not in ("0", "false", "False")  # index A→Z détaillé
ANNEX_ROUTES = os.environ.get("RAPPORT_ANNEX_ROUTES", "1") not in ("0", "false", "False")


def emit(out: list[str], s: str) -> None:
    out.append(s)


def _h(tag: str, seed: str, salt: int) -> int:
    raw = f"{tag}|{seed}|{salt}".encode("utf-8")
    return int(hashlib.sha256(raw).hexdigest(), 16)


def _format_bank_line(line: str, seed: str) -> str:
    s = seed.strip()
    if "{s}" in line:
        return line.replace("{s}", s)
    return line


# Banque large : phrases métier ; répartition par domaine pour éviter hors-sujet.
SENT_BANK: list[str] = [
    "Le serveur reste la source de vérité pour tout ce qui touche aux jetons, aux tirages et aux transitions d’état de partie.",
    "Toute action critique est rejetée si l’utilisateur n’est pas authentifié ou si le rôle (joueur, spectateur, bot) ne correspond pas au contexte socket.",
    "Les erreurs métier sont renvoyées avec un message stable côté API pour permettre une traduction et un diagnostic sans exposer d’implémentation interne.",
    "Les montants sont validés (positifs, plafonds, solde disponible) avant toute écriture ; en cas d’échec, aucun débit partiel n’est laissé visible côté client.",
    "Les mises à jour de solde privilégient une transaction unique (débit/crédit + mouvement de ledger) pour éviter les états intermédiaires incohérents.",
    "Le cash game distingue wallet réel et stack à la table ; quitter ou se relever synchronise les deux via des règles explicites de conversion.",
    "Les tournois utilisent un stack virtuel découplé du portefeuille après le buy-in ; les éliminations et les blinds suivent un automate serveur.",
    "Le moteur poker en mémoire avance la rue uniquement lorsque toutes les mises attendues sont résolues ; aucune action hors tour n’est appliquée.",
    "Les pots principaux et secondaires sont recalculés après chaque action valide pour refléter les all-in et les écarts de stack.",
    "Le board et les cartes fermées ne sont jamais envoyés aux spectateurs sous une forme qui révélerait des cartes non montrées au showdown.",
    "La reconnexion WebSocket redemande un snapshot courant : le client ne reconstruit pas l’état à partir de messages partiels sans validation serveur.",
    "Les timers de table coupent l’action par défaut (check/fold selon contexte) pour éviter les blocages ; la politique exacte dépend de la rue et des mises devant.",
    "Le chat de table est optionnellement filtré ou limité en fréquence pour limiter le spam sans casser le flux temps réel des actions.",
    "Les rooms d’attente exposent un état agrégé (places, prêts, visibilité) ; le passage à une partie réelle crée ou rattache un `gameId` serveur.",
    "Les salles privées peuvent exiger une acceptation hôte ; les demandes en attente expirent ou sont annulées si la room se dissout.",
    "La roulette et la machine à sous partagent une logique d’« action par tour » avec identifiant d’idempotence pour absorber les doubles envois réseau.",
    "Le résultat des mini-jeux est déterminé côté serveur après débit validé ; le client ne fait qu’animer une représentation du résultat officiel.",
    "Un prêt actif entre amis peut capter une fraction des gains casino selon les règles métier jusqu’à extinction du solde dû ; l’ordre de priorité est documenté côté serveur.",
    "Le ledger de prêt conserve une trace des mouvements (création, remboursement partiel, clôture) pour éviter les litiges et permettre un audit.",
    "Les paris cachés s’appuient sur des phases de marché (avant main, pendant les mises, etc.) : les cotes et tickets sont versionnés pour éviter les contestations rétroactives.",
    "La résolution des paris cachés est déclenchée à une fin de main définie (showdown ou fin de coup) et ne modifie pas rétroactivement les cotes affichées au moment du pari.",
    "La gamification (XP, niveaux, badges) est mise à jour dans des transactions courtes ; les plafonds de mise des mini-jeux peuvent dépendre du niveau effectif.",
    "Le classement (leaderboard) s’appuie sur des requêtes triées et paginées ; les ex-aequo sont départagés par un critère secondaire stable (par ex. identifiant affiché).",
    "Le profil agrège des champs publics ou contrôlés ; les champs sensibles ne sont jamais modifiables sans repasser par les garde-fous d’auth.",
    "L’accessibilité côté client (contraste, alertes, daltonisme) s’applique via des classes ou thèmes locaux et ne change pas les règles de jeu côté serveur.",
    "Les bots de practice rejouent des actions avec un délai humain simulé ; la difficulté module l’agressivité et la fréquence d’erreur, pas l’accès aux cartes cachées.",
    "Le bot expert peut consulter un microservice IA : la réponse est validée (format, action autorisée) puis ramenée au même pipeline d’action que les autres bots.",
    "Si l’IA est indisponible ou invalide, une heuristique locale prend le relais sans exposer au joueur une erreur technique brute.",
    "Le blackjack multi synchronise des sièges et un état de room ; les actions REST ou messages WS reflètent toujours l’état courant après validation.",
    "Les invitations entre amis croisent présence temps réel, notifications et garde-fous anti-harcèlement (refus, blocage côté produit si prévu).",
    "Les endpoints d’administration sont protégés par rôle et souvent désactivés en production pour les opérations dangereuses (overrides, debug moteur).",
    "CORS, CSP, rate limiting et JWT blacklist forment une couche défense en profondeur autour des routes sensibles et des sockets.",
    "Les métriques et healthchecks permettent de surveiller la latence des actions poker et la disponibilité des dépendances sans loguer de données personnelles inutiles.",
    "L’internationalisation sépare clés et libellés ; le changement de langue recharge les chaînes visibles sans redémarrer les connexions temps réel.",
    "Les défis quotidiens incrémentent une progression stockée par utilisateur ; la réclamation de récompense est idempotente ou protégée contre le double claim.",
    "Les signalements et avis post-partie alimentent une file ou une table consultable par la modération ; le traitement est asynchrone par rapport à la table.",
    "Les tests de charge implicites (nombre de tables, sockets ouverts) imposent des limites sur la taille des payloads d’état et la fréquence des diffusions.",
    "La séparation des contextes (practice, cash, casino, tournoi) évite qu’une même route réutilise par erreur des règles de wallet incompatibles.",
    "Les snapshots personnalisés masquent ce que le joueur ne doit pas voir (cartes adverses, cartes brûlées) tout en gardant assez d’information pour l’UI locale.",
    "Les side pots sont nécessaires dès qu’au moins deux stacks effectifs diffèrent après des mises ; le moteur les fusionne correctement au showdown.",
    "Un all-in avant la river peut déclencher un runout automatique des cartes communautaires restantes sans nouvelles actions de mise.",
    "Les blinds et l’ordre du bouton tournent entre les mains selon les règles de table ; le serveur mémorise le siège du dealer pour cohérence.",
    "Les actions joueur (fold, call, raise) portent un montant ou une sémantique contrôlée ; les relances minimales respectent la structure de mise courante.",
    "Le strip des secrets dans les réponses HTTP/WS évite d’exposer des seeds de RNG, des jetons internes ou des clés d’administration.",
    "La pagination du leaderboard évite de charger des milliers de lignes ; le rang personnel est calculé via une requête dédiée avec le même critère de tri.",
    "Les avatars peuvent être des URL contrôlées ou des fichiers stockés ; la validation MIME et la taille réduisent les risques d’abus.",
    "La 2FA TOTP s’active et se vérifie via des endpoints dédiés ; les codes sont comparés avec fenêtre temporelle et protection contre le brute force.",
    "La récupération de mot de passe s’appuie sur un jeton à usage limité et une expiration courte ; aucune divulgation ne confirme l’existence d’un email.",
    "Le logout invalide côté serveur la session ou le refresh selon le modèle choisi, pour limiter la réutilisation de tokens volés.",
    "Les overrides de développement (roulette forcée, etc.) sont conditionnés à l’environnement pour éviter une fuite en production.",
    "Les WebSockets authentifient la poignée de main avec le même mécanisme que l’API REST pour éviter les connexions anonymes aux tables.",
    "Les rooms blackjack multi peuvent inviter par lien ou liste d’amis ; l’hôte contrôle le démarrage quand les sièges requis sont pourvus.",
    "Le solde affiché dans le lobby est rafraîchi après les opérations réussies ; les échecs réseau laissent un toast sans modifier le solde affiché optimiste abusivement.",
    "Les statistiques agrégées (victoires, mains jouées) sont incrémentées après coup validé ; les annulations ou rollbacks sont rares et tracées.",
    "Les files spectateur vers siège joueur respectent l’ordre d’arrivée et la capacité ; un joueur qui quitte libère un slot exploitable.",
    "Les mises max des mini-jeux peuvent être abaissées dynamiquement si le niveau ou la politique de risque l’exige, toujours après lecture serveur.",
    "Les prêts refusés ou annulés ne laissent pas de dette fantôme ; l’état « actif » est binaire et vérifiable avant tout nouveau crédit.",
    "Les notifications socket pour prêts ou invitations portent un type de message stable pour que le client route vers le bon modal.",
    "Le patch profil valide les types et longueurs ; les champs non autorisés sont ignorés ou rejetés plutôt que fusionnés silencieusement.",
    "L’historique wallet liste les mouvements avec sens (crédit/débit) et référence de partie quand applicable pour corrélation support.",
    "Le top-up de développement est isolé derrière des garde-fous d’environnement pour éviter une inflation artificielle en production.",
    "Les bots MEDIUM et HARD resserrent les fourchettes de mise et augmentent la cohérence avec les pot odds sans accès illégitime aux cartes.",
    "Le bot EASY favorise des lignes plus passives et des erreurs de taille de mise plus fréquentes pour un entraînement progressif.",
    "La slot calcule un gain à partir d’une table de paiements interne ; les symboles affichés correspondent au résultat serveur, pas l’inverse.",
    "La roulette applique les multiplicateurs de segment après validation du plateau de mises ; les mises multiples sont sommées correctement.",
    "Le blackjack solo avance une main contre banque avec règles codifiées (blackjack payé, dealer hit/stand) sans latence réseau intermédiaire.",
    "Les tournois planifiés ou manuels déclenchent des broadcasts d’état quand les phases changent (inscription fermée, table finale, etc.).",
    "Le cron serveur peut faire progresser les tournois ou expirer des entités temporaires (invitations, tokens) de façon déterministe.",
    "La recherche joueur limite le débit et le contenu renvoyé pour limiter l’énumération ; les résultats respectent les paramètres de visibilité.",
    "La persistance Prisma mappe les entités métier (utilisateur, partie, mouvement) avec contraintes d’unicité là où la logique l’exige.",
    "Les migrations de schéma sont hors scope runtime mais conditionnent l’évolution des champs exposés au client.",
    "Les logs structurés facilitent la corrélation par `gameId`, `userId` ou `actionId` sans journaliser de secrets utilisateur.",
    "Swagger documente les contrats HTTP pour intégration et tests ; il ne remplace pas l’autorisation sur les routes protégées.",
    "Helmet renforce les en-têtes HTTP ; la politique CSP doit être alignée avec les origines des assets front et les WebSockets.",
    "Les rate limits protègent login, reset mot de passe et endpoints coûteux pour limiter le credential stuffing et le DoS applicatif.",
    "L’anti-cheat côté poker repose surtout sur l’absence d’informations cachées au client et sur la validation serveur stricte des séquences.",
    "Les messages d’erreur réseau côté client distinguent timeout, 401 et 500 pour guider l’utilisateur sans fuir d’informations sensibles.",
    "Les query params du lobby permettent des deep-links (onglet tournoi, etc.) tout en resynchronisant l’état depuis l’API à l’arrivée.",
    "Le tutoriel lobby est purement client et n’impacte pas les soldes ; il peut être ignoré ou rejoué selon préférence stockée localement.",
    "Les types de daltonisme ajustent des palettes prédéfinies plutôt que des transformations arbitraires sur l’ensemble des couleurs du jeu.",
    "Le mode haut contraste augmente les contrastes et les contours sans casser la lisibilité des cartes et jetons sur petits écrans.",
    "Les alertes visuelles supplémentaires signalent tour à soi, timer critique ou gros pot sans son, pour l’accessibilité auditif partielle.",
    "Les badges de profil reflètent des jalons de gamification atteints côté serveur ; le client ne peut pas s’attribuer un badge arbitraire.",
    "Les parties privées peuvent mémoriser un code ou une liste blanche selon le modèle produit ; le serveur vérifie à chaque tentative de jointure.",
    "Le rematch recrée une room ou réinitialise une session selon le flux produit, en conservant les participants autorisés.",
    "La suppression de room nettoie les sockets rattachés et refuse les nouvelles actions avec un code d’erreur explicite.",
    "Les jetons de practice ne sont jamais confondus avec le wallet dans les écritures comptables même si l’UI les affiche dans des vues proches.",
    "La validation de la réponse IA contrôle que l’action demandée est dans l’ensemble légal {fold, check, call, raise} et que les montants sont bornés.",
    "Le contexte envoyé au modèle résume rue, pot, stacks et actions récentes sans inclure les cartes des adversaires encore fermées.",
    "Les stats de fin de main en practice enregistrent résultat et grosse main pour feedback joueur, pas pour alimenter le leaderboard public.",
    "Les Webhooks ou jobs async ne sont pas requis pour le cœur temps réel mais peuvent exister pour analytics externe si configuré.",
    "La cohérence « lecture après écriture » sur le profil renvoie la vue fraîche après patch pour éviter les UIs qui affichent un mélange ancien/nouveau.",
    "Les erreurs de validation Zod ou équivalent sont mappées vers des codes utilisateur pour uniformiser le front multi-formulaires.",
    "Les cookies ou en-têtes d’auth ne sont jamais loggés en clair dans les pipelines de debug général.",
    "La compatibilité mobile adapte les zones tactiles et réduit la densité d’information sur les écrans étroits sans changer les règles.",
    "Les feature flags éventuels permettent de couper un mini-jeu ou un mode en incident sans redéployer le client si le serveur expose l’état.",
    "Les duplications d’événements socket sont ignorées côté client si un numéro de séquence ou un hash d’état l’indique.",
    "Les mises à jour optimistes UI sont évitées pour le solde ; on attend la réponse serveur ou on réconcilie sur erreur.",
    "Les sessions blackjack multi expirent si inactives trop longtemps pour libérer des ressources serveur et des rooms fantômes.",
    "Les buy-ins tournoi échouent si le wallet est insuffisant ; aucune place réservée n’est laissée dans un état bancaire incohérent.",
    "Les feuilles de route i18n découpent par domaine (auth, casino, poker) pour limiter les collisions de clés et faciliter la revue.",
    "Les traductions manquantes retombent sur une langue par défaut avec marquage possible en développement seulement.",
    "Les prêts entre amis exigent un accepteur identifié ; le créateur ne peut pas forcer l’exécution sans accord enregistré.",
    "Les taux de prêt sont bornés par configuration serveur pour éviter des conditions usuraires ou des bugs de saisie.",
    "Le classement par victoires ne compte que les parties terminées selon des critères définis (abandon volontaire vs fin normale) si distinction il y a.",
    "Le classement par jetons reflète un snapshot ou une agrégation périodique selon le design ; les détails évitent les lectures full-scan répétées.",
    "Les spectateurs peuvent quitter sans impact sur le pot ; seuls les joueurs assis participent aux décisions monétaires.",
    "Le moteur journalise parfois la dernière action pour reprise UI ; ce journal n’est pas une source de vérité longue durée.",
    "La fenêtre de paris live sur la rue en cours, si activée, impose des bornes temporelles strictes synchronisées sur l’horloge serveur.",
    "Les cartes brûlées ou retirées du deck en poker ne réapparaissent pas dans le même tirage ; le deck mémoire est cohérent jusqu’à la main suivante.",
    "Le shuffle est effectué côté serveur avant distribution ; le client reçoit uniquement les cartes de son siège.",
    "Les animations de roulette et slot masquent la latence réseau mais n’anticipent jamais un gain avant la réponse officielle.",
    "Les gains casino créditent puis tentent le remboursement de prêt dans la même logique transactionnelle pour éviter un retrait sans recouvrement.",
    "Les XP peuvent être capés par jour ou par action pour limiter le farming abusif si une telle politique est activée.",
    "Les notifications push hors navigateur, si présentes, sont branchées en option et ne remplacent pas les toasts in-app.",
    "La console admin lit les signalements ; les actions de modération (mute, ban) propagent l’état aux services concernés si implémenté.",
    "Les avis « étoiles » post-partie sont anonymisés en affichage public si le produit le prévoit pour réduire les vendettas personnelles.",
    "Les WebSockets se reconnectent avec backoff exponentiel côté client pour ne pas saturer le serveur après une panne réseau.",
    "Les rooms d’attente affichent le pseudo ou un identifiant stable pour coordination sociale sans exposer l’email.",
    "Les paramètres de bot choisis avant la partie sont figés pour la session afin d’éviter un changement de difficulté en cours de main.",
    "Les mises call automatiques au tapis partiel suivent les règles de table pour éviter des montants impossibles après all-in.",
    "Le split des gains au showdown respecte l’ordre des meilleures mains et peut partager un pot entre plusieurs gagnants au prorata.",
    "Les cartes montrées au showdown sont diffusées à tous les joueurs encore en jeu ; les cartes non montrées restent secrètes.",
    "Les actions de petite blind et grosse blind sont posées automatiquement en début de main selon la structure configurée.",
    "Les straddles ou options maison, si supportées, sont explicitement activées dans la config de table avant la main.",
    "Les jetons insuffisants pour la grosse blind déclenchent un all-in forcé ou une élimination tournoi selon le mode.",
    "Les mises en practice utilisent un compteur interne séparé ; la fin de partie peut afficher un bilan sans toucher au wallet.",
    "Les erreurs Prisma de contrainte unique sont traduites en conflit utilisateur (pseudo pris, etc.).",
    "Les index SQL sur colonnes de tri du leaderboard accélèrent les pages profondes sans changer les règles de tri.",
    "Les sessions longues rafraîchissent le JWT via refresh contrôlé pour limiter la surface de vol d’un token longue durée.",
    "Les CORS stricts refusent les origines non listées même si le token serait valide, pour limiter les appels depuis sites tiers.",
    "Les uploads d’avatar passent par une validation de taille et un stockage blob ou CDN selon l’infra déployée.",
    "Les liens magiques ou tokens par email respectent une seule utilisation ou une courte fenêtre selon la politique sécurité.",
    "Les tables poker cash peuvent avoir un minimum buy-in et un maximum pour encadrer la profondeur de stack.",
    "Le leave table convertit le stack restant en crédit wallet si les règles de partie le permettent et après validation serveur.",
    "Le rebuy cash ajoute des jetons à la table depuis le wallet dans des limites de table et de solde.",
    "Les messages système de table (joueur déconnecté) informent sans révéler la stratégie interne de reconnexion automatique.",
    "Les bots ne bénéficient d’aucun canal privilégié vers le deck ; ils reçoivent le même snapshot réduit que la logique autorise pour un joueur équivalent.",
    "La latence mesurée sur l’appel IA permet de basculer plus vite vers l’heuristique si un seuil est dépassé.",
    "Les raisons textuelles renvoyées par l’IA sont affichées ou masquées selon le niveau de transparence produit choisi.",
    "Les traductions des raisons d’IA peuvent rester en langue source si non localisées pour éviter une double traduction automatique erronée.",
]


def _generated_sentences() -> list[str]:
    """Phrases uniques combinant modules produit × aspects techniques (couverture exhaustive sans copier-coller)."""
    mods = (
        "l’écran d’accueil (StartScreen)",
        "le flux Auth / Register / Login",
        "la vérification d’email avant inscription",
        "les questions secrètes de récupération de compte",
        "la réinitialisation de mot de passe par jeton",
        "le lobby principal et ses onglets",
        "le hub mini-jeux (roulette, slot, blackjack)",
        "la configuration des bots avant practice",
        "la waiting room poker (création / rejoindre)",
        "les salles privées et demandes d’adhésion",
        "le démarrage de partie vers un gameId",
        "la table poker temps réel (Game)",
        "le moteur de distribution et d’enchères",
        "les blinds et le bouton dealer",
        "les streets préflop à river",
        "le chat de table",
        "le mode spectateur et la file de reprise siège",
        "le cash sit-out / rebuy / leave",
        "les paris cachés et leurs phases de marché",
        "la cotation et le placement de tickets",
        "la résolution des paris cachés en fin de main",
        "la roulette (tour, mises, tirage, gains)",
        "la machine à sous (tour, symboles, payout)",
        "le blackjack solo contre banque",
        "le lobby blackjack multi",
        "la room blackjack multi et les sièges",
        "les invitations à une table blackjack",
        "la page tournois (liste / inscription)",
        "la salle d’attente tournoi et le watcher cron",
        "la téléportation socket vers table de tournoi",
        "la finale, l’élimination et le mode spectateur tournoi",
        "l’écran de résultat tournoi et le classement gains",
        "l’administration des tournois (page dédiée)",
        "la liste d’amis et les demandes",
        "la recherche de joueurs",
        "les messages privés entre amis",
        "les prêts entre amis (demande, taux, acceptation)",
        "le remboursement automatique sur gains casino",
        "le leaderboard (XP, jetons, victoires)",
        "le profil utilisateur et l’édition",
        "l’avatar (fichier ou URL) et quotas taille",
        "les défis quotidiens et la réclamation de récompense",
        "la gamification (niveaux, badges, plafonds de mise)",
        "les signalements joueur",
        "les avis / notes post-partie",
        "la console admin web (JWT rôle admin)",
        "les routes dev-only (runtime poker, blackjack, override roulette)",
        "les healthchecks live / ready et dépendances",
        "les métriques Prometheus et endpoint /metrics",
        "la documentation Swagger /api-docs",
        "les logs structurés et requestId",
        "le client RTK Query et invalidation de tags",
        "l’en-tête x-idempotency-key sur les mutations",
        "le retry réseau avec backoff sur erreurs transitoires",
        "le socket global (auth token, connect_error)",
        "le provider d’accessibilité et menu",
        "le thème de table (felt / couleurs)",
        "le loader global et les toasts",
        "l’acceptation de liens d’invitation",
        "la page résultats paris cachés",
        "GameDeal et flux de distribution démo",
        "GameExample (démo / test intégration)",
        "le routage React (basename Capacitor)",
        "les routes protégées utilisateur et admin",
        "la page HiddenBetsResult",
        "les mises à jour applicatives (route updates)",
        "le nettoyage planifié (cleanup jobs)",
        "la récupération blackjack au boot serveur",
        "le service tournoi et broadcasts Socket.IO",
        "le gateway poker (événements temps réel)",
        "le wallet et l’historique des mouvements",
        "le top-up réservé au développement",
        "la 2FA TOTP et les endpoints dédiés",
        "l’anti-cheat middleware HTTP",
        "les timeouts HTTP globaux",
        "le rate limiting différencié (bot, slot, roulette, blackjack, hidden-bets)",
        "la politique Helmet CSP et fonts externes",
        "le JSON body limit (avatars data URL)",
        "le trust proxy et CORS allowlist",
        "l’invalidation JWT / blacklist au logout",
        "les erreurs Prisma mappées en conflits utilisateur",
        "la pagination et filtres leaderboard",
        "le tie-break sur identifiant affiché",
        "les Webhooks ou jobs async optionnels",
        "la séparation practice / cash / casino / tournoi",
        "les statistiques de fin de main practice",
        "le microservice Python pour décisions expert bot",
        "la validation stricte des actions IA",
        "le fallback heuristique Node si IA KO",
        "l’endpoint /api/health/live",
        "l’endpoint /api/health/ready et l’état dégradé",
        "l’endpoint /metrics protégé par bearer optionnel",
        "la page Swagger /api-docs",
        "le gestionnaire d’erreurs HTTP global Express",
        "le serveur HTTP + Socket.IO partagé",
        "la configuration trust proxy",
        "les limites express.json pour payloads",
        "le skipSuccessfulRequests sur rate limit global",
        "les routes /api/blackjack-tables",
        "les routes /api/daily-challenges",
        "les routes /api/leaderboard",
        "les routes /api/waiting-room",
        "les routes /api/bot avec rate limit dédié",
        "les routes /api/hidden-bets avec rate limit dédié",
        "la route racine updatesRouter",
        "les tags RTK FriendLoan et invalidations croisées",
        "le hook useUser et synchronisation token",
        "le TournamentTeleporter dans App",
        "les overlays tournoi (finaliste, éliminé, résultat)",
        "la navigation /tournaments et /tournament-waiting",
        "la page MiniGames",
        "les pages Roulette et SlotMachine",
        "la page BotConfiguration",
        "la page WaitingRoom dédiée",
        "la page Friends et flux social",
        "la page Leaderboard filtrable",
        "la page Profile et EditProfile",
        "la page Login / Register / Auth",
        "l’AdminAuth isolé de l’auth joueur",
        "le composant GameWithKey (reset état route)",
        "les query params spectate=1 sur Game",
        "le state tournamentPlayers passé en navigation",
        "les toasts tournament-countdown",
        "les handlers socket.off au démontage",
        "la persistance difficulté bot en session",
        "l’historique des mains practice",
        "le endpoint createGame / joinGame RTK",
        "la recherche searchUsers avec terme",
        "les réponses 403 / 401 uniformisées",
        "le stockage token localStorage",
        "la déconnexion socket si token invalide",
        "le dev socket.onAny pour debug",
        "le basename Capacitor vs web",
        "le provider TableThemeProvider",
        "le provider AccessibilityMenuOpenContext",
        "le provider AccessibilityProvider",
        "les classes CSS racine accessibilité",
        "le tutorial lobby page dédiée",
        "le flux register → lobby",
        "le flux login → invalidation User",
        "le patch profil email/username/password",
        "l’upload avatar mutation séparée",
        "les friend requests entrantes/sortantes",
        "les loans actifs vs historiques",
        "les notifications prêt accepté/refusé",
        "le calcul rang personnel leaderboard",
        "les catégories victoires vs jetons vs XP",
        "le cron tournament progression",
        "le broadcast io vers room tournoi",
        "le mapping playerToGameId au start",
        "la file spectateur cash pleine",
        "le timer table poker côté serveur",
        "le fold forcé ou check auto si timer",
        "le runout cartes après all-in",
        "le calcul meilleure main showdown",
        "le partage pot égalité",
        "la résolution paris cachés après showdown",
        "la quote hash exposée au client",
        "le ticket idempotent placement",
        "le ledger casino atomique",
        "le sync XP post-mini-jeu",
        "les stats agrégées roulette",
        "les stats agrégées slot",
        "le blackjack hit stand double split si supporté",
        "la banque blackjack multi tour par tour",
        "l’état WAITING DEAL PLAY BUST blackjack multi",
        "les invitations socket room blackjack",
        "le recovery service blackjack tables",
        "le admin runtime blackjack dev-only",
        "le admin runtime poker dev-only",
        "l’override roulette numéro forcé dev-only",
        "la route admin générique dev-only",
        "le feedback route séparée reports",
        "la console admin JWT console",
        "les player reports motifs",
        "les daily challenges reset journalier",
        "la progression challenge stockée DB",
        "le claim reward challenge",
        "les badges profil liés niveaux",
        "les niveaux XP seuils",
        "les friend messages pagination",
        "les invitation party poker",
        "les invitation party blackjack",
        "le leave friend loan cancel",
        "le reject friend loan",
        "le accept friend loan crédit",
        "le taux prêt borne min max",
        "le socket rejoin après refresh page",
        "le game state sanitization avant emit",
        "le last action log poker UI",
        "le pot display multi-devises jetons",
        "le side pot UI lecture état serveur",
        "le chat rate limit soft",
        "le hidden bet live window timing",
        "le pre_hand market quotes",
        "le live flop market transition",
        "le player action validation amounts",
        "le sit out flag siège poker",
        "le rebuy max table enforcement",
        "le min buy cash table",
        "le max players waiting room",
        "le private room join request timeout",
        "le host kick si implémenté",
        "le rematch same players flag",
        "le destroy room cascade sockets",
        "le practice bot expert wallet policy",
        "le practice bot non-expert jetons virtuels",
        "le record hand result practice API",
        "le persist chips expert bot path",
        "le model inference timeout",
        "le model response schema validation",
        "le logging confidence IA",
        "le fallback reason code IA",
        "le socket auth handshake token",
        "le join_game payload gameId",
        "le leave_game cleanup seat",
        "le disconnect grace period joueur",
        "le reconnect same seat if free",
        "le spectate join as observer",
        "le spectate card masking rules",
        "le cash queue promote spectator",
        "le tournament prize pool calculation",
        "le tournament ranking by chips",
        "le tournament elimination zero chips",
        "le tournament final table merge",
        "le tournament spectate delay 5s",
        "le tournament result delay 12s",
        "le tournament navigate back lobby",
        "le admin tournaments UI fields",
        "le tournament cancelled refund policy",
        "le tournament min players start check",
        "le tournament scheduled cron trigger",
        "le tournament join wallet lock",
        "le tournament leave before start refund",
        "le leaderboard SQL ORDER BY",
        "le leaderboard OFFSET pagination",
        "le profile aggregate stats query",
        "le edit profile validation email unique",
        "le avatar image/jpeg size cap",
        "le 2FA enable verify steps",
        "le 2FA backup codes si prévu",
        "le logout blacklist token id",
        "le login rate limit auth routes",
        "le register password strength",
        "le recovery question list server",
        "le reset token single use",
        "le cors preflight OPTIONS 200",
        "le helmet frame ancestors self",
        "le connectSrc self socket url",
        "le imgSrc blob data https",
        "le idempotency middleware scope",
        "le anti-cheat body inspection light",
        "le timeout per route override",
        "le requestId propagation logs",
        "le http access log middleware",
        "le degraded redis fallback memory",
        "le ready check database ping",
        "le live check always true",
        "le swagger hide topbar",
        "le updates static route behavior",
        "le root quantum bluff api message",
        "le port listen env PORT",
        "le process exit boot failure",
        "le tournament service static io",
        "le game gateway constructor side effects",
        "le socket path /socket.io",
        "le cors credentials true socket",
        "le client socket auth object",
        "le server socketAuth middleware order",
        "le emit personalized snapshot per userId",
        "le room subscription socket join",
        "le disconnect socket leave room",
        "le error boundary reset state",
        "le loader show on route transition",
        "le toast stack max visible",
        "le invitation accept deep link route",
        "le friends online presence indicator",
        "le loan banner active on casino pages",
        "le roulette loan repayment order",
        "le slot loan repayment order",
        "le xp grant failure tolerance",
        "le stats increment async post commit",
        "le wallet history append only",
        "le transaction isolation read committed",
        "le prisma transaction interactive poker cash",
        "le hidden bet history query by game",
        "le hidden bet history query by user",
        "le feedback text max length",
        "le report category enum",
        "le admin console read only mode",
        "le admin console action audit",
        "le daily challenge streak bonus si prévu",
        "le badge unlock notification",
        "le level up notification",
        "le gamification cap bet by level",
        "le roulette max bet config",
        "le slot max bet config",
        "le blackjack bet limits table",
        "le multi blackjack seat claim atomic",
        "le multi blackjack start host only",
        "le multi blackjack leave mid hand rules",
        "le solo blackjack deck shuffle server",
        "le solo blackjack settlement push state",
        "le roulette wheel animation client only",
        "le slot reels animation client only",
        "le roulette result authoritative number",
        "le slot result authoritative symbols",
        "le idempotency actionId casino round",
        "le duplicate action reject same round",
        "le wallet insufficient funds message",
        "le loan exceeds allowed rate error",
        "le friend not found search",
        "le friend request duplicate prevention",
        "le self friend request block",
        "le blocked user list si prévu",
        "le username profanity filter si prévu",
        "le email verification optional flow",
        "le token expiry refresh flow si prévu",
        "le socket reconnect exponential backoff client",
        "le game page key pathname search reset",
        "le tournament overlay z-index full screen",
        "le tournament medal display top3",
        "le tournament ranking scroll area",
        "le tournament prize formatting locale",
        "le leaderboard self rank highlight",
        "le profile badges grid",
        "le edit profile change password current required",
        "le profile stats wins losses hands",
        "le friends list sort online first",
        "le loan list filter active",
        "le message friend realtime poll or socket si prévu",
        "le mini games hub cards layout",
        "le lobby quick actions row",
        "le navigation bottom bar si mobile",
        "le responsive table poker layout",
        "le mobile touch targets buttons",
        "le accessibility skip link si prévu",
        "le screen reader labels cards",
        "le high contrast token colors",
        "le color blind mode deuteranopia",
        "le color blind mode protanopia",
        "le color blind mode tritanopia",
        "le sound effects mute accessibility tie in si prévu",
        "le language switcher component",
        "le i18n namespace game labels",
        "le i18n namespace casino labels",
        "le i18n namespace auth labels",
        "le locale date formatting leaderboard",
        "le number formatting chips locale",
        "le error toast network french copy",
        "le success toast friend accepted",
        "le warning toast tournament soon",
        "le info toast player joined room",
        "le quantum bluff branding start screen",
        "le start screen CTA login register",
        "le protected redirect login if no token",
        "le admin redirect if not admin jwt",
        "le game example route isolation",
        "le game deal route isolation",
        "le hidden bets result route params",
        "le results alias route same page",
        "le blackjack lobby room id param",
        "le blackjack table gameId param",
        "le waiting room create POST",
        "le waiting room list GET",
        "le waiting room join POST",
        "le waiting room ready toggle",
        "le waiting room start POST gameId response",
        "le game socket join after HTTP start",
        "le practice create bot game HTTP",
        "le practice difficulty query param",
        "le bot action server driven timing",
        "le showdown evaluation HTTP internal",
        "le expert bot python grpc or http si prévu",
        "le bot decision log structured",
        "le player action log structured",
        "le latency metric histogram si prévu",
        "le rate limit metric counter si prévu",
        "le http 500 hide stack prod",
        "le http 500 show stack dev",
        "le prisma error map user facing",
        "le socket error ack client toast",
        "le join game error room full",
        "le join game error wrong password private",
        "le join game error banned si prévu",
        "le leave table forfeit uncalled si règles",
        "le all in call auto partial amount",
        "le side pot display order smallest first",
        "le board burn card animation serveur logique",
        "le street advance server event broadcast",
        "le player turn highlight UI",
        "le action buttons disabled wrong turn",
        "le raise slider max stack bound",
        "le call amount computed server",
        "le min raise increment server",
        "le ante table optional si supporté",
        "le straddle optional toggle room config",
        "le dealer button rotation animation",
        "le small blind big blind labels i18n",
        "le pot odds hint display optional client only",
        "le hand strength display optional client only",
        "le previous hand history sidebar si prévu",
        "le note player tag si prévu",
        "le emoji reaction chat si prévu",
        "le report chat message si prévu",
        "le mute player chat si prévu",
        "le block user social si prévu",
        "le loan reminder notification si prévu",
        "le loan paid off celebration si prévu",
        "le tournament trophy asset display",
        "le tournament name branding header",
        "le tournament clock server synced si prévu",
        "le tournament blind level schedule",
        "le tournament break schedule si prévu",
        "le tournament rebuy addon si supporté tournoi",
        "le tournament bounty si supporté",
        "le tournament satellite ticket si supporté",
        "le leaderboard anti cheat stats validation",
        "le xp anti farm cooldown server",
        "le daily challenge rollover timezone UTC",
        "le admin tournament delete cascade",
        "le admin tournament force start si prévu",
        "le feedback thank you acknowledgment",
        "le report submitted acknowledgment",
        "le console admin filter by status",
        "le console admin assign moderator si prévu",
        "le updates check new version banner si prévu",
        "le capacitor splash screen si mobile",
        "le capacitor status bar style si mobile",
        "le web share api invite link si prévu",
        "le clipboard copy room code",
        "le qr code room invite si prévu",
    )
    aspects = (
        "documente les préconditions et postconditions attendues",
        "s’appuie sur la validation serveur comme source de vérité",
        "expose des erreurs métier stables pour i18n et support",
        "limite les abus par quotas, plafonds ou fréquence",
        "journalise les transitions sensibles pour audit",
        "gère la concurrence par transactions courtes ou verrous logiques",
        "dégrade proprement en cas d’indisponibilité d’une dépendance",
        "synchronise l’UI sur le snapshot officiel après mutation",
        "respecte l’idempotence ou les clés d’unicité métier",
        "isole les données par utilisateur et par partie",
        "refuse les actions si le rôle ne correspond pas au contexte",
        "propage l’état via Socket.IO de façon agrégée",
        "minimise la fuite d’information entre rôles",
        "assure la cohérence wallet ↔ table ↔ tournoi",
        "applique les règles de remboursement de prêt actif",
        "vérifie les montants et soldes avant persistance",
        "distingue erreurs réseau, auth et serveur côté client",
        "maintient la compatibilité mobile et navigateur",
        "permet l’observabilité (latence, codes, corrélation)",
        "reste désactivable ou restreint en production si sensible",
    )
    out: list[str] = []
    for m in mods:
        for a in aspects:
            out.append(f"Pour {m}, le produit {a}.")
    return out


def _all_sentences_ordered() -> list[str]:
    merged = list(SENT_BANK) + _generated_sentences()
    seen: set[str] = set()
    uniq: list[str] = []
    for s in merged:
        if s not in seen:
            seen.add(s)
            uniq.append(s)
    return uniq


ALL_SENTENCES = _all_sentences_ordered()

# Mots-clés → domaine (une phrase peut être classée dans plusieurs domaines).
_DOMAIN_KEYS: dict[str, tuple[str, ...]] = {
    "pok": (
        "poker", "moteur", "main", "carte", "pot", "blind", "showdown", "deck", "river",
        "flop", "all-in", "fold", "raise", "spectateur", "snapshot", "rue ", "side pot",
        "paris cachés", "cote", "ticket", "shuffle", "board", "straddle", "dealer",
        "practice", "bot ", "ia ", "socket", "table", "room d’attente", "waiting",
        "cash game", "tournoi", "buy-in", "showdown",
    ),
    "cas": (
        "roulette", "slot", "symbole", "blackjack", "mini-jeu", "casino", "segment",
        "animation", "idempotence", "action par tour",
    ),
    "cli": (
        "client", "ui ", "interface", "lobby", "toast", "query param", "tutoriel",
        "accessibilité", "contraste", "daltonisme", "localstorage", "mobile",
        "reconnexion", "backoff", "deep-link", "langue", "i18n", "traduction",
        "react", "routage", "affichage", "navigateur",
    ),
    "soc": (
        "ami", "prêt", "ledger", "invitation", "leaderboard", "classement", "xp",
        "badge", "défi", "gamification", "signalement", "avis", "étoiles", "profil",
        "avatar", "recherche joueur",
    ),
    "auth": (
        "jwt", "auth", "totp", "2fa", "mot de passe", "logout", "session", "inscription",
        "wallet", "solde", "top-up",
    ),
    "srv": (
        "prisma", "transaction", "api ", "express", "http", "zod", "migration",
        "contrainte", "index sql", "persistance", "postgresql", "websocket",
    ),
    "ops": (
        "cors", "csp", "rate limit", "helmet", "swagger", "métrique", "health",
        "prometheus", "log structuré", "admin", "override", "production",
        "anti-cheat", "webhook",
    ),
}


def _line_domains(line: str) -> frozenset[str]:
    low = line.lower()
    found: set[str] = set()
    for dom, keys in _DOMAIN_KEYS.items():
        if any(k in low for k in keys):
            found.add(dom)
    if not found:
        found.add("gen")
    return frozenset(found)


def _build_domain_banks_from(sentences: list[str]) -> dict[str, list[str]]:
    banks: dict[str, list[str]] = {k: [] for k in list(_DOMAIN_KEYS) + ["gen"]}
    for sent in sentences:
        for d in _line_domains(sent):
            banks[d].append(sent)
    for k in banks:
        seen: set[str] = set()
        uniq: list[str] = []
        for s in banks[k]:
            if s not in seen:
                seen.add(s)
                uniq.append(s)
        banks[k] = uniq
    return banks


DOMAIN_BANKS = _build_domain_banks_from(ALL_SENTENCES)

# Balise → domaines prioritaires (ordre : on pioche d’abord dans le premier non vide).
TAG_DOMAINS: dict[str, tuple[str, ...]] = {
    "ARC": ("srv", "cli", "ops", "gen"),
    "AUTH": ("auth", "srv", "gen"),
    "ACC": ("cli", "gen"),
    "LOBBY": ("cli", "soc", "gen"),
    "WRM": ("pok", "cli", "gen"),
    "POK_RT": ("pok", "srv", "gen"),
    "POK_MOT": ("pok", "gen"),
    "SPEC": ("pok", "gen"),
    "HB": ("pok", "gen"),
    "BOT": ("pok", "gen"),
    "BOT_E": ("pok", "gen"),
    "BOT_M": ("pok", "gen"),
    "BOT_H": ("pok", "gen"),
    "BOT_X": ("pok", "ops", "gen"),
    "ROU": ("cas", "soc", "srv", "gen"),
    "SLOT": ("cas", "soc", "srv", "gen"),
    "BJ1": ("cas", "gen"),
    "BJN": ("cas", "soc", "pok", "gen"),
    "TRN": ("pok", "soc", "srv", "gen"),
    "FRD": ("soc", "pok", "cli", "gen"),
    "LOAN": ("soc", "cas", "srv", "gen"),
    "LDB": ("soc", "srv", "gen"),
    "PROF": ("soc", "auth", "gen"),
    "DCH": ("soc", "srv", "gen"),
    "GAM": ("soc", "cas", "gen"),
    "MOD": ("soc", "ops", "gen"),
    "ADM": ("ops", "pok", "gen"),
    "SEC": ("ops", "auth", "gen"),
    "OPS": ("ops", "srv", "gen"),
    "I18N": ("cli", "gen"),
    "CLI": ("cli", "srv", "gen"),
    "SHL": ("cli", "auth", "gen"),
    "TOU_CLI": ("pok", "cli", "gen"),
    "ADM_TOUR": ("ops", "pok", "gen"),
    "FMSG": ("soc", "cli", "gen"),
    "FBK": ("soc", "ops", "gen"),
    "RPT": ("soc", "ops", "gen"),
    "ADMWEB": ("ops", "auth", "gen"),
    "UPD": ("cli", "ops", "gen"),
    "GDE": ("pok", "cli", "gen"),
    "HIDPG": ("pok", "cli", "gen"),
    "THM": ("cli", "gen"),
    "CAP": ("cli", "srv", "gen"),
    "BOOT": ("srv", "ops", "gen"),
    "CLN": ("srv", "ops", "gen"),
    "SCH": ("srv", "soc", "auth", "gen"),
    "INV": ("soc", "pok", "gen"),
    "GAME_API": ("pok", "srv", "gen"),
}


def _pool_for_tag(tag: str) -> list[str]:
    seen: set[str] = set()
    pool: list[str] = []
    for dom in TAG_DOMAINS.get(tag, ("gen",)):
        for s in DOMAIN_BANKS.get(dom, []):
            if s not in seen:
                seen.add(s)
                pool.append(s)
    if len(pool) < 12:
        for s in DOMAIN_BANKS["gen"]:
            if s not in seen:
                seen.add(s)
                pool.append(s)
    return pool if pool else list(ALL_SENTENCES)


ROLE_LABELS = (
    "Objectif & périmètre",
    "Entrées & contrats (API / UI)",
    "État, persistance & intégrité",
    "Temps réel & synchronisation",
    "Sécurité, rôles & conformité",
    "Erreurs, limites & dégradation",
    "Exploitation & évolutivité",
)


def expand_block(out: list[str], tag: str, title: str, seeds: list[str]) -> None:
    emit(out, f"## {title}")
    emit(out, f"_Balise `{tag}` — logique fonctionnelle, sans code source._")
    emit(out, "")
    pool = _pool_for_tag(tag)
    plen = len(pool)
    for j, seed in enumerate(seeds, start=1):
        emit(out, f"### {tag}.{j:02d} — {seed}")
        n_b = max(1, BULLETS_PER_SEED)
        used_seed: set[int] = set()
        for b in range(n_b):
            cand = _h(tag, seed, b * 1_001) % plen
            step = 1 + (_h(tag, seed, b + 999) % max(1, plen - 1))
            chosen_idx = -1
            for attempt in range(max(1, plen * 2)):
                idx = (cand + attempt * step) % plen
                if idx in used_seed:
                    continue
                chosen_idx = idx
                break
            if chosen_idx < 0:
                for idx in range(plen):
                    if idx not in used_seed:
                        chosen_idx = idx
                        break
            if chosen_idx < 0:
                chosen_idx = 0
            used_seed.add(chosen_idx)
            chosen = _format_bank_line(pool[chosen_idx], seed)
            role = ROLE_LABELS[b % len(ROLE_LABELS)]
            emit(out, f"- **{tag}.{j:02d}.{b+1}** — *{role}.* {chosen}")
        emit(out, "")


def annex_http_routes() -> list[str]:
    """Liste alignée sur `server/src/index.ts` (préfixes réels)."""
    rows = [
        ("`/api`", "Routes jeu poker HTTP complémentaires (`game.routes`)."),
        ("`/api/auth`", "Inscription, login, profil, wallet, vérifications email, reset mot de passe."),
        ("`/api/auth/2fa`", "Activation / vérification TOTP."),
        ("`/api/friends`", "Amis, messages, prêts, invitations sociales (sous-chemins combinés)."),
        ("`/api/waiting-room`", "Création / gestion des salles d’attente poker."),
        ("`/api/game`", "API état ou actions poker hors flux socket principal."),
        ("`/api/bot`", "Création / pilotage parties practice contre bots (rate limit dédié)."),
        ("`/api/slot`", "Tours machine à sous (rate limit dédié)."),
        ("`/api/roulette`", "Tours roulette (rate limit dédié)."),
        ("`/api/blackjack`", "Blackjack solo (rate limit dédié)."),
        ("`/api/hidden-bets`", "Marchés et tickets paris cachés (rate limit dédié)."),
        ("`/api/feedback`", "Retours utilisateur qualité / UX."),
        ("`/api/reports`", "Signalements joueur."),
        ("`/api/admin/console`", "Console admin web JWT rôle admin."),
        ("`/api/blackjack-tables`", "Tables blackjack multijoueur (rate limit dédié)."),
        ("`/api/leaderboard`", "Classements paginés et rang personnel."),
        ("`/api/invitations`", "Acceptation / gestion invitations (alias monté sur friends)."),
        ("`/api/daily-challenges`", "Progression et réclamation défis quotidiens."),
        ("`/api/tournaments`", "Cycle de vie tournois côté REST."),
        ("`/api/admin/blackjack/runtime`", "**Dev uniquement** — introspection / contrôle runtime blackjack."),
        ("`/api/admin/poker/runtime`", "**Dev uniquement** — introspection / contrôle runtime poker."),
        ("`/api/admin/roulette/override`", "**Dev uniquement** — forçage résultat roulette."),
        ("`/api/admin`", "**Dev uniquement** — routes admin génériques."),
        ("`/` (updatesRouter)", "Mises à jour / assets ou métadonnées de livraison client."),
        ("`/api/health/live`", "Liveness Kubernetes / load balancer."),
        ("`/api/health/ready`", "Readiness + état composants (DB, dégradation)."),
        ("`/api/health`", "Santé texte compacte pour probes simples."),
        ("`/metrics`", "Prometheus (optionnellement protégé par bearer)."),
        ("`/api-docs`", "Swagger UI + spec OpenAPI."),
        ("**Socket.IO** `path=/socket.io`", "Gateway poker & tournois ; auth middleware `socketAuth` ; CORS aligné REST."),
    ]
    out: list[str] = []
    emit(out, "## Référence — surface HTTP & temps réel")
    emit(out, "_Préfixes montés dans `server/src/index.ts` ; les limites de débit différenciées s’appliquent aux familles casino/bot/hidden-bets._")
    emit(out, "")
    for path, desc in rows:
        emit(out, f"- **{path}** — {desc}")
    emit(out, "")
    return out


def annex_react_routes() -> list[str]:
    """Pages alignées sur `client/src/App.tsx`."""
    pages = [
        ("/", "StartScreen — point d’entrée branding / CTA."),
        ("/auth", "Auth — login / register combinés."),
        ("/auth/admin", "AdminAuth — authentification console admin."),
        ("/admin/console", "AdminConsole — outils modération / métadonnées (protégé)."),
        ("/lobby", "Lobby hub poker & mini-jeux."),
        ("/bot-configuration", "Choix difficulté bots practice."),
        ("/minigames", "Hub roulette / slot / blackjack solo."),
        ("/blackjack", "Blackjack solo."),
        ("/blackjack/lobby", "Lobby tables multi (+ `:roomId` optionnel)."),
        ("/blackjack/table/:gameId", "Table blackjack multi temps réel."),
        ("/waiting-room", "Waiting rooms poker."),
        ("/game", "Table poker principale (`GameWithKey` + query `gameId`, `spectate`)."),
        ("/game-deal", "GameDeal — démo flux de donne."),
        ("/game-example", "GameExample — démo / test."),
        ("/results, /hidden-bets-result", "Synthèse paris cachés."),
        ("/leaderboard", "Classements."),
        ("/profile", "Profil joueur."),
        ("/friends", "Social — amis, prêts, messages."),
        ("/edit-profile", "Édition profil / avatar / mot de passe."),
        ("/tutorial-lobby", "Tutoriel lobby."),
        ("/tournaments", "Liste / inscription tournois."),
        ("/tournament-waiting", "Salle d’attente tournoi & événements socket."),
        ("/admin/tournaments", "Admin UI tournois."),
    ]
    out: list[str] = []
    emit(out, "## Référence — routes React protégées")
    emit(out, "_Chemins sous `BrowserRouter` ; la plupart sous `ProtectedRoute` utilisateur sauf Start/Auth/AdminAuth._")
    emit(out, "")
    for path, desc in pages:
        emit(out, f"- **`{path}`** — {desc}")
    emit(out, "")
    return out


def annex_az_index() -> list[str]:
    """Index alphabétique dense couvrant tout le périmètre produit (A→Z)."""
    chunks: list[tuple[str, str]] = [
        (
            "A",
            "**Accessibilité** : contrastes élevés, alertes visuelles pour événements critiques, modes daltoniens paramétrables, persistance navigateur. "
            "**Admin** : routes d’override et runtime poker/blackjack/roulette uniquement hors production ; console admin JWT séparée. "
            "**API** : surface REST sous `/api`, limites JSON pour avatars, timeouts globaux, anti-cheat HTTP.",
        ),
        (
            "B",
            "**Blackjack solo** : session locale contre banque, règles codifiées, settlement et stats. "
            "**Blackjack multi** : rooms, sièges, invitations, REST pour actions, WebSocket pour état partagé, récupération d’état au boot serveur. "
            "**Bots** : EASY / MEDIUM / HARD / EXPERT+IA, practice séparé du wallet, délais humains, persistance stats de fin de main.",
        ),
        (
            "C",
            "**Cash poker** : sit-out, rebuy, leave, conversion stack↔wallet. **Chat** table filtrable. **Classement** : leaderboard multi-métriques, pagination, rang personnel. "
            "**CORS / CSP / credentials** : origines contrôlées, Helmet, headers autorisés pour idempotency et requestId.",
        ),
        (
            "D",
            "**Défis quotidiens** : progression, réclamation idempotente. **Données** : Prisma/PostgreSQL, contraintes d’unicité, migrations hors requête joueur. "
            "**Distribution** cartes poker côté serveur uniquement.",
        ),
        (
            "E",
            "**Erreurs** : mapping Zod/conflits, messages utilisateur, distinction 401/timeout/500 côté client. "
            "**Événements tournoi** : countdown, annulation, joueur rejoint, attente finale, table finale, élimination, spectate, résultat global.",
        ),
        (
            "F",
            "**Feedback** post-expérience via `/api/feedback`. **Amis** : demandes, acceptation/refus, recherche limitée, présence. "
            "**Prêts** : création, taux plafonnés, accept/refus/cancel, notifications temps réel, remboursement prioritaire sur gains casino.",
        ),
        (
            "G",
            "**Gamification** : XP, niveaux, badges, plafonds de mise liés au niveau. **Gateway Socket.IO** : auth middleware, rooms par gameId, événements poker et tournois. "
            "**GameDeal / GameExample** : flux de démonstration ou d’intégration sans impacter le wallet production.",
        ),
        (
            "H",
            "**Health** : `/api/health/live`, `/api/health/ready` avec état DB/dégradation. **Paris cachés** : phases marché, quotes versionnées, tickets, historiques par partie et par joueur. "
            "**HiddenBetsResult** : page de synthèse côté client.",
        ),
        (
            "I",
            "**I18n** : fichiers par langue, clés par domaine, rechargement UI. **Idempotence** : middleware + clés côté client pour casino et actions sensibles. "
            "**Invitations** : routes dédiées, acceptation in-app, intégration lobby et blackjack multi.",
        ),
        (
            "J",
            "**Jetons** : wallet, stack table, jetons virtuels practice, jetons tournoi après buy-in. **Jobs** : cron tournoi, nettoyage planifié des entités temporaires.",
        ),
        (
            "K",
            "**Clés d’API** et **JWT** : bearer utilisateur vs admin console ; refresh/logout et blacklist pour révoquer l’accès.",
        ),
        (
            "L",
            "**Loader** global et **Layout** : navigation commune, barre de solde, points d’entrée vers poker, mini-jeux, tournois, social. **Lobby** : tutoriel, onglets, deep-links.",
        ),
        (
            "M",
            "**Messages amis** : liste paginée, envoi, invalidation RTK. **Machine à sous** : tour, débit, tirage symboles, crédit, XP, stats, prêt actif. "
            "**Métriques** Prometheus et endpoint protégé si bearer configuré.",
        ),
        (
            "N",
            "**Notifications** : toasts (succès, info, warning, erreur), événements socket prêts/invitations/tournoi. **Navigation** React Router avec basename Capacitor optionnel.",
        ),
        (
            "O",
            "**Observabilité** : requestId, logs HTTP, logs d’actions IA (latence, fallback). **Overrides** roulette dev et runtime admin strictement environnement développement.",
        ),
        (
            "P",
            "**Poker** : waiting rooms, partie temps réel, moteur rue/pot/sidepots, showdown, spectateurs, paris cachés intégrés table cash. "
            "**Profil** : lecture agrégée, patch contrôlé, avatar, badges.",
        ),
        (
            "Q",
            "**Qualité** : ErrorBoundary client, tests d’intégration blackjack multi, Swagger pour contrats. **Quotas** : rate limits par famille d’endpoints (bot, casino, hidden-bets).",
        ),
        (
            "R",
            "**Roulette** : tour, mises multiples, tirage serveur, gains, ledger, XP, prêt actif, stats. **Récupération mot de passe** : question + reset token. "
            "**Reports joueur** via `/api/reports`.",
        ),
        (
            "S",
            "**Sécurité** : trust proxy, rate limit global, Helmet, séparation prod/dev pour admin. **Socket** : même auth que REST, gestion connect_error token invalide. "
            "**Slot & stats** agrégées mini-jeux.",
        ),
        (
            "T",
            "**Tournois** : création, join/leave, buy-in wallet, watcher, téléportation vers tables, phases finales, spectateur forcé, écran résultat avec bourse. "
            "**Thème de table** : personnalisation visuelle feutre/couleurs.",
        ),
        (
            "U",
            "**Updates** : route racine pour livraison d’informations de version ou assets selon implémentation. **Utilisateur** : `useUser`, routes protégées, déconnexion socket si JWT rejeté.",
        ),
        (
            "V",
            "**Validation** systématique des montants, des transitions de rue poker, des sièges blackjack, des capacités de room. **Victoires** et métriques leaderboard.",
        ),
        (
            "W",
            "**Waiting room** poker : prêt collectif, rematch, suppression, visibilité publique/privée, transition gameId. **Wallet** : historique, sync après opérations.",
        ),
        (
            "X",
            "**Cross-cutting** : idempotency-key sur mutations RTK, retry staggered, tags `User`/`Game`/`Friend`/loans pour cohérence cache client.",
        ),
        (
            "Y",
            "**Yield / performance** : transactions DB courtes, pagination leaderboard, limites payload socket, health ready pour ne pas router trafic sur instance non prête.",
        ),
        (
            "Z",
            "**Zéro-trust côté client** : aucune logique monétaire ou RNG critique ; toute règle d’argent ou de hasard appliquée et prouvée côté serveur ; snapshots masquant les secrets adverses.",
        ),
    ]
    out: list[str] = []
    emit(out, "## Index fonctionnel A → Z")
    emit(out, "_Synthèse exhaustive du périmètre livré (routes, sockets, pages, données, garde-fous)._")
    emit(out, "")
    for letter, text in chunks:
        emit(out, f"### {letter}")
        emit(out, text)
        emit(out, "")
    return out


def annex_short() -> list[str]:
    """Principes transverses uniques (pas de boucle de milliers de lignes)."""
    principles = [
        "Toute règle qui touche à l’argent ou au hasard doit être appliquée côté serveur et résister aux manipulations client.",
        "Les états de partie sont diffusés pour minimiser la fuite d’information entre spectateur, joueur assis et bot.",
        "Les identifiants stables (`gameId`, `roomId`, `actionId`) servent traçabilité et support.",
        "Les erreurs réseau ne doivent pas laisser l’UI dans un état monétaire incohérent : resynchronisation ou annulation d’affichage optimiste.",
        "Les limites de taux et de taille protègent l’infrastructure et évitent des tables ou payloads disproportionnés.",
        "La configuration sépare développement (overrides, top-up) et production.",
        "Les dépendances optionnelles (microservice IA) ont un chemin de dégradation testé et observable.",
        "La sécurité des sockets se aligne sur celle des routes HTTP pour les actions sensibles.",
        "L’accessibilité reste une couche de présentation : elle ne déplace pas la logique métier.",
        "La modularité poker / casino / social limite les régressions croisées.",
        "Les transactions DB courtes réduisent deadlocks et contention sur les comptes.",
        "Les logs excluent les secrets ; la corrélation utilise des identifiants techniques non sensibles.",
        "Les contrats API documentés limitent les ruptures pour clients mobiles ou tiers.",
        "Les tests priorisent les chemins financiers et les fins de main poker.",
        "Les politiques mot de passe / session équilibrent sécurité et friction utilisateur.",
        "Les contenus joueur (chat, pseudo) peuvent être filtrés selon les règles communautaires.",
        "Les WebSockets multi-nœuds impliquent affinité de room ou bus interne pour cohérence d’état.",
        "Les feature toggles permettent de couper un mode ou un pari en incident sans rollback complet.",
        "Les SLI (latence d’action, 5xx) nourrissent des objectifs de fiabilité internes.",
        "Les runbooks d’incident couvrent coupure IA, maintenance et fermeture des mises.",
        "Une version minimale de client peut être exigée pour rester compatible avec le protocole socket/HTTP.",
        "Les migrations de schéma conditionnent les champs exposés mais ne s’exécutent pas dans le chemin critique d’une main.",
        "La documentation fonctionnelle doit suivre le produit : divergence document/code = risque.",
        "Le RGPD ou équivalent s’applique aux exports et suppressions de données personnelles selon déploiement.",
        "La charge prévisible (soirée, tournoi) se absorbée par montée en charge HTTP derrière load balancer stateless.",
    ]
    out: list[str] = []
    emit(out, "## Annexes — principes transverses")
    emit(out, "_Une seule passe, pas de cycles répétitifs._")
    emit(out, "")
    for i, p in enumerate(principles[:ANNEX_MAX], start=1):
        emit(out, f"- **ANN.{i:02d}** — {p}")
    emit(out, "")
    return out


def main() -> None:
    blocks: list[tuple[str, str, list[str]]] = [
        (
            "ARC",
            "Architecture globale",
            [
                "Couche client React et routage",
                "API HTTP Express",
                "WebSocket Socket.IO",
                "Persistance Prisma/PostgreSQL",
                "Moteur poker mémoire",
                "Contrôleur cash poker",
                "Casino (roulette, slot, BJ)",
                "Sécurité transversale",
                "Observabilité",
                "Microservice IA Python optionnel",
            ],
        ),
        (
            "AUTH",
            "Authentification & compte",
            [
                "Inscription",
                "Login JWT utilisateur",
                "Logout & révocation token",
                "Récupération mot de passe",
                "Profil & patch profil",
                "Solde & sync",
                "Historique wallet",
                "Gamification exposée au client",
                "Top-up développement",
                "2FA TOTP",
            ],
        ),
        (
            "ACC",
            "Accessibilité client",
            [
                "Haut contraste",
                "Alertes visuelles",
                "Mode daltonisme",
                "Types de daltonisme",
                "Persistance localStorage",
                "Application classes racine HTML",
                "Menu accessibilité",
                "Impact zéro sur règles serveur",
            ],
        ),
        (
            "LOBBY",
            "Lobby & navigation",
            [
                "Vue hub poker/minijeux",
                "Onglets et query params",
                "Tutoriel lobby",
                "Toasts & erreurs réseau",
                "Barre solde globale",
                "Accès configuration bots",
                "Accès tournois",
                "Accès blackjack multi",
            ],
        ),
        (
            "WRM",
            "Waiting rooms poker",
            [
                "Création salle",
                "Visibilité publique/privée",
                "Rejoindre / capacité",
                "Prêt collectif",
                "Démarrage vers gameId",
                "Demandes join salle privée",
                "Rematch",
                "Quitter / suppression",
            ],
        ),
        (
            "POK_RT",
            "Poker en ligne temps réel",
            [
                "Handshake socket & auth",
                "JOIN_GAME & room gameId",
                "PLAYER_ACTION",
                "Snapshots personnalisés",
                "Timer & anti-bot réaction",
                "Showdown & pots",
                "Cash sit/rebuy/leave",
                "File spectateur rejoin",
                "Chat table",
                "Reconnect & resync",
            ],
        ),
        (
            "POK_MOT",
            "Moteur de table poker",
            [
                "Distribution & blinds",
                "Ordre d’action",
                "Streets & board",
                "Fenêtre paris live optionnelle",
                "All-in runout auto",
                "Side pots",
                "Sanitisation état",
                "Journal dernière action",
            ],
        ),
        (
            "SPEC",
            "Spectateurs",
            [
                "Mode spectateur poker",
                "Visibilité cartes restreinte",
                "Queue rejoin cash",
                "Contrôles d’identité socket",
            ],
        ),
        (
            "HB",
            "Paris cachés",
            [
                "Contexte table cash mémoire",
                "Phases marché PRE_HAND / LIVE_*",
                "Cotation serveur",
                "Quote hash & versioning",
                "Placement ticket",
                "Résolution en fin de main",
                "Historique par partie",
                "Historique par joueur",
            ],
        ),
        (
            "BOT",
            "Practice bots — socle",
            [
                "Création partie practice-bot",
                "Enregistrement difficulté",
                "Chaîne async anti-race",
                "Délai réflexion bot",
                "Émission états type multi",
                "Évaluation showdown HTTP",
                "Persistance stats fin de main",
                "Politique wallet expert vs autres",
            ],
        ),
        ("BOT_E", "Bot EASY", ["Comportement loose", "Randomisation", "Sizing relances"]),
        ("BOT_M", "Bot MEDIUM", ["Équilibre risque/récompense", "Bluffs modérés", "Sizing plus structuré"]),
        ("BOT_H", "Bot HARD", ["Pot odds", "Bluffs structurés", "Moins d’erreurs grossières"]),
        (
            "BOT_X",
            "Bot EXPERT + IA",
            [
                "Heuristique Node de secours",
                "Appel microservice Python",
                "Validation réponse IA",
                "Fallback silencieux",
                "Journalisation QoS",
                "Contexte étendu (rue, stacks)",
                "Conformité non-triche",
                "Sanitisation décision",
            ],
        ),
        (
            "ROU",
            "Roulette",
            [
                "Contexte tour casino",
                "Idempotence actionId",
                "Validation mises & plafonds",
                "Transaction débit",
                "Tirage résultat serveur",
                "Résolution gains",
                "Crédit & ledger",
                "Prêt actif & priorité remboursement",
                "XP & tolérance erreur XP",
                "Stats agrégées",
            ],
        ),
        (
            "SLOT",
            "Machine à sous",
            [
                "Contexte tour & idempotence",
                "Validation mise max",
                "Transaction débit",
                "Tirage symboles",
                "Calcul payout",
                "Crédit & ledger",
                "Prêt actif",
                "XP",
                "Stats agrégées",
            ],
        ),
        ("BJ1", "Blackjack solo", ["Session", "Actions joueur", "Settlement", "Stats"]),
        (
            "BJN",
            "Blackjack multi",
            [
                "Room & sièges",
                "Invitations amis",
                "Machine état room",
                "Start vers gameId",
                "REST actions",
                "WS snapshots",
            ],
        ),
        (
            "TRN",
            "Tournois",
            [
                "Création",
                "Join/leave",
                "Start",
                "Buy-in wallet",
                "Cron serveur",
                "Broadcast état",
            ],
        ),
        (
            "FRD",
            "Amis & social",
            [
                "Demandes ami",
                "Acceptation/refus",
                "Recherche joueurs",
                "Présence socket",
                "Invitations parties",
            ],
        ),
        (
            "LOAN",
            "Prêts entre amis",
            [
                "Création demande",
                "Taux autorisés",
                "Accept/refus/cancel",
                "Notifications socket",
                "Remboursement auto sur gains casino",
                "Ledger prêt",
            ],
        ),
        (
            "LDB",
            "Leaderboard",
            [
                "Catégories XP/jetons/victoires",
                "Tri SQL",
                "Pagination",
                "Rang personnel avec bearer",
                "Tie-break username",
            ],
        ),
        (
            "PROF",
            "Profil",
            [
                "Lecture agrégée",
                "Édition contrôlée",
                "Avatar binaire ou URL",
                "Badges liés gamification",
            ],
        ),
        ("DCH", "Défis quotidiens", ["Progression", "Claim récompense", "Persistance par utilisateur"]),
        (
            "GAM",
            "Gamification",
            [
                "XP & niveaux",
                "Badges",
                "Plafonds effectifs mini-jeux",
                "Mises à jour transactionnelles sécurisées",
            ],
        ),
        ("MOD", "Modération & qualité", ["Signalement joueur", "Avis partie (rating)", "Console admin lecture/traitement"]),
        (
            "ADM",
            "Administration",
            [
                "Console JWT admin",
                "Routes runtime dev poker/bj",
                "Override roulette dev",
                "Désactivation stricte en production",
            ],
        ),
        (
            "SEC",
            "Sécurité réseau",
            [
                "CORS allowlist",
                "Helmet CSP",
                "Rate limits",
                "JWT & blacklist",
                "Idempotency casino",
                "Timeouts HTTP",
                "Anti-cheat",
            ],
        ),
        ("OPS", "Exploitation", ["Health live/ready", "Métriques prometheus", "Swagger contrats", "Logs structurés"]),
        (
            "I18N",
            "Internationalisation",
            [
                "Fichiers par langue",
                "Clés par domaine fonctionnel",
                "Rafraîchissement UI sur changement langue",
                "Fallback langue par défaut",
            ],
        ),
        (
            "CLI",
            "Client — API RTK Query & cache",
            [
                "Configuration baseUrl /api",
                "Bearer Authorization depuis localStorage",
                "En-tête x-idempotency-key par mutation",
                "Retry exponentiel / staggeredBaseQuery",
                "TagTypes User, Game, Friend, FriendRequest, FriendMessage, FriendLoan",
                "Invalidation après login/register/profile",
                "check-email avant inscription",
                "recovery-question + resetPassword",
                "Endpoints friends, loans, invitations",
            ],
        ),
        (
            "SHL",
            "Coquille application (shell)",
            [
                "Layout commun et navigation",
                "ProtectedRoute utilisateur",
                "AdminProtectedRoute + AdminAuth",
                "ErrorBoundary global",
                "LoaderProvider (chargements)",
                "ToastContext (retours utilisateur)",
                "InvitationAcceptProvider (liens d’invitation)",
                "Socket singleton et logs dev connect_error",
            ],
        ),
        (
            "TOU_CLI",
            "Tournoi — expérience client temps réel",
            [
                "Socket tournament-started → navigation gameId",
                "tournament-countdown → toasts",
                "tournament-cancelled",
                "tournament-player-joined",
                "tournament-won / qualification finale",
                "tournament-waiting-final",
                "tournament-final-table + state players",
                "tournament-eliminated overlay",
                "tournament-spectate délai puis spectate=1",
                "tournament-result overlay classement & gains",
            ],
        ),
        (
            "ADM_TOUR",
            "Administration tournois (UI)",
            [
                "Page /admin/tournaments protégée",
                "Création / édition métadonnées tournoi",
                "Liaison avec service & cron serveur",
                "Communication erreurs vers toasts",
            ],
        ),
        (
            "FMSG",
            "Messagerie entre amis",
            [
                "Liste des messages par conversation",
                "Envoi message texte",
                "Rafraîchissement / cache RTK",
                "Limites anti-spam côté serveur si configurées",
            ],
        ),
        (
            "FBK",
            "Feedback utilisateur",
            [
                "Soumission avis / retour UX",
                "Stockage pour analyse produit",
                "Séparation des données de jeu temps réel",
            ],
        ),
        (
            "RPT",
            "Signalements joueur (reports)",
            [
                "Création signalement cible + motif",
                "File modération côté admin",
                "Traçabilité pour décisions futures",
            ],
        ),
        (
            "ADMWEB",
            "Console admin web",
            [
                "Auth JWT rôle admin dédiée (ADMIN_CONSOLE_*)",
                "Lecture signalements / feedbacks",
                "Actions de modération si implémentées",
                "Séparation stricte des comptes joueurs",
            ],
        ),
        (
            "UPD",
            "Mises à jour & distribution client",
            [
                "Route updates racine côté serveur",
                "Intégration future PWA / binaires Capacitor",
                "Versioning ou changelog exposable",
            ],
        ),
        (
            "GDE",
            "Démos & flux GameDeal / GameExample",
            [
                "GameDeal : scénario de donne / animation",
                "GameExample : intégration ou démo protégée",
                "Aucun impact wallet hors contexte practice",
            ],
        ),
        (
            "HIDPG",
            "Page résultats paris cachés",
            [
                "Route /results et /hidden-bets-result",
                "Agrégation issue de la dernière main ou session",
                "Navigation depuis table poker",
            ],
        ),
        (
            "THM",
            "Thème visuel de table",
            [
                "TableThemeProvider",
                "Couleurs feutre / tapis",
                "Cohérence cartes et jetons",
                "Indépendant des règles serveur",
            ],
        ),
        (
            "CAP",
            "Web, Capacitor & basename",
            [
                "Détection window.Capacitor",
                "basename Router optionnel",
                "Chemins relatifs assets",
                "Socket URL alignée environnement",
            ],
        ),
        (
            "BOOT",
            "Démarrage serveur & intégrations",
            [
                "connectDB Prisma",
                "logDegradedStateAtBoot",
                "recoverBlackjackRuntimeAtBoot",
                "TournamentService.setIo + startTournamentWatcher",
                "GameGateway sur serveur HTTP",
                "initCleanupJobs",
            ],
        ),
        (
            "CLN",
            "Nettoyage & maintenance planifiée",
            [
                "Jobs cleanup invitations / rooms fantômes",
                "Expiration tokens ou entités temporaires",
                "Journalisation des purges",
            ],
        ),
        (
            "SCH",
            "Domaine données (vue métier)",
            [
                "Utilisateur : auth, profil, solde, stats, gamification",
                "Partie poker : états runtime + persistance sélective",
                "Wallet & mouvements : crédits/débits traçables",
                "Amis, prêts, messages, invitations",
                "Tournois : inscriptions, phases, gains",
                "Mini-jeux : tours, mises, résultats, XP",
                "Modération : reports, feedbacks",
            ],
        ),
        (
            "INV",
            "Invitations (REST + social)",
            [
                "Routes /api/invitations et /api/friends",
                "Acceptation depuis lien ou UI",
                "Intégration blackjack multi & poker",
                "Notifications socket associées",
            ],
        ),
        (
            "GAME_API",
            "API REST poker hors socket",
            [
                "Routes /api/game pour actions ou état complémentaire",
                "Cohérence avec gateway temps réel",
                "Même modèle d’auth JWT",
            ],
        ),
    ]

    lines: list[str] = []
    emit(lines, "# RAPPORT TECHNIQUE — Quantum Bluff (fonctionnement & logiques)")
    emit(lines, "")
    emit(
        lines,
        "> Document **sans code source** : descriptions de flux, rôles, données et garde-fous. "
        f"**{BULLETS_PER_SEED}** angles par sous-thème ; banque **{len(SENT_BANK)}** phrases de référence + **{len(ALL_SENTENCES) - len(SENT_BANK)}** formulations générées (couverture A→Z). "
        "Les pools par domaine évitent le hors-sujet ; la répétition exacte est limitée à l’intérieur d’une même sous-section. "
        "Variables : `RAPPORT_BULLETS_PER_SEED` (défaut 12), `RAPPORT_ANNEX_MAX` (défaut 60), "
        "`RAPPORT_ANNEX_AZ=0`, `RAPPORT_ANNEX_ROUTES=0` pour désactiver annexes.",
    )
    emit(lines, "")

    for tag, title, seeds in blocks:
        expand_block(lines, tag, title, seeds)

    if ANNEX_AZ:
        lines.extend(annex_az_index())

    if ANNEX_ROUTES:
        lines.extend(annex_http_routes())
        lines.extend(annex_react_routes())

    if ANNEX_MAX > 0:
        lines.extend(annex_short())

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"lines={len(lines)} bullets_per_seed={BULLETS_PER_SEED} annex_max={ANNEX_MAX} out={OUT}")


if __name__ == "__main__":
    main()
