#!/usr/bin/env python3
"""Generate scripts/seo_landings_data.json with expanded SEO landing content."""

from __future__ import annotations

import json
import re
from pathlib import Path

OUT = Path(__file__).with_name("seo_landings_data.json")


def faq(*items: tuple[str, str]) -> list[dict[str, str]]:
    return [{"q": q, "a": a} for q, a in items]


def wc(desc: list[str]) -> int:
    return sum(len(p.split()) for p in desc)


def expand(base: list[str], extra: list[str]) -> list[str]:
    """Keep base paragraphs, append extras (up to 7 paragraphs if needed for word count)."""
    return list(base) + list(extra)


# --- Shared expansion blocks (Quantum Bluff platform context) ---

FR_SOCIAL = (
    "Quantum Bluff est avant tout un salon social : liste d'amis, présence en ligne, messagerie privée "
    "et appels vocaux WebRTC intégrés au lobby et aux salles d'attente. Vous coordonnez une soirée Belote "
    "ou une session blackjack sans quitter l'application, en parlant directement à vos partenaires comme "
    "autour d'une vraie table. Les notifications de présence indiquent qui est disponible pour une partie "
    "rapide ; les invitations ciblées évitent les salons publics bruyants. Cette couche sociale native "
    "distingue Quantum Bluff des simulateurs isolés où l'on joue seul contre une interface froide."
)

FR_CHIPS = (
    "Toutes les mises utilisent des jetons virtuels sans valeur monétaire réelle. Vous recevez un solde "
    "de départ à l'inscription, des bonus de connexion quotidienne et des récompenses via défis et "
    "classements. Aucun dépôt bancaire, retrait ou conversion en argent n'est possible : Quantum Bluff "
    "est un casino social et une plateforme de divertissement, pas un opérateur de jeu d'argent réglementé. "
    "La page Jeu responsable du site rappelle les bonnes pratiques. Le plaisir vient de la compétition "
    "amicale, de la progression cosmétique et du partage de sessions mémorables entre amis."
)

FR_SERVER = (
    "Chaque résultat est validé côté serveur avant affichage : le client ne décide jamais seul du gain "
    "ou de la perte. Cette architecture autoritaire garantit l'équité entre joueurs et empêche toute "
    "manipulation locale. Les reconnexions après coupure réseau restituent votre session sans perte de "
    "mise en cours lorsque le round n'est pas terminé. L'historique portefeuille trace chaque transaction "
    "en jetons pour un suivi transparent. Les tests automatisés côté backend couvrent les cas limites "
    "de mise, de timing et de payout."
)

FR_LOBBY = (
    "Depuis le lobby unifié, basculez entre cartes multijoueur, hub casino rétro et mini-jeux Quick Solo "
    "sans recréer de compte. Les classements saisonniers, badges et défis quotidiens récompensent la "
    "régularité : jouer dix rounds, remporter une manche ou inviter un ami alimente votre progression. "
    "L'interface responsive fonctionne sur navigateur desktop, mobile et application Capacitor avec le "
    "même portefeuille de jetons. Créez votre compte gratuit en quelques secondes et explorez l'écosystème "
    "complet Quantum Bluff dès la première connexion."
)

FR_EXTRA = (
    "Le blog Quantum Bluff News, la page Découvrir et les guides long format documentent chaque titre "
    "du lobby : règles détaillées, stratégies responsables et changelog des mises à jour serveur. "
    "L'authentification Google, le profil public avec badges et la messagerie privée structurent une "
    "communauté francophone et internationale autour du jeu social. Les tournois annoncés après "
    "inscription gratuite proposent des structures adaptées aux soirées entre amis comme aux sessions "
    "solo d'entraînement. Aucune pression financière : seuls comptent le plaisir de jouer, l'amélioration "
    "de votre niveau et le lien social maintenu par la voix WebRTC native. Consultez aussi la page "
    "Jeu responsable pour des repères sur le temps de jeu et la gestion de votre solde virtuel."
)

FR_COMMUNITY = (
    "La communauté Quantum Bluff s'organise autour du lobby unifié : fil d'actualité, notifications "
    "de tournois et page Découvrir pour présenter chaque titre aux nouveaux joueurs. Les guides long "
    "format détaillent stratégies, mises à jour serveur et bonnes pratiques de jeu responsable. "
    "Profil public, badges et messagerie privée renforcent les liens entre joueurs sans quitter la "
    "plateforme — idéal pour planifier une soirée entre amis ou reprendre contact avec un partenaire "
    "habituel de Belote ou de poker."
)

FR_SIGNUP = (
    "Créez un compte gratuit en quelques secondes via e-mail ou Google : aucune carte bancaire, "
    "aucun abonnement. Le portefeuille de jetons virtuels est partagé entre poker, Belote, blackjack, "
    "hub casino rétro et mini-jeux Quick Solo. Consultez Quantum Bluff News pour suivre les nouveautés "
    "serveur, les tournois à venir et les guides stratégiques publiés par l'équipe."
)

EN_EXTRA = (
    "The Quantum Bluff News blog, Discover page and long-form guides document every lobby title: detailed "
    "rules, responsible strategies and server update changelogs. Google sign-in, public profiles with badges "
    "and private messaging build a French and international community around social play. Tournaments "
    "announced after free signup offer structures suited to friend nights and solo practice alike. "
    "No financial pressure: only the fun of playing, skill improvement and social connection via native "
    "WebRTC voice matter here. See the responsible gaming page for play-time tips and virtual balance management."
)

EN_COMMUNITY = (
    "The Quantum Bluff community revolves around the unified lobby: news feed, tournament notifications "
    "and the Discover page to introduce every title to new players. Long-form guides cover strategies, "
    "server updates and responsible play tips. Public profiles, badges and private messaging strengthen "
    "connections without leaving the platform — ideal for planning a friends' night or reconnecting "
    "with a regular Belote or poker partner."
)

EN_SIGNUP = (
    "Create a free account in seconds via email or Google: no bank card, no subscription. The virtual "
    "chip wallet is shared across poker, Belote, blackjack, the retro casino hub and Quick Solo "
    "mini-games. Read Quantum Bluff News for server updates, upcoming tournaments and strategy guides "
    "from the team."
)

EN_SOCIAL = (
    "Quantum Bluff is built as a social lounge first: friends list, online presence, private messaging "
    "and WebRTC voice calls integrated into the lobby and waiting rooms. Coordinate a Belote night or "
    "a blackjack session without leaving the app, talking to partners as you would at a real table. "
    "Presence notifications show who is available for a quick game; targeted invites avoid noisy public "
    "rooms. This native social layer sets Quantum Bluff apart from isolated simulators where you play "
    "alone against a cold interface."
)

EN_CHIPS = (
    "All bets use virtual chips with no real monetary value. You receive a starting balance at signup, "
    "daily login bonuses and rewards through challenges and leaderboards. No bank deposits, withdrawals "
    "or cash conversion are possible: Quantum Bluff is a social casino and entertainment platform, not a "
    "regulated real-money gambling operator. The responsible gaming page outlines best practices. The fun "
    "comes from friendly competition, cosmetic progression and sharing memorable sessions with friends."
)

EN_SERVER = (
    "Every outcome is validated server-side before display: the client never decides wins or losses alone. "
    "This authoritative architecture ensures fairness and prevents local manipulation. Reconnections after "
    "network drops restore your session without losing an in-progress bet when the round is not finished. "
    "Wallet history logs every chip transaction for transparent tracking. Automated backend tests cover "
    "edge cases for bets, timing and payouts."
)

EN_LOBBY = (
    "From the unified lobby, switch between multiplayer card games, the retro casino hub and Quick Solo "
    "mini-games without creating a new account. Seasonal leaderboards, badges and daily challenges reward "
    "regular play: complete ten rounds, win a hand or invite a friend to advance your profile. The "
    "responsive interface works on desktop browsers, mobile and the Capacitor app with the same chip "
    "wallet. Create your free account in seconds and explore the full Quantum Bluff ecosystem on first login."
)


PAD = {
    "fr": (
        "Quantum Bluff est votre salon de casino social : jetons virtuels gratuits, voix WebRTC intégrée, "
        "lobby unifié et jeux validés serveur. Rejoignez la communauté sans carte bancaire ni engagement "
        "financier — créez un compte gratuit et jouez en quelques clics depuis navigateur ou application mobile."
    ),
    "en": (
        "Quantum Bluff is your social casino lounge: free virtual chips, integrated WebRTC voice, unified lobby "
        "and server-validated games. Join the community with no bank card or financial commitment — create a "
        "free account and play in clicks from browser or mobile app."
    ),
}

FILLER_MARKERS = (
    "Quantum Bluff est votre salon de casino social",
    "Quantum Bluff is your social casino lounge",
)


def strip_filler(text: str) -> str:
    for marker in FILLER_MARKERS:
        idx = text.find(marker)
        if idx != -1:
            text = text[:idx].strip()
    return text


def finalize_description(paragraphs: list[str], locale: str, preserve_first: int = 0) -> list[str]:
    """Deduplicate, strip filler padding, ensure 700+ words in 5–6 paragraphs."""
    deduped: list[str] = []
    seen: set[str] = set()
    for p in paragraphs:
        cleaned = strip_filler(p)
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            deduped.append(cleaned)

    if preserve_first > 0:
        head = deduped[:preserve_first]
        for p in deduped[preserve_first:]:
            if p not in head:
                head.append(p)
        deduped = head

    while len(deduped) > 6:
        deduped[-2] = f"{deduped[-2]} {deduped[-1]}"
        deduped.pop()

    supplements = (
        [FR_EXTRA, FR_COMMUNITY, FR_SIGNUP, FR_LOBBY, FR_CHIPS, FR_SERVER, FR_SOCIAL]
        if locale == "fr"
        else [EN_EXTRA, EN_COMMUNITY, EN_SIGNUP, EN_LOBBY, EN_CHIPS, EN_SERVER, EN_SOCIAL]
    )
    sup_idx = 0
    while wc(deduped) < 700 and sup_idx < len(supplements):
        block = supplements[sup_idx]
        if not any(block in p for p in deduped):
            deduped[-1] = f"{deduped[-1]} {block}"
        sup_idx += 1

    if wc(deduped) < 700:
        topup = (
            "Inscription gratuite, sans carte bancaire."
            if locale == "fr"
            else "Free signup, no bank card required."
        )
        deduped[-1] = f"{deduped[-1]} {topup}"

    final_topup = (
        "Quantum Bluff réunit poker multijoueur, Belote à quatre, blackjack solo et multijoueur, "
        "roulette européenne, machines à sous vintage, Lucky Number, Roue de la fortune, Crash et Mines "
        "dans un même portefeuille de jetons virtuels. La voix WebRTC, la messagerie et les classements "
        "saisonniers transforment chaque session en moment social, que vous jouiez dix minutes ou "
        "une soirée entière entre amis — toujours sans argent réel ni engagement financier. "
        "Créez votre compte gratuitement et explorez le lobby dès maintenant. Aucun téléchargement "
        "obligatoire sur navigateur desktop ou mobile."
        if locale == "fr"
        else "Quantum Bluff brings together multiplayer poker, four-player Belote, solo and multiplayer "
        "blackjack, European roulette, vintage slots, Lucky Number, Wheel of Fortune, Crash and Mines "
        "in one virtual chip wallet. WebRTC voice, messaging and seasonal leaderboards turn every session "
        "into a social moment, whether you play ten minutes or a full friends' night — always with no "
        "real money or financial commitment. Create your free account and explore the lobby today. "
        "No download required in desktop or mobile browsers."
    )
    if wc(deduped) < 700:
        deduped[-1] = f"{deduped[-1]} {final_topup}"

    if wc(deduped) < 700:
        raise SystemExit(
            f"Description under 700 words ({wc(deduped)}) after {sup_idx} supplements — add content in generator"
        )

    if len(deduped) < 5:
        last = deduped.pop()
        words = last.split()
        mid = len(words) // 2
        deduped.append(" ".join(words[:mid]))
        deduped.append(" ".join(words[mid:]))

    return deduped[:6]


def main() -> None:
    data = {"fr": {}, "en": {}}
    _populate_fr(data["fr"])
    _populate_en(data["en"])

    preserve = {
        ("fr", "poker"): 6,
        ("en", "poker"): 6,
        ("fr", "belote"): 3,
        ("en", "belote"): 3,
        ("fr", "blackjack"): 3,
        ("en", "blackjack"): 3,
        ("fr", "roulette"): 3,
        ("en", "roulette"): 3,
        ("fr", "slots"): 3,
        ("en", "slots"): 3,
        ("fr", "crash"): 3,
        ("en", "crash"): 3,
        ("fr", "mines"): 3,
        ("en", "mines"): 3,
    }

    for locale in ("fr", "en"):
        for slug, entry in data[locale].items():
            pf = preserve.get((locale, slug), 0)
            entry["description"] = finalize_description(entry["description"], locale, pf)
            if wc(entry["description"]) < 700:
                raise SystemExit(f"{locale}/{slug}: {wc(entry['description'])} words (need 700+)")
            if not (5 <= len(entry["description"]) <= 6):
                raise SystemExit(f"{locale}/{slug}: need 5-6 paragraphs, got {len(entry['description'])}")
            if len(entry["faq"]) != 8:
                raise SystemExit(f"{locale}/{slug}: need 8 FAQ, got {len(entry['faq'])}")

    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUT}")
    for locale in ("fr", "en"):
        for slug in data[locale]:
            print(f"  {locale}/{slug}: {wc(data[locale][slug]['description'])} words")


def _populate_fr(fr: dict) -> None:
    fr["poker"] = {
        "path": "/play-poker-online",
        "image": "pokerImg",
        "imageAlt": "Table de poker Texas Hold'em sur Quantum Bluff",
        "metaTitle": "Jouer au poker en ligne gratuit | Texas Hold'em multijoueur — Quantum Bluff",
        "metaDescription": "Jouez au poker Texas Hold'em en ligne sur Quantum Bluff : salles publiques et privées, tournois, bots d'entraînement, chat vocal et jetons virtuels gratuits. Sans argent réel.",
        "heroTitle": "Jouer au poker en ligne",
        "heroSubtitle": "Texas Hold'em no-limit multijoueur dans un salon social premium — bluffez, lisez vos adversaires et grimpez les classements sans miser d'argent réel.",
        "descriptionTitle": "Pourquoi jouer au poker sur Quantum Bluff ?",
        "description": [
            "Quantum Bluff propose du Texas Hold'em no-limit pensé pour le jeu social : tables de deux à cinq joueurs, salles d'attente avec invitations d'amis, mode spectateur et tournois structurés. Chaque action est validée côté serveur pour garantir l'équité des mains, des blinds et des tapis. Le moteur gère automatiquement les side pots lors des all-in multiples, la rotation du bouton dealer et le chronomètre des décisions, afin que vous puissiez vous concentrer sur la lecture des adversaires plutôt que sur la mécanique technique. Que vous jouiez une main rapide en pause déjeuner ou une session marathon le week-end, la table reste fluide et réactive sur desktop comme sur mobile.",
            "Que vous soyez débutant ou habitué des salles live, vous pouvez vous entraîner contre des bots configurables, rejoindre une table publique en un clic ou créer une partie privée entre amis. Le lobby unifié, les classements saisonniers et les récompenses quotidiennes transforment chaque session en progression mesurable. Les défis hebdomadaires et les succès débloquables récompensent les styles de jeu variés : volume de mains, victoires en heads-up ou participation aux tournois communautaires. Votre profil public affiche vos statistiques agrégées, vos badges et votre présence en ligne pour retrouver facilement vos partenaires habituels.",
            "La plateforme intègre messagerie instantanée, présence en temps réel et appels vocaux WebRTC : idéal pour retrouver l'ambiance d'une vraie table sans quitter le navigateur. En salle d'attente, vous préparez la stratégie avec vos amis ; à table, la voix remplace le chat texte pour des bluffs plus immersifs. Le mode spectateur permet d'observer une partie en cours avant de prendre un siège, parfait pour apprendre les timings et les sizing d'enchères des joueurs expérimentés. Toutes ces fonctionnalités sociales sont natives à Quantum Bluff — pas de plugins tiers ni de salons Discord obligatoires.",
            "Les jetons sont une monnaie virtuelle interne, sans valeur monétaire : le plaisir du bluff et de la compétition amicale, pas le gambling réglementé. Vous recevez un solde de départ à l'inscription, des bonus de connexion quotidienne et des récompenses via les missions et tournois. Aucun dépôt bancaire, aucun retrait, aucune conversion en argent réel n'est possible. Quantum Bluff se positionne clairement comme casino social et salon de cartes en ligne, avec une charte de jeu responsable accessible depuis le site. Le divertissement reste au centre : gagner des jetons virtuels, monter au classement, s'amuser entre amis.",
            "Côté technique, le poker Quantum Bluff repose sur une architecture serveur autoritaire : cartes distribuées, mélanges et résolutions de mains côté backend, avec affichage synchronisé chez chaque client. Cela empêche toute triche locale et garantit que deux joueurs voient exactement le même état de table. Les reconnexions après coupure réseau restituent votre siège et votre tapis sans perte de main en cours. L'interface tactile sur mobile reprend les mêmes actions — check, raise, fold — avec des boutons dimensionnés pour le pouce et un historique de main consultable après chaque showdown.",
            "Rejoindre une table prend quelques secondes après création de compte gratuit. Depuis le lobby, filtrez les salles publiques par nombre de joueurs ou lancez une room privée avec mot de passe optionnel. Les tournois annoncés dans le fil d'actualité communautaire proposent des structures de blinds progressives et des prix en jetons pour les finalistes. Entre deux tournois, entraînez-vous contre des bots dont vous réglez le nombre et la difficulté pour tester des lignes agressives ou tight sans pression sociale. Quantum Bluff réunit ainsi l'accessibilité d'un jeu gratuit, la profondeur stratégique du Hold'em et une couche sociale premium rarement vue sur les plateformes similaires.",
        ],
        "rulesTitle": "Règles du Texas Hold'em sur Quantum Bluff",
        "rules": [
            "Chaque joueur reçoit deux cartes privées (hole cards). Cinq cartes communes sont révélées en trois tours : flop (3), turn (1), river (1).",
            "Le but est de constituer la meilleure main de cinq cartes en combinant vos deux cartes et les cartes communes.",
            "Les tours d'enchères précèdent le flop, le turn et la river. Actions possibles : check, bet, call, raise, fold — selon la situation et votre tapis.",
            "Le joueur avec la meilleure main au showdown remporte le pot. Un adversaire peut aussi gagner si tous les autres se couchent (fold).",
            "Les blinds (small blind / big blind) avancent à chaque main. Le bouton dealer tourne pour équilibrer les positions.",
            "En no-limit, vous pouvez miser tout votre tapis à tout moment (all-in). Les side pots sont calculés automatiquement par le serveur.",
        ],
        "faqTitle": "FAQ — Poker en ligne sur Quantum Bluff",
        "faq": faq(
            ("Le poker sur Quantum Bluff est-il gratuit ?", "Oui. Vous jouez avec des jetons virtuels offerts à l'inscription, via la connexion quotidienne et les défis. Aucun dépôt d'argent réel n'est requis."),
            ("Puis-je jouer au poker avec des amis ?", "Oui. Créez une salle privée, invitez vos amis depuis la liste d'amis ou partagez le lien d'invitation. Les appels vocaux de groupe sont disponibles en salle d'attente et à table."),
            ("Y a-t-il des tournois de poker ?", "Oui. Des tournois communautaires sont organisés régulièrement avec structure de blinds, classement et récompenses en jetons virtuels."),
            ("Puis-je m'entraîner contre des bots ?", "Oui. Le mode bots permet de configurer le nombre d'adversaires IA et le niveau de difficulté avant de lancer une table d'entraînement."),
            ("Quantum Bluff est-il un site de jeu d'argent ?", "Non. Quantum Bluff est une plateforme de jeu social. Les jetons n'ont aucune valeur monétaire et ne peuvent pas être échangés contre de l'argent réel."),
            ("Combien de joueurs par table ?", "Les tables Texas Hold'em accueillent entre deux et cinq joueurs. Le nombre exact est visible dans le lobby avant de rejoindre une salle."),
            ("Que se passe-t-il si je me déconnecte en cours de main ?", "Le serveur conserve votre siège et votre tapis. À la reconnexion, vous retrouvez la main en cours si elle n'est pas terminée."),
            ("Le poker fonctionne-t-il sur mobile ?", "Oui. L'interface poker est responsive et optimisée tactile sur navigateur mobile et application Quantum Bluff."),
        ),
        "ctaTitle": "La table vous attend",
        "ctaBody": "Créez votre compte gratuitement et rejoignez une table de Texas Hold'em en quelques secondes.",
    }
    _populate_fr_remaining(fr)


def _populate_fr_remaining(fr: dict) -> None:
    belote_base = [
        "Quantum Bluff recrée l'expérience d'une Belote conviviale en ligne : quatre joueurs, deux équipes de deux, distribution automatique et calcul des scores conforme aux règles classiques. La salle d'attente permet de former une table entre amis ou de rejoindre une partie publique. Le moteur Belote V1 gère enchères, plis et annonces sans erreur de comptage manuel.",
        "Les enchères (prises), les annonces et le déroulement des plis sont gérés par le serveur pour éviter les erreurs de comptage. Vous vous concentrez sur le jeu : quel atout choisir, quand couper, comment maximiser les points de votre équipe. Les timers de tour maintiennent un rythme fluide comparable à une vraie partie autour d'une table.",
        "Comme sur le reste de la plateforme, la couche sociale est native : invitations, messagerie, présence et appels vocaux pour retrouver la convivialité d'une vraie partie de cartes, depuis mobile ou navigateur. Formez votre équipe en salle d'attente, discutez stratégie à voix haute puis enchaînez les manches sans quitter Quantum Bluff.",
    ]
    fr["belote"] = {
        "path": "/online-belote",
        "image": "beloteImg",
        "imageAlt": "Partie de Belote multijoueur sur Quantum Bluff",
        "metaTitle": "Belote en ligne gratuite | Jouer à la Belote multijoueur — Quantum Bluff",
        "metaDescription": "Jouez à la Belote en ligne sur Quantum Bluff : parties à 4, contrats, score en temps réel, chat vocal et jetons virtuels. Jeu social gratuit, sans argent réel.",
        "heroTitle": "Belote en ligne",
        "heroSubtitle": "Retrouvez l'esprit des parties entre amis : Belote classique à quatre joueurs, en équipes, avec annonces, belote/rebelote et ambiance vocale intégrée.",
        "descriptionTitle": "La Belote social sur Quantum Bluff",
        "description": expand(belote_base, [
            "Plusieurs variantes sont disponibles — Classique, Coinchée, Contrée et Moderne — partageant le même moteur serveur et les mêmes garanties d'équité. Chaque mode conserve les usages français que les joueurs connaissent : distribution 32 cartes, belote/rebelote, annonces tierces et carrés, comptage des points de levées. Le score s'affiche en temps réel à la fin de chaque pli et de chaque manche, avec récapitulatif des contrats réussis ou chutés pour éviter toute dispute.",
            FR_SOCIAL,
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles de la Belote sur Quantum Bluff",
        "rules": [
            "La Belote se joue à quatre en deux équipes de deux. Les partenaires sont assis face à face.",
            "On joue avec un jeu de 32 cartes. Chaque joueur reçoit huit cartes après la distribution.",
            "Phase d'enchères : les joueurs annoncent un contrat (couleur atout et nombre de points visé) ou passent. Le plus fort contrat fixe l'atout pour la manche.",
            "Les annonces (tierces, cinquantes, carrés, belote/rebelote) sont déclarées et comptabilisées selon les règles classiques.",
            "À chaque pli, il faut fournir la couleur demandée si possible ; à défaut, couper à l'atout ou défausser. Le plus fort pli remporte la levée.",
            "Les points des levées et des annonces déterminent si le contrat est réussi. La première équipe à atteindre le score cible remporte la partie.",
        ],
        "faqTitle": "FAQ — Belote en ligne sur Quantum Bluff",
        "faq": faq(
            ("Combien de joueurs pour une partie de Belote ?", "La Belote sur Quantum Bluff se joue à quatre joueurs, en deux équipes de deux partenaires."),
            ("Les règles sont-elles les mêmes qu'en Belote classique ?", "Oui. Distribution 32 cartes, enchères, atout, annonces, belote/rebelote et comptage des points suivent les usages de la Belote classique française."),
            ("Puis-je jouer à la Belote avec des amis ?", "Oui. Créez une salle d'attente Belote et invitez vos amis. Les appels vocaux de groupe sont disponibles avant et pendant la partie."),
            ("Faut-il payer pour jouer ?", "Non. L'accès est gratuit avec des jetons virtuels. Aucune mise d'argent réel n'est impliquée."),
            ("Sur quels appareils puis-je jouer ?", "Sur navigateur web (desktop et mobile) et via l'application mobile Quantum Bluff. L'interface est responsive et optimisée tactile."),
            ("Quelles variantes de Belote sont proposées ?", "Classique, Coinchée, Contrée et Moderne sont disponibles depuis le lobby Belote, avec les mêmes règles de base et des spécificités d'enchères selon le mode."),
            ("Le score est-il calculé automatiquement ?", "Oui. Le serveur comptabilise levées, annonces et contrats en temps réel ; le client affiche le récapitulatif sans saisie manuelle."),
            ("Y a-t-il un mode spectateur ?", "Oui. Vous pouvez observer une table en cours avant de rejoindre, utile pour apprendre ou attendre un siège libre."),
        ),
        "ctaTitle": "Formez votre équipe",
        "ctaBody": "Inscrivez-vous gratuitement et lancez une partie de Belote avec vos amis dès maintenant.",
    }
    _populate_fr_games_2(fr)


def _populate_fr_games_2(fr: dict) -> None:
    bj_base = [
        "Quantum Bluff propose le blackjack dans deux formats : une table solo rapide pour s'entraîner et des tables multijoueur où plusieurs joueurs affrontent le croupier simultanément. Les règles classiques du 21 s'appliquent : battre le croupier sans dépasser 21, avec les options split, double down et insurance.",
        "Chaque tirage de carte est validé côté serveur. Le moteur gère automatiquement les mains du croupier (stand on 17), les side bets éventuels et le calcul des gains en jetons virtuels.",
        "Intégré au lobby Quantum Bluff, le blackjack bénéficie du même écosystème social : amis, classements, récompenses quotidiennes et sessions express entre deux parties de poker ou de Belote.",
    ]
    fr["blackjack"] = {
        "path": "/online-blackjack",
        "image": "blackjackImg",
        "imageAlt": "Table de blackjack sur Quantum Bluff",
        "metaTitle": "Blackjack en ligne gratuit | 21 multijoueur — Quantum Bluff",
        "metaDescription": "Jouez au blackjack en ligne sur Quantum Bluff : mode solo, tables multijoueur, règles classiques 21, jetons virtuels et ambiance casino social. Gratuit, sans argent réel.",
        "heroTitle": "Blackjack en ligne",
        "heroSubtitle": "Affrontez le croupier au 21 en solo ou rejoignez une table multijoueur — split, double et insurance gérés par le serveur pour une expérience fluide.",
        "descriptionTitle": "Blackjack social sur Quantum Bluff",
        "description": expand(bj_base, [
            "Le mode solo convient aux débutants qui apprennent la stratégie de base : quand tirer, doubler ou split selon la carte visible du croupier. Le multijoueur recrée l'ambiance d'une table de casino où plusieurs joueurs agissent en parallèle contre le même croupier virtuel, avec timer collectif pour garder le rythme. Les payouts blackjack 3:2, push sur égalité de naturals et règles stand-on-17 du croupier suivent les standards que les joueurs attendent.",
            "Votre portefeuille de jetons virtuels se met à jour instantanément après chaque main. L'historique wallet permet d'auditer vos sessions solo et multijoueur. Aucun dépôt ni retrait d'argent réel : le blackjack Quantum Bluff reste un divertissement social intégré au salon, pas un casino réglementé.",
            FR_SOCIAL,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles du blackjack sur Quantum Bluff",
        "rules": [
            "Le but est d'obtenir une main dont la valeur est plus proche de 21 que celle du croupier, sans dépasser 21.",
            "Les cartes 2 à 10 valent leur valeur faciale. Les figures (Valet, Dame, Roi) valent 10. L'As vaut 1 ou 11, selon ce qui avantage le joueur.",
            "Blackjack naturel : un As et une carte de 10 points en deux cartes. Il bat toute autre main sauf un blackjack adverse (égalité / push).",
            "Actions disponibles : Hit (tirer), Stand (rester), Double (doubler la mise et une seule carte), Split (séparer une paire en deux mains).",
            "Le croupier tire selon les règles fixes : il stand sur 17 et tire sur 16 ou moins.",
            "Insurance est proposée si le croupier montre un As : pari annexe contre un blackjack du croupier.",
        ],
        "faqTitle": "FAQ — Blackjack en ligne sur Quantum Bluff",
        "faq": faq(
            ("Puis-je jouer au blackjack gratuitement ?", "Oui. Vous misez des jetons virtuels sans valeur monétaire. Des jetons sont offerts à l'inscription et via les récompenses quotidiennes."),
            ("Existe-t-il un mode multijoueur ?", "Oui. Rejoignez le lobby blackjack multijoueur : plusieurs joueurs peuvent être assis à la même table et jouer contre le croupier en parallèle."),
            ("Les règles sont-elles standards ?", "Oui. Blackjack 3:2, croupier stand on 17, split et double selon les règles classiques du casino, adaptées au format social."),
            ("Quantum Bluff est-il un casino en ligne réglementé ?", "Non. C'est une plateforme de divertissement social. Aucun dépôt, retrait ou gain d'argent réel n'est possible."),
            ("Puis-je jouer sur mobile ?", "Oui. Le blackjack est accessible depuis le navigateur mobile et l'application Quantum Bluff avec une interface tactile optimisée."),
            ("Le croupier joue-t-il automatiquement ?", "Oui. Le serveur applique stand on 17 et hit on 16 ou moins sans intervention manuelle."),
            ("Puis-je consulter l'historique de mes mains ?", "Oui. L'historique portefeuille enregistre mises et gains en jetons pour chaque session blackjack."),
            ("Le split et le double sont-ils gérés serveur ?", "Oui. Toutes les actions et tirages sont validés côté backend avant affichage."),
        ),
        "ctaTitle": "Tentez le 21",
        "ctaBody": "Créez votre compte et lancez une partie de blackjack solo ou multijoueur en un clic.",
    }
    _populate_fr_games_3(fr)


def _populate_fr_games_3(fr: dict) -> None:
    roulette_base = [
        "Quantum Bluff propose une roulette européenne intégrée au hub casino rétro : ambiance vintage, animation fluide et retour instantané vers le lobby. Les mises intérieures (numéro plein, cheval, transversale) et extérieures (rouge/noir, pair/impair, douzaines) sont toutes disponibles.",
        "Chaque spin est généré et validé côté serveur avant d'être affiché. Les gains en jetons virtuels sont crédités automatiquement sur votre portefeuille, avec historique des parties pour suivre vos sessions.",
        "Un mode tutoriel guidé depuis le lobby vous aide à découvrir les types de paris. Idéal pour une pause rapide entre deux parties de poker ou de Belote, sans quitter l'univers Quantum Bluff.",
    ]
    fr["roulette"] = {
        "path": "/online-roulette",
        "image": "rouletteImg",
        "imageAlt": "Roulette européenne rétro sur Quantum Bluff",
        "metaTitle": "Roulette en ligne gratuite | Roulette européenne — Quantum Bluff",
        "metaDescription": "Jouez à la roulette en ligne sur Quantum Bluff : roulette européenne, mises intérieures et extérieures, thème casino rétro et jetons virtuels. Gratuit, sans argent réel.",
        "heroTitle": "Roulette en ligne",
        "heroSubtitle": "Roulette européenne au salon casino rétro — rouge, noir, pair, impair et pleins : chaque tirage est validé côté serveur avec des jetons virtuels.",
        "descriptionTitle": "Roulette social sur Quantum Bluff",
        "description": expand(roulette_base, [
            "La roue européenne à 37 cases (0–36) offre un seul zéro, avec payouts standards : plein 35:1, cheval 17:1, rouge/noir 1:1. Le tapis rétro reprend l'esthétique néon du hub casino, cohérente avec la machine à sous et Lucky Number du même salon. Les limites de mise en jetons (pas de 10) sont affichées clairement avant chaque spin.",
            "Le tutoriel /tutorial/roulette depuis le lobby détaille chaque type de pari pour les débutants. Les joueurs expérimentés enchaînent les spins entre deux tournois poker grâce au bouton retour vers le hub sans perdre leur solde global.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles de la roulette sur Quantum Bluff",
        "rules": [
            "La roulette européenne compte 37 cases : numéros 1 à 36 et un zéro (0).",
            "Placez vos mises sur le tapis avant le lancement de la roue : numéro plein, cheval, transversale, carré, sixain, colonne, douzaine, rouge/noir, pair/impair, manque/passe.",
            "Le croupier virtuel lance la bille ; le numéro gagnant est tiré côté serveur et affiché avec animation synchronisée.",
            "Les gains dépendent du type de pari : un plein paie 35:1, rouge/noir et pair/impair paient 1:1, etc.",
            "Les mises sont en jetons virtuels (pas de 10), avec limites min/max affichées à l'écran.",
            "Aucune valeur monétaire réelle n'est en jeu : divertissement social uniquement.",
        ],
        "faqTitle": "FAQ — Roulette en ligne sur Quantum Bluff",
        "faq": faq(
            ("Quel type de roulette est disponible ?", "Roulette européenne à 37 cases (un seul zéro), dans le salon casino rétro du lobby."),
            ("La roulette est-elle gratuite ?", "Oui. Vous jouez avec des jetons virtuels offerts à l'inscription et via les récompenses quotidiennes."),
            ("Les tirages sont-ils équitables ?", "Oui. Chaque résultat est généré et validé côté serveur avant affichage, sans manipulation côté client."),
            ("Y a-t-il un tutoriel ?", "Oui. Un mode tutoriel guidé est accessible depuis le lobby pour apprendre les types de paris pas à pas."),
            ("Puis-je jouer sur mobile ?", "Oui. La roulette est responsive et optimisée pour le tactile sur navigateur et application mobile."),
            ("Quelles mises intérieures puis-je placer ?", "Plein, cheval, transversale, carré et sixain sont disponibles sur le tapis avec payouts affichés."),
            ("Où voir mon historique de spins ?", "L'historique portefeuille enregistre chaque mise et gain en jetons virtuels après validation serveur."),
            ("La roulette partage-t-elle le solde du lobby ?", "Oui. Le même portefeuille de jetons s'applique à toute la plateforme Quantum Bluff."),
        ),
        "ctaTitle": "Faites tourner la roue",
        "ctaBody": "Créez votre compte gratuitement et lancez un spin à la roulette européenne.",
    }
    _populate_fr_games_4(fr)


def _populate_fr_games_4(fr: dict) -> None:
    slots_base = [
        "Quantum Bluff propose une machine à sous au style casino vintage : symboles classiques, effets lumineux et interface immersive dans le hub rétro. Chaque spin est validé côté serveur pour garantir des résultats équitables.",
        "Les gains en jetons virtuels sont calculés automatiquement selon les combinaisons alignées. L'historique portefeuille trace chaque partie pour un suivi transparent de vos sessions.",
        "Parfait pour une pause rapide : quelques spins entre deux mains de poker, sans quitter l'écosystème Quantum Bluff ni miser d'argent réel.",
    ]
    fr["slots"] = {
        "path": "/online-slots",
        "image": "slotImg",
        "imageAlt": "Machine à sous vintage sur Quantum Bluff",
        "metaTitle": "Machine à sous en ligne gratuite | Slots rétro — Quantum Bluff",
        "metaDescription": "Jouez aux machines à sous en ligne sur Quantum Bluff : slot vintage, symboles classiques, tirages serveur et jetons virtuels. Casino social gratuit, sans argent réel.",
        "heroTitle": "Machine à sous en ligne",
        "heroSubtitle": "Slot machine vintage au cœur du casino rétro — symboles néon, tirages validés serveur et sessions express entre deux parties de cartes.",
        "descriptionTitle": "Slots social sur Quantum Bluff",
        "description": expand(slots_base, [
            "Les symboles vintage et effets néon recréent l'ambiance des salles classiques dans une interface moderne. Le tableau des payouts est visible avant chaque spin ; les alignements gagnants déclenchent des crédits instantanés sur votre portefeuille. Chaque tirage est indépendant côté serveur — aucun cycle « chaud » ou « froid » n'existe.",
            "Les défis quotidiens peuvent inclure des objectifs sur les mini-jeux casino : enchaîner dix spins à mise modérée contribue à vos récompenses sans épuiser votre solde. Fixez un budget virtuel de session comme en poker pour garder le divertissement maîtrisé.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Comment jouer aux slots sur Quantum Bluff",
        "rules": [
            "Choisissez votre mise en jetons virtuels (limites affichées à l'écran) puis lancez le spin.",
            "Les rouleaux s'arrêtent sur une combinaison de symboles déterminée côté serveur.",
            "Les alignements gagnants (lignes, paires, symboles bonus) déclenchent des gains selon le tableau des payouts.",
            "Les jetons gagnés sont crédités instantanément sur votre portefeuille virtuel.",
            "Aucun dépôt ni retrait d'argent réel : monnaie interne uniquement.",
            "Le jeu est accessible depuis le hub casino rétro du lobby après connexion.",
        ],
        "faqTitle": "FAQ — Machine à sous sur Quantum Bluff",
        "faq": faq(
            ("Les slots sont-ils gratuits ?", "Oui. Vous jouez avec des jetons virtuels sans valeur monétaire, obtenus à l'inscription et via les récompenses quotidiennes."),
            ("Les résultats sont-ils truqués ?", "Non. Chaque tirage est généré et validé côté serveur avant d'être affiché au client."),
            ("Quel style de machine à sous ?", "Une slot vintage au thème casino rétro, avec symboles classiques et effets néon, intégrée au salon Quantum Bluff."),
            ("Puis-je jouer sur mobile ?", "Oui. L'interface est responsive et optimisée pour le tactile sur navigateur et application."),
            ("Quantum Bluff est-il un casino réglementé ?", "Non. C'est une plateforme de divertissement social. Aucun gain d'argent réel n'est possible."),
            ("Où voir le tableau des gains ?", "Le paytable est affiché dans l'interface slot avant de lancer un spin."),
            ("Les spins comptent-ils pour les défis quotidiens ?", "Oui. Certaines missions quotidiennes ciblent les mini-jeux casino dont les slots."),
            ("Quelle mise minimale ?", "Les limites affichées à l'écran suivent le contrat jetons de la plateforme, généralement par pas de 10."),
        ),
        "ctaTitle": "Tentez votre chance",
        "ctaBody": "Inscrivez-vous et lancez vos premiers spins sur la machine à sous vintage.",
    }
    _populate_fr_games_5(fr)


def _populate_fr_games_5(fr: dict) -> None:
    crash_base = [
        "Le Crash est un mini-jeu solo où un multiplicateur grimpe en continu jusqu'à un point de crash imprévisible. Placez votre mise, suivez la courbe et encaissez (cash out) avant que le multiplicateur ne s'effondre.",
        "Chaque round est entièrement géré côté serveur : point de crash, timing et payouts calculés avant affichage. Les mises vont de 10 à 500 jetons virtuels, avec historique portefeuille pour chaque session.",
        "Intégré au hub Quick Solo du lobby, le Crash offre des sessions express entre deux parties de cartes — fun, rapide et sans argent réel.",
    ]
    fr["crash"] = {
        "path": "/online-crash-game",
        "image": "crashImg",
        "imageAlt": "Jeu Crash multijoueur sur Quantum Bluff",
        "metaTitle": "Crash game en ligne gratuit | Multiplicateur — Quantum Bluff",
        "metaDescription": "Jouez au Crash en ligne sur Quantum Bluff : multiplicateur en temps réel, cash out, rounds serveur et jetons virtuels. Mini-jeu social gratuit, sans argent réel.",
        "heroTitle": "Crash game en ligne",
        "heroSubtitle": "Montez le multiplicateur et encaissez avant le crash — chaque round est validé côté serveur avec animation temps réel synchronisée.",
        "descriptionTitle": "Crash social sur Quantum Bluff",
        "description": expand(crash_base, [
            "La courbe monte de 1,00× jusqu'au crash ; votre gain potentiel est mise × multiplicateur au moment du cash out. Le point de crash est fixé serveur avant le round — le client anime le résultat sans influence sur l'issue. Un historique des rounds récents aide à analyser vos sessions sans promettre de pattern prédictible.",
            "Stratégie responsable : fixez une cible de cash out avant le départ (ex. 2,0×) plutôt que de courir après le multiplicateur en cours de round. Les jetons perdus restent virtuels ; le plaisir vient du timing et de la gestion du risque social entre amis qui comparent leurs scores.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles du Crash sur Quantum Bluff",
        "rules": [
            "Placez une mise en jetons virtuels (10 à 500, pas de 10) avant le début du round.",
            "Le multiplicateur démarre à 1,00× et monte progressivement.",
            "Cliquez sur Cash Out pour encaisser : gain = mise × multiplicateur au moment du cash out.",
            "Si le multiplicateur crash avant votre cash out, vous perdez la mise du round.",
            "Le point de crash est déterminé côté serveur avant le début du round — le client affiche uniquement le résultat.",
            "Un historique des rounds récents est visible pour analyser vos sessions.",
        ],
        "faqTitle": "FAQ — Crash game sur Quantum Bluff",
        "faq": faq(
            ("Comment fonctionne le Crash ?", "Un multiplicateur monte jusqu'à un crash aléatoire. Encaissez avant le crash pour gagner mise × multiplicateur."),
            ("Le jeu est-il gratuit ?", "Oui. Vous misez des jetons virtuels sans valeur monétaire."),
            ("Le crash est-il manipulable ?", "Non. Le point de crash est calculé côté serveur avant le round et ne peut pas être modifié par le client."),
            ("Quelle est la mise minimale ?", "10 jetons virtuels, par pas de 10, jusqu'à 500 jetons maximum par round."),
            ("Où accéder au Crash ?", "Depuis le hub Quick Solo du lobby, après connexion à votre compte Quantum Bluff."),
            ("Puis-je cash out à tout moment ?", "Oui, tant que le multiplicateur n'a pas crashé. Le payout est calculé serveur au clic."),
            ("Y a-t-il un historique des rounds ?", "Oui. Les rounds récents et l'historique portefeuille tracent vos sessions."),
            ("Le Crash fonctionne-t-il sur mobile ?", "Oui. L'interface Quick Solo est responsive et optimisée tactile."),
        ),
        "ctaTitle": "Visez le cash out",
        "ctaBody": "Créez votre compte et testez le Crash — encaissez au bon moment avant l'effondrement.",
    }
    _populate_fr_games_6(fr)


def _populate_fr_games_6(fr: dict) -> None:
    mines_base = [
        "Mines est un mini-jeu de grille où vous choisissez le nombre de mines cachées, placez votre mise et révélez des cases une par une. Chaque case sûre augmente le multiplicateur ; touchez une mine et vous perdez la mise.",
        "Le placement des mines et les payouts sont entièrement calculés côté serveur. Le client illustre l'état de la grille et les gains potentiels, sans influencer le résultat.",
        "Accessible depuis le hub Quick Solo, Mines complète l'offre casino express de Quantum Bluff — sessions courtes, stratégie risque/récompense et jetons virtuels uniquement.",
    ]
    fr["mines"] = {
        "path": "/online-mines-game",
        "image": "minesImg",
        "imageAlt": "Jeu Mines sur Quantum Bluff",
        "metaTitle": "Mines game en ligne gratuit | Grille risque/récompense — Quantum Bluff",
        "metaDescription": "Jouez à Mines en ligne sur Quantum Bluff : grille risque/récompense, révélez les cases, évitez les mines et jetons virtuels. Mini-jeu social gratuit, sans argent réel.",
        "heroTitle": "Mines game en ligne",
        "heroSubtitle": "Révélez les cases une par une sans toucher une mine — chaque case sûre fait grimper votre gain jusqu'au cash out.",
        "descriptionTitle": "Mines social sur Quantum Bluff",
        "description": expand(mines_base, [
            "Plus vous choisissez de mines sur la grille, plus le multiplicateur potentiel monte — mais le risque de tout perdre augmente aussi. Après plusieurs gemmes sûres, encaisser (Cash Out) sécurise le gain serveur sans tenter le board complet. Le layout responsive mobile aligne les types de payout avec le backend pour une expérience cohérente.",
            "Mines partage le contrat de mise unifié Quick Solo : 10 à 500 jetons, pas de 10, anti double-clic et crédit wallet atomique. Idéal entre deux mains de Belote ou après une session Crash pour varier le rythme.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles du Mines sur Quantum Bluff",
        "rules": [
            "Choisissez le nombre de mines sur la grille (plus de mines = multiplicateur plus élevé mais risque accru).",
            "Placez votre mise en jetons virtuels (10 à 500, pas de 10).",
            "Révélez les cases une par une : chaque gemme sûre augmente le gain potentiel.",
            "Cash Out à tout moment pour encaisser le multiplicateur actuel.",
            "Si vous révélez une mine, le round est perdu et la mise est déduite.",
            "Le placement des mines est tiré côté serveur au début du round — équitable et non manipulable.",
        ],
        "faqTitle": "FAQ — Mines game sur Quantum Bluff",
        "faq": faq(
            ("Comment gagner au Mines ?", "Révélez un maximum de cases sûres puis encaissez (Cash Out) avant de toucher une mine."),
            ("Le jeu est-il gratuit ?", "Oui. Mises en jetons virtuels sans valeur monétaire réelle."),
            ("Les mines sont-elles truquées ?", "Non. Le placement est généré côté serveur au début de chaque round."),
            ("Puis-je choisir le nombre de mines ?", "Oui. Plus il y a de mines, plus le multiplicateur potentiel est élevé — mais le risque augmente aussi."),
            ("Mines fonctionne-t-il sur mobile ?", "Oui. La grille est responsive et optimisée pour le tactile."),
            ("Quand puis-je encaisser ?", "À tout moment après au moins une case sûre révélée, via Cash Out serveur-validé."),
            ("Que se passe-t-il si je touche une mine ?", "Le round est perdu et la mise est déduite ; une nouvelle grille peut être lancée."),
            ("Où accéder au Mines ?", "Depuis le hub Quick Solo du lobby Quantum Bluff après connexion."),
        ),
        "ctaTitle": "Évitez les mines",
        "ctaBody": "Inscrivez-vous et lancez votre première grille Mines depuis le lobby.",
    }
    fr["luckyNumber"] = {
        "path": "/online-lucky-number",
        "image": "luckyImg",
        "imageAlt": "Jeu Lucky Number sur Quantum Bluff",
        "metaTitle": "Lucky Number en ligne gratuit | Numéro porte-bonheur — Quantum Bluff",
        "metaDescription": "Jouez à Lucky Number sur Quantum Bluff : choisissez un chiffre de 1 à 10, tirage serveur, gain x8 et jetons virtuels. Casino rétro gratuit, sans argent réel.",
        "heroTitle": "Lucky Number en ligne",
        "heroSubtitle": "Choisissez votre numéro porte-bonheur de 1 à 10 — la maison tire, vous gagnez x8 en cas de match, avec mises de 10 à 500 jetons validées serveur.",
        "descriptionTitle": "Lucky Number dans le casino rétro Quantum Bluff",
        "description": expand([
            "Lucky Number est un mini-jeu instantané du hub casino rétro : vous sélectionnez un entier entre 1 et 10, placez votre mise en jetons virtuels, puis le serveur tire un numéro gagnant via POST /api/lucky-number/play. Si votre choix correspond, vous encaissez huit fois votre mise (coefficient x8) ; sinon la mise est perdue pour ce round.",
            "Les mises acceptées vont de 10 à 500 jetons, par pas de 10, avec validation serveur du solde avant chaque tirage. Un verrou anti double-clic empêche les requêtes parallèles sur le même compte. L'animation client illustre le tirage sans décider du résultat.",
            "Intégré aux côtés de la roulette européenne et de la machine à sous vintage, Lucky Number complète la triade rétro pour des pauses d'une minute entre deux parties de cartes multijoueur.",
        ], [
            "Le tirage est uniforme entre 1 et 10 côté backend, testé par la suite Jest du serveur. L'historique portefeuille enregistre mise, numéro choisi, numéro tiré et payout pour auditer chaque session. Aucune valeur monétaire réelle n'est en jeu.",
            "Les défis quotidiens peuvent inclure des objectifs Lucky Number (ex. dix rounds) pour gagner des jetons bonus. Fixez un budget virtuel de session comme sur les autres mini-jeux du hub.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles du Lucky Number sur Quantum Bluff",
        "rules": [
            "Choisissez un numéro entier entre 1 et 10 inclus.",
            "Placez votre mise en jetons virtuels (10 à 500, pas de 10).",
            "Le serveur tire un numéro gagnant uniformément entre 1 et 10.",
            "Si votre numéro correspond au tirage, vous gagnez mise × 8 (coefficient x8).",
            "En cas de non-correspondance, la mise du round est perdue.",
            "Chaque round est validé via POST /api/lucky-number/play — le client affiche le résultat serveur.",
        ],
        "faqTitle": "FAQ — Lucky Number sur Quantum Bluff",
        "faq": faq(
            ("Comment jouer à Lucky Number ?", "Choisissez un chiffre de 1 à 10, misez 10–500 jetons, le serveur tire ; match = gain x8."),
            ("Le jeu est-il gratuit ?", "Oui. Mises en jetons virtuels sans valeur monétaire."),
            ("Le tirage est-il équitable ?", "Oui. Le numéro est tiré uniformément côté serveur avant affichage."),
            ("Quel est le payout en cas de gain ?", "Huit fois votre mise (coefficient x8) crédité sur le portefeuille virtuel."),
            ("Où accéder au jeu ?", "Depuis le hub casino rétro du lobby Quantum Bluff."),
            ("Quelle mise minimale et maximale ?", "10 jetons minimum, 500 maximum, par pas de 10."),
            ("Puis-je enchaîner plusieurs tirages ?", "Oui, un verrou serveur évite les double-clics pendant le traitement."),
            ("Lucky Number fonctionne-t-il sur mobile ?", "Oui. L'interface rétro est responsive et optimisée tactile."),
        ),
        "ctaTitle": "Tentez votre numéro",
        "ctaBody": "Créez votre compte et lancez votre premier tirage Lucky Number depuis le casino rétro.",
    }
    fr["wheel"] = {
        "path": "/online-wheel-of-fortune",
        "image": "slotImg",
        "imageAlt": "Roue de la fortune sur Quantum Bluff",
        "metaTitle": "Roue de la fortune en ligne gratuite | Wheel x20 — Quantum Bluff",
        "metaDescription": "Jouez à la Roue de la fortune sur Quantum Bluff : 12 segments, multiplicateurs x0 à x20 JACKPOT, mises 10–500 jetons, spin validé serveur. Quick Solo gratuit.",
        "heroTitle": "Roue de la fortune en ligne",
        "heroSubtitle": "Douze segments, multiplicateurs de x0 à JACKPOT x20 — tournez la roue dans le hub Quick Solo avec mises de 10 à 500 jetons validées côté serveur.",
        "descriptionTitle": "Wheel of Fortune sur Quantum Bluff",
        "description": expand([
            "La Roue de la fortune est un mini-jeu Quick Solo à douze segments : x0, x0.5, x1, x1.5, x2, x3, x5 et JACKPOT x20. Vous misez entre 10 et 500 jetons virtuels, le serveur tire le segment gagnant et calcule le payout (mise × coefficient) avant l'animation.",
            "Le pointeur fixe en haut et la rotation finale sont synchronisées avec le résultat API — le client ne choisit jamais le segment. La légende des coefficients est visible avant le premier spin pour comprendre la distribution des segments.",
            "Accessible depuis le hub Quick Solo aux côtés de Crash et Mines, la roue offre des sessions express sans quitter le portefeuille unifié Quantum Bluff.",
        ], [
            "Trois segments x0, deux x0.5, deux x1, un x1.5, un x2, un x3, un x5 et un JACKPOT x20 composent la roue — chaque spin est indépendant et testé côté serveur (wheelMath.ts). L'historique wallet trace mises et gains.",
            "Stratégie responsable : la roue reste un divertissement à variance élevée ; fixez un plafond de jetons par session. Les défis quotidiens peuvent compter les spins wheel vers vos récompenses.",
            FR_CHIPS,
            FR_SERVER,
            FR_LOBBY,
        ]),
        "rulesTitle": "Règles de la Roue sur Quantum Bluff",
        "rules": [
            "La roue comporte 12 segments avec multiplicateurs : x0, x0.5, x1, x1.5, x2, x3, x5 et JACKPOT x20.",
            "Placez votre mise en jetons virtuels (10 à 500, pas de 10) avant de lancer le spin.",
            "Le serveur tire le segment gagnant et calcule gain = mise × multiplicateur.",
            "L'animation de rotation est synchronisée avec le résultat serveur — le client n'influence pas l'issue.",
            "Un segment x0 signifie perte de la mise ; JACKPOT x20 crédite vingt fois la mise.",
            "Chaque spin est indépendant ; l'historique portefeuille enregistre le résultat.",
        ],
        "faqTitle": "FAQ — Roue de la fortune sur Quantum Bluff",
        "faq": faq(
            ("Combien de segments a la roue ?", "Douze segments avec coefficients x0, x0.5, x1, x1.5, x2, x3, x5 et JACKPOT x20."),
            ("Le jeu est-il gratuit ?", "Oui. Mises en jetons virtuels sans argent réel."),
            ("Le spin est-il truqué ?", "Non. Le segment est tiré et validé côté serveur avant l'animation."),
            ("Quelle est la mise maximale ?", "500 jetons virtuels, minimum 10, pas de 10."),
            ("Où accéder à la roue ?", "Depuis le hub Quick Solo du lobby Quantum Bluff."),
            ("Que signifie JACKPOT x20 ?", "Vingt fois votre mise est créditée si le pointeur s'arrête sur le segment JACKPOT."),
            ("Puis-je voir les coefficients avant de jouer ?", "Oui. La légende des segments est affichée dans l'interface."),
            ("La roue fonctionne-t-elle sur mobile ?", "Oui. Interface responsive avec animation synchronisée au résultat serveur."),
        ),
        "ctaTitle": "Tournez la roue",
        "ctaBody": "Inscrivez-vous et lancez votre premier spin sur la Roue de la fortune.",
    }


def _populate_en(en: dict) -> None:
    en["poker"] = {
        "path": "/play-poker-online",
        "image": "pokerImg",
        "imageAlt": "Texas Hold'em poker table on Quantum Bluff",
        "metaTitle": "Play Poker Online Free | Texas Hold'em Multiplayer — Quantum Bluff",
        "metaDescription": "Play Texas Hold'em poker online on Quantum Bluff: public and private rooms, tournaments, training bots, voice chat and free virtual chips. No real money.",
        "heroTitle": "Play poker online",
        "heroSubtitle": "No-limit Texas Hold'em multiplayer in a premium social lounge — bluff, read your opponents and climb the rankings without wagering real money.",
        "descriptionTitle": "Why play poker on Quantum Bluff?",
        "description": [
            "Quantum Bluff offers no-limit Texas Hold'em built for social play: two to five player tables, waiting rooms with friend invites, spectator mode and structured tournaments. Every action is server-validated to keep hands, blinds and stacks fair. The engine handles side pots on multi-way all-ins, dealer button rotation and action timers automatically so you focus on reads rather than mechanics. Lunch-break hands and weekend marathons stay smooth on desktop and mobile.",
            "Whether you are new to poker or a live-room regular, train against configurable bots, join a public table in one click or host a private game with friends. The unified lobby, seasonal leaderboards and daily rewards turn every session into measurable progress. Weekly challenges and unlockable achievements reward varied play styles: hand volume, heads-up wins or community tournament entries. Your public profile shows aggregated stats, badges and online presence so regular partners are easy to find.",
            "The platform includes messaging, real-time presence and WebRTC voice calls — recreating a real table atmosphere from your browser. Waiting rooms let you strategize with friends before seating; at the table, voice replaces text for immersive bluffs. Spectator mode lets you watch a hand before joining — ideal for learning bet sizing from experienced players. These social features are native to Quantum Bluff — no third-party plugins or mandatory Discord servers.",
            "Chips are virtual in-game currency with no monetary value — the thrill of the bluff and friendly competition, not regulated gambling. You receive a starting balance at signup, daily login bonuses and rewards through missions and tournaments. No bank deposits, withdrawals or cash conversion are possible. Quantum Bluff is clearly positioned as a social casino and online card room with a responsible gaming charter on the site. Entertainment stays central: win virtual chips, climb rankings and have fun with friends.",
            "Technically, Quantum Bluff poker uses a server-authoritative architecture: cards dealt, shuffles and hand resolution on the backend with synchronized display on every client. That prevents local cheating and ensures two players see exactly the same table state. Reconnections after network drops restore your seat and stack without losing an in-progress hand. The mobile touch interface offers the same actions — check, raise, fold — with thumb-sized buttons and hand history after each showdown.",
            "Joining a table takes seconds after free account creation. From the lobby, filter public rooms by player count or launch a private room with optional password. Community tournaments announced in the news feed offer progressive blind structures and virtual chip prizes for finalists. Between tournaments, train against bots whose count and difficulty you set to test aggressive or tight lines without social pressure. Quantum Bluff combines free accessibility, Hold'em strategic depth and a premium social layer rarely seen on similar platforms.",
        ],
        "rulesTitle": "Texas Hold'em rules on Quantum Bluff",
        "rules": [
            "Each player receives two private hole cards. Five community cards are revealed in three rounds: flop (3), turn (1), river (1).",
            "The goal is to make the best five-card hand using your two cards and the community cards.",
            "Betting rounds occur before the flop, turn and river. Actions include check, bet, call, raise and fold depending on the situation and your stack.",
            "The best hand at showdown wins the pot. A player also wins if everyone else folds.",
            "Blinds (small blind / big blind) advance each hand. The dealer button rotates to balance positions.",
            "In no-limit, you may bet your entire stack at any time (all-in). Side pots are calculated automatically by the server.",
        ],
        "faqTitle": "FAQ — Online poker on Quantum Bluff",
        "faq": faq(
            ("Is poker on Quantum Bluff free?", "Yes. You play with virtual chips granted at signup, through daily login and challenges. No real-money deposit is required."),
            ("Can I play poker with friends?", "Yes. Create a private room, invite friends from your list or share an invite link. Group voice calls are available in the waiting room and at the table."),
            ("Are there poker tournaments?", "Yes. Community tournaments run regularly with blind structure, standings and virtual chip prizes."),
            ("Can I practice against bots?", "Yes. Bot mode lets you configure the number of AI opponents and difficulty before starting a training table."),
            ("Is Quantum Bluff a real-money gambling site?", "No. Quantum Bluff is a social gaming platform. Chips have no cash value and cannot be exchanged for real money."),
            ("How many players per table?", "Texas Hold'em tables seat two to five players. The exact count is shown in the lobby before you join."),
            ("What happens if I disconnect mid-hand?", "The server keeps your seat and stack. On reconnect you rejoin the current hand if it is still in progress."),
            ("Does poker work on mobile?", "Yes. The poker UI is responsive and touch-optimized in mobile browsers and the Quantum Bluff app."),
        ),
        "ctaTitle": "The table is waiting",
        "ctaBody": "Create your free account and join a Texas Hold'em table in seconds.",
    }
    _populate_en_remaining(en)


def _populate_en_remaining(en: dict) -> None:
    belote_base = [
        "Quantum Bluff recreates a friendly Belote experience online: four players, two teams of two, automatic dealing and standard scoring. The waiting room lets you gather friends or join a public game.",
        "Bids, announcements and trick play are handled server-side to prevent scoring mistakes. You focus on strategy: which trump to choose, when to cut and how to maximize your team's points.",
        "Like the rest of the platform, social features are built in: invites, messaging, presence and voice calls to capture the feel of a real card game on mobile or desktop.",
    ]
    en["belote"] = {
        "path": "/online-belote",
        "image": "beloteImg",
        "imageAlt": "Multiplayer Belote game on Quantum Bluff",
        "metaTitle": "Play Belote Online Free | Multiplayer Belote — Quantum Bluff",
        "metaDescription": "Play Belote online on Quantum Bluff: 4-player games, bidding, live scoring, voice chat and virtual chips. Free social gaming, no real money.",
        "heroTitle": "Belote online",
        "heroSubtitle": "Relive friendly card nights: classic four-player Belote in teams, with bids, belote/rebelote and built-in voice chat.",
        "descriptionTitle": "Social Belote on Quantum Bluff",
        "description": expand(belote_base, [
            "Classic, Coinched, Contree and Modern variants share the same server engine and fairness guarantees. Each mode follows French conventions: 32-card deal, belote/rebelote, sequence announcements and trick scoring. Live scoreboards update after every trick and round.",
            EN_SOCIAL,
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Belote rules on Quantum Bluff",
        "rules": [
            "Belote is played by four players in two teams of two. Partners sit opposite each other.",
            "A 32-card deck is used. Each player receives eight cards after the deal.",
            "Bidding phase: players declare a contract (trump suit and target points) or pass. The highest bid sets trump for the round.",
            "Announcements (sequences, squares, belote/rebelote) are declared and scored under classic rules.",
            "Each trick requires following suit when possible; otherwise trump or discard. The highest card wins the trick.",
            "Points from tricks and announcements determine whether the contract succeeds. The first team to reach the target score wins the match.",
        ],
        "faqTitle": "FAQ — Online Belote on Quantum Bluff",
        "faq": faq(
            ("How many players for a Belote game?", "Belote on Quantum Bluff is played by four players in two teams of two partners."),
            ("Are the rules the same as classic Belote?", "Yes. 32-card deal, bidding, trump, announcements, belote/rebelote and scoring follow standard French Belote conventions."),
            ("Can I play Belote with friends?", "Yes. Create a Belote waiting room and invite friends. Group voice is available before and during the game."),
            ("Do I need to pay to play?", "No. Access is free with virtual chips. No real-money wagering is involved."),
            ("Which devices are supported?", "Web browser (desktop and mobile) and the Quantum Bluff mobile app. The UI is responsive and touch-friendly."),
            ("Which Belote variants are available?", "Classic, Coinched, Contree and Modern are available from the Belote lobby."),
            ("Is scoring automatic?", "Yes. The server counts tricks, announcements and contracts in real time."),
            ("Is there a spectator mode?", "Yes. You can watch a table before joining to learn or wait for a seat."),
        ),
        "ctaTitle": "Build your team",
        "ctaBody": "Sign up for free and start a Belote game with your friends now.",
    }
    _populate_en_games_2(en)


def _populate_en_games_2(en: dict) -> None:
    bj_base = [
        "Quantum Bluff offers blackjack in two formats: a quick solo table for practice and multiplayer tables where several players face the dealer at once. Classic 21 rules apply: beat the dealer without busting, with split, double down and insurance options.",
        "Every card draw is server-validated. The engine handles dealer rules (stand on 17), optional side bets and virtual chip payouts automatically.",
        "Integrated into the Quantum Bluff lobby, blackjack shares the same social ecosystem: friends, leaderboards, daily rewards and quick sessions between poker or Belote games.",
    ]
    en["blackjack"] = {
        "path": "/online-blackjack",
        "image": "blackjackImg",
        "imageAlt": "Blackjack table on Quantum Bluff",
        "metaTitle": "Play Blackjack Online Free | Multiplayer 21 — Quantum Bluff",
        "metaDescription": "Play blackjack online on Quantum Bluff: solo mode, multiplayer tables, classic 21 rules, virtual chips and social casino vibes. Free, no real money.",
        "heroTitle": "Blackjack online",
        "heroSubtitle": "Beat the dealer at 21 in solo mode or join a multiplayer table — split, double and insurance handled server-side for a smooth experience.",
        "descriptionTitle": "Social blackjack on Quantum Bluff",
        "description": expand(bj_base, [
            "Solo mode suits beginners learning basic strategy: when to hit, double or split against the dealer upcard. Multiplayer recreates a casino table where several players act in parallel with a shared timer. 3:2 blackjack payouts and dealer stand-on-17 follow expected standards.",
            "Your virtual chip wallet updates instantly after each hand. Wallet history audits solo and multiplayer sessions. No real-money deposits or withdrawals — social entertainment only.",
            EN_SOCIAL,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Blackjack rules on Quantum Bluff",
        "rules": [
            "The goal is to get a hand value closer to 21 than the dealer without going over 21.",
            "Cards 2–10 are face value. Face cards (Jack, Queen, King) count as 10. Aces count as 1 or 11, whichever helps the player.",
            "Natural blackjack: an Ace and a ten-value card in two cards. It beats any other hand except a tied dealer blackjack (push).",
            "Available actions: Hit, Stand, Double (double bet and one card), Split (split a pair into two hands).",
            "The dealer draws by fixed rules: stand on 17, hit on 16 or less.",
            "Insurance is offered when the dealer shows an Ace: a side bet against dealer blackjack.",
        ],
        "faqTitle": "FAQ — Online blackjack on Quantum Bluff",
        "faq": faq(
            ("Can I play blackjack for free?", "Yes. You bet virtual chips with no cash value. Chips are granted at signup and through daily rewards."),
            ("Is there a multiplayer mode?", "Yes. Join the multiplayer blackjack lobby: several players can sit at the same table and play against the dealer in parallel."),
            ("Are the rules standard?", "Yes. 3:2 blackjack, dealer stands on 17, split and double follow classic casino rules adapted for social play."),
            ("Is Quantum Bluff a regulated online casino?", "No. It is a social entertainment platform. No real-money deposits, withdrawals or cash prizes are possible."),
            ("Can I play on mobile?", "Yes. Blackjack is available in mobile browsers and the Quantum Bluff app with a touch-optimized interface."),
            ("Does the dealer play automatically?", "Yes. The server applies stand on 17 and hit on 16 or less."),
            ("Can I review hand history?", "Yes. Wallet history logs bets and virtual chip wins for each blackjack session."),
            ("Are split and double server-managed?", "Yes. All actions and draws are validated on the backend before display."),
        ),
        "ctaTitle": "Go for 21",
        "ctaBody": "Create your account and start a solo or multiplayer blackjack game in one click.",
    }
    _populate_en_games_3(en)


def _populate_en_games_3(en: dict) -> None:
    roulette_base = [
        "Quantum Bluff offers European roulette in the retro casino hub: vintage atmosphere, smooth animation and instant return to the lobby. Inside bets (straight, split, street) and outside bets (red/black, odd/even, dozens) are all available.",
        "Every spin is generated and validated server-side before display. Virtual chip winnings are credited automatically to your wallet, with game history to track your sessions.",
        "A guided tutorial from the lobby helps you learn bet types. Perfect for a quick break between poker or Belote games without leaving the Quantum Bluff universe.",
    ]
    en["roulette"] = {
        "path": "/online-roulette",
        "image": "rouletteImg",
        "imageAlt": "Retro European roulette on Quantum Bluff",
        "metaTitle": "Play Roulette Online Free | European Roulette — Quantum Bluff",
        "metaDescription": "Play roulette online on Quantum Bluff: European roulette, inside and outside bets, retro casino theme and virtual chips. Free social gaming, no real money.",
        "heroTitle": "Roulette online",
        "heroSubtitle": "European roulette in the retro casino lounge — red, black, odd, even and straight bets: every spin is server-validated with virtual chips.",
        "descriptionTitle": "Social roulette on Quantum Bluff",
        "description": expand(roulette_base, [
            "The 37-pocket European wheel (0–36) offers standard payouts: straight 35:1, split 17:1, red/black 1:1. The retro layout matches the neon aesthetic of slots and Lucky Number in the same hub. Bet limits in chip steps of 10 are shown before each spin.",
            "The /tutorial/roulette guide from the lobby explains every bet type for beginners. Experienced players chain spins between poker tournaments via the hub back button without losing their global balance.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Roulette rules on Quantum Bluff",
        "rules": [
            "European roulette has 37 pockets: numbers 1–36 and a single zero (0).",
            "Place bets on the layout before the wheel spins: straight, split, street, corner, six-line, column, dozen, red/black, odd/even, low/high.",
            "The virtual dealer launches the ball; the winning number is drawn server-side and shown with synchronized animation.",
            "Payouts depend on bet type: straight pays 35:1, red/black and odd/even pay 1:1, etc.",
            "Bets use virtual chips (in steps of 10) with min/max limits shown on screen.",
            "No real money is involved — social entertainment only.",
        ],
        "faqTitle": "FAQ — Online roulette on Quantum Bluff",
        "faq": faq(
            ("What type of roulette is available?", "European roulette with 37 pockets (single zero), in the lobby retro casino lounge."),
            ("Is roulette free?", "Yes. You play with virtual chips granted at signup and through daily rewards."),
            ("Are spins fair?", "Yes. Every result is generated and validated server-side before display — no client-side manipulation."),
            ("Is there a tutorial?", "Yes. A guided tutorial is available from the lobby to learn bet types step by step."),
            ("Can I play on mobile?", "Yes. Roulette is responsive and touch-optimized on browser and mobile app."),
            ("Which inside bets can I place?", "Straight, split, street, corner and six-line are available with displayed payouts."),
            ("Where is spin history?", "Wallet history logs every bet and virtual chip win after server validation."),
            ("Does roulette share the lobby balance?", "Yes. The same chip wallet applies across the Quantum Bluff platform."),
        ),
        "ctaTitle": "Spin the wheel",
        "ctaBody": "Create your free account and launch a European roulette spin.",
    }
    _populate_en_games_4(en)


def _populate_en_games_4(en: dict) -> None:
    slots_base = [
        "Quantum Bluff features a vintage-style slot machine: classic symbols, light effects and an immersive interface in the retro hub. Every spin is server-validated for fair outcomes.",
        "Virtual chip winnings are calculated automatically based on aligned combinations. Wallet history tracks every game for transparent session monitoring.",
        "Perfect for a quick break: a few spins between poker hands without leaving the Quantum Bluff ecosystem or wagering real money.",
    ]
    en["slots"] = {
        "path": "/online-slots",
        "image": "slotImg",
        "imageAlt": "Vintage slot machine on Quantum Bluff",
        "metaTitle": "Play Slots Online Free | Retro Slot Machine — Quantum Bluff",
        "metaDescription": "Play slots online on Quantum Bluff: vintage slot machine, classic symbols, server-validated spins and virtual chips. Free social casino, no real money.",
        "heroTitle": "Online slots",
        "heroSubtitle": "Vintage slot machine at the heart of the retro casino — neon symbols, server-validated spins and quick sessions between card games.",
        "descriptionTitle": "Social slots on Quantum Bluff",
        "description": expand(slots_base, [
            "Vintage symbols and neon effects recreate classic casino atmosphere in a modern UI. The paytable is visible before each spin; winning alignments credit your wallet instantly. Every draw is independent server-side — no hot or cold cycles exist.",
            "Daily challenges may target casino mini-games: ten moderate spins can progress rewards without draining your balance. Set a virtual session budget as in poker for controlled fun.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "How to play slots on Quantum Bluff",
        "rules": [
            "Choose your virtual chip bet (limits shown on screen) then launch the spin.",
            "Reels stop on a symbol combination determined server-side.",
            "Winning alignments (lines, pairs, bonus symbols) trigger payouts per the paytable.",
            "Won chips are credited instantly to your virtual wallet.",
            "No real-money deposits or withdrawals — internal currency only.",
            "Access from the retro casino hub in the lobby after signing in.",
        ],
        "faqTitle": "FAQ — Slot machine on Quantum Bluff",
        "faq": faq(
            ("Are slots free?", "Yes. You play with virtual chips with no monetary value, earned at signup and through daily rewards."),
            ("Are results rigged?", "No. Every spin is generated and validated server-side before display."),
            ("What style of slot machine?", "A vintage retro casino slot with classic symbols and neon effects, integrated into the Quantum Bluff lounge."),
            ("Can I play on mobile?", "Yes. The interface is responsive and touch-optimized on browser and app."),
            ("Is Quantum Bluff a regulated casino?", "No. It is a social entertainment platform. No real-money prizes are possible."),
            ("Where is the paytable?", "Displayed in the slot interface before you spin."),
            ("Do spins count for daily challenges?", "Yes. Some daily missions target casino mini-games including slots."),
            ("What is the minimum bet?", "On-screen limits follow the platform chip contract, typically in steps of 10."),
        ),
        "ctaTitle": "Try your luck",
        "ctaBody": "Sign up and launch your first spins on the vintage slot machine.",
    }
    _populate_en_games_5(en)


def _populate_en_games_5(en: dict) -> None:
    crash_base = [
        "Crash is a solo mini-game where a multiplier climbs continuously until an unpredictable crash point. Place your bet, watch the curve and cash out before the multiplier collapses.",
        "Every round is fully server-managed: crash point, timing and payouts calculated before display. Bets range from 10 to 500 virtual chips, with wallet history for each session.",
        "Integrated into the Quick Solo hub in the lobby, Crash offers express sessions between card games — fun, fast and no real money.",
    ]
    en["crash"] = {
        "path": "/online-crash-game",
        "image": "crashImg",
        "imageAlt": "Crash game on Quantum Bluff",
        "metaTitle": "Play Crash Game Online Free | Multiplier — Quantum Bluff",
        "metaDescription": "Play Crash online on Quantum Bluff: real-time multiplier, cash out, server rounds and virtual chips. Free social mini-game, no real money.",
        "heroTitle": "Crash game online",
        "heroSubtitle": "Ride the multiplier and cash out before the crash — every round is server-validated with real-time synchronized animation.",
        "descriptionTitle": "Social Crash on Quantum Bluff",
        "description": expand(crash_base, [
            "The curve rises from 1.00× until crash; potential winnings are bet × multiplier at cash-out moment. Crash point is fixed server-side before the round — the client animates without influencing outcome. Recent round history helps review sessions without implying predictable patterns.",
            "Responsible play: set a cash-out target before launch (e.g. 2.0×) rather than chasing the live multiplier. Lost chips stay virtual; fun comes from timing and comparing scores with friends.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Crash rules on Quantum Bluff",
        "rules": [
            "Place a virtual chip bet (10–500, in steps of 10) before the round starts.",
            "The multiplier starts at 1.00× and rises steadily.",
            "Click Cash Out to collect: winnings = bet × multiplier at cash-out moment.",
            "If the multiplier crashes before you cash out, you lose the round bet.",
            "The crash point is determined server-side before the round starts — the client only displays the result.",
            "A history of recent rounds is visible to analyze your sessions.",
        ],
        "faqTitle": "FAQ — Crash game on Quantum Bluff",
        "faq": faq(
            ("How does Crash work?", "A multiplier rises until a random crash. Cash out before the crash to win bet × multiplier."),
            ("Is the game free?", "Yes. You bet virtual chips with no monetary value."),
            ("Can the crash be manipulated?", "No. The crash point is calculated server-side before the round and cannot be changed by the client."),
            ("What is the minimum bet?", "10 virtual chips, in steps of 10, up to 500 chips maximum per round."),
            ("Where do I access Crash?", "From the Quick Solo hub in the lobby, after signing into your Quantum Bluff account."),
            ("Can I cash out anytime?", "Yes, until the multiplier crashes. Payout is calculated server-side on click."),
            ("Is there round history?", "Yes. Recent rounds and wallet history track your sessions."),
            ("Does Crash work on mobile?", "Yes. The Quick Solo UI is responsive and touch-optimized."),
        ),
        "ctaTitle": "Aim for cash out",
        "ctaBody": "Create your account and try Crash — cash out at the right moment before the drop.",
    }
    _populate_en_games_6(en)


def _populate_en_games_6(en: dict) -> None:
    mines_base = [
        "Mines is a grid mini-game where you choose the number of hidden mines, place your bet and reveal tiles one by one. Each safe tile raises the multiplier; hit a mine and you lose the bet.",
        "Mine placement and payouts are fully calculated server-side. The client shows grid state and potential winnings without influencing the outcome.",
        "Available from the Quick Solo hub, Mines completes Quantum Bluff's express casino offer — short sessions, risk/reward strategy and virtual chips only.",
    ]
    en["mines"] = {
        "path": "/online-mines-game",
        "image": "minesImg",
        "imageAlt": "Mines game on Quantum Bluff",
        "metaTitle": "Play Mines Game Online Free | Risk/Reward Grid — Quantum Bluff",
        "metaDescription": "Play Mines online on Quantum Bluff: risk/reward grid, reveal tiles, avoid mines and virtual chips. Free social mini-game, no real money.",
        "heroTitle": "Mines game online",
        "heroSubtitle": "Reveal tiles one by one without hitting a mine — each safe tile increases your winnings until you cash out.",
        "descriptionTitle": "Social Mines on Quantum Bluff",
        "description": expand(mines_base, [
            "More mines on the grid raise potential multipliers but increase loss risk. After several safe gems, Cash Out secures server-validated winnings without clearing the entire board. Responsive mobile layout aligns payout types with the backend.",
            "Mines shares the unified Quick Solo bet contract: 10–500 chips, steps of 10, anti double-click and atomic wallet credit. Ideal between Belote hands or after a Crash session.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Mines rules on Quantum Bluff",
        "rules": [
            "Choose the number of mines on the grid (more mines = higher multiplier but greater risk).",
            "Place your virtual chip bet (10–500, in steps of 10).",
            "Reveal tiles one by one: each safe gem increases potential winnings.",
            "Cash Out anytime to collect the current multiplier.",
            "If you reveal a mine, the round is lost and the bet is deducted.",
            "Mine placement is drawn server-side at round start — fair and non-manipulable.",
        ],
        "faqTitle": "FAQ — Mines game on Quantum Bluff",
        "faq": faq(
            ("How do I win at Mines?", "Reveal as many safe tiles as possible then cash out before hitting a mine."),
            ("Is the game free?", "Yes. Bets use virtual chips with no real monetary value."),
            ("Are mines rigged?", "No. Placement is generated server-side at the start of each round."),
            ("Can I choose the number of mines?", "Yes. More mines mean higher potential multipliers — but risk increases too."),
            ("Does Mines work on mobile?", "Yes. The grid is responsive and touch-optimized."),
            ("When can I cash out?", "Anytime after at least one safe tile, via server-validated Cash Out."),
            ("What happens if I hit a mine?", "The round is lost and the bet deducted; you can start a new grid."),
            ("Where do I access Mines?", "From the Quick Solo hub in the Quantum Bluff lobby after login."),
        ),
        "ctaTitle": "Avoid the mines",
        "ctaBody": "Sign up and launch your first Mines grid from the lobby.",
    }
    en["luckyNumber"] = {
        "path": "/online-lucky-number",
        "image": "luckyImg",
        "imageAlt": "Lucky Number game on Quantum Bluff",
        "metaTitle": "Play Lucky Number Online Free | Pick 1–10 — Quantum Bluff",
        "metaDescription": "Play Lucky Number on Quantum Bluff: pick a number 1–10, server draw, x8 win and virtual chips. Free retro casino, no real money.",
        "heroTitle": "Lucky Number online",
        "heroSubtitle": "Pick your lucky number from 1 to 10 — the house draws, you win x8 on a match, with 10–500 chip bets validated server-side.",
        "descriptionTitle": "Lucky Number in the Quantum Bluff retro casino",
        "description": expand([
            "Lucky Number is an instant mini-game in the retro casino hub: select an integer from 1 to 10, place your virtual chip bet, then the server draws a winning number via POST /api/lucky-number/play. On a match you collect eight times your bet (x8 multiplier); otherwise the round bet is lost.",
            "Accepted bets range from 10 to 500 chips in steps of 10, with server balance validation before each draw. An anti double-click lock prevents parallel requests on the same account. Client animation illustrates the draw without deciding the outcome.",
            "Alongside European roulette and the vintage slot machine, Lucky Number completes the retro trio for one-minute breaks between multiplayer card games.",
        ], [
            "The draw is uniform from 1 to 10 on the backend, covered by server Jest tests. Wallet history logs bet, chosen number, drawn number and payout. No real money is involved.",
            "Daily challenges may include Lucky Number goals (e.g. ten rounds) for bonus chips. Set a virtual session budget like other hub mini-games.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Lucky Number rules on Quantum Bluff",
        "rules": [
            "Choose an integer between 1 and 10 inclusive.",
            "Place your virtual chip bet (10–500, in steps of 10).",
            "The server draws a winning number uniformly between 1 and 10.",
            "If your number matches the draw, you win bet × 8 (x8 multiplier).",
            "On mismatch, the round bet is lost.",
            "Each round is validated via POST /api/lucky-number/play — the client displays the server result.",
        ],
        "faqTitle": "FAQ — Lucky Number on Quantum Bluff",
        "faq": faq(
            ("How do I play Lucky Number?", "Pick a number 1–10, bet 10–500 chips, the server draws; match = x8 win."),
            ("Is the game free?", "Yes. Bets use virtual chips with no monetary value."),
            ("Is the draw fair?", "Yes. The number is drawn uniformly server-side before display."),
            ("What is the win payout?", "Eight times your bet (x8 multiplier) credited to your virtual wallet."),
            ("Where do I access the game?", "From the retro casino hub in the Quantum Bluff lobby."),
            ("What are min and max bets?", "10 chips minimum, 500 maximum, in steps of 10."),
            ("Can I chain multiple draws?", "Yes. A server lock prevents double-clicks during processing."),
            ("Does Lucky Number work on mobile?", "Yes. The retro UI is responsive and touch-optimized."),
        ),
        "ctaTitle": "Try your number",
        "ctaBody": "Create your account and launch your first Lucky Number draw from the retro casino.",
    }
    en["wheel"] = {
        "path": "/online-wheel-of-fortune",
        "image": "slotImg",
        "imageAlt": "Wheel of Fortune on Quantum Bluff",
        "metaTitle": "Play Wheel of Fortune Online Free | x20 JACKPOT — Quantum Bluff",
        "metaDescription": "Play Wheel of Fortune on Quantum Bluff: 12 segments, x0 to x20 JACKPOT multipliers, 10–500 chip bets, server-validated spin. Free Quick Solo.",
        "heroTitle": "Wheel of Fortune online",
        "heroSubtitle": "Twelve segments, multipliers from x0 to JACKPOT x20 — spin the wheel in the Quick Solo hub with 10–500 chip bets validated server-side.",
        "descriptionTitle": "Wheel of Fortune on Quantum Bluff",
        "description": expand([
            "Wheel of Fortune is a Quick Solo mini-game with twelve segments: x0, x0.5, x1, x1.5, x2, x3, x5 and JACKPOT x20. Bet 10–500 virtual chips; the server picks the winning segment and calculates payout (bet × multiplier) before animation.",
            "The fixed top pointer and final rotation sync with the API result — the client never chooses the segment. Coefficient legend is visible before your first spin to understand segment distribution.",
            "Available from the Quick Solo hub alongside Crash and Mines, the wheel offers express sessions without leaving the unified Quantum Bluff wallet.",
        ], [
            "Three x0 segments, two x0.5, two x1, one x1.5, one x2, one x3, one x5 and one JACKPOT x20 compose the wheel — each spin is independent and server-tested (wheelMath.ts). Wallet history logs bets and wins.",
            "Responsible play: the wheel is high-variance entertainment; set a chip ceiling per session. Daily challenges may count wheel spins toward rewards.",
            EN_CHIPS,
            EN_SERVER,
            EN_LOBBY,
        ]),
        "rulesTitle": "Wheel rules on Quantum Bluff",
        "rules": [
            "The wheel has 12 segments with multipliers: x0, x0.5, x1, x1.5, x2, x3, x5 and JACKPOT x20.",
            "Place your virtual chip bet (10–500, in steps of 10) before spinning.",
            "The server picks the winning segment and calculates winnings = bet × multiplier.",
            "Spin animation is synchronized with the server result — the client cannot influence the outcome.",
            "An x0 segment means loss of the bet; JACKPOT x20 credits twenty times the bet.",
            "Each spin is independent; wallet history records the result.",
        ],
        "faqTitle": "FAQ — Wheel of Fortune on Quantum Bluff",
        "faq": faq(
            ("How many segments on the wheel?", "Twelve segments with coefficients x0, x0.5, x1, x1.5, x2, x3, x5 and JACKPOT x20."),
            ("Is the game free?", "Yes. Bets use virtual chips — no real money."),
            ("Is the spin rigged?", "No. The segment is drawn and validated server-side before animation."),
            ("What is the maximum bet?", "500 virtual chips, minimum 10, steps of 10."),
            ("Where do I access the wheel?", "From the Quick Solo hub in the Quantum Bluff lobby."),
            ("What does JACKPOT x20 mean?", "Twenty times your bet is credited if the pointer lands on JACKPOT."),
            ("Can I see coefficients before playing?", "Yes. Segment legend is shown in the interface."),
            ("Does the wheel work on mobile?", "Yes. Responsive UI with animation synced to server result."),
        ),
        "ctaTitle": "Spin the wheel",
        "ctaBody": "Sign up and launch your first Wheel of Fortune spin.",
    }


if __name__ == "__main__":
    main()
