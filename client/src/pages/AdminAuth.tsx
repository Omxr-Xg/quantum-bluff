import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Shield,
  User,
} from "lucide-react";
import {
  AdminShellBackground,
  adminLanguageButtonClass,
} from "../components/AdminShellBackground";
import { QuantumBluffLogo } from "../assets/logo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem, setAuthItem } from "../utils/authStorage";

export function AdminAuth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminConsoleNotConfigured, setAdminConsoleNotConfigured] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAuthItem("token");
    if (token && getAuthItem("role") === "admin") {
      navigate("/admin/console", { replace: true });
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAdminConsoleNotConfigured(false);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (
          res.status === 503 &&
          (data as { code?: string }).code === "ADMIN_CONSOLE_NOT_CONFIGURED"
        ) {
          setAdminConsoleNotConfigured(true);
          return;
        }
        setError((data as { error?: string }).error ?? t("adminConsole.loginError"));
        return;
      }
      const token = (data as { token?: string }).token;
      const user = (data as { user?: { id: string; username: string } }).user;
      if (!token || !user) {
        setError(t("adminConsole.loginError"));
        return;
      }
      setAuthItem("token", token);
      setAuthItem("role", "admin");
      setAuthItem("userId", user.id);
      setAuthItem("username", user.username);
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/admin/console", { replace: true });
    } catch {
      setError(t("adminConsole.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShellBackground>
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <LanguageSwitcher buttonClassName={adminLanguageButtonClass} />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-500/10 shadow-[0_0_32px_rgba(245,158,11,0.18)] backdrop-blur-sm sm:h-[4.5rem] sm:w-[4.5rem]">
              <QuantumBluffLogo className="h-11 w-11 sm:h-12 sm:w-12" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-950/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-200/90">
              <Shield className="h-3.5 w-3.5" aria-hidden />
              {t("adminConsole.title")}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {t("adminConsole.loginTitle")}
            </h1>
            <p className="mt-2 text-sm text-slate-300/90">{t("adminConsole.loginSubtitle")}</p>
          </div>

          <div className="rounded-3xl border border-amber-200/15 bg-slate-950/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl sm:p-8">
            {adminConsoleNotConfigured ? (
              <div
                className="mb-6 rounded-2xl border border-amber-500/35 bg-amber-950/50 p-4 text-sm text-amber-50"
                role="alert"
              >
                <p className="mb-2 font-semibold text-amber-200">
                  {t("adminConsole.notConfiguredTitle")}
                </p>
                <p className="whitespace-pre-line text-amber-100/90">
                  {t("adminConsole.notConfiguredHelp")}
                </p>
              </div>
            ) : null}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-200"
                  htmlFor="admin-user"
                >
                  <User className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  {t("adminConsole.username")}
                </label>
                <input
                  id="admin-user"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 text-white shadow-inner transition placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                  placeholder={t("adminConsole.username")}
                />
              </div>

              <div>
                <label
                  className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-200"
                  htmlFor="admin-pass"
                >
                  <KeyRound className="h-3.5 w-3.5 text-amber-300" aria-hidden />
                  {t("adminConsole.password")}
                </label>
                <div className="relative">
                  <input
                    id="admin-pass"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-4 py-3 pe-12 text-white shadow-inner transition placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20"
                    placeholder={t("adminConsole.password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-amber-200"
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </div>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading || !username.trim() || !password}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 py-3.5 font-semibold text-white shadow-[0_12px_32px_rgba(245,158,11,0.28)] transition hover:from-amber-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Lock className="h-4 w-4" aria-hidden />}
                {t("adminConsole.signIn")}
              </button>
            </form>

            <Link
              to="/auth"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/35 py-3 text-sm font-medium text-slate-200 transition hover:border-amber-300/25 hover:bg-slate-900/55 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t("adminConsole.backToClientPlatform")}
            </Link>
          </div>
        </div>
      </div>
    </AdminShellBackground>
  );
}
