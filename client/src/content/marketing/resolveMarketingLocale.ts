import type { MarketingLocale } from "./siteContent";

export function resolveMarketingLocale(locale: string): MarketingLocale {
  if (locale.startsWith("fr")) return "fr";
  if (locale.startsWith("es")) return "es";
  if (locale.startsWith("ar")) return "ar";
  if (locale.startsWith("uk")) return "uk";
  return "en";
}
