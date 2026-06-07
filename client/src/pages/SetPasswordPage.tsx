import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Check, Eye, EyeOff, Loader2, Lock, Shield, X } from "lucide-react";
import { ClientAuthShellBackground } from "../components/ClientAuthShellBackground";
import { QuantumBluffLogo } from "../assets/logo";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";

export function SetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isFormValid =
    Object.values(passwordCriteria).every(Boolean) &&
    password === confirmPassword;

  useEffect(() => {
    const token = getAuthItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json().catch(() => ({}))) as {
          user?: { needsPasswordSetup?: boolean };
        };
        if (cancelled) return;
        if (!res.ok || !data.user?.needsPasswordSetup) {
          navigate("/lobby", { replace: true });
          return;
        }
      } catch {
        if (!cancelled) navigate("/auth", { replace: true });
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const token = getAuthItem("token");
    if (!token) {
      navigate("/auth", { replace: true });
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/auth/set-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("common.error"));
        return;
      }
      navigate("/lobby", { replace: true });
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const Criterion = ({ met, label }: { met: boolean; label: string }) => (
    <div
      className={`flex items-center gap-2 text-xs transition-colors ${met ? "text-green-400" : "text-red-500"}`}
    >
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" aria-hidden />
      </div>
    );
  }

  return (
    <ClientAuthShellBackground className="!justify-center p-4 py-10 sm:p-6">
      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <QuantumBluffLogo className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t("auth.setPasswordTitle")}</h1>
          <p className="text-sm text-gray-400 leading-relaxed">{t("auth.setPasswordSubtitle")}</p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 backdrop-blur-lg"
          style={{
            background:
              "linear-gradient(145deg, rgba(7,16,34,0.88), rgba(10,24,48,0.76)) padding-box, linear-gradient(145deg, rgba(96,165,250,0.18), rgba(103,232,249,0.62), rgba(37,99,235,0.28)) border-box",
            border: "1px solid transparent",
            boxShadow:
              "0 24px 80px rgba(2,6,23,0.48), 0 0 34px rgba(37,99,235,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div className="mb-5 flex items-start gap-3 rounded-lg border border-cyan-500/25 bg-cyan-950/25 px-3 py-3 text-sm text-cyan-100/90">
            <Shield className="h-5 w-5 shrink-0 text-cyan-300" aria-hidden />
            <p>{t("auth.setPasswordHint")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                {t("auth.password")}
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4 bg-black/30 p-3 rounded-lg border border-[#313131]">
                <Criterion met={passwordCriteria.length} label={t("auth.criteriaLength")} />
                <Criterion met={passwordCriteria.uppercase} label={t("auth.criteriaUppercase")} />
                <Criterion met={passwordCriteria.number} label={t("auth.criteriaNumber")} />
                <Criterion met={passwordCriteria.special} label={t("auth.criteriaSpecial")} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                {t("auth.confirmPassword")}
              </label>
              <div className="relative group">
                <Lock
                  className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${
                    confirmPassword
                      ? password === confirmPassword
                        ? "text-green-400"
                        : "text-red-500"
                      : "text-[#717171]"
                  }`}
                />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-transparent border rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 ${
                    confirmPassword
                      ? password === confirmPassword
                        ? "border-green-400"
                        : "border-red-500"
                      : "border-[#414141] focus:border-blue-400"
                  }`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-white"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-[10px] mt-1 ml-1">{t("auth.passwordMismatch")}</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${
                isFormValid && !loading
                  ? "bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70"
                  : "bg-slate-950/20 text-white/45 font-normal border-blue-300/40 opacity-80 cursor-not-allowed"
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t("common.loading")}</span>
                </>
              ) : (
                <span>{t("auth.setPasswordSubmit")}</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </ClientAuthShellBackground>
  );
}
