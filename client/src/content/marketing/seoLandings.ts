import type { FaqItem } from "./siteContent";
import { resolveMarketingLocale } from "./resolveMarketingLocale";
import pokerImg from "../../assets/games/poker.webp";
import beloteImg from "../../assets/games/belote.webp";
import blackjackImg from "../../assets/games/blackjack.webp";
import rouletteImg from "../../assets/games/roulette.webp";
import slotImg from "../../assets/games/slot.webp";
import crashImg from "../../assets/games/crash.webp";
import minesImg from "../../assets/games/mines.webp";

export type SeoGameSlug =
  | "poker"
  | "belote"
  | "blackjack"
  | "roulette"
  | "slots"
  | "crash"
  | "mines";

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
  roulette: {
    path: "/online-roulette",
    image: rouletteImg,
    imageAlt: "Roulette européenne rétro sur Quantum Bluff",
    metaTitle: "Roulette en ligne gratuite | Roulette européenne — Quantum Bluff",
    metaDescription:
      "Jouez à la roulette en ligne sur Quantum Bluff : roulette européenne, mises intérieures et extérieures, thème casino rétro et jetons virtuels. Gratuit, sans argent réel.",
    heroTitle: "Roulette en ligne",
    heroSubtitle:
      "Roulette européenne au salon casino rétro — rouge, noir, pair, impair et pleins : chaque tirage est validé côté serveur avec des jetons virtuels.",
    descriptionTitle: "Roulette social sur Quantum Bluff",
    description: [
      "Quantum Bluff propose une roulette européenne intégrée au hub casino rétro : ambiance vintage, animation fluide et retour instantané vers le lobby. Les mises intérieures (numéro plein, cheval, transversale) et extérieures (rouge/noir, pair/impair, douzaines) sont toutes disponibles.",
      "Chaque spin est généré et validé côté serveur avant d'être affiché. Les gains en jetons virtuels sont crédités automatiquement sur votre portefeuille, avec historique des parties pour suivre vos sessions.",
      "Un mode tutoriel guidé depuis le lobby vous aide à découvrir les types de paris. Idéal pour une pause rapide entre deux parties de poker ou de Belote, sans quitter l'univers Quantum Bluff.",
    ],
    rulesTitle: "Règles de la roulette sur Quantum Bluff",
    rules: [
      "La roulette européenne compte 37 cases : numéros 1 à 36 et un zéro (0).",
      "Placez vos mises sur le tapis avant le lancement de la roue : numéro plein, cheval, transversale, carré, sixain, colonne, douzaine, rouge/noir, pair/impair, manque/passe.",
      "Le croupier virtuel lance la bille ; le numéro gagnant est tiré côté serveur et affiché avec animation synchronisée.",
      "Les gains dépendent du type de pari : un plein paie 35:1, rouge/noir et pair/impair paient 1:1, etc.",
      "Les mises sont en jetons virtuels (pas de 10), avec limites min/max affichées à l'écran.",
      "Aucune valeur monétaire réelle n'est en jeu : divertissement social uniquement.",
    ],
    faqTitle: "FAQ — Roulette en ligne sur Quantum Bluff",
    faq: [
      {
        q: "Quel type de roulette est disponible ?",
        a: "Roulette européenne à 37 cases (un seul zéro), dans le salon casino rétro du lobby.",
      },
      {
        q: "La roulette est-elle gratuite ?",
        a: "Oui. Vous jouez avec des jetons virtuels offerts à l'inscription et via les récompenses quotidiennes.",
      },
      {
        q: "Les tirages sont-ils équitables ?",
        a: "Oui. Chaque résultat est généré et validé côté serveur avant affichage, sans manipulation côté client.",
      },
      {
        q: "Y a-t-il un tutoriel ?",
        a: "Oui. Un mode tutoriel guidé est accessible depuis le lobby pour apprendre les types de paris pas à pas.",
      },
      {
        q: "Puis-je jouer sur mobile ?",
        a: "Oui. La roulette est responsive et optimisée pour le tactile sur navigateur et application mobile.",
      },
    ],
    ctaTitle: "Faites tourner la roue",
    ctaBody: "Créez votre compte gratuitement et lancez un spin à la roulette européenne.",
  },
  slots: {
    path: "/online-slots",
    image: slotImg,
    imageAlt: "Machine à sous vintage sur Quantum Bluff",
    metaTitle: "Machine à sous en ligne gratuite | Slots rétro — Quantum Bluff",
    metaDescription:
      "Jouez aux machines à sous en ligne sur Quantum Bluff : slot vintage, symboles classiques, tirages serveur et jetons virtuels. Casino social gratuit, sans argent réel.",
    heroTitle: "Machine à sous en ligne",
    heroSubtitle:
      "Slot machine vintage au cœur du casino rétro — symboles néon, tirages validés serveur et sessions express entre deux parties de cartes.",
    descriptionTitle: "Slots social sur Quantum Bluff",
    description: [
      "Quantum Bluff propose une machine à sous au style casino vintage : symboles classiques, effets lumineux et interface immersive dans le hub rétro. Chaque spin est validé côté serveur pour garantir des résultats équitables.",
      "Les gains en jetons virtuels sont calculés automatiquement selon les combinaisons alignées. L'historique portefeuille trace chaque partie pour un suivi transparent de vos sessions.",
      "Parfait pour une pause rapide : quelques spins entre deux mains de poker, sans quitter l'écosystème Quantum Bluff ni miser d'argent réel.",
    ],
    rulesTitle: "Comment jouer aux slots sur Quantum Bluff",
    rules: [
      "Choisissez votre mise en jetons virtuels (limites affichées à l'écran) puis lancez le spin.",
      "Les rouleaux s'arrêtent sur une combinaison de symboles déterminée côté serveur.",
      "Les alignements gagnants (lignes, paires, symboles bonus) déclenchent des gains selon le tableau des payouts.",
      "Les jetons gagnés sont crédités instantanément sur votre portefeuille virtuel.",
      "Aucun dépôt ni retrait d'argent réel : monnaie interne uniquement.",
      "Le jeu est accessible depuis le hub casino rétro du lobby après connexion.",
    ],
    faqTitle: "FAQ — Machine à sous sur Quantum Bluff",
    faq: [
      {
        q: "Les slots sont-ils gratuits ?",
        a: "Oui. Vous jouez avec des jetons virtuels sans valeur monétaire, obtenus à l'inscription et via les récompenses quotidiennes.",
      },
      {
        q: "Les résultats sont-ils truqués ?",
        a: "Non. Chaque tirage est généré et validé côté serveur avant d'être affiché au client.",
      },
      {
        q: "Quel style de machine à sous ?",
        a: "Une slot vintage au thème casino rétro, avec symboles classiques et effets néon, intégrée au salon Quantum Bluff.",
      },
      {
        q: "Puis-je jouer sur mobile ?",
        a: "Oui. L'interface est responsive et optimisée pour le tactile sur navigateur et application.",
      },
      {
        q: "Quantum Bluff est-il un casino réglementé ?",
        a: "Non. C'est une plateforme de divertissement social. Aucun gain d'argent réel n'est possible.",
      },
    ],
    ctaTitle: "Tentez votre chance",
    ctaBody: "Inscrivez-vous et lancez vos premiers spins sur la machine à sous vintage.",
  },
  crash: {
    path: "/online-crash-game",
    image: crashImg,
    imageAlt: "Jeu Crash multijoueur sur Quantum Bluff",
    metaTitle: "Crash game en ligne gratuit | Multiplicateur — Quantum Bluff",
    metaDescription:
      "Jouez au Crash en ligne sur Quantum Bluff : multiplicateur en temps réel, cash out, rounds serveur et jetons virtuels. Mini-jeu social gratuit, sans argent réel.",
    heroTitle: "Crash game en ligne",
    heroSubtitle:
      "Montez le multiplicateur et encaissez avant le crash — chaque round est validé côté serveur avec animation temps réel synchronisée.",
    descriptionTitle: "Crash social sur Quantum Bluff",
    description: [
      "Le Crash est un mini-jeu solo où un multiplicateur grimpe en continu jusqu'à un point de crash imprévisible. Placez votre mise, suivez la courbe et encaissez (cash out) avant que le multiplicateur ne s'effondre.",
      "Chaque round est entièrement géré côté serveur : point de crash, timing et payouts calculés avant affichage. Les mises vont de 10 à 500 jetons virtuels, avec historique portefeuille pour chaque session.",
      "Intégré au hub Quick Solo du lobby, le Crash offre des sessions express entre deux parties de cartes — fun, rapide et sans argent réel.",
    ],
    rulesTitle: "Règles du Crash sur Quantum Bluff",
    rules: [
      "Placez une mise en jetons virtuels (10 à 500, pas de 10) avant le début du round.",
      "Le multiplicateur démarre à 1,00× et monte progressivement.",
      "Cliquez sur Cash Out pour encaisser : gain = mise × multiplicateur au moment du cash out.",
      "Si le multiplicateur crash avant votre cash out, vous perdez la mise du round.",
      "Le point de crash est déterminé côté serveur avant le début du round — le client affiche uniquement le résultat.",
      "Un historique des rounds récents est visible pour analyser vos sessions.",
    ],
    faqTitle: "FAQ — Crash game sur Quantum Bluff",
    faq: [
      {
        q: "Comment fonctionne le Crash ?",
        a: "Un multiplicateur monte jusqu'à un crash aléatoire. Encaissez avant le crash pour gagner mise × multiplicateur.",
      },
      {
        q: "Le jeu est-il gratuit ?",
        a: "Oui. Vous misez des jetons virtuels sans valeur monétaire.",
      },
      {
        q: "Le crash est-il manipulable ?",
        a: "Non. Le point de crash est calculé côté serveur avant le round et ne peut pas être modifié par le client.",
      },
      {
        q: "Quelle est la mise minimale ?",
        a: "10 jetons virtuels, par pas de 10, jusqu'à 500 jetons maximum par round.",
      },
      {
        q: "Où accéder au Crash ?",
        a: "Depuis le hub Quick Solo du lobby, après connexion à votre compte Quantum Bluff.",
      },
    ],
    ctaTitle: "Visez le cash out",
    ctaBody: "Créez votre compte et testez le Crash — encaissez au bon moment avant l'effondrement.",
  },
  mines: {
    path: "/online-mines-game",
    image: minesImg,
    imageAlt: "Jeu Mines sur Quantum Bluff",
    metaTitle: "Mines game en ligne gratuit | Grille risque/récompense — Quantum Bluff",
    metaDescription:
      "Jouez à Mines en ligne sur Quantum Bluff : grille risque/récompense, révélez les cases, évitez les mines et jetons virtuels. Mini-jeu social gratuit, sans argent réel.",
    heroTitle: "Mines game en ligne",
    heroSubtitle:
      "Révélez les cases une par une sans toucher une mine — chaque case sûre fait grimper votre gain jusqu'au cash out.",
    descriptionTitle: "Mines social sur Quantum Bluff",
    description: [
      "Mines est un mini-jeu de grille où vous choisissez le nombre de mines cachées, placez votre mise et révélez des cases une par une. Chaque case sûre augmente le multiplicateur ; touchez une mine et vous perdez la mise.",
      "Le placement des mines et les payouts sont entièrement calculés côté serveur. Le client illustre l'état de la grille et les gains potentiels, sans influencer le résultat.",
      "Accessible depuis le hub Quick Solo, Mines complète l'offre casino express de Quantum Bluff — sessions courtes, stratégie risque/récompense et jetons virtuels uniquement.",
    ],
    rulesTitle: "Règles du Mines sur Quantum Bluff",
    rules: [
      "Choisissez le nombre de mines sur la grille (plus de mines = multiplicateur plus élevé mais risque accru).",
      "Placez votre mise en jetons virtuels (10 à 500, pas de 10).",
      "Révélez les cases une par une : chaque gemme sûre augmente le gain potentiel.",
      "Cash Out à tout moment pour encaisser le multiplicateur actuel.",
      "Si vous révélez une mine, le round est perdu et la mise est déduite.",
      "Le placement des mines est tiré côté serveur au début du round — équitable et non manipulable.",
    ],
    faqTitle: "FAQ — Mines game sur Quantum Bluff",
    faq: [
      {
        q: "Comment gagner au Mines ?",
        a: "Révélez un maximum de cases sûres puis encaissez (Cash Out) avant de toucher une mine.",
      },
      {
        q: "Le jeu est-il gratuit ?",
        a: "Oui. Mises en jetons virtuels sans valeur monétaire réelle.",
      },
      {
        q: "Les mines sont-elles truquées ?",
        a: "Non. Le placement est généré côté serveur au début de chaque round.",
      },
      {
        q: "Puis-je choisir le nombre de mines ?",
        a: "Oui. Plus il y a de mines, plus le multiplicateur potentiel est élevé — mais le risque augmente aussi.",
      },
      {
        q: "Mines fonctionne-t-il sur mobile ?",
        a: "Oui. La grille est responsive et optimisée pour le tactile.",
      },
    ],
    ctaTitle: "Évitez les mines",
    ctaBody: "Inscrivez-vous et lancez votre première grille Mines depuis le lobby.",
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
  roulette: {
    path: "/online-roulette",
    image: rouletteImg,
    imageAlt: "Retro European roulette on Quantum Bluff",
    metaTitle: "Play Roulette Online Free | European Roulette — Quantum Bluff",
    metaDescription:
      "Play roulette online on Quantum Bluff: European roulette, inside and outside bets, retro casino theme and virtual chips. Free social gaming, no real money.",
    heroTitle: "Roulette online",
    heroSubtitle:
      "European roulette in the retro casino lounge — red, black, odd, even and straight bets: every spin is server-validated with virtual chips.",
    descriptionTitle: "Social roulette on Quantum Bluff",
    description: [
      "Quantum Bluff offers European roulette in the retro casino hub: vintage atmosphere, smooth animation and instant return to the lobby. Inside bets (straight, split, street) and outside bets (red/black, odd/even, dozens) are all available.",
      "Every spin is generated and validated server-side before display. Virtual chip winnings are credited automatically to your wallet, with game history to track your sessions.",
      "A guided tutorial from the lobby helps you learn bet types. Perfect for a quick break between poker or Belote games without leaving the Quantum Bluff universe.",
    ],
    rulesTitle: "Roulette rules on Quantum Bluff",
    rules: [
      "European roulette has 37 pockets: numbers 1–36 and a single zero (0).",
      "Place bets on the layout before the wheel spins: straight, split, street, corner, six-line, column, dozen, red/black, odd/even, low/high.",
      "The virtual dealer launches the ball; the winning number is drawn server-side and shown with synchronized animation.",
      "Payouts depend on bet type: straight pays 35:1, red/black and odd/even pay 1:1, etc.",
      "Bets use virtual chips (in steps of 10) with min/max limits shown on screen.",
      "No real money is involved — social entertainment only.",
    ],
    faqTitle: "FAQ — Online roulette on Quantum Bluff",
    faq: [
      {
        q: "What type of roulette is available?",
        a: "European roulette with 37 pockets (single zero), in the lobby retro casino lounge.",
      },
      {
        q: "Is roulette free?",
        a: "Yes. You play with virtual chips granted at signup and through daily rewards.",
      },
      {
        q: "Are spins fair?",
        a: "Yes. Every result is generated and validated server-side before display — no client-side manipulation.",
      },
      {
        q: "Is there a tutorial?",
        a: "Yes. A guided tutorial is available from the lobby to learn bet types step by step.",
      },
      {
        q: "Can I play on mobile?",
        a: "Yes. Roulette is responsive and touch-optimized on browser and mobile app.",
      },
    ],
    ctaTitle: "Spin the wheel",
    ctaBody: "Create your free account and launch a European roulette spin.",
  },
  slots: {
    path: "/online-slots",
    image: slotImg,
    imageAlt: "Vintage slot machine on Quantum Bluff",
    metaTitle: "Play Slots Online Free | Retro Slot Machine — Quantum Bluff",
    metaDescription:
      "Play slots online on Quantum Bluff: vintage slot machine, classic symbols, server-validated spins and virtual chips. Free social casino, no real money.",
    heroTitle: "Online slots",
    heroSubtitle:
      "Vintage slot machine at the heart of the retro casino — neon symbols, server-validated spins and quick sessions between card games.",
    descriptionTitle: "Social slots on Quantum Bluff",
    description: [
      "Quantum Bluff features a vintage-style slot machine: classic symbols, light effects and an immersive interface in the retro hub. Every spin is server-validated for fair outcomes.",
      "Virtual chip winnings are calculated automatically based on aligned combinations. Wallet history tracks every game for transparent session monitoring.",
      "Perfect for a quick break: a few spins between poker hands without leaving the Quantum Bluff ecosystem or wagering real money.",
    ],
    rulesTitle: "How to play slots on Quantum Bluff",
    rules: [
      "Choose your virtual chip bet (limits shown on screen) then launch the spin.",
      "Reels stop on a symbol combination determined server-side.",
      "Winning alignments (lines, pairs, bonus symbols) trigger payouts per the paytable.",
      "Won chips are credited instantly to your virtual wallet.",
      "No real-money deposits or withdrawals — internal currency only.",
      "Access from the retro casino hub in the lobby after signing in.",
    ],
    faqTitle: "FAQ — Slot machine on Quantum Bluff",
    faq: [
      {
        q: "Are slots free?",
        a: "Yes. You play with virtual chips with no monetary value, earned at signup and through daily rewards.",
      },
      {
        q: "Are results rigged?",
        a: "No. Every spin is generated and validated server-side before display.",
      },
      {
        q: "What style of slot machine?",
        a: "A vintage retro casino slot with classic symbols and neon effects, integrated into the Quantum Bluff lounge.",
      },
      {
        q: "Can I play on mobile?",
        a: "Yes. The interface is responsive and touch-optimized on browser and app.",
      },
      {
        q: "Is Quantum Bluff a regulated casino?",
        a: "No. It is a social entertainment platform. No real-money prizes are possible.",
      },
    ],
    ctaTitle: "Try your luck",
    ctaBody: "Sign up and launch your first spins on the vintage slot machine.",
  },
  crash: {
    path: "/online-crash-game",
    image: crashImg,
    imageAlt: "Crash game on Quantum Bluff",
    metaTitle: "Play Crash Game Online Free | Multiplier — Quantum Bluff",
    metaDescription:
      "Play Crash online on Quantum Bluff: real-time multiplier, cash out, server rounds and virtual chips. Free social mini-game, no real money.",
    heroTitle: "Crash game online",
    heroSubtitle:
      "Ride the multiplier and cash out before the crash — every round is server-validated with real-time synchronized animation.",
    descriptionTitle: "Social Crash on Quantum Bluff",
    description: [
      "Crash is a solo mini-game where a multiplier climbs continuously until an unpredictable crash point. Place your bet, watch the curve and cash out before the multiplier collapses.",
      "Every round is fully server-managed: crash point, timing and payouts calculated before display. Bets range from 10 to 500 virtual chips, with wallet history for each session.",
      "Integrated into the Quick Solo hub in the lobby, Crash offers express sessions between card games — fun, fast and no real money.",
    ],
    rulesTitle: "Crash rules on Quantum Bluff",
    rules: [
      "Place a virtual chip bet (10–500, in steps of 10) before the round starts.",
      "The multiplier starts at 1.00× and rises steadily.",
      "Click Cash Out to collect: winnings = bet × multiplier at cash-out moment.",
      "If the multiplier crashes before you cash out, you lose the round bet.",
      "The crash point is determined server-side before the round starts — the client only displays the result.",
      "A history of recent rounds is visible to analyze your sessions.",
    ],
    faqTitle: "FAQ — Crash game on Quantum Bluff",
    faq: [
      {
        q: "How does Crash work?",
        a: "A multiplier rises until a random crash. Cash out before the crash to win bet × multiplier.",
      },
      {
        q: "Is the game free?",
        a: "Yes. You bet virtual chips with no monetary value.",
      },
      {
        q: "Can the crash be manipulated?",
        a: "No. The crash point is calculated server-side before the round and cannot be changed by the client.",
      },
      {
        q: "What is the minimum bet?",
        a: "10 virtual chips, in steps of 10, up to 500 chips maximum per round.",
      },
      {
        q: "Where do I access Crash?",
        a: "From the Quick Solo hub in the lobby, after signing into your Quantum Bluff account.",
      },
    ],
    ctaTitle: "Aim for cash out",
    ctaBody: "Create your account and try Crash — cash out at the right moment before the drop.",
  },
  mines: {
    path: "/online-mines-game",
    image: minesImg,
    imageAlt: "Mines game on Quantum Bluff",
    metaTitle: "Play Mines Game Online Free | Risk/Reward Grid — Quantum Bluff",
    metaDescription:
      "Play Mines online on Quantum Bluff: risk/reward grid, reveal tiles, avoid mines and virtual chips. Free social mini-game, no real money.",
    heroTitle: "Mines game online",
    heroSubtitle:
      "Reveal tiles one by one without hitting a mine — each safe tile increases your winnings until you cash out.",
    descriptionTitle: "Social Mines on Quantum Bluff",
    description: [
      "Mines is a grid mini-game where you choose the number of hidden mines, place your bet and reveal tiles one by one. Each safe tile raises the multiplier; hit a mine and you lose the bet.",
      "Mine placement and payouts are fully calculated server-side. The client shows grid state and potential winnings without influencing the outcome.",
      "Available from the Quick Solo hub, Mines completes Quantum Bluff's express casino offer — short sessions, risk/reward strategy and virtual chips only.",
    ],
    rulesTitle: "Mines rules on Quantum Bluff",
    rules: [
      "Choose the number of mines on the grid (more mines = higher multiplier but greater risk).",
      "Place your virtual chip bet (10–500, in steps of 10).",
      "Reveal tiles one by one: each safe gem increases potential winnings.",
      "Cash Out anytime to collect the current multiplier.",
      "If you reveal a mine, the round is lost and the bet is deducted.",
      "Mine placement is drawn server-side at round start — fair and non-manipulable.",
    ],
    faqTitle: "FAQ — Mines game on Quantum Bluff",
    faq: [
      {
        q: "How do I win at Mines?",
        a: "Reveal as many safe tiles as possible then cash out before hitting a mine.",
      },
      {
        q: "Is the game free?",
        a: "Yes. Bets use virtual chips with no real monetary value.",
      },
      {
        q: "Are mines rigged?",
        a: "No. Placement is generated server-side at the start of each round.",
      },
      {
        q: "Can I choose the number of mines?",
        a: "Yes. More mines mean higher potential multipliers — but risk increases too.",
      },
      {
        q: "Does Mines work on mobile?",
        a: "Yes. The grid is responsive and touch-optimized.",
      },
    ],
    ctaTitle: "Avoid the mines",
    ctaBody: "Sign up and launch your first Mines grid from the lobby.",
  },
};

export function getSeoLanding(slug: SeoGameSlug, locale: string): SeoLandingContent {
  const pack = resolveMarketingLocale(locale) === "fr" ? fr : en;
  return pack[slug];
}
