import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { applyAuthSession } from "../utils/applyAuthSession";
import { trackEvent } from "../utils/analytics";
import { fetchBalanceFromServer } from "../utils/userProfile";
import { applyPendingReferralAfterAuth } from "../utils/applyPendingReferral";

const OAUTH_ERROR_KEYS = [
  "google_denied",
  "google_token",
  "google_profile",
  "google_email",
  "google_email_conflict",
  "google_auth_failed",
  "account_suspended",
  "missing_token",
  "profile_failed",
] as const;

type OAuthErrorKey = (typeof OAUTH_ERROR_KEYS)[number];

function isOAuthErrorKey(value: string): value is OAuthErrorKey {
  return (OAUTH_ERROR_KEYS as readonly string[]).includes(value);
}

/** Chemin /lobby incluant le basename Vite (déploiement sous sous-chemin). */
function lobbyHistoryPath(): string {
  const raw = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const base = raw === "." || raw === "./" || raw === "" ? "" : raw;
  return `${base}/lobby`;
}

/** Retire token / error de l’URL pour qu’ils ne restent pas dans l’historique. */
function scrubOAuthQueryFromHistory(): void {
  window.history.replaceState({}, "", window.location.pathname);
}

export function OAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [error, setError] = useState<OAuthErrorKey | null>(null);

  useEffect(() => {
    const errorCode = searchParams.get("error");
    if (errorCode) {
      scrubOAuthQueryFromHistory();
      setError(isOAuthErrorKey(errorCode) ? errorCode : "google_auth_failed");
      return;
    }

    const token = searchParams.get("token");
    if (!token) {
      scrubOAuthQueryFromHistory();
      setError("missing_token");
      return;
    }

    scrubOAuthQueryFromHistory();

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("profile_failed");
        const data = (await res.json()) as { user?: Record<string, unknown> };
        if (!data.user || cancelled) return;

        applyAuthSession(token, data.user as Parameters<typeof applyAuthSession>[1]);
        await applyPendingReferralAfterAuth(token);
        await fetchBalanceFromServer({ authoritative: true });
        trackEvent("login");
        window.history.replaceState({}, "", lobbyHistoryPath());
        navigate("/lobby", { replace: true });
      } catch {
        if (!cancelled) setError("profile_failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  if (error) {
    const message = t(`auth.oauthError.${error}`, {
      defaultValue: t("auth.oauthError.generic"),
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <div className="text-center max-w-md space-y-4">
          <p className="text-red-400">{message}</p>
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
          >
            {t("auth.backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
      <Loader2 className="w-8 h-8 animate-spin text-cyan-400" aria-hidden />
      <span className="ml-3 text-sm text-slate-300">{t("auth.oauthCompleting")}</span>
    </div>
  );
}
