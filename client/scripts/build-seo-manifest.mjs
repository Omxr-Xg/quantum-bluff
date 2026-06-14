#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.join(__dirname, "..");
const REPO_ROOT = path.join(CLIENT_ROOT, "..");
const OUT = path.join(CLIENT_ROOT, "scripts", "seo-manifest.json");

const SITE_ORIGIN = "https://www.quantum-bluff.com";

const STATIC_PAGES = {
  "/": {
    title: "Quantum Bluff — Casino social poker, Belote et mini-jeux en ligne",
    description:
      "Texas Hold'em multijoueur, Belote en ligne, tournois, classement mondial et mini-jeux casino solo — jetons virtuels gratuits, sans argent réel.",
    heading: "Quantum Bluff",
    paragraphs: [
      "Quantum Bluff est un casino social en ligne : poker Texas Hold'em, Belote, blackjack, roulette, slots, Crash, Mines et plus encore.",
      "Jetons virtuels gratuits, appels vocaux WebRTC, tournois et classements saisonniers. Inscription gratuite sur www.quantum-bluff.com.",
    ],
  },
  "/discover": {
    title: "Découvrir Quantum Bluff — Quantum Bluff",
    description:
      "Texas Hold'em multijoueur, Belote en ligne, tournois, classement mondial et mini-jeux casino solo — le tout dans une expérience premium.",
    heading: "Découvrir Quantum Bluff",
    paragraphs: [
      "Présentation complète de la plateforme : jeux, fonctionnalités sociales, classements, récompenses et FAQ avant inscription.",
    ],
  },
  "/downloads": {
    title: "Téléchargements — Quantum Bluff (Mac, Windows, Android)",
    description:
      "Télécharge Quantum Bluff pour macOS, Windows et Android. Applications natives gratuites, même compte qu'en ligne.",
    heading: "Téléchargements",
    paragraphs: ["Applications natives macOS, Windows et Android — même compte que la version web."],
  },
  "/news": {
    title: "Quantum Bluff News — Actualités et guides",
    description:
      "Actualités, changelogs et guides de jeu Quantum Bluff : poker, Belote, blackjack, mini-jeux et conseils pour débutants.",
    heading: "Quantum Bluff News",
    paragraphs: ["Guides longs, notes de version et annonces du salon social Quantum Bluff."],
  },
  "/about": {
    title: "À propos — Quantum Bluff",
    description:
      "Mission, vision et engagement Quantum Bluff : casino social, jetons virtuels, accessibilité et jeu responsable.",
    heading: "À propos de Quantum Bluff",
    paragraphs: [
      "Quantum Bluff réunit jeux de cartes multijoueurs et mini-jeux casino dans un salon social premium, sans argent réel.",
    ],
  },
  "/responsible-gaming": {
    title: "Jeu responsable — Quantum Bluff",
    description:
      "Jetons virtuels sans valeur monétaire, public 18+, pauses et bonnes pratiques sur Quantum Bluff.",
    heading: "Jeu responsable",
    paragraphs: [
      "Quantum Bluff est un divertissement social : pas de dépôt ni retrait d'argent réel. Jouez avec modération.",
    ],
  },
  "/contact": {
    title: "Contact — Quantum Bluff",
    description:
      "Une question sur votre compte, un bug ou un partenariat ? Contactez support@quantum-bluff.com.",
    heading: "Contact",
    paragraphs: [
      "Équipe support : support@quantum-bluff.com — délai de réponse habituel 48 à 72 h ouvrées.",
    ],
  },
  "/privacy-policy": {
    title: "Politique de confidentialité — Quantum Bluff",
    description: "Données traitées, cookies, droits RGPD et contact privacy@quantum-bluff.com.",
    heading: "Politique de confidentialité",
    paragraphs: ["Informations sur le traitement des données personnelles sur Quantum Bluff."],
  },
  "/terms-of-service": {
    title: "Conditions d'utilisation — Quantum Bluff",
    description: "CGU Quantum Bluff : compte, jetons virtuels, conduite en jeu et propriété intellectuelle.",
    heading: "Conditions d'utilisation",
    paragraphs: ["Règles d'utilisation du service Quantum Bluff."],
  },
};

async function loadLandings() {
  const raw = await fs.readFile(path.join(REPO_ROOT, "scripts", "seo_landings_data.json"), "utf8");
  const data = JSON.parse(raw);
  const pages = {};
  for (const game of Object.values(data.fr ?? {})) {
    if (!game.path || !game.metaTitle) continue;
    pages[game.path] = {
      title: game.metaTitle,
      description: game.metaDescription,
      heading: game.heroTitle ?? game.metaTitle,
      paragraphs: Array.isArray(game.description) ? game.description.slice(0, 3) : [game.metaDescription],
    };
  }
  return pages;
}

async function loadArticles() {
  const raw = await fs.readFile(
    path.join(CLIENT_ROOT, "src/content/marketing/longGuidesContent.ts"),
    "utf8",
  );
  const pages = {};
  const re = /slug:\s*"([^"]+)"[\s\S]*?title:\s*"((?:\\.|[^"\\])*)"[\s\S]*?excerpt:\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = re.exec(raw)) !== null) {
    const slug = m[1];
    if (pages[`/news/${slug}`]) continue;
    const unescape = (s) => s.replace(/\\"/g, '"').replace(/\\n/g, " ");
    pages[`/news/${slug}`] = {
      title: `${unescape(m[2])} — Quantum Bluff`,
      description: unescape(m[3]),
      heading: unescape(m[2]),
      paragraphs: [unescape(m[3])],
    };
  }
  return pages;
}

async function main() {
  const [landings, articles] = await Promise.all([loadLandings(), loadArticles()]);
  const routes = { ...STATIC_PAGES, ...landings, ...articles };
  const manifest = {
    generatedAt: new Date().toISOString(),
    siteOrigin: SITE_ORIGIN,
    routes,
  };
  await fs.writeFile(OUT, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`[seo-manifest] ${Object.keys(routes).length} routes → ${OUT}`);
}

main().catch((err) => {
  console.error("[seo-manifest] failed:", err);
  process.exit(1);
});
