#!/usr/bin/env python3
"""Generate expanded seoLandings.ts content."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "client/src/content/marketing/seoLandings.ts"

HEADER = '''import type { FaqItem } from "./siteContent";
import { resolveMarketingLocale } from "./resolveMarketingLocale";
import pokerImg from "../../assets/games/poker.webp";
import beloteImg from "../../assets/games/belote.webp";
import blackjackImg from "../../assets/games/blackjack.webp";
import rouletteImg from "../../assets/games/roulette.webp";
import slotImg from "../../assets/games/slot.webp";
import crashImg from "../../assets/games/crash.webp";
import minesImg from "../../assets/games/mines.webp";
import luckyImg from "../../assets/games/lucky.webp";

export type SeoGameSlug =
  | "poker"
  | "belote"
  | "blackjack"
  | "roulette"
  | "slots"
  | "crash"
  | "mines"
  | "luckyNumber"
  | "wheel";

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

'''

FOOTER = '''
export function getSeoLanding(slug: SeoGameSlug, locale: string): SeoLandingContent {
  const pack = resolveMarketingLocale(locale) === "fr" ? fr : en;
  return pack[slug];
}
'''

# Load content from JSON sibling file for maintainability
CONTENT_JSON = Path(__file__).with_name("seo_landings_data.json")


def ts_string(s: str) -> str:
    return json.dumps(s, ensure_ascii=False)


def render_entry(key: str, data: dict) -> str:
    lines = [f"  {key}: {{"]
    lines.append(f"    path: {ts_string(data['path'])},")
    lines.append(f"    image: {data['image']},")
    lines.append(f"    imageAlt: {ts_string(data['imageAlt'])},")
    lines.append(f"    metaTitle: {ts_string(data['metaTitle'])},")
    lines.append(
        "    metaDescription:\n      " + ts_string(data["metaDescription"]) + ","
    )
    lines.append(f"    heroTitle: {ts_string(data['heroTitle'])},")
    lines.append(
        "    heroSubtitle:\n      " + ts_string(data["heroSubtitle"]) + ","
    )
    lines.append(
        f"    descriptionTitle: {ts_string(data['descriptionTitle'])},"
    )
    lines.append("    description: [")
    for p in data["description"]:
        lines.append("      " + ts_string(p) + ",")
    lines.append("    ],")
    lines.append(f"    rulesTitle: {ts_string(data['rulesTitle'])},")
    lines.append("    rules: [")
    for r in data["rules"]:
        lines.append("      " + ts_string(r) + ",")
    lines.append("    ],")
    lines.append(f"    faqTitle: {ts_string(data['faqTitle'])},")
    lines.append("    faq: [")
    for item in data["faq"]:
        lines.append("      {")
        lines.append(f"        q: {ts_string(item['q'])},")
        lines.append(f"        a: {ts_string(item['a'])},")
        lines.append("      },")
    lines.append("    ],")
    lines.append(f"    ctaTitle: {ts_string(data['ctaTitle'])},")
    lines.append(f"    ctaBody: {ts_string(data['ctaBody'])},")
    lines.append("  },")
    return "\n".join(lines)


def render_locale(name: str, entries: dict) -> str:
    order = [
        "poker",
        "belote",
        "blackjack",
        "roulette",
        "slots",
        "crash",
        "mines",
        "luckyNumber",
        "wheel",
    ]
    parts = [f"const {name}: SeoLandingsByLocale = {{"]
    for key in order:
        parts.append(render_entry(key, entries[key]))
    parts.append("};")
    return "\n".join(parts)


def word_count(desc: list[str]) -> int:
    return sum(len(p.split()) for p in desc)


def main() -> None:
    data = json.loads(CONTENT_JSON.read_text(encoding="utf-8"))
    for locale in ("fr", "en"):
        for slug, entry in data[locale].items():
            wc = word_count(entry["description"])
            if wc < 700:
                raise SystemExit(f"{locale}/{slug}: description only {wc} words (need 700+)")
            if len(entry["description"]) < 5:
                raise SystemExit(f"{locale}/{slug}: need 5-6 description paragraphs")
            if len(entry["faq"]) != 8:
                raise SystemExit(f"{locale}/{slug}: need 8 FAQ items, got {len(entry['faq'])}")

    body = HEADER + render_locale("fr", data["fr"]) + "\n\n" + render_locale("en", data["en"]) + FOOTER
    OUT.write_text(body, encoding="utf-8")
    print(f"Wrote {OUT} ({len(body)} bytes)")


if __name__ == "__main__":
    main()
