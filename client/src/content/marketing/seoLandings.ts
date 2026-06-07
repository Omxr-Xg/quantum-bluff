import type { FaqItem } from "./siteContent";
import pokerImg from "../../assets/games/poker.webp";
import beloteImg from "../../assets/games/belote.webp";
import blackjackImg from "../../assets/games/blackjack.webp";

export type SeoGameSlug = "poker" | "belote" | "blackjack";

export type SeoLandingContent = {
  path: string;
  image: string;
  imageAlt: string;
  metaTitle: string;
  metaDescription: string;
  heroTitle: string;
  heroSubtitle: string;
  descriptionTitle: string;
  description: string[];
  rulesTitle: string;
  rules: string[];
  faqTitle: string;
  faq: FaqItem[];
  ctaTitle: string;
  ctaBody: string;
};

type SeoLandingsByLocale = Record<SeoGameSlug, SeoLandingContent>;

const fr: SeoLandingsByLocale = {
  poker: {
    path: "/play-poker-online",
    image: pokerImg,
    imageAlt: "Table de poker Texas Hold'em sur Quantum Bluff",
    metaTitle: "Jouer au poker en ligne gratuit | Texas Hold'em multijoueur — Quantum Bluff",
    metaDescription:
      "Jouez au poker Texas Hold'em en ligne sur Quantum Bluff : salles publiques et privées, tournois, bots d'entraînement, chat vocal et jetons virtuels gratuits. Sans argent réel.",
    heroTitle: "Jouer au poker en ligne",
    heroSubtitle:
      "Texas Hold'em no-limit multijoueur dans un salon social premium — bluffez, lisez vos adversaires et grimpez les classements sans miser d'argent réel.",
    descriptionTitle: "Pourquoi jouer au poker sur Quantum Bluff ?",
    description: [
      "Quantum Bluff propose du Texas Hold'em no-limit pensé pour le jeu social : tables de deux à cinq joueurs, salles d'attente avec invitations d'amis, mode spectateur et tournois structurés. Chaque action est validée côté serveur pour garantir l'équité des mains, des blinds et des tapis.",
      "Que vous soyez débutant ou habitué des salles live, vous pouvez vous entraîner contre des bots configurables, rejoindre une table publique en un clic ou créer une partie privée entre amis. Le lobby unifié, les classements saisonniers et les récompenses quotidiennes transforment chaque session en progression mesurable.",
      "La plateforme intègre messagerie, présence en temps réel et appels vocaux WebRTC : idéal pour retrouver l'ambiance d'une vraie table sans quitter le navigateur. Les jetons sont une monnaie virtuelle interne, sans valeur monétaire — le plaisir du bluff, pas le gambling réglementé.",
    ],
    rulesTitle: "Règles du Texas Hold'em sur Quantum Bluff",
    rules: [
      "Chaque joueur reçoit deux cartes privées (hole cards). Cinq cartes communes sont révélées en trois tours : flop (3), turn (1), river (1).",
      "Le but est de constituer la meilleure main de cinq cartes en combinant vos deux cartes et les cartes communes.",
      "Les tours d'enchères précèdent le flop, le turn et la river. Actions possibles : check, bet, call, raise, fold — selon la situation et votre tapis.",
      "Le joueur avec la meilleure main au showdown remporte le pot. Un adversaire peut aussi gagner si tous les autres se couchent (fold).",
      "Les blinds (small blind / big blind) avancent à chaque main. Le bouton dealer tourne pour équilibrer les positions.",
      "En no-limit, vous pouvez miser tout votre tapis à tout moment (all-in). Les side pots sont calculés automatiquement par le serveur.",
    ],
    faqTitle: "FAQ — Poker en ligne sur Quantum Bluff",
    faq: [
      {
        q: "Le poker sur Quantum Bluff est-il gratuit ?",
        a: "Oui. Vous jouez avec des jetons virtuels offerts à l'inscription, via la connexion quotidienne et les défis. Aucun dépôt d'argent réel n'est requis.",
      },
      {
        q: "Puis-je jouer au poker avec des amis ?",
        a: "Oui. Créez une salle privée, invitez vos amis depuis la liste d'amis ou partagez le lien d'invitation. Les appels vocaux de groupe sont disponibles en salle d'attente et à table.",
      },
      {
        q: "Y a-t-il des tournois de poker ?",
        a: "Oui. Des tournois communautaires sont organisés régulièrement avec structure de blinds, classement et récompenses en jetons virtuels.",
      },
      {
        q: "Puis-je m'entraîner contre des bots ?",
        a: "Oui. Le mode bots permet de configurer le nombre d'adversaires IA et le niveau de difficulté avant de lancer une table d'entraînement.",
      },
      {
        q: "Quantum Bluff est-il un site de jeu d'argent ?",
        a: "Non. Quantum Bluff est une plateforme de jeu social. Les jetons n'ont aucune valeur monétaire et ne peuvent pas être échangés contre de l'argent réel.",
      },
    ],
    ctaTitle: "La table vous attend",
    ctaBody: "Créez votre compte gratuitement et rejoignez une table de Texas Hold'em en quelques secondes.",
  },
  belote: {
    path: "/online-belote",
    image: beloteImg,
    imageAlt: "Partie de Belote multijoueur sur Quantum Bluff",
    metaTitle: "Belote en ligne gratuite | Jouer à la Belote multijoueur — Quantum Bluff",
    metaDescription:
      "Jouez à la Belote en ligne sur Quantum Bluff : parties à 4, contrats, score en temps réel, chat vocal et jetons virtuels. Jeu social gratuit, sans argent réel.",
    heroTitle: "Belote en ligne",
    heroSubtitle:
      "Retrouvez l'esprit des parties entre amis : Belote classique à quatre joueurs, en équipes, avec annonces, belote/rebelote et ambiance vocale intégrée.",
    descriptionTitle: "La Belote social sur Quantum Bluff",
    description: [
      "Quantum Bluff recrée l'expérience d'une Belote conviviale en ligne : quatre joueurs, deux équipes de deux, distribution automatique et calcul des scores conforme aux règles classiques. La salle d'attente permet de former une table entre amis ou de rejoindre une partie publique.",
      "Les enchères (prises), les annonces et le déroulement des plis sont gérés par le serveur pour éviter les erreurs de comptage. Vous vous concentrez sur le jeu : quel atout choisir, quand couper, comment maximiser les points de votre équipe.",
      "Comme sur le reste de la plateforme, la couche sociale est native : invitations, messagerie, présence et appels vocaux pour retrouver la convivialité d'une vraie partie de cartes, depuis mobile ou navigateur.",
    ],
    rulesTitle: "Règles de la Belote sur Quantum Bluff",
    rules: [
      "La Belote se joue à quatre en deux équipes de deux. Les partenaires sont assis face à face.",
      "On joue avec un jeu de 32 cartes. Chaque joueur reçoit huit cartes après la distribution.",
      "Phase d'enchères : les joueurs annoncent un contrat (couleur atout et nombre de points visé) ou passent. Le plus fort contrat fixe l'atout pour la manche.",
      "Les annonces (tierces, cinquantes, carrés, belote/rebelote) sont déclarées et comptabilisées selon les règles classiques.",
      "À chaque pli, il faut fournir la couleur demandée si possible ; à défaut, couper à l'atout ou défausser. Le plus fort pli remporte la levée.",
      "Les points des levées et des annonces déterminent si le contrat est réussi. La première équipe à atteindre le score cible remporte la partie.",
    ],
    faqTitle: "FAQ — Belote en ligne sur Quantum Bluff",
    faq: [
      {
        q: "Combien de joueurs pour une partie de Belote ?",
        a: "La Belote sur Quantum Bluff se joue à quatre joueurs, en deux équipes de deux partenaires.",
      },
      {
        q: "Les règles sont-elles les mêmes qu'en Belote classique ?",
        a: "Oui. Distribution 32 cartes, enchères, atout, annonces, belote/rebelote et comptage des points suivent les usages de la Belote classique française.",
      },
      {
        q: "Puis-je jouer à la Belote avec des amis ?",
        a: "Oui. Créez une salle d'attente Belote et invitez vos amis. Les appels vocaux de groupe sont disponibles avant et pendant la partie.",
      },
      {
        q: "Faut-il payer pour jouer ?",
        a: "Non. L'accès est gratuit avec des jetons virtuels. Aucune mise d'argent réel n'est impliquée.",
      },
      {
        q: "Sur quels appareils puis-je jouer ?",
        a: "Sur navigateur web (desktop et mobile) et via l'application mobile Quantum Bluff. L'interface est responsive et optimisée tactile.",
      },
    ],
    ctaTitle: "Formez votre équipe",
    ctaBody: "Inscrivez-vous gratuitement et lancez une partie de Belote avec vos amis dès maintenant.",
  },
  blackjack: {
    path: "/online-blackjack",
    image: blackjackImg,
    imageAlt: "Table de blackjack sur Quantum Bluff",
    metaTitle: "Blackjack en ligne gratuit | 21 multijoueur — Quantum Bluff",
    metaDescription:
      "Jouez au blackjack en ligne sur Quantum Bluff : mode solo, tables multijoueur, règles classiques 21, jetons virtuels et ambiance casino social. Gratuit, sans argent réel.",
    heroTitle: "Blackjack en ligne",
    heroSubtitle:
      "Affrontez le croupier au 21 en solo ou rejoignez une table multijoueur — split, double et insurance gérés par le serveur pour une expérience fluide.",
    descriptionTitle: "Blackjack social sur Quantum Bluff",
    description: [
      "Quantum Bluff propose le blackjack dans deux formats : une table solo rapide pour s'entraîner et des tables multijoueur où plusieurs joueurs affrontent le croupier simultanément. Les règles classiques du 21 s'appliquent : battre le croupier sans dépasser 21, avec les options split, double down et insurance.",
      "Chaque tirage de carte est validé côté serveur. Le moteur gère automatiquement les mains du croupier (stand on 17), les side bets éventuels et le calcul des gains en jetons virtuels.",
      "Intégré au lobby Quantum Bluff, le blackjack bénéficie du même écosystème social : amis, classements, récompenses quotidiennes et sessions express entre deux parties de poker ou de Belote.",
    ],
    rulesTitle: "Règles du blackjack sur Quantum Bluff",
    rules: [
      "Le but est d'obtenir une main dont la valeur est plus proche de 21 que celle du croupier, sans dépasser 21.",
      "Les cartes 2 à 10 valent leur valeur faciale. Les figures (Valet, Dame, Roi) valent 10. L'As vaut 1 ou 11, selon ce qui avantage le joueur.",
      "Blackjack naturel : un As et une carte de 10 points en deux cartes. Il bat toute autre main sauf un blackjack adverse (égalité / push).",
      "Actions disponibles : Hit (tirer), Stand (rester), Double (doubler la mise et une seule carte), Split (séparer une paire en deux mains).",
      "Le croupier tire selon les règles fixes : il stand sur 17 et tire sur 16 ou moins.",
      "Insurance est proposée si le croupier montre un As : pari annexe contre un blackjack du croupier.",
    ],
    faqTitle: "FAQ — Blackjack en ligne sur Quantum Bluff",
    faq: [
      {
        q: "Puis-je jouer au blackjack gratuitement ?",
        a: "Oui. Vous misez des jetons virtuels sans valeur monétaire. Des jetons sont offerts à l'inscription et via les récompenses quotidiennes.",
      },
      {
        q: "Existe-t-il un mode multijoueur ?",
        a: "Oui. Rejoignez le lobby blackjack multijoueur : plusieurs joueurs peuvent être assis à la même table et jouer contre le croupier en parallèle.",
      },
      {
        q: "Les règles sont-elles standards ?",
        a: "Oui. Blackjack 3:2, croupier stand on 17, split et double selon les règles classiques du casino, adaptées au format social.",
      },
      {
        q: "Quantum Bluff est-il un casino en ligne réglementé ?",
        a: "Non. C'est une plateforme de divertissement social. Aucun dépôt, retrait ou gain d'argent réel n'est possible.",
      },
      {
        q: "Puis-je jouer sur mobile ?",
        a: "Oui. Le blackjack est accessible depuis le navigateur mobile et l'application Quantum Bluff avec une interface tactile optimisée.",
      },
    ],
    ctaTitle: "Tentez le 21",
    ctaBody: "Créez votre compte et lancez une partie de blackjack solo ou multijoueur en un clic.",
  },
};

const en: SeoLandingsByLocale = {
  poker: {
    path: "/play-poker-online",
    image: pokerImg,
    imageAlt: "Texas Hold'em poker table on Quantum Bluff",
    metaTitle: "Play Poker Online Free | Texas Hold'em Multiplayer — Quantum Bluff",
    metaDescription:
      "Play Texas Hold'em poker online on Quantum Bluff: public and private rooms, tournaments, training bots, voice chat and free virtual chips. No real money.",
    heroTitle: "Play poker online",
    heroSubtitle:
      "No-limit Texas Hold'em multiplayer in a premium social lounge — bluff, read your opponents and climb the rankings without wagering real money.",
    descriptionTitle: "Why play poker on Quantum Bluff?",
    description: [
      "Quantum Bluff offers no-limit Texas Hold'em built for social play: two to five player tables, waiting rooms with friend invites, spectator mode and structured tournaments. Every action is server-validated to keep hands, blinds and stacks fair.",
      "Whether you are new to poker or a live-room regular, train against configurable bots, join a public table in one click or host a private game with friends. The unified lobby, seasonal leaderboards and daily rewards turn every session into measurable progress.",
      "The platform includes messaging, real-time presence and WebRTC voice calls — recreating a real table atmosphere from your browser. Chips are virtual in-game currency with no monetary value — the thrill of the bluff, not regulated gambling.",
    ],
    rulesTitle: "Texas Hold'em rules on Quantum Bluff",
    rules: [
      "Each player receives two private hole cards. Five community cards are revealed in three rounds: flop (3), turn (1), river (1).",
      "The goal is to make the best five-card hand using your two cards and the community cards.",
      "Betting rounds occur before the flop, turn and river. Actions include check, bet, call, raise and fold depending on the situation and your stack.",
      "The best hand at showdown wins the pot. A player also wins if everyone else folds.",
      "Blinds (small blind / big blind) advance each hand. The dealer button rotates to balance positions.",
      "In no-limit, you may bet your entire stack at any time (all-in). Side pots are calculated automatically by the server.",
    ],
    faqTitle: "FAQ — Online poker on Quantum Bluff",
    faq: [
      {
        q: "Is poker on Quantum Bluff free?",
        a: "Yes. You play with virtual chips granted at signup, through daily login and challenges. No real-money deposit is required.",
      },
      {
        q: "Can I play poker with friends?",
        a: "Yes. Create a private room, invite friends from your list or share an invite link. Group voice calls are available in the waiting room and at the table.",
      },
      {
        q: "Are there poker tournaments?",
        a: "Yes. Community tournaments run regularly with blind structure, standings and virtual chip prizes.",
      },
      {
        q: "Can I practice against bots?",
        a: "Yes. Bot mode lets you configure the number of AI opponents and difficulty before starting a training table.",
      },
      {
        q: "Is Quantum Bluff a real-money gambling site?",
        a: "No. Quantum Bluff is a social gaming platform. Chips have no cash value and cannot be exchanged for real money.",
      },
    ],
    ctaTitle: "The table is waiting",
    ctaBody: "Create your free account and join a Texas Hold'em table in seconds.",
  },
  belote: {
    path: "/online-belote",
    image: beloteImg,
    imageAlt: "Multiplayer Belote game on Quantum Bluff",
    metaTitle: "Play Belote Online Free | Multiplayer Belote — Quantum Bluff",
    metaDescription:
      "Play Belote online on Quantum Bluff: 4-player games, bidding, live scoring, voice chat and virtual chips. Free social gaming, no real money.",
    heroTitle: "Belote online",
    heroSubtitle:
      "Relive friendly card nights: classic four-player Belote in teams, with bids, belote/rebelote and built-in voice chat.",
    descriptionTitle: "Social Belote on Quantum Bluff",
    description: [
      "Quantum Bluff recreates a friendly Belote experience online: four players, two teams of two, automatic dealing and standard scoring. The waiting room lets you gather friends or join a public game.",
      "Bids, announcements and trick play are handled server-side to prevent scoring mistakes. You focus on strategy: which trump to choose, when to cut and how to maximize your team's points.",
      "Like the rest of the platform, social features are built in: invites, messaging, presence and voice calls to capture the feel of a real card game on mobile or desktop.",
    ],
    rulesTitle: "Belote rules on Quantum Bluff",
    rules: [
      "Belote is played by four players in two teams of two. Partners sit opposite each other.",
      "A 32-card deck is used. Each player receives eight cards after the deal.",
      "Bidding phase: players declare a contract (trump suit and target points) or pass. The highest bid sets trump for the round.",
      "Announcements (sequences, squares, belote/rebelote) are declared and scored under classic rules.",
      "Each trick requires following suit when possible; otherwise trump or discard. The highest card wins the trick.",
      "Points from tricks and announcements determine whether the contract succeeds. The first team to reach the target score wins the match.",
    ],
    faqTitle: "FAQ — Online Belote on Quantum Bluff",
    faq: [
      {
        q: "How many players for a Belote game?",
        a: "Belote on Quantum Bluff is played by four players in two teams of two partners.",
      },
      {
        q: "Are the rules the same as classic Belote?",
        a: "Yes. 32-card deal, bidding, trump, announcements, belote/rebelote and scoring follow standard French Belote conventions.",
      },
      {
        q: "Can I play Belote with friends?",
        a: "Yes. Create a Belote waiting room and invite friends. Group voice is available before and during the game.",
      },
      {
        q: "Do I need to pay to play?",
        a: "No. Access is free with virtual chips. No real-money wagering is involved.",
      },
      {
        q: "Which devices are supported?",
        a: "Web browser (desktop and mobile) and the Quantum Bluff mobile app. The UI is responsive and touch-friendly.",
      },
    ],
    ctaTitle: "Build your team",
    ctaBody: "Sign up for free and start a Belote game with your friends now.",
  },
  blackjack: {
    path: "/online-blackjack",
    image: blackjackImg,
    imageAlt: "Blackjack table on Quantum Bluff",
    metaTitle: "Play Blackjack Online Free | Multiplayer 21 — Quantum Bluff",
    metaDescription:
      "Play blackjack online on Quantum Bluff: solo mode, multiplayer tables, classic 21 rules, virtual chips and social casino vibes. Free, no real money.",
    heroTitle: "Blackjack online",
    heroSubtitle:
      "Beat the dealer at 21 in solo mode or join a multiplayer table — split, double and insurance handled server-side for a smooth experience.",
    descriptionTitle: "Social blackjack on Quantum Bluff",
    description: [
      "Quantum Bluff offers blackjack in two formats: a quick solo table for practice and multiplayer tables where several players face the dealer at once. Classic 21 rules apply: beat the dealer without busting, with split, double down and insurance options.",
      "Every card draw is server-validated. The engine handles dealer rules (stand on 17), optional side bets and virtual chip payouts automatically.",
      "Integrated into the Quantum Bluff lobby, blackjack shares the same social ecosystem: friends, leaderboards, daily rewards and quick sessions between poker or Belote games.",
    ],
    rulesTitle: "Blackjack rules on Quantum Bluff",
    rules: [
      "The goal is to get a hand value closer to 21 than the dealer without going over 21.",
      "Cards 2–10 are face value. Face cards (Jack, Queen, King) count as 10. Aces count as 1 or 11, whichever helps the player.",
      "Natural blackjack: an Ace and a ten-value card in two cards. It beats any other hand except a tied dealer blackjack (push).",
      "Available actions: Hit, Stand, Double (double bet and one card), Split (split a pair into two hands).",
      "The dealer draws by fixed rules: stand on 17, hit on 16 or less.",
      "Insurance is offered when the dealer shows an Ace: a side bet against dealer blackjack.",
    ],
    faqTitle: "FAQ — Online blackjack on Quantum Bluff",
    faq: [
      {
        q: "Can I play blackjack for free?",
        a: "Yes. You bet virtual chips with no cash value. Chips are granted at signup and through daily rewards.",
      },
      {
        q: "Is there a multiplayer mode?",
        a: "Yes. Join the multiplayer blackjack lobby: several players can sit at the same table and play against the dealer in parallel.",
      },
      {
        q: "Are the rules standard?",
        a: "Yes. 3:2 blackjack, dealer stands on 17, split and double follow classic casino rules adapted for social play.",
      },
      {
        q: "Is Quantum Bluff a regulated online casino?",
        a: "No. It is a social entertainment platform. No real-money deposits, withdrawals or cash prizes are possible.",
      },
      {
        q: "Can I play on mobile?",
        a: "Yes. Blackjack is available in mobile browsers and the Quantum Bluff app with a touch-optimized interface.",
      },
    ],
    ctaTitle: "Go for 21",
    ctaBody: "Create your account and start a solo or multiplayer blackjack game in one click.",
  },
};

export function getSeoLanding(slug: SeoGameSlug, locale: string): SeoLandingContent {
  const pack = locale.startsWith("fr") ? fr : en;
  return pack[slug];
}
