import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Shield } from "lucide-react";
import { apiUrl } from "../utils/apiBase";

export function AdminAuth() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && localStorage.getItem("role") === "admin") {
      navigate("/admin/console", { replace: true });
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.loginError"));
        return;
      }
      const token = (data as { token?: string }).token;
      const user = (data as { user?: { id: string; username: string } }).user;
      if (!token || !user) {
        setError(t("adminConsole.loginError"));
        return;
      }
      localStorage.setItem("token", token);
      localStorage.setItem("role", "admin");
      localStorage.setItem("userId", user.id);
      localStorage.setItem("username", user.username);
      window.dispatchEvent(new Event("auth-changed"));
      navigate("/admin/console", { replace: true });
    } catch {
      setError(t("adminConsole.networkError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-800/80 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-600/30">
            <Shield className="h-7 w-7 text-amber-300" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{t("adminConsole.loginTitle")}</h1>
            <p className="text-sm text-slate-400">{t("adminConsole.loginSubtitle")}</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="admin-user">
              {t("adminConsole.username")}
            </label>
            <input
              id="admin-user"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300" htmlFor="admin-pass">
              {t("adminConsole.password")}
            </label>
            <input
              id="admin-pass"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:border-amber-500 focus:outline-none"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t("adminConsole.signIn")}
          </button>
        </form>
      </div>
    </div>
  );
}
