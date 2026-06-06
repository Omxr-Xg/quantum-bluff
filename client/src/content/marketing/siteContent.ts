import bacBg from "../../assets/background/BAC.png";
import bl1Bg from "../../assets/background/BL1.png";
import ba1Bg from "../../assets/background/BA1.png";
import bac2Bg from "../../assets/background/BAC2.png";

export type MarketingLocale = "fr" | "en";

export type FaqItem = { q: string; a: string };
export type ScreenshotItem = { src: string; title: string; caption: string };
export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  tags: string[];
  body: string[];
};

export type SiteContent = {
  discover: {
    metaTitle: string;
    heroTitle: string;
    heroSubtitle: string;
    intro: string[];
    featuresTitle: string;
    features: { title: string; body: string }[];
    gamesTitle: string;
    games: string[];
    leaderboardTitle: string;
    leaderboard: string[];
    rewardsTitle: string;
    rewards: string[];
    screenshotsTitle: string;
    screenshots: ScreenshotItem[];
    faqTitle: string;
    faq: FaqItem[];
    ctaTitle: string;
    ctaBody: string;
  };
  about: { title: string; sections: { heading: string; paragraphs: string[] }[] };
  contact: {
    title: string;
    intro: string[];
    emailLabel: string;
    email: string;
    supportHours: string;
    formNote: string;
  };
  privacy: { title: string; lastUpdated: string; sections: { heading: string; paragraphs: string[] }[] };
  terms: { title: string; lastUpdated: string; sections: { heading: string; paragraphs: string[] }[] };
  news: { title: string; subtitle: string; articles: NewsArticle[] };
};

const fr: SiteContent = {
  discover: {
    metaTitle: "Découvrir Quantum Bluff",
    heroTitle: "Le casino social où le bluff devient stratégie",
    heroSubtitle:
      "Texas Hold'em multijoueur, Belote en ligne, tournois, classement mondial et mini-jeux casino solo — le tout dans une expérience premium pensée pour le mobile et le desktop.",
    intro: [
      "Quantum Bluff est une plateforme de jeux de cartes et de casino en ligne qui réunit passion du poker, convivialité des salons multijoueurs et frisson des mises virtuelles. Conçu comme un véritable hub de divertissement, le projet place l'équité technique au centre : les mains, les tirages et les gains des mini-jeux sont validés côté serveur, ce qui garantit une expérience cohérente que vous jouiez une partie rapide en solo ou une table Texas Hold'em à cinq joueurs.",
      "L'identité Quantum Bluff repose sur une promesse simple : chaque victoire commence par un bluff. Le jeu encourage la lecture des adversaires, la gestion du tapis et la maîtrise des probabilités, tout en restant accessible grâce à des tutoriels intégrés, des tables contre bots et des défis quotidiens qui accompagnent votre progression.",
      "Que vous arriviez pour découvrir la roulette rétro, tenter un jackpot sur la machine à sous, rejoindre un tournoi hebdomadaire ou simplement retrouver vos amis autour d'une partie de Belote, le lobby unifié vous permet de tout atteindre en quelques clics. Les jetons sont une monnaie virtuelle de compte : ils servent à miser, à s'inscrire aux événements et à débloquer des récompenses de progression, sans prétendre à un service de jeu d'argent réel.",
      "Cette page publique présente l'ensemble de l'offre Quantum Bluff avant connexion : fonctionnalités sociales, catalogue de jeux, système de classement, récompenses, aperçus visuels et réponses aux questions les plus fréquentes. Elle complète l'écran d'accueil animé en donnant aux nouveaux joueurs — et aux partenaires — une vision claire et détaillée du produit.",
    ],
    featuresTitle: "Fonctionnalités principales",
    features: [
      {
        title: "Salon multijoueur unifié",
        body: "Créez ou rejoignez des salles Texas Hold'em publiques ou privées, suivez les parties en cours, acceptez des invitations amis et basculez entre poker, blackjack, Belote et jeux solo sans recharger l'application.",
      },
      {
        title: "Progression et défis",
        body: "Défis quotidiens, connexion récompensée, historique de solde et statistiques de profil motivent une pratique régulière. Le système de rangs reflète votre activité et vos performances sur la durée.",
      },
      {
        title: "Social intégré",
        body: "Liste d'amis, messages, invitations en direct, appels vocaux en table et présence en salle d'attente : Quantum Bluff est pensé pour jouer à plusieurs, pas seulement contre la machine.",
      },
      {
        title: "Sécurité et équité",
        body: "Authentification sécurisée, validation serveur des résultats casino, journal des transactions de jetons et modération des signalements pour préserver une communauté saine.",
      },
      {
        title: "Accessibilité",
        body: "Contraste élevé, alertes visuelles, support multilingue (français, anglais, espagnol, arabe, ukrainien) et interface responsive pour smartphones, tablettes et navigateurs desktop.",
      },
    ],
    gamesTitle: "Jeux disponibles",
    games: [
      "Texas Hold'em — parties contre bots, salles multijoueurs, tournois structurés et mode spectateur.",
      "Blackjack — solo contre le croupier ou tables multijoueur du salon avec règles serveur.",
      "Belote — salles quatre joueurs, variantes, buy-in et pot partagé selon les règles de la table.",
      "Jeux solo casino — Crash, Mines, Wheel of Fortune, Lucky Number dans le hub nouveautés.",
      "Jeux casino rétro — Roulette européenne, machine à sous vintage, classiques du salon.",
      "Roulette tutoriel — mode guidé pas à pas pour apprendre les mises intérieures et extérieures.",
    ],
    leaderboardTitle: "Classement mondial",
    leaderboard: [
      "Le classement Quantum Bluff met en avant les joueurs les plus actifs et les plus performants sur une période glissante. Il combine volume de parties, résultats en tournois et progression de rang pour éviter qu'un seul coup de chance ne définisse toute la hiérarchie.",
      "Consultez le podium, comparez votre position à celle de vos amis et utilisez le leaderboard comme objectif à moyen terme : monter en rang demande de la régularité, pas uniquement un gros coup sur un mini-jeu.",
      "Les saisons et événements spéciaux peuvent faire évoluer les critères d'affichage ; les règles détaillées sont précisées dans l'article « Comment fonctionne le système de rangs » du blog Quantum Bluff News.",
    ],
    rewardsTitle: "Récompenses et jetons",
    rewards: [
      "Les jetons sont la monnaie virtuelle interne. Vous en recevez via la connexion quotidienne, les défis, les codes cadeaux promotionnels, les résultats de parties et certains événements communautaires.",
      "Les gains et pertes en mini-jeux casino sont enregistrés dans l'historique du portefeuille pour une traçabilité complète. Les montants affichés en euros dans les écrans de démonstration sont simulés et n'impliquent aucun transfert bancaire réel.",
      "Les récompenses de progression (rangs, badges, défis) sont conçues pour valoriser l'engagement loyal sans promettre de gains financiers externes au jeu.",
    ],
    screenshotsTitle: "Aperçus de l'expérience",
    screenshots: [
      {
        src: bacBg,
        title: "Lobby principal",
        caption: "Navigation entre poker, blackjack, jeux solo et tournois depuis un salon sombre premium.",
      },
      {
        src: bl1Bg,
        title: "Tables multijoueur",
        caption: "Salles d'attente, invitations amis et lancement de parties Texas Hold'em en temps réel.",
      },
      {
        src: ba1Bg,
        title: "Casino solo",
        caption: "Hub des mini-jeux : Crash, Mines, roue de la fortune et classiques rétro.",
      },
      {
        src: bac2Bg,
        title: "Profil & progression",
        caption: "Solde, rang, statistiques et récompenses quotidiennes accessibles depuis le menu.",
      },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Quantum Bluff est-il un casino d'argent réel ?",
        a: "Non. Les jetons sont virtuels. Les écrans de paiement ou de retrait éventuels sont des simulations pédagogiques pour tester l'interface, sans valeur monétaire réelle.",
      },
      {
        q: "Faut-il payer pour commencer ?",
        a: "La création de compte est gratuite. Vous recevez des jetons de départ et pouvez en gagner via les défis quotidiens et les parties.",
      },
      {
        q: "Sur quels appareils puis-je jouer ?",
        a: "Navigateur moderne (Chrome, Safari, Firefox, Edge) et application mobile via Capacitor. Une connexion internet stable est recommandée pour le multijoueur.",
      },
      {
        q: "Comment sont calculés les résultats des mini-jeux ?",
        a: "Chaque mise est envoyée au serveur qui tire le résultat, débite et crédite le solde de manière atomique. Le client n'affiche que l'animation.",
      },
      {
        q: "Puis-je jouer avec mes amis ?",
        a: "Oui : ajoutez des amis, invitez-les en salle d'attente poker ou Belote, et utilisez le chat vocal en table lorsque disponible.",
      },
      {
        q: "Comment fonctionne le classement ?",
        a: "Il agrège activité et performance. Consultez le blog pour le détail des critères et des saisons.",
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Consultez notre politique de confidentialité. Nous limitons la collecte au nécessaire du service et ne vendons pas vos données personnelles.",
      },
      {
        q: "Comment contacter l'équipe ?",
        a: "Utilisez la page Contact ou écrivez à support@quantum-bluff.com pour les demandes générales.",
      },
    ],
    ctaTitle: "Prêt à entrer dans le salon ?",
    ctaBody:
      "Créez votre compte en quelques secondes, réclamez vos jetons de bienvenue et rejoignez une table — ou explorez d'abord le tutoriel poker depuis le lobby.",
  },
  about: {
    title: "À propos de Quantum Bluff",
    sections: [
      {
        heading: "Notre mission",
        paragraphs: [
          "Quantum Bluff a été créé pour offrir une alternative sociale et élégante aux jeux de cartes en ligne fragmentés. Nous voulons un seul lieu où l'on retrouve le poker entre amis, la Belote du dimanche soir et une roulette rapide entre deux mains, sans sacrifier la qualité visuelle ni l'intégrité des résultats.",
          "L'équipe produit et technique itère en continu sur la base des retours joueurs : nouveaux mini-jeux, amélioration du vocal, tournois communautaires et outils de modération.",
        ],
      },
      {
        heading: "Valeurs",
        paragraphs: [
          "Transparence sur la monnaie virtuelle, respect des joueurs, accessibilité et amusement responsable. Nous encourageons des pauses régulières et rappelons que le jeu doit rester un loisir.",
        ],
      },
      {
        heading: "Éditeur",
        paragraphs: [
          "Quantum Bluff est édité par l'équipe projet Quantum Bluff. Pour toute question juridique ou partenariat presse : legal@quantum-bluff.com.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact",
    intro: [
      "Une question sur votre compte, un bug à signaler ou une proposition de partenariat ? Notre équipe support traite les messages du lundi au vendredi.",
      "Avant d'écrire, consultez la FAQ de la page Découvrir et les articles du blog — beaucoup de réponses y figurent déjà.",
    ],
    emailLabel: "E-mail support",
    email: "support@quantum-bluff.com",
    supportHours: "Délai de réponse habituel : 48 à 72 h ouvrées.",
    formNote:
      "Le formulaire ci-dessous ouvre votre client mail. Pour les signalements de joueurs, utilisez l'outil intégré en partie lorsque c'est possible.",
  },
  privacy: {
    title: "Politique de confidentialité",
    lastUpdated: "Mai 2026",
    sections: [
      {
        heading: "1. Responsable du traitement",
        paragraphs: [
          "L'équipe Quantum Bluff traite les données nécessaires au fonctionnement du jeu (compte, parties, solde virtuel, logs techniques). Contact : privacy@quantum-bluff.com.",
        ],
      },
      {
        heading: "2. Données collectées",
        paragraphs: [
          "Identifiants de compte (pseudo, e-mail), hash de mot de passe, préférences langue et accessibilité, historique de parties et transactions de jetons, logs de connexion et adresse IP pour la sécurité, messages amis et signalements le cas échéant.",
        ],
      },
      {
        heading: "3. Finalités",
        paragraphs: [
          "Fourniture du service multijoueur, prévention de la fraude, support utilisateur, amélioration produit via statistiques agrégées, respect des obligations légales.",
        ],
      },
      {
        heading: "4. Base légale",
        paragraphs: [
          "Exécution du contrat (CGU), intérêt légitime (sécurité, amélioration), consentement lorsque requis (cookies non essentiels, communications marketing si activées).",
        ],
      },
      {
        heading: "5. Durée de conservation",
        paragraphs: [
          "Compte actif : données conservées tant que le compte existe. Après suppression : anonymisation ou suppression sous 90 jours sauf obligation légale contraire. Logs techniques : jusqu'à 12 mois.",
        ],
      },
      {
        heading: "6. Vos droits",
        paragraphs: [
          "Accès, rectification, effacement, limitation, opposition et portabilité lorsque applicable. Demande à privacy@quantum-bluff.com. Réclamation possible auprès de l'autorité de protection des données de votre pays.",
        ],
      },
      {
        heading: "7. Cookies et stockage local",
        paragraphs: [
          "Token de session, préférences i18n et paramètres d'accessibilité en localStorage. Pas de revente de données à des régies publicitaires tierces dans la version actuelle du produit.",
        ],
      },
      {
        heading: "8. Transferts",
        paragraphs: [
          "Hébergement et sous-traitants techniques peuvent être situés hors UE avec garanties appropriées (clauses contractuelles types) lorsque requis.",
        ],
      },
      {
        heading: "9. Mineurs",
        paragraphs: [
          "Le service s'adresse aux personnes de 18 ans et plus. Tout compte identifié comme mineur peut être suspendu.",
        ],
      },
      {
        heading: "10. Mises à jour",
        paragraphs: [
          "Cette politique peut évoluer. La date en tête de page indique la dernière révision substantielle.",
        ],
      },
    ],
  },
  terms: {
    title: "Conditions d'utilisation",
    lastUpdated: "Mai 2026",
    sections: [
      {
        heading: "1. Acceptation",
        paragraphs: [
          "En créant un compte ou en utilisant Quantum Bluff, vous acceptez les présentes conditions et la politique de confidentialité.",
        ],
      },
      {
        heading: "2. Nature du service",
        paragraphs: [
          "Quantum Bluff est un jeu en ligne à jetons virtuels. Aucun gain monétaire réel n'est garanti. Les jetons n'ont pas de valeur légale de tender en dehors de la plateforme.",
        ],
      },
      {
        heading: "3. Compte utilisateur",
        paragraphs: [
          "Vous êtes responsable de la confidentialité de vos identifiants. Un compte par personne physique. Pseudo et comportement doivent respecter les autres joueurs.",
        ],
      },
      {
        heading: "4. Conduite interdite",
        paragraphs: [
          "Triche, collusion, harcèlement, contournement technique, multi-comptes abusifs et exploitation de bugs sont interdits. Sanctions possibles : avertissement, suspension, suppression de compte.",
        ],
      },
      {
        heading: "5. Monnaie virtuelle",
        paragraphs: [
          "Les achats ou retraits simulés dans l'interface sont des démonstrations. L'équipe peut ajuster les soldes en cas d'erreur avérée ou de fraude, avec traçabilité ledger.",
        ],
      },
      {
        heading: "6. Propriété intellectuelle",
        paragraphs: [
          "Marques, visuels, code et contenus sont protégés. Toute reproduction non autorisée est interdite.",
        ],
      },
      {
        heading: "7. Disponibilité",
        paragraphs: [
          "Service fourni « en l'état ». Maintenance, mises à jour et interruptions temporaires peuvent survenir sans indemnité.",
        ],
      },
      {
        heading: "8. Limitation de responsabilité",
        paragraphs: [
          "Dans les limites permises par la loi, Quantum Bluff n'est pas responsable des pertes indirectes liées à l'utilisation du jeu. Jouez de manière responsable.",
        ],
      },
      {
        heading: "9. Résiliation",
        paragraphs: [
          "Vous pouvez supprimer votre compte via le support. Nous pouvons fermer un compte en cas de violation des CGU.",
        ],
      },
      {
        heading: "10. Droit applicable",
        paragraphs: [
          "Les présentes conditions sont régies par le droit français sauf disposition impérative contraire. Litiges : tribunaux compétents après tentative de résolution amiable.",
        ],
      },
    ],
  },
  news: {
    title: "Quantum Bluff News",
    subtitle: "Actualités, guides et notes de version de la plateforme.",
    articles: [
      {
        slug: "bienvenue-quantum-bluff-news",
        title: "Bienvenue sur Quantum Bluff News",
        excerpt: "Le fil d'actualité officiel : fonctionnalités, guides et calendrier des événements.",
        date: "2026-05-01",
        readMinutes: 4,
        tags: ["Annonce"],
        body: [
          "Quantum Bluff News est le point d'entrée pour suivre l'évolution du salon. Chaque mois nous y publions les nouveautés client et serveur, les guides de jeu et les conseils de progression.",
          "Vous y trouverez des articles sur le poker, la Belote, les mini-jeux casino et le système de rangs. Les publications majeures sont aussi résumées dans le lobby lors des mises à jour.",
          "Abonnez-vous aux annonces en jeu via les notifications et consultez régulièrement cette page pour ne rien manquer des tournois communautaires à venir.",
        ],
      },
      {
        slug: "nouveautes-casino-solo-2026",
        title: "Nouveautés casino solo : Crash, Mines, Wheel et Lucky Number",
        excerpt: "Tour d'horizon des mini-jeux solo ajoutés au hub Jeux solo et au salon rétro.",
        date: "2026-05-15",
        readMinutes: 6,
        tags: ["Mise à jour", "Casino"],
        body: [
          "Le hub Jeux solo regroupe les expériences rapides : Crash pour rider un multiplicateur, Mines pour une grille risque/récompense, Wheel of Fortune pour un tirage spectaculaire et, côté rétro, Lucky Number pour parier sur un chiffre porte-bonheur.",
          "Chaque mini-jeu suit le même contrat de sécurité : mise validée serveur, tirage ou résultat généré côté API, crédit ledger et verrou anti double-clic. Les animations client ne font qu'illustrer le résultat.",
          "Les limites de mise standard vont de 10 à 500 jetons par round avec pas de 10. Consultez les pages de chaque jeu pour les coefficients exacts.",
        ],
      },
      {
        slug: "guide-texas-holdem-debuter",
        title: "Guide Texas Hold'em : bien débuter au salon",
        excerpt: "Règles essentielles, ordre des mises et conseils pour vos premières tables multijoueur.",
        date: "2026-04-20",
        readMinutes: 8,
        tags: ["Guide", "Poker"],
        body: [
          "Le Texas Hold'em distribue deux cartes privées à chaque joueur et cinq cartes communes. La meilleure main de cinq cartes remporte le pot.",
          "Au Quantum Bluff, commencez par le mode bots pour tester les tours de mise sans pression. Passez ensuite aux salles publiques deux à cinq joueurs : respectez les blinds annoncées et le buy-in minimal.",
          "Conseil : jouez serré en early position, élargissez légèrement sur le bouton, et utilisez l'historique de mains pour analyser vos sessions. Le tutoriel intégré du lobby vous guide pas à pas.",
        ],
      },
      {
        slug: "guide-belote-salons",
        title: "Guide Belote : créer une salle et lancer une partie",
        excerpt: "Variantes, buy-in, présence des quatre joueurs et déroulement d'une manche.",
        date: "2026-04-28",
        readMinutes: 7,
        tags: ["Guide", "Belote"],
        body: [
          "La Belote Quantum Bluff se joue en salle de quatre. L'hôte définit la variante, le score cible et le buy-in en jetons avant le début.",
          "Chaque joueur doit être présent dans la salle d'attente et prêt avant le lancement. Le pot est constitué des mises d'entrée et distribué selon les règles de la variante choisie.",
          "Utilisez le vocal en table pour coordonner vos équipes tout en respectant le fair-play : aucune communication externe n'est autorisée en tournoi officiel.",
        ],
      },
      {
        slug: "systeme-de-rangs-explication",
        title: "Comment fonctionne le système de rangs",
        excerpt: "Critères de progression, lien avec le classement et récompenses associées.",
        date: "2026-05-10",
        readMinutes: 5,
        tags: ["Progression"],
        body: [
          "Votre rang Quantum Bluff synthétise l'expérience accumulée : parties jouées, participation aux tournois, défis quotidiens complétés et certains jalons sociaux.",
          "Le classement affiché met en avant les meilleures performances récentes mais ne se limite pas au rang : un joueur actif peut grimper même après une série de parties modestes.",
          "Les récompenses de rang sont cosmétiques ou en jetons bonus selon les saisons. Aucun rang ne garantit un avantage compétitif injuste sur les tables équitables.",
        ],
      },
    ],
  },
};

const en: SiteContent = {
  discover: {
    metaTitle: "Discover Quantum Bluff",
    heroTitle: "The social casino where bluff becomes strategy",
    heroSubtitle:
      "Multiplayer Texas Hold'em, online Belote, tournaments, global leaderboard and solo casino mini-games — a premium experience on mobile and desktop.",
    intro: [],
    featuresTitle: "Key features",
    features: [],
    gamesTitle: "Available games",
    games: fr.discover.games,
    leaderboardTitle: "Global leaderboard",
    leaderboard: fr.discover.leaderboard,
    rewardsTitle: "Rewards and chips",
    rewards: fr.discover.rewards,
    screenshotsTitle: "Experience previews",
    screenshots: fr.discover.screenshots,
    faqTitle: "FAQ",
    faq: fr.discover.faq,
    ctaTitle: "Ready to enter the lounge?",
    ctaBody: "Create your account in seconds, claim welcome chips and join a table.",
  },
  about: fr.about,
  contact: { ...fr.contact, title: "Contact", emailLabel: "Support email" },
  privacy: fr.privacy,
  terms: fr.terms,
  news: { ...fr.news, title: "Quantum Bluff News", subtitle: "Updates, guides and release notes." },
};

// English discover long-form (abbreviated mirror — FR is canonical for word count)
en.discover.intro = [
  "Quantum Bluff is an online card and casino gaming platform that combines poker passion, multiplayer lounges and virtual chip excitement. Server-side validation keeps every hand and mini-game outcome fair whether you play solo or at a five-player Hold'em table.",
  "Our promise: every win starts with a bluff. Learn opponents, manage your stack and enjoy integrated tutorials, bot tables and daily challenges.",
  "From retro roulette to Belote with friends or weekly tournaments, the unified lobby gets you there in a few taps. Chips are virtual account currency only — not real-money gambling.",
  "This public page describes the full offer before login: social features, game catalogue, leaderboard, rewards, screenshots and FAQ.",
];
en.discover.features = [
  { title: "Unified multiplayer lobby", body: "Create or join public or private Hold'em rooms, spectate, accept friend invites and switch between poker, blackjack, Belote and solo games." },
  { title: "Progression & challenges", body: "Daily goals, login rewards, balance history and profile stats. Ranks reflect long-term activity." },
  { title: "Built-in social", body: "Friends, messages, invites, table voice chat and waiting-room presence." },
  { title: "Security & fairness", body: "Secure auth, server-validated casino results, wallet ledger and player reports." },
  { title: "Accessibility", body: "High contrast, visual alerts, multilingual UI and responsive layout." },
];
en.discover.games = [
  "Texas Hold'em — bot tables, multiplayer rooms, structured tournaments and spectator mode.",
  "Blackjack — solo against the dealer or multiplayer lounge tables with server rules.",
  "Belote — four-player rooms, variants, buy-in and shared pot per table rules.",
  "Solo casino games — Crash, Mines, Wheel of Fortune, Lucky Number in the news hub.",
  "Retro casino — European roulette, vintage slot machine, lounge classics.",
  "Roulette tutorial — step-by-step guided mode for inside and outside bets.",
];
en.discover.leaderboard = [
  "The Quantum Bluff leaderboard highlights the most active and skilled players over a rolling period. It combines match volume, tournament results and rank progression so one lucky hand does not define the hierarchy.",
  "Check the podium, compare your position with friends and use the board as a medium-term goal: climbing ranks takes consistency, not just one big mini-game win.",
  "Seasons and special events may adjust display criteria; see the blog article on ranks for details.",
];
en.discover.rewards = [
  "Chips are the internal virtual currency. You earn them through daily login, challenges, promo gift codes, match results and some community events.",
  "Mini-game wins and losses are recorded in your wallet history for full traceability. Euro amounts shown in demo screens are simulated and involve no real bank transfer.",
  "Progression rewards (ranks, badges, challenges) celebrate loyal play without promising external financial gains.",
];
en.discover.faq = [
  { q: "Is Quantum Bluff a real-money casino?", a: "No. Chips are virtual. Any payment or withdrawal screens are educational simulations with no real monetary value." },
  { q: "Do I need to pay to start?", a: "Account creation is free. You receive starter chips and can earn more through daily challenges and matches." },
  { q: "Which devices are supported?", a: "Modern browsers (Chrome, Safari, Firefox, Edge) and the mobile app via Capacitor. A stable internet connection is recommended for multiplayer." },
  { q: "How are mini-game results calculated?", a: "Each bet is sent to the server, which draws the outcome and atomically debits or credits your balance. The client only plays the animation." },
  { q: "Can I play with friends?", a: "Yes: add friends, invite them to poker or Belote waiting rooms, and use table voice chat when available." },
  { q: "How does the leaderboard work?", a: "It aggregates activity and performance. See the blog for criteria and seasons." },
  { q: "Is my data protected?", a: "See our privacy policy. We limit collection to what the service needs and do not sell your personal data." },
  { q: "How do I contact the team?", a: "Use the Contact page or email support@quantum-bluff.com for general enquiries." },
];

export function getSiteContent(locale: string): SiteContent {
  return locale.startsWith("fr") ? fr : en;
}

export function getNewsArticle(slug: string, locale: string): NewsArticle | undefined {
  return getSiteContent(locale).news.articles.find((a) => a.slug === slug);
}
