/**
 * Script deterministe d'une main Hold'em pour le tutoriel A a Z.
 *
 * Aucune logique reseau : la TutorialGame consomme directement ce tableau
 * d'etats successifs. Les cartes et actions du bot sont choisies pour
 * faire vivre tous les concepts (positions, blindes, preflop / flop / turn /
 * river, tirage couleur, paire, deux paires, showdown, classements).
 *
 * Hero (siege 0) = bouton « dealer » (BTN, donc small blind en heads-up).
 * Bot   (siege 1) = grosse blinde (BB), agit en dernier preflop.
 *
 * En heads-up Texas Hold'em : le bouton poste la SB et parle en premier
 * preflop, puis en dernier sur les streets suivantes. On choisit volontairement
 * cette configuration pour que le tutoriel mette le joueur dans la position
 * la plus active possible.
 */

export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Card = {
  suit: Suit;
  /** Valeur en notation classique : "A","K","Q","J","10","9",…,"2". */
  value: string;
};

export type HandRanking =
  | "highCard"
  | "pair"
  | "twoPair"
  | "threeKind"
  | "straight"
  | "flush"
  | "fullHouse"
  | "fourKind"
  | "straightFlush"
  | "royalFlush";

export type TutorialHighlight =
  | null
  | "table"
  | "pot"
  | "board"
  | "heroCards"
  | "botCards"
  | "actions"
  | "blinds"
  | "dealer"
  | "heroSeat"
  | "botSeat"
  | "rankings";

export type ExpectedAction =
  | "next"
  | "fold"
  | "check"
  | "call"
  | "raise"
  | "bet"
  | "finish";

export type TutorialStep = {
  /** Cle i18n du titre : `tutorial.game.steps.{key}.title`. */
  key: string;
  /** Phase logique (utile pour le badge en haut de la bulle). */
  phase:
    | "intro"
    | "seats"
    | "blinds"
    | "deal"
    | "preflop"
    | "flop"
    | "turn"
    | "river"
    | "showdown"
    | "outro";
  /** Mise au pot avant action du joueur. */
  pot: number;
  heroChips: number;
  botChips: number;
  /** Mise courante deja committee dans le pot sur la street en cours. */
  heroBet: number;
  botBet: number;
  /** Cartes communes revelees a ce stade (0, 3, 4 ou 5). */
  board: Card[];
  /** Mains privees revelees a l'ecran (avant showdown : seulement hero). */
  showHeroCards: boolean;
  showBotCards: boolean;
  /** Element a mettre en surbrillance par le spotlight. */
  highlight: TutorialHighlight;
  /** Action attendue du joueur pour passer a l'etape suivante. */
  expectedAction: ExpectedAction;
  /** Si `expectedAction === 'raise'|'bet'`, montant force a clicker. */
  raiseTo?: number;
  /**
   * Si renseigne, le panneau d'action propose un seul bouton aux montants
   * deterministes (les autres sont grises) — empeche le joueur de devier
   * du script.
   */
  callAmount?: number;
  /** Sous-titre court (cle i18n) pour le badge phase. */
  phaseLabelKey: string;
};

const HERO_HAND: [Card, Card] = [
  { suit: "hearts", value: "A" },
  { suit: "hearts", value: "K" },
];

const BOT_HAND: [Card, Card] = [
  { suit: "spades", value: "K" },
  { suit: "spades", value: "Q" },
];

const FLOP: [Card, Card, Card] = [
  { suit: "hearts", value: "2" },
  { suit: "hearts", value: "7" },
  { suit: "clubs", value: "K" },
];
const TURN: Card = { suit: "hearts", value: "J" };
const RIVER: Card = { suit: "spades", value: "3" };

const HERO_START = 1000;
const BOT_START = 1000;
const SB = 10;
const BB = 20;

/**
 * Pre-flop : hero (BTN/SB) doit completer la BB ou relancer.
 * Le script force la relance a 60 (3xBB) pour enseigner « 3-bet open ».
 */
const PREFLOP_RAISE = 60;
/** Flop : hero bet 80 apres check du bot. */
const FLOP_BET = 80;
/** Turn : hero raise apres bet 100 du bot. */
const TURN_RAISE_TO = 350;
/** River : hero value bet 400. */
const RIVER_BET = 400;

/**
 * Construit le tableau d'etapes. Chaque etape decrit l'etat de la table
 * APRES son texte pedagogique mais AVANT l'action attendue du joueur.
 */
export const TUTORIAL_STEPS: TutorialStep[] = [
  // 0 — intro
  {
    key: "intro",
    phase: "intro",
    pot: 0,
    heroChips: HERO_START,
    botChips: BOT_START,
    heroBet: 0,
    botBet: 0,
    board: [],
    showHeroCards: false,
    showBotCards: false,
    highlight: null,
    expectedAction: "next",
    phaseLabelKey: "phase.intro",
  },
  // 1 — sieges + bouton
  {
    key: "seats",
    phase: "seats",
    pot: 0,
    heroChips: HERO_START,
    botChips: BOT_START,
    heroBet: 0,
    botBet: 0,
    board: [],
    showHeroCards: false,
    showBotCards: false,
    highlight: "table",
    expectedAction: "next",
    phaseLabelKey: "phase.seats",
  },
  // 2 — dealer button explanation
  {
    key: "dealer",
    phase: "seats",
    pot: 0,
    heroChips: HERO_START,
    botChips: BOT_START,
    heroBet: 0,
    botBet: 0,
    board: [],
    showHeroCards: false,
    showBotCards: false,
    highlight: "dealer",
    expectedAction: "next",
    phaseLabelKey: "phase.seats",
  },
  // 3 — blindes posees
  {
    key: "blinds",
    phase: "blinds",
    pot: SB + BB,
    heroChips: HERO_START - SB,
    botChips: BOT_START - BB,
    heroBet: SB,
    botBet: BB,
    board: [],
    showHeroCards: false,
    showBotCards: false,
    highlight: "blinds",
    expectedAction: "next",
    phaseLabelKey: "phase.blinds",
  },
  // 4 — distribution des hole cards
  {
    key: "deal",
    phase: "deal",
    pot: SB + BB,
    heroChips: HERO_START - SB,
    botChips: BOT_START - BB,
    heroBet: SB,
    botBet: BB,
    board: [],
    showHeroCards: true,
    showBotCards: false,
    highlight: "heroCards",
    expectedAction: "next",
    phaseLabelKey: "phase.deal",
  },
  // 5 — explication des actions preflop
  {
    key: "preflopExplain",
    phase: "preflop",
    pot: SB + BB,
    heroChips: HERO_START - SB,
    botChips: BOT_START - BB,
    heroBet: SB,
    botBet: BB,
    board: [],
    showHeroCards: true,
    showBotCards: false,
    highlight: "actions",
    expectedAction: "next",
    phaseLabelKey: "phase.preflop",
  },
  // 6 — action hero : raise to 60
  {
    key: "preflopRaise",
    phase: "preflop",
    pot: SB + BB,
    heroChips: HERO_START - SB,
    botChips: BOT_START - BB,
    heroBet: SB,
    botBet: BB,
    board: [],
    showHeroCards: true,
    showBotCards: false,
    highlight: "actions",
    expectedAction: "raise",
    raiseTo: PREFLOP_RAISE,
    phaseLabelKey: "phase.preflop",
  },
  // 7 — bot call → pot 120, fin preflop
  {
    key: "preflopBotCalls",
    phase: "preflop",
    pot: PREFLOP_RAISE * 2,
    heroChips: HERO_START - PREFLOP_RAISE,
    botChips: BOT_START - PREFLOP_RAISE,
    heroBet: 0,
    botBet: 0,
    board: [],
    showHeroCards: true,
    showBotCards: false,
    highlight: "pot",
    expectedAction: "next",
    phaseLabelKey: "phase.preflop",
  },
  // 8 — flop revealed
  {
    key: "flop",
    phase: "flop",
    pot: PREFLOP_RAISE * 2,
    heroChips: HERO_START - PREFLOP_RAISE,
    botChips: BOT_START - PREFLOP_RAISE,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP],
    showHeroCards: true,
    showBotCards: false,
    highlight: "board",
    expectedAction: "next",
    phaseLabelKey: "phase.flop",
  },
  // 9 — explication top paire + tirage flush
  {
    key: "flopRead",
    phase: "flop",
    pot: PREFLOP_RAISE * 2,
    heroChips: HERO_START - PREFLOP_RAISE,
    botChips: BOT_START - PREFLOP_RAISE,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP],
    showHeroCards: true,
    showBotCards: false,
    highlight: "heroCards",
    expectedAction: "next",
    phaseLabelKey: "phase.flop",
  },
  // 10 — hero bet 80 (apres check du bot)
  {
    key: "flopBet",
    phase: "flop",
    pot: PREFLOP_RAISE * 2,
    heroChips: HERO_START - PREFLOP_RAISE,
    botChips: BOT_START - PREFLOP_RAISE,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP],
    showHeroCards: true,
    showBotCards: false,
    highlight: "actions",
    expectedAction: "bet",
    raiseTo: FLOP_BET,
    phaseLabelKey: "phase.flop",
  },
  // 11 — bot call → pot 280
  {
    key: "flopBotCalls",
    phase: "flop",
    pot: PREFLOP_RAISE * 2 + FLOP_BET * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP],
    showHeroCards: true,
    showBotCards: false,
    highlight: "pot",
    expectedAction: "next",
    phaseLabelKey: "phase.flop",
  },
  // 12 — turn revealed : Jh → flush completee
  {
    key: "turn",
    phase: "turn",
    pot: PREFLOP_RAISE * 2 + FLOP_BET * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN],
    showHeroCards: true,
    showBotCards: false,
    highlight: "board",
    expectedAction: "next",
    phaseLabelKey: "phase.turn",
  },
  // 13 — explication couleur faite
  {
    key: "turnFlush",
    phase: "turn",
    pot: PREFLOP_RAISE * 2 + FLOP_BET * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN],
    showHeroCards: true,
    showBotCards: false,
    highlight: "heroCards",
    expectedAction: "next",
    phaseLabelKey: "phase.turn",
  },
  // 14 — hero raise to 350 (bot a deja bet 100 → on l'inclut dans le pot affiche)
  {
    key: "turnRaise",
    phase: "turn",
    pot: PREFLOP_RAISE * 2 + FLOP_BET * 2 + 100,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET - 100,
    heroBet: 0,
    botBet: 100,
    board: [...FLOP, TURN],
    showHeroCards: true,
    showBotCards: false,
    highlight: "actions",
    expectedAction: "raise",
    raiseTo: TURN_RAISE_TO,
    callAmount: 100,
    phaseLabelKey: "phase.turn",
  },
  // 15 — bot call → pot 980
  {
    key: "turnBotCalls",
    phase: "turn",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN],
    showHeroCards: true,
    showBotCards: false,
    highlight: "pot",
    expectedAction: "next",
    phaseLabelKey: "phase.turn",
  },
  // 16 — river revealed
  {
    key: "river",
    phase: "river",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: false,
    highlight: "board",
    expectedAction: "next",
    phaseLabelKey: "phase.river",
  },
  // 17 — hero value bet 400
  {
    key: "riverBet",
    phase: "river",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2,
    heroChips: HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    botChips: BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: false,
    highlight: "actions",
    expectedAction: "bet",
    raiseTo: RIVER_BET,
    phaseLabelKey: "phase.river",
  },
  // 18 — bot call → showdown
  {
    key: "riverBotCalls",
    phase: "river",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2 + RIVER_BET * 2,
    heroChips:
      HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    botChips:
      BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: false,
    highlight: "pot",
    expectedAction: "next",
    phaseLabelKey: "phase.river",
  },
  // 19 — showdown : bot reveal
  {
    key: "showdownReveal",
    phase: "showdown",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2 + RIVER_BET * 2,
    heroChips:
      HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    botChips:
      BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: true,
    highlight: "botCards",
    expectedAction: "next",
    phaseLabelKey: "phase.showdown",
  },
  // 20 — rankings ladder
  {
    key: "rankings",
    phase: "showdown",
    pot:
      PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2 + RIVER_BET * 2,
    heroChips:
      HERO_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    botChips:
      BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: true,
    highlight: "rankings",
    expectedAction: "next",
    phaseLabelKey: "phase.showdown",
  },
  // 21 — pot transfere au hero
  {
    key: "showdownWin",
    phase: "showdown",
    pot: 0,
    heroChips:
      HERO_START -
      PREFLOP_RAISE -
      FLOP_BET -
      TURN_RAISE_TO -
      RIVER_BET +
      (PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2 + RIVER_BET * 2),
    botChips:
      BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: true,
    highlight: "heroSeat",
    expectedAction: "next",
    phaseLabelKey: "phase.showdown",
  },
  // 22 — outro
  {
    key: "outro",
    phase: "outro",
    pot: 0,
    heroChips:
      HERO_START -
      PREFLOP_RAISE -
      FLOP_BET -
      TURN_RAISE_TO -
      RIVER_BET +
      (PREFLOP_RAISE * 2 + FLOP_BET * 2 + TURN_RAISE_TO * 2 + RIVER_BET * 2),
    botChips:
      BOT_START - PREFLOP_RAISE - FLOP_BET - TURN_RAISE_TO - RIVER_BET,
    heroBet: 0,
    botBet: 0,
    board: [...FLOP, TURN, RIVER],
    showHeroCards: true,
    showBotCards: true,
    highlight: null,
    expectedAction: "finish",
    phaseLabelKey: "phase.outro",
  },
];

export const TUTORIAL_HERO_HAND = HERO_HAND;
export const TUTORIAL_BOT_HAND = BOT_HAND;
export const TUTORIAL_BLINDS = { sb: SB, bb: BB };

/**
 * Ordre canonique des classements de mains pour l'echelle pedagogique.
 * La main du hero finit en `flush` — c'est ce rang que le composant met
 * en exergue dans l'echelle.
 */
export const HAND_RANKING_LADDER: HandRanking[] = [
  "highCard",
  "pair",
  "twoPair",
  "threeKind",
  "straight",
  "flush",
  "fullHouse",
  "fourKind",
  "straightFlush",
  "royalFlush",
];

export const TUTORIAL_HERO_FINAL_RANK: HandRanking = "flush";
export const TUTORIAL_BOT_FINAL_RANK: HandRanking = "pair";
