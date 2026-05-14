/**
 * Affiche un message d’erreur d’inscription : préfère la clé métier `code` (i18n),
 * sinon le texte serveur `error`, sinon le message générique.
 */
export function translateRegisterApiError(
  err: unknown,
  t: (key: string, options?: Record<string, unknown>) => string,
  fallbackKey = "auth.registerError",
): string {
  const data =
    err && typeof err === "object" && "data" in err
      ? (err as { data?: { error?: string; code?: string; unblockAt?: string } }).data
      : undefined;
  const code = typeof data?.code === "string" ? data.code : "";
  if (code === "REGISTER_GAMBLING_FORBIDDEN") return t("auth.registerGamblingForbidden");
  if (code === "REGISTER_AGE_US_21") return t("auth.registerAgeUs21");
  if (code === "REGISTER_AGE_MIN_18") return t("auth.registerAgeMin18");
  if (code === "REGISTER_DATE_INVALID") return t("auth.registerDateInvalid");
  if (code === "REGISTER_EMAIL_AGE_BLACKLISTED") {
    const iso = typeof data?.unblockAt === "string" ? data.unblockAt : "";
    const d = iso ? new Date(iso) : null;
    const dateStr =
      d && !Number.isNaN(d.getTime())
        ? new Intl.DateTimeFormat(undefined, { dateStyle: "long", timeZone: "UTC" }).format(d)
        : "";
    return t("auth.registerEmailAgeBlacklisted", { date: dateStr });
  }
  if (typeof data?.error === "string" && data.error.trim() !== "") return data.error.trim();
  return t(fallbackKey);
}

/** `YYYY-MM-DD` pour `<input type="date" max={todayIso} />`. */
export function isoDateUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
