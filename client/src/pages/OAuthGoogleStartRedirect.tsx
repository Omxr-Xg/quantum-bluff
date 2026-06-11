import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { resolveOAuthBackendOrigin } from "../utils/wakeApi";

function buildApiOAuthUrl(ref: string | null): string {
  const url = new URL("/auth/google", resolveOAuthBackendOrigin());
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
}

/** Secours si le SPA charge /auth/google (ex. ancien SW) → redirection API. */
export function OAuthGoogleStartRedirect() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const ref = params.get("ref");
  const target = buildApiOAuthUrl(ref);

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 text-center text-white">
      <Loader2 className="h-8 w-8 animate-spin text-blue-300" aria-hidden />
      <p className="text-sm text-slate-300">{t("auth.oauthCompleting")}</p>
    </div>
  );
}
