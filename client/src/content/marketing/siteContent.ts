import bacBg from "../../assets/background/BAC.webp";
import bl1Bg from "../../assets/background/BL1.webp";
import ba1Bg from "../../assets/background/BA1.webp";
import bac2Bg from "../../assets/background/BAC2.webp";
import pokerImg from "../../assets/games/poker.webp";
import beloteImg from "../../assets/games/belote.webp";
import blackjackImg from "../../assets/games/blackjack.webp";
import rouletteImg from "../../assets/games/roulette.webp";
import slotImg from "../../assets/games/slot.webp";
import crashImg from "../../assets/games/crash.webp";
import minesImg from "../../assets/games/mines.webp";
import luckyImg from "../../assets/games/lucky.webp";
import { es } from "./siteContent.es";
import { ar } from "./siteContent.ar";
import { uk } from "./siteContent.uk";
import { resolveMarketingLocale } from "./resolveMarketingLocale";
import { responsibleGamingFr, responsibleGamingEn } from "./responsibleGamingContent";
import { frBaseNewsArticles, enBaseNewsArticles, mergeNewsArticles } from "./longGuidesContent";

export type MarketingLocale = "fr" | "en" | "es" | "ar" | "uk";

export type FaqItem = { q: string; a: string };
export type ScreenshotItem = { src: string; title: string; caption: string };
export type GameCard = { id: string; name: string; description: string; screenshot: string };
export type FeatureCard = { title: string; body: string };
export type HomeContent = {
  whatIsTitle: string;
  whatIs: string[];
  gamesTitle: string;
  games: GameCard[];
  socialTitle: string;
  social: FeatureCard[];
  whyTitle: string;
  why: FeatureCard[];
  faqTitle: string;
  faq: FaqItem[];
  ctaTitle: string;
  ctaBody: string;
};
export type NewsArticle = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMinutes: number;
  tags: string[];
  body: string[];
  imageUrls?: string[];
};

export type SiteContent = {
  home: HomeContent;
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
  responsibleGaming?: { title: string; lastUpdated: string; sections: { heading: string; paragraphs: string[] }[] };
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
  home: {
    whatIsTitle: "Qu'est-ce que Quantum Bluff ?",
    whatIs: [
      "Quantum Bluff est une plateforme de jeux de cartes et de casino social en ligne, née d'un projet porté par une équipe de huit personnes et soutenu devant un jury universitaire avec félicitations. Depuis le 1er juin 2026, le salon est ouvert au public : plus qu'un exercice académique, c'est un véritable hub de divertissement où poker, Belote, blackjack et mini-jeux casino cohabitent dans une interface premium sombre et responsive.",
      "La promesse du produit tient en une phrase : chaque victoire commence par un bluff. Le Texas Hold'em multijoueur invite à lire les adversaires et gérer son tapis ; la Belote retrouve l'esprit des parties entre amis ; les jeux solo — Crash, Mines, Lucky Number, roulette rétro ou machine à sous — offrent des sessions express entre deux mains. Tout est relié par un lobby unifié accessible depuis le navigateur ou l'application mobile.",
      "L'intégrité technique est au cœur de l'architecture : chaque main de poker, chaque tirage de roulette et chaque round de mini-jeu est validé côté serveur avant d'être affiché. Les jetons sont une monnaie virtuelle interne, sans valeur monétaire réelle. Vous en gagnez via la connexion quotidienne, les défis, les parties et les événements communautaires — jamais via un service de jeu d'argent réglementé.",
      "Quantum Bluff se distingue par sa couche sociale native : amis, messagerie, invitations en salle d'attente, appels vocaux un-à-un et appels de groupe WebRTC, présence en temps réel et classements saisonniers. L'accessibilité (contraste élevé, alertes visuelles, cinq langues) et la progression par rangs et badges accompagnent les joueurs occasionnels comme les habitués du salon.",
      "Que vous découvriez le produit sur cette page, lisiez le blog Quantum Bluff News ou créiez directement votre compte, vous entrez dans un écosystème pensé pour durer : mises à jour mensuelles, nouveaux mini-jeux, tournois communautaires et amélioration continue du vocal. Bienvenue au salon — la table vous attend.",
    ],
    gamesTitle: "Les jeux disponibles",
    games: [
      {
        id: "holdem",
        name: "Texas Hold'em",
        description:
          "Le poker no-limit par excellence : salles publiques et privées de deux à cinq joueurs, tables bots pour s'entraîner, tournois structurés et mode spectateur. Blinds, buy-in et timers sont gérés par le serveur pour une expérience fluide.",
        screenshot: pokerImg,
      },
      {
        id: "belote",
        name: "Belote",
        description:
          "Quatre joueurs autour d'une table style poker : Classique, Coinchée, Contrée ou Moderne. L'hôte définit le buy-in et le score cible ; la cagnotte est redistribuée aux gagnants. Salle d'attente plein écran et vocal en table.",
        screenshot: beloteImg,
      },
      {
        id: "blackjack",
        name: "Blackjack",
        description:
          "Affrontez le croupier en solo ou rejoignez une table multijoueur du salon. Les règles (hit, stand, double) sont appliquées côté serveur ; le tapis et les mises suivent le même ledger de jetons que le reste de la plateforme.",
        screenshot: blackjackImg,
      },
      {
        id: "roulette",
        name: "Roulette",
        description:
          "Roulette européenne au hub casino rétro : mises intérieures et extérieures, animation vintage et retour fluide vers le salon. Un mode tutoriel guidé est disponible depuis le lobby pour apprendre les types de paris.",
        screenshot: rouletteImg,
      },
      {
        id: "slots",
        name: "Machine à sous",
        description:
          "Slot machine vintage dans l'univers rétro : symboles classiques, effets néon et tirages validés serveur. Idéal pour une pause rapide entre deux parties de cartes sans quitter l'ambiance casino.",
        screenshot: slotImg,
      },
      {
        id: "crash",
        name: "Crash",
        description:
          "Montez le multiplicateur et encaissez avant le crash. Chaque round est généré côté API : mise de 10 à 500 jetons, historique portefeuille et animation temps réel synchronisée sur le résultat serveur.",
        screenshot: crashImg,
      },
      {
        id: "mines",
        name: "Mines",
        description:
          "Grille risque/récompense : révélez des cases sans toucher une mine pour faire grimper le gain. Le tirage est serveur-authoritative ; le client illustre uniquement l'état de la grille et les payouts.",
        screenshot: minesImg,
      },
      {
        id: "lucky-number",
        name: "Lucky Number",
        description:
          "Pariez sur un chiffre porte-bonheur dans le hub rétro. Tirage instantané, coefficients affichés clairement et API dédiée POST /api/lucky-number/play pour une traçabilité complète des gains.",
        screenshot: luckyImg,
      },
    ],
    socialTitle: "Fonctionnalités sociales",
    social: [
      {
        title: "Appels vocaux",
        body: "Appelez un ami depuis le lobby ou en table via WebRTC : sonnerie, timeout 15 secondes, audio bidirectionnel et négociation SDP sécurisée. Le dock vocal est déplaçable pendant la partie.",
      },
      {
        title: "Appels de groupe",
        body: "Lancez une conversation vocale à plusieurs pour coordonner une Belote ou débriefer après un tournoi. Le VoiceCallManager gère les participants et la continuité entre table et salle d'attente.",
      },
      {
        title: "Messagerie",
        body: "Échangez des messages privés avec vos amis, consultez l'historique et répondez depuis le profil ou la liste d'amis. Les notifications in-app signalent les nouvelles conversations.",
      },
      {
        title: "Classements",
        body: "Le leaderboard mondial combine volume de parties, performances en tournois et progression de rang sur une période glissante. Comparez votre position à celle de vos amis depuis le lobby.",
      },
      {
        title: "Badges et défis",
        body: "Défis quotidiens, connexion récompensée et jalons de progression débloquent badges visibles sur le profil. Les récompenses restent cosmétiques ou en jetons bonus — pas d'avantage compétitif injuste.",
      },
      {
        title: "Système d'amis",
        body: "Ajoutez des joueurs, acceptez des demandes, invitez-les en salle d'attente poker ou Belote et voyez leur présence en ligne. Les amis connectés remontent en priorité dans le lobby.",
      },
    ],
    whyTitle: "Pourquoi Quantum Bluff ?",
    why: [
      {
        title: "Gratuit",
        body: "Création de compte sans frais, jetons de départ offerts et gains via défis quotidiens et parties. Aucun dépôt bancaire réel n'est requis pour jouer.",
      },
      {
        title: "Multi-plateforme",
        body: "Navigateur moderne (Chrome, Safari, Firefox, Edge), application mobile Capacitor et build Electron desktop. Une seule progression, quel que soit l'appareil.",
      },
      {
        title: "Temps réel",
        body: "Sockets Socket.IO pour le multijoueur, mises à jour instantanées du solde et des salles, présence en waiting-room et appels vocaux à faible latence.",
      },
      {
        title: "Progression joueur",
        body: "Rangs, statistiques de profil, historique de portefeuille et tutoriels intégrés accompagnent votre montée en compétence sur la durée.",
      },
    ],
    faqTitle: "Questions fréquentes",
    faq: [
      {
        q: "Quantum Bluff est-il un casino d'argent réel ?",
        a: "Non. Les jetons sont virtuels. Les écrans de paiement ou de retrait sont des simulations pédagogiques sans valeur monétaire réelle.",
      },
      {
        q: "Le jeu est-il gratuit ?",
        a: "Oui. L'inscription est gratuite et vous recevez des jetons de départ. Vous pouvez en gagner via les défis quotidiens, les parties et les événements.",
      },
      {
        q: "Sur quels appareils puis-je jouer ?",
        a: "Sur navigateur web, application mobile (Capacitor) et client desktop (Electron). Une connexion stable est recommandée pour le multijoueur et le vocal.",
      },
      {
        q: "Comment fonctionnent les appels vocaux ?",
        a: "Depuis le lobby ou le profil ami, lancez un appel WebRTC. Une sonnerie retentit 15 secondes ; si l'ami décroche, l'audio bidirectionnel s'établit via ICE/TURN.",
      },
      {
        q: "Puis-je jouer avec mes amis ?",
        a: "Oui : ajoutez-les, invitez-les en salle d'attente poker ou Belote, et utilisez le vocal en table.",
      },
      {
        q: "Quelles variantes de Belote sont disponibles ?",
        a: "Classique, Coinchée, Contrée et Moderne. L'hôte choisit la variante, le buy-in et le score cible avant le lancement.",
      },
      {
        q: "Comment sont calculés les mini-jeux (Crash, Mines, etc.) ?",
        a: "Chaque mise part au serveur qui tire le résultat et met à jour le solde de façon atomique. Le client n'affiche que l'animation.",
      },
      {
        q: "Comment fonctionne le classement ?",
        a: "Il agrège activité récente, tournois et progression de rang. Consultez le blog pour les critères détaillés et les saisons.",
      },
      {
        q: "Y a-t-il des tournois ?",
        a: "Oui, des tournois Texas Hold'em structurés sont accessibles depuis le lobby avec salles d'attente et écran de résultats dédié.",
      },
      {
        q: "Quelles langues sont supportées ?",
        a: "Français, anglais, espagnol, arabe et ukrainien. Le sélecteur de langue est disponible depuis le menu principal.",
      },
      {
        q: "Mes données sont-elles protégées ?",
        a: "Consultez notre politique de confidentialité. Nous limitons la collecte au nécessaire du service et ne vendons pas vos données.",
      },
      {
        q: "Y a-t-il une limite d'âge ?",
        a: "Le service s'adresse aux personnes de 18 ans et plus. Tout compte identifié comme mineur peut être suspendu.",
      },
      {
        q: "Comment signaler un joueur ?",
        a: "Utilisez l'outil de signalement intégré en partie lorsque disponible, ou contactez support@quantum-bluff.com.",
      },
      {
        q: "Comment contacter l'équipe ?",
        a: "Page Contact ou e-mail support@quantum-bluff.com. Délai de réponse habituel : 48 à 72 h ouvrées.",
      },
    ],
    ctaTitle: "Prêt à jouer ?",
    ctaBody: "Créez votre compte gratuitement, réclamez vos jetons de bienvenue et rejoignez une table en quelques secondes.",
  },
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
          "Né d'un projet porté par une équipe de huit personnes et soutenu devant un jury universitaire avec félicitations, le salon est devenu public le 1er juin 2026. Depuis, l'équipe produit et technique itère en continu : nouveaux mini-jeux, amélioration du vocal WebRTC, tournois communautaires, accessibilité et outils de modération.",
          "Notre ambition est de proposer un hub de divertissement durable — navigateur, application mobile et clients desktop — où chaque victoire commence par un bluff, mais où le fair-play et le respect des joueurs priment sur tout.",
        ],
      },
      {
        heading: "Ce que nous proposons",
        paragraphs: [
          "Texas Hold'em multijoueur, Belote à quatre joueurs, blackjack solo ou multijoueur, roulette européenne, machine à sous, Crash, Mines, Lucky Number et Wheel of Fortune : tous les jeux partagent le même portefeuille de jetons virtuels et la même couche sociale (amis, messagerie, invitations, appels vocaux).",
          "Chaque tirage, chaque main et chaque round de mini-jeu est validé côté serveur avant affichage. Les jetons n'ont aucune valeur monétaire réelle : Quantum Bluff est un jeu social, pas un opérateur de jeu d'argent réglementé.",
        ],
      },
      {
        heading: "Valeurs",
        paragraphs: [
          "Transparence sur la monnaie virtuelle, respect des joueurs, accessibilité (contraste, alertes visuelles, cinq langues d'interface) et amusement responsable. Nous encourageons des pauses régulières et rappelons que le jeu doit rester un loisir.",
          "La communauté est modérée : signalements en partie, politique anti-triche et support réactif pour les litiges entre joueurs.",
        ],
      },
      {
        heading: "Éditeur et contact",
        paragraphs: [
          "Quantum Bluff est édité par l'équipe projet Quantum Bluff. Pour toute question juridique ou partenariat presse : legal@quantum-bluff.com. Support joueurs : support@quantum-bluff.com.",
          "Retrouvez nos guides de jeu sur Quantum Bluff News (/news), nos pages dédiées par jeu (poker, belote, blackjack, etc.) et la page Découvrir pour une présentation complète de la plateforme.",
        ],
      },
    ],
  },
  responsibleGaming: responsibleGamingFr,
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
    subtitle: "Actualités, guides et journal des mises à jour de la plateforme.",
    articles: mergeNewsArticles(frBaseNewsArticles, "fr"),
  },
};

const en: SiteContent = {
  home: {
    whatIsTitle: "What is Quantum Bluff?",
    whatIs: fr.home.whatIs,
    gamesTitle: "Available games",
    games: fr.home.games.map((g) => ({
      ...g,
      name:
        g.id === "holdem"
          ? "Texas Hold'em"
          : g.id === "belote"
            ? "Belote"
            : g.id === "blackjack"
              ? "Blackjack"
              : g.id === "roulette"
                ? "Roulette"
                : g.id === "slots"
                  ? "Slot machine"
                  : g.id === "crash"
                    ? "Crash"
                    : g.id === "mines"
                      ? "Mines"
                      : "Lucky Number",
      description:
        g.id === "holdem"
          ? "The classic no-limit poker game: public and private 2–5 player rooms, bot tables, structured tournaments and spectator mode. Blinds, buy-in and timers are server-managed."
          : g.id === "belote"
            ? "Four players at a poker-style table: Classic, Coinched, Contrée or Modern. The host sets buy-in and target score; the pot goes to winners. Full-screen waiting room and table voice chat."
            : g.id === "blackjack"
              ? "Play solo against the dealer or join a multiplayer lounge table. Server-side rules (hit, stand, double) with the same chip ledger as the rest of the platform."
              : g.id === "roulette"
                ? "European roulette in the retro casino hub: inside and outside bets, vintage animation. A guided tutorial is available from the lobby."
                : g.id === "slots"
                  ? "Vintage slot machine in the retro lounge: classic symbols, neon effects and server-validated spins."
                  : g.id === "crash"
                    ? "Ride the multiplier and cash out before the crash. Server-generated rounds, 10–500 chip bets and wallet history."
                    : g.id === "mines"
                      ? "Risk/reward grid: reveal tiles without hitting a mine. Server-authoritative draw; the client only renders the grid."
                      : "Bet on a lucky number in the retro hub. Instant draw, clear coefficients and dedicated API for full traceability.",
    })),
    socialTitle: "Social features",
    social: [
      { title: "Voice calls", body: "Call a friend from the lobby or table via WebRTC: ringtone, 15s timeout, bidirectional audio and secure SDP negotiation." },
      { title: "Group calls", body: "Start a multi-party voice chat to coordinate Belote or debrief after a tournament. VoiceCallManager handles participants and table continuity." },
      { title: "Messaging", body: "Private messages with friends, chat history and in-app notifications for new conversations." },
      { title: "Leaderboards", body: "Global board combining match volume, tournament results and rank progression over a rolling period." },
      { title: "Badges & challenges", body: "Daily challenges, login rewards and milestones unlock profile badges. Rewards are cosmetic or bonus chips only." },
      { title: "Friends system", body: "Add players, accept requests, invite to poker or Belote waiting rooms and see online presence. Connected friends are prioritised in the lobby." },
    ],
    whyTitle: "Why Quantum Bluff?",
    why: [
      { title: "Free", body: "No-cost signup, starter chips and earnings through daily challenges and matches. No real bank deposit required." },
      { title: "Cross-platform", body: "Modern browsers, Capacitor mobile app and Electron desktop. One progression across devices." },
      { title: "Real-time", body: "Socket.IO multiplayer, instant balance and room updates, waiting-room presence and low-latency voice." },
      { title: "Player progression", body: "Ranks, profile stats, wallet history and built-in tutorials support long-term improvement." },
    ],
    faqTitle: "FAQ",
    faq: [],
    ctaTitle: "Ready to play?",
    ctaBody: "Create your free account, claim welcome chips and join a table in seconds.",
  },
  discover: {
    metaTitle: "Discover Quantum Bluff",
    heroTitle: "The social casino where bluff becomes strategy",
    heroSubtitle:
      "Multiplayer Texas Hold'em, online Belote, tournaments, global leaderboard and solo casino mini-games — a premium experience on mobile and desktop.",
    intro: [],
    featuresTitle: "Key features",
    features: [],
    gamesTitle: "Available games",
    games: [],
    leaderboardTitle: "Global leaderboard",
    leaderboard: [],
    rewardsTitle: "Rewards and chips",
    rewards: [],
    screenshotsTitle: "Experience previews",
    screenshots: [],
    faqTitle: "FAQ",
    faq: [],
    ctaTitle: "Ready to enter the lounge?",
    ctaBody: "Create your account in seconds, claim welcome chips and join a table.",
  },
  about: {
    title: "About Quantum Bluff",
    sections: [
      {
        heading: "Our mission",
        paragraphs: [
          "Quantum Bluff was created to offer a social, elegant alternative to fragmented online card games. We want one place to enjoy poker with friends, Sunday Belote and a quick roulette spin between hands — without sacrificing visual quality or result integrity.",
          "Born from an eight-person team project defended before a university jury with honours, the lounge opened to the public on June 1, 2026. The product and engineering team iterates continuously: new mini-games, WebRTC voice, community tournaments, accessibility and moderation tools.",
          "Our ambition is a lasting entertainment hub — browser, mobile app and desktop clients — where every win starts with a bluff, but fair play and respect for players come first.",
        ],
      },
      {
        heading: "What we offer",
        paragraphs: [
          "Multiplayer Texas Hold'em, four-player Belote, solo or multiplayer blackjack, European roulette, slot machine, Crash, Mines, Lucky Number and Wheel of Fortune: all games share the same virtual chip wallet and social layer (friends, messaging, invites, voice calls).",
          "Every draw, hand and mini-game round is server-validated before display. Chips have no real monetary value: Quantum Bluff is social gaming, not a regulated real-money gambling operator.",
        ],
      },
      {
        heading: "Values",
        paragraphs: [
          "Transparency on virtual currency, respect for players, accessibility (contrast, visual alerts, five UI languages) and responsible fun. We encourage regular breaks and remind everyone that gaming should stay a leisure activity.",
          "The community is moderated: in-game reporting, anti-cheat policy and responsive support for player disputes.",
        ],
      },
      {
        heading: "Publisher and contact",
        paragraphs: [
          "Quantum Bluff is published by the Quantum Bluff project team. Legal or press enquiries: legal@quantum-bluff.com. Player support: support@quantum-bluff.com.",
          "Find game guides on Quantum Bluff News (/news), dedicated pages per game (poker, belote, blackjack, etc.) and the Discover page for a full platform overview.",
        ],
      },
    ],
  },
  responsibleGaming: responsibleGamingEn,
  contact: {
    title: "Contact",
    intro: [
      "A question about your account, a bug to report or a partnership proposal? Our support team handles messages Monday to Friday.",
      "Before writing, check the Discover page FAQ and blog articles — many answers are already there.",
    ],
    emailLabel: "Support email",
    email: "support@quantum-bluff.com",
    supportHours: "Typical response time: 48–72 business hours.",
    formNote:
      "The form below opens your mail client. For player reports, use the in-game tool when possible.",
  },
  privacy: {
    title: "Privacy policy",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "1. Data controller",
        paragraphs: [
          "The Quantum Bluff team processes data required to run the game (account, matches, virtual balance, technical logs). Contact: privacy@quantum-bluff.com.",
        ],
      },
      {
        heading: "2. Data collected",
        paragraphs: [
          "Account identifiers (username, email), password hash, language and accessibility preferences, match and chip transaction history, connection logs and IP address for security, friend messages and reports when applicable.",
        ],
      },
      {
        heading: "3. Purposes",
        paragraphs: [
          "Providing the multiplayer service, fraud prevention, user support, product improvement via aggregated statistics, compliance with legal obligations.",
        ],
      },
      {
        heading: "4. Legal basis",
        paragraphs: [
          "Contract performance (Terms), legitimate interest (security, improvement), consent when required (non-essential cookies, marketing communications if enabled).",
        ],
      },
      {
        heading: "5. Retention",
        paragraphs: [
          "Active account: data kept while the account exists. After deletion: anonymisation or erasure within 90 days unless legally required otherwise. Technical logs: up to 12 months.",
        ],
      },
      {
        heading: "6. Your rights",
        paragraphs: [
          "Access, rectification, erasure, restriction, objection and portability where applicable. Request at privacy@quantum-bluff.com. You may lodge a complaint with your local data protection authority.",
        ],
      },
      {
        heading: "7. Cookies and local storage",
        paragraphs: [
          "Session token, i18n preferences and accessibility settings in localStorage. No sale of data to third-party ad networks in the current product version.",
        ],
      },
      {
        heading: "8. Transfers",
        paragraphs: [
          "Hosting and technical subprocessors may be located outside the EU with appropriate safeguards (standard contractual clauses) when required.",
        ],
      },
      {
        heading: "9. Minors",
        paragraphs: [
          "The service is for users aged 18 and over. Any account identified as belonging to a minor may be suspended.",
        ],
      },
      {
        heading: "10. Updates",
        paragraphs: [
          "This policy may evolve. The date at the top indicates the last substantial revision.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of service",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "1. Acceptance",
        paragraphs: [
          "By creating an account or using Quantum Bluff, you accept these terms and the privacy policy.",
        ],
      },
      {
        heading: "2. Nature of the service",
        paragraphs: [
          "Quantum Bluff is an online game using virtual chips. No real monetary winnings are guaranteed. Chips have no legal tender value outside the platform.",
        ],
      },
      {
        heading: "3. User account",
        paragraphs: [
          "You are responsible for keeping your credentials confidential. One account per person. Username and behaviour must respect other players.",
        ],
      },
      {
        heading: "4. Prohibited conduct",
        paragraphs: [
          "Cheating, collusion, harassment, technical circumvention, abusive multi-accounts and bug exploitation are prohibited. Sanctions may include warning, suspension or account deletion.",
        ],
      },
      {
        heading: "5. Virtual currency",
        paragraphs: [
          "Simulated purchases or withdrawals in the interface are demonstrations. The team may adjust balances in case of proven error or fraud, with ledger traceability.",
        ],
      },
      {
        heading: "6. Intellectual property",
        paragraphs: [
          "Trademarks, visuals, code and content are protected. Unauthorised reproduction is prohibited.",
        ],
      },
      {
        heading: "7. Availability",
        paragraphs: [
          "Service provided \"as is\". Maintenance, updates and temporary interruptions may occur without compensation.",
        ],
      },
      {
        heading: "8. Limitation of liability",
        paragraphs: [
          "To the extent permitted by law, Quantum Bluff is not liable for indirect losses related to use of the game. Play responsibly.",
        ],
      },
      {
        heading: "9. Termination",
        paragraphs: [
          "You may delete your account via support. We may close an account in case of Terms violation.",
        ],
      },
      {
        heading: "10. Governing law",
        paragraphs: [
          "These terms are governed by French law unless mandatory local provisions apply. Disputes: competent courts after amicable resolution attempt.",
        ],
      },
    ],
  },
  news: {
    title: "Quantum Bluff News",
    subtitle: "Updates, guides and the platform changelog.",
    articles: [],
  },
};

en.home.faq = [
  { q: "Is Quantum Bluff a real-money casino?", a: "No. Chips are virtual. Payment or withdrawal screens are educational simulations with no real monetary value." },
  { q: "Is the game free?", a: "Yes. Signup is free with starter chips. Earn more through daily challenges, matches and events." },
  { q: "Which devices are supported?", a: "Web browser, Capacitor mobile app and Electron desktop. A stable connection is recommended for multiplayer and voice." },
  { q: "How do voice calls work?", a: "Launch a WebRTC call from the lobby or friend profile. A 15-second ringtone plays; if they answer, bidirectional audio connects via ICE/TURN." },
  { q: "Can I play with friends?", a: "Yes: add friends, invite them to poker or Belote waiting rooms and use table voice chat." },
  { q: "Which Belote variants are available?", a: "Classic, Coinched, Contrée and Modern. The host picks variant, buy-in and target score." },
  { q: "How are mini-games calculated?", a: "Each bet goes to the server which draws the outcome and atomically updates your balance. The client only animates." },
  { q: "How does the leaderboard work?", a: "It aggregates recent activity, tournaments and rank progression. See the blog for detailed criteria." },
  { q: "Are there tournaments?", a: "Yes — structured Texas Hold'em tournaments from the lobby with waiting rooms and a results screen." },
  { q: "Which languages are supported?", a: "French, English, Spanish, Arabic and Ukrainian via the main menu language selector." },
  { q: "Is my data protected?", a: "See our privacy policy. We limit collection to what the service needs and do not sell your data." },
  { q: "Is there an age limit?", a: "The service is for users aged 18 and over. Underage accounts may be suspended." },
  { q: "How do I report a player?", a: "Use the in-game report tool when available, or email support@quantum-bluff.com." },
  { q: "How do I contact the team?", a: "Contact page or support@quantum-bluff.com. Typical response time: 48–72 business hours." },
];

en.home.whatIs = [
  "Quantum Bluff is a social online card and casino platform born from an eight-person team project, defended before a university jury with honours. Since June 1, 2026 it is open to the public: a full entertainment hub where poker, Belote, blackjack and casino mini-games live in one premium dark responsive interface.",
  "Our promise: every win starts with a bluff. Multiplayer Texas Hold'em, friend Belote games, solo Crash, Mines, Lucky Number, retro roulette and slots — all reachable from one unified lobby on web or mobile.",
  "Technical integrity is central: every poker hand, roulette spin and mini-game round is server-validated before display. Chips are internal virtual currency with no real monetary value.",
  "Native social layer: friends, messaging, waiting-room invites, 1v1 and group WebRTC voice, real-time presence and seasonal leaderboards. Accessibility and rank progression support casual and regular players alike.",
  "Whether you read this page, browse Quantum Bluff News or sign up now, you join an ecosystem built to last: monthly updates, new mini-games, community tournaments and ongoing voice improvements. Welcome to the lounge.",
];

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
en.discover.screenshots = [
  {
    src: bacBg,
    title: "Main lobby",
    caption: "Navigate between poker, blackjack, solo games and tournaments from a premium dark lounge.",
  },
  {
    src: bl1Bg,
    title: "Multiplayer tables",
    caption: "Waiting rooms, friend invites and real-time Texas Hold'em launches.",
  },
  {
    src: ba1Bg,
    title: "Solo casino",
    caption: "Mini-games hub: Crash, Mines, wheel of fortune and retro classics.",
  },
  {
    src: bac2Bg,
    title: "Profile & progression",
    caption: "Balance, rank, stats and daily rewards from the main menu.",
  },
];
en.news.articles = mergeNewsArticles(enBaseNewsArticles, "en");


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

const contentByLocale: Record<MarketingLocale, SiteContent> = {
  fr,
  en,
  es,
  ar,
  uk,
};

export function getSiteContent(locale: string): SiteContent {
  const loc = resolveMarketingLocale(locale);
  const content = contentByLocale[loc];
  return {
    ...content,
    responsibleGaming: content.responsibleGaming ?? (loc === "fr" ? responsibleGamingFr : responsibleGamingEn),
  };
}

export function getNewsArticle(slug: string, locale: string): NewsArticle | undefined {
  return getSiteContent(locale).news.articles.find((a) => a.slug === slug);
}
