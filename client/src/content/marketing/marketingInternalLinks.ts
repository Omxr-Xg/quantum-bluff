import type { SeoGameSlug } from "./seoLandings";
import { resolveMarketingLocale } from "./resolveMarketingLocale";

export const GAME_SEO_PATHS: Record<string, string> = {
  holdem: "/play-poker-online",
  belote: "/online-belote",
  blackjack: "/online-blackjack",
  roulette: "/online-roulette",
  slots: "/online-slots",
  crash: "/online-crash-game",
  mines: "/online-mines-game",
  "lucky-number": "/online-lucky-number",
  wheel: "/online-wheel-of-fortune",
};

const ALL_LANDING_SLUGS: SeoGameSlug[] = [
  "poker",
  "belote",
  "blackjack",
  "roulette",
  "slots",
  "crash",
  "mines",
  "luckyNumber",
  "wheel",
];

const LANDING_PATHS: Record<SeoGameSlug, string> = {
  poker: "/play-poker-online",
  belote: "/online-belote",
  blackjack: "/online-blackjack",
  roulette: "/online-roulette",
  slots: "/online-slots",
  crash: "/online-crash-game",
  mines: "/online-mines-game",
  luckyNumber: "/online-lucky-number",
  wheel: "/online-wheel-of-fortune",
};

const LANDING_LABELS: Record<SeoGameSlug, { fr: string; en: string }> = {
  poker: { fr: "Poker en ligne", en: "Online poker" },
  belote: { fr: "Belote en ligne", en: "Online Belote" },
  blackjack: { fr: "Blackjack en ligne", en: "Online blackjack" },
  roulette: { fr: "Roulette en ligne", en: "Online roulette" },
  slots: { fr: "Machines à sous", en: "Online slots" },
  crash: { fr: "Crash", en: "Crash game" },
  mines: { fr: "Mines", en: "Mines game" },
  luckyNumber: { fr: "Lucky Number", en: "Lucky Number" },
  wheel: { fr: "Roue de la fortune", en: "Wheel of Fortune" },
};

type GuideLink = { slug: string; fr: string; en: string };

const GUIDES_BY_GAME: Record<SeoGameSlug, GuideLink[]> = {
  poker: [
    { slug: "guide-texas-holdem-debuter", fr: "Guide débutant Texas Hold'em", en: "Texas Hold'em beginner guide" },
    { slug: "guide-poker-probabilites-bluff", fr: "Probabilités et bluffs", en: "Odds and bluffing" },
    { slug: "guide-tournois-salons-poker", fr: "Tournois et salles privées", en: "Tournaments and private rooms" },
  ],
  belote: [
    { slug: "guide-belote-salons", fr: "Belote : salons et règles", en: "Belote rooms and rules" },
    { slug: "guide-belote-histoire-variantes", fr: "Histoire et variantes", en: "History and variants" },
  ],
  blackjack: [
    { slug: "guide-blackjack-regles-strategie", fr: "Règles et stratégie 21", en: "Blackjack rules and strategy" },
    { slug: "guide-debutant-quantum-bluff", fr: "Guide complet débutant", en: "Complete beginner guide" },
  ],
  roulette: [
    { slug: "guide-roulette-types-mises", fr: "Types de mises roulette", en: "Roulette bet types" },
    { slug: "guide-debutant-quantum-bluff", fr: "Guide complet débutant", en: "Complete beginner guide" },
  ],
  slots: [
    { slug: "guide-slots-roue-fortune", fr: "Slots et roue de la fortune", en: "Slots and wheel of fortune" },
  ],
  crash: [
    { slug: "guide-crash-mines-strategie", fr: "Crash & Mines : stratégie", en: "Crash & Mines strategy" },
  ],
  mines: [
    { slug: "guide-crash-mines-strategie", fr: "Crash & Mines : stratégie", en: "Crash & Mines strategy" },
  ],
  luckyNumber: [
    { slug: "guide-slots-roue-fortune", fr: "Lucky Number et mini-jeux", en: "Lucky Number and mini-games" },
  ],
  wheel: [
    { slug: "guide-slots-roue-fortune", fr: "Roue et slots rétro", en: "Wheel and retro slots" },
  ],
};

export const FEATURED_GUIDES: GuideLink[] = [
  { slug: "guide-debutant-quantum-bluff", fr: "Guide complet débutant", en: "Complete beginner guide" },
  { slug: "guide-poker-probabilites-bluff", fr: "Probabilités et bluffs au poker", en: "Poker odds and bluffing" },
  { slug: "guide-blackjack-regles-strategie", fr: "Blackjack : règles et stratégie", en: "Blackjack rules and strategy" },
  { slug: "guide-belote-histoire-variantes", fr: "Belote : histoire et variantes", en: "Belote history and variants" },
  { slug: "guide-crash-mines-strategie", fr: "Crash & Mines", en: "Crash & Mines strategy" },
  { slug: "guide-tournois-salons-poker", fr: "Tournois et salles privées", en: "Tournaments and private rooms" },
];

export function getSeoRelatedGuides(game: SeoGameSlug, locale: string) {
  const isFr = resolveMarketingLocale(locale) === "fr";
  return GUIDES_BY_GAME[game].map((g) => ({
    to: `/news/${g.slug}`,
    label: isFr ? g.fr : g.en,
  }));
}

export function getOtherLandings(game: SeoGameSlug, locale: string) {
  const isFr = resolveMarketingLocale(locale) === "fr";
  return ALL_LANDING_SLUGS.filter((s) => s !== game).map((s) => ({
    to: LANDING_PATHS[s],
    label: isFr ? LANDING_LABELS[s].fr : LANDING_LABELS[s].en,
  }));
}

export function getFeaturedGuides(locale: string) {
  const isFr = resolveMarketingLocale(locale) === "fr";
  return FEATURED_GUIDES.map((g) => ({
    to: `/news/${g.slug}`,
    label: isFr ? g.fr : g.en,
  }));
}

export function getAllLandings(locale: string) {
  const isFr = resolveMarketingLocale(locale) === "fr";
  return ALL_LANDING_SLUGS.map((s) => ({
    to: LANDING_PATHS[s],
    label: isFr ? LANDING_LABELS[s].fr : LANDING_LABELS[s].en,
  }));
}
