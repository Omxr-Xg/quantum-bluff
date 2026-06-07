import { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Check, X, ArrowLeft, Spade, Heart, Club, Diamond, CircleDot, Calendar } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { ClientAuthShellBackground } from "../components/ClientAuthShellBackground";
import { AuthPublicFooter } from "../components/marketing/AuthPublicFooter";
import {
  useCheckEmailMutation,
  useLoginMutation,
  useRegisterMutation,
  useRecoveryQuestionMutation,
  useResetPasswordMutation,
} from "../services/api";
import { persistGamificationFromAuthUser } from "../utils/gamificationStorage";
import { getAuthItem, removeAuthItem, setAuthItem } from "../utils/authStorage";
import { translateRegisterApiError, isoDateUtc } from "../utils/authRegisterErrors";

// Hook loader
import { useLoader } from "../contexts/LoaderContext";
import { socket } from "../services/socket";

type Step = "email" | "login" | "register" | "forgotPassword";

const SECRET_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

const AUTH_QUOTES: readonly { text: string; author: string }[] = [
  { text: "Poker is not about the cards you hold, but the story you make others believe.", author: "Daniel Negreanu" },
  { text: "The smarter you seem, the easier it is to bluff.", author: "Doyle Brunson" },
  { text: "Confidence is the most dangerous card at the table.", author: "Phil Ivey" },
  { text: "Every great victory begins with uncertainty.", author: "Sun Tzu" },
  { text: "The finest player knows when to fold, when to strike, and when to deceive.", author: "Chip Reese" },
  { text: "Bluffing is the art of turning fear into power.", author: "Phil Hellmuth" },
  { text: "A weak hand played perfectly defeats a strong hand played poorly.", author: "Mike Sexton" },
  { text: "In poker, silence is often louder than words.", author: "Amarillo Slim" },
  { text: "Fortune favors the player who controls the table, not the cards.", author: "Stu Ungar" },
  { text: "The best bluff is the one nobody notices.", author: "Johnny Moss" },
  { text: "Never reveal your full game. Mystery wins more pots than strength.", author: "Doyle Brunson" },
  { text: "A true player wins long before the cards are shown.", author: "Daniel Negreanu" },
  { text: "Pressure creates mistakes. Bluffing creates pressure.", author: "Phil Ivey" },
  { text: "Every hand is a battle between logic and emotion.", author: "Chris Ferguson" },
  { text: "A gentleman never shows all his cards.", author: "Inspired by Dostoevsky" },
  { text: "Poker rewards patience, punishes ego, and respects courage.", author: "Mike Caro" },
  { text: "The table belongs to the player who controls the rhythm.", author: "Phil Galfond" },
  { text: "Bluff rarely works once. Mastery is making it work twice.", author: "Tom Dwan" },
  { text: "Luck wins hands. Strategy wins legends.", author: "Quantum Bluff" },
  { text: "Every victory starts with a bluff.", author: "Quantum Bluff" },
];

export function Auth() {
  /** Guest auth UI in English; global language (e.g. after logout) stays in user preference. */
  const { t } = useTranslation(undefined, { lng: 'en' });
  
  // Initialisation du loader
  const { showLoader, hideLoader } = useLoader();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginTotpCode, setLoginTotpCode] = useState("");
  const [loginRequiresTotp, setLoginRequiresTotp] = useState(false);
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [secretQuestionId, setSecretQuestionId] = useState<number>(1);
  const [secretAnswer, setSecretAnswer] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [recoveryQuestionId, setRecoveryQuestionId] = useState<number | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [forgotSecretAnswer, setForgotSecretAnswer] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotTotpCode, setForgotTotpCode] = useState("");
  const [forgotRequiresTotp, setForgotRequiresTotp] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [resetSuccessBanner, setResetSuccessBanner] = useState(false);
  
  const [checkEmail, { isLoading: isCheckingEmail, error: checkError }] = useCheckEmailMutation();
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  const [register, { isLoading: isRegistering, error: registerError }] = useRegisterMutation();
  const [recoveryQuestion, { isLoading: isLoadingRecovery }] = useRecoveryQuestionMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetPasswordMutation();
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/lobby";

  const dobBounds = useMemo(() => {
    const today = new Date();
    return {
      max: isoDateUtc(today),
      min: isoDateUtc(new Date(Date.UTC(today.getUTCFullYear() - 120, today.getUTCMonth(), today.getUTCDate()))),
    };
  }, []);

  const authQuotePick = useMemo(
    () => AUTH_QUOTES[Math.floor(Math.random() * AUTH_QUOTES.length)],
    [],
  );

  useEffect(() => {
    if (getAuthItem("token")) {
      navigate(from, { replace: true });
    }
  }, [navigate, from]);

  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = EMAIL_REGEX.test(email.trim());
  const isLoginFormValid =
    email.length > 0 &&
    password.length > 0 &&
    (!loginRequiresTotp || loginTotpCode.length === 6);
  const forgotPasswordCriteria = {
    length: forgotNewPassword.length >= 8,
    uppercase: /[A-Z]/.test(forgotNewPassword),
    number: /[0-9]/.test(forgotNewPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(forgotNewPassword),
  };

  const isRegisterFormValid =
    username.length >= 3 &&
    isEmailValid &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    Object.values(passwordCriteria).every(Boolean) &&
    password === confirmPassword &&
    secretAnswer.trim().length >= 2;

  const isForgotFormValid =
    recoveryQuestionId != null &&
    forgotSecretAnswer.trim().length >= 1 &&
    Object.values(forgotPasswordCriteria).every(Boolean) &&
    forgotNewPassword === forgotConfirmPassword;

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEmailValid) return;
    try {
      showLoader(t("auth.checkingEmail"));
      const { exists } = await checkEmail({ email: email.trim() }).unwrap();
      setStep(exists ? "login" : "register");
    } catch {
      // Error handled by checkError
    } finally {
      hideLoader();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoginFormValid) return;

    setResetSuccessBanner(false);

    try {
      showLoader(t("auth.loggingIn"));

      const response = await login({
        email: email.trim(),
        password,
        ...(loginTotpCode.trim() ? { totpCode: loginTotpCode.trim() } : {}),
      }).unwrap();

      const token = response.token;

      // Stockage session
      removeAuthItem("userid");
      removeAuthItem("role");
      setAuthItem("token", token);
      setAuthItem("userId", String(response.user.id));
      setAuthItem("username", response.user.username);
      setAuthItem("quantum_bluff_username", response.user.username);
      setAuthItem("quantum_bluff_email", response.user.email);

      if (typeof response.user.chips === "number") {
        setAuthItem("quantum_bluff_balance", String(response.user.chips));
      }

      const avatarUrl = (response.user as { avatarUrl?: string | null }).avatarUrl;
      if (typeof avatarUrl === "string" && avatarUrl.trim() !== "") {
        setAuthItem("quantum_bluff_avatar", avatarUrl.trim());
      } else {
        removeAuthItem("quantum_bluff_avatar");
      }

      persistGamificationFromAuthUser(response.user as unknown as Record<string, unknown>);

      // Reconnexion socket après auth
      socket.disconnect(); // clean ancien état
      socket.auth = { token }; // inject token
      socket.connect(); // reconnect propre

      window.dispatchEvent(new Event("auth-changed"));

      navigate(typeof from === "string" ? from : "/lobby", { replace: true });

    } catch (err: unknown) {
      const data = err && typeof err === "object" && "data" in err
        ? (err as { data?: { requires2FA?: boolean } }).data
        : undefined;
      if (data?.requires2FA) setLoginRequiresTotp(true);
    } finally {
      hideLoader();
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRegisterFormValid) return;
    try {
      showLoader(t("auth.registering"));
      const response = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        dateOfBirth,
        secretQuestionId,
        secretAnswer: secretAnswer.trim(),
      }).unwrap();
      removeAuthItem("userid");
      removeAuthItem("role");
      setAuthItem("token", response.token);
      setAuthItem("userId", String(response.user.id));
      setAuthItem("username", response.user.username);
      setAuthItem("quantum_bluff_username", response.user.username);
      setAuthItem("quantum_bluff_email", response.user.email);
      if (typeof response.user.chips === "number") {
        setAuthItem("quantum_bluff_balance", String(response.user.chips));
      }
      const avatarUrlReg = (response.user as { avatarUrl?: string | null }).avatarUrl;
      if (typeof avatarUrlReg === "string" && avatarUrlReg.trim() !== "") {
        setAuthItem("quantum_bluff_avatar", avatarUrlReg.trim());
      } else {
        removeAuthItem("quantum_bluff_avatar");
      }
      persistGamificationFromAuthUser(response.user as unknown as Record<string, unknown>);
      
      
      socket.disconnect();
      socket.auth = { token: response.token };
      socket.connect();

      window.dispatchEvent(new Event("auth-changed"));
      navigate(typeof from === "string" ? from : "/lobby", { replace: true });
    } catch {
      // Error handled by registerError
    } finally {
      hideLoader();
    }
  };

  const goBackToEmail = () => {
    setStep("email");
    setPassword("");
    setLoginTotpCode("");
    setLoginRequiresTotp(false);
    setUsername("");
    setConfirmPassword("");
    setSecretAnswer("");
    setSecretQuestionId(1);
    setDateOfBirth("");
    setRecoveryQuestionId(null);
    setRecoveryError(null);
    setForgotSecretAnswer("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotTotpCode("");
    setForgotRequiresTotp(false);
    setResetPasswordError(null);
  };

  useEffect(() => {
    if (step !== "forgotPassword" || !email.trim()) return;
    let cancelled = false;
    setRecoveryError(null);
    setRecoveryQuestionId(null);
    setResetPasswordError(null);
    setForgotRequiresTotp(false);
    recoveryQuestion({ email: email.trim() })
      .unwrap()
      .then((r) => {
        if (!cancelled) setRecoveryQuestionId(r.questionId);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const data =
          err && typeof err === "object" && "data" in err
            ? (err as { data?: { error?: string; code?: string } }).data
            : undefined;
        if (data?.code === "NO_SECRET_QUESTION") {
          setRecoveryError(t("auth.noSecretQuestionLegacy"));
        } else {
          setRecoveryError(data?.error ?? t("common.error"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [step, email]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isForgotFormValid) return;
    setResetPasswordError(null);
    try {
      showLoader(t("auth.resettingPassword"));
      await resetPassword({
        email: email.trim(),
        secretAnswer: forgotSecretAnswer.trim(),
        newPassword: forgotNewPassword,
        ...(forgotTotpCode.trim() ? { totpCode: forgotTotpCode.trim() } : {}),
      }).unwrap();
      setStep("login");
      setPassword("");
      setForgotSecretAnswer("");
      setForgotNewPassword("");
      setForgotConfirmPassword("");
      setForgotTotpCode("");
      setForgotRequiresTotp(false);
      setResetSuccessBanner(true);
    } catch (err: unknown) {
      const data = err && typeof err === "object" && "data" in err
        ? (err as { data?: { error?: string; requires2FA?: boolean } }).data
        : undefined;
      if (data?.requires2FA) setForgotRequiresTotp(true);
      setResetPasswordError(data?.error ?? t("common.error"));
    } finally {
      hideLoader();
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

  const subtitle =
    step === "email"
      ? t("auth.secureAccess")
      : step === "login"
        ? t("auth.secureAccess")
        : step === "forgotPassword"
          ? t("auth.forgotPasswordSubtitle")
          : t("auth.createYourAccount");

  return (
    <ClientAuthShellBackground className="!justify-between p-4 py-10 sm:p-6 sm:py-12">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="auth-float-card auth-float-card-a">
          <span>A</span>
          <Spade className="h-9 w-9" aria-hidden strokeWidth={1.5} />
        </div>
        <div className="auth-float-card auth-float-card-b auth-red-card">
          <span>K</span>
          <Heart className="h-9 w-9" aria-hidden strokeWidth={1.5} />
        </div>
        <div className="auth-float-card auth-float-card-c">
          <span>Q</span>
          <Club className="h-9 w-9" aria-hidden strokeWidth={1.5} />
        </div>
        <div className="auth-float-card auth-float-card-d auth-red-card">
          <span>J</span>
          <Diamond className="h-9 w-9" aria-hidden strokeWidth={1.5} />
        </div>
        <div className="auth-card-back auth-card-back-a" aria-hidden />
        <div className="auth-card-back auth-card-back-b" aria-hidden />
        <div className="auth-card-back auth-card-back-c" aria-hidden />

        <div className="auth-chip auth-chip-a" aria-hidden>
          <span /><span /><span />
        </div>
        <div className="auth-chip auth-chip-b" aria-hidden>
          <span /><span /><span /><span />
        </div>
        <div className="auth-chip auth-chip-c" aria-hidden>
          <span /><span /><span /><span />
        </div>
        <div className="auth-chip-dot auth-chip-dot-a"><CircleDot className="h-5 w-5" aria-hidden /></div>
        <div className="auth-chip-dot auth-chip-dot-b"><CircleDot className="h-4 w-4" aria-hidden /></div>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <QuantumBluffLogo className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
            {t("auth.title")}
          </h1>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>

        <div
          className="rounded-2xl p-6 sm:p-8 transition-all duration-300 backdrop-blur-lg"
          style={{
            background:
              "linear-gradient(145deg, rgba(7,16,34,0.88), rgba(10,24,48,0.76)) padding-box, linear-gradient(145deg, rgba(96,165,250,0.18), rgba(103,232,249,0.62), rgba(37,99,235,0.28)) border-box",
            border: "1px solid transparent",
            boxShadow:
              "0 24px 80px rgba(2,6,23,0.48), 0 0 34px rgba(37,99,235,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Bouton retour email */}
          {step !== "email" && (
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={goBackToEmail}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-cyan-300 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {t("auth.changeEmail")}
              </button>
              {step === "forgotPassword" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("login");
                    setRecoveryQuestionId(null);
                    setRecoveryError(null);
                    setForgotSecretAnswer("");
                    setForgotNewPassword("");
                    setForgotConfirmPassword("");
                    setResetPasswordError(null);
                  }}
                  className="text-sm text-cyan-400/90 hover:text-cyan-300 transition-colors"
                >
                  {t("auth.backToLogin")}
                </button>
              )}
            </div>
          )}

          {/* Step 1: Email */}
          {step === "email" && (
            <form onSubmit={handleCheckEmail} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.emailPlaceholder")}
                    className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                    required
                  />
                </div>
                {email.trim().length > 0 && !isEmailValid && (
                  <p className="text-red-400 text-xs mt-1 ml-1">{t("auth.invalidEmailFormat")}</p>
                )}
              </div>
              {checkError && (
                <div className="text-red-400 text-sm text-center">
                  {"data" in checkError
                    ? (checkError as { data?: { error?: string } }).data?.error ?? t("common.error")
                    : t("common.networkError")}
                </div>
              )}
              <button
                type="submit"
                disabled={isCheckingEmail || !isEmailValid}
                className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${
                  isEmailValid && !isCheckingEmail
                    ? "bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70 before:animate-[sh02_2s_linear_infinite]"
                    : "bg-slate-950/20 text-white/45 font-normal shadow-[0_0_11px_2px_rgba(59,130,246,0.18)] border-blue-300/40 opacity-80 cursor-not-allowed"
                } before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
              >
                {isCheckingEmail ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <span>{t("auth.continue")}</span>
                )}
              </button>
            </form>
          )}

          {/* Step 2a: Login (mot de passe) */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              {resetSuccessBanner && (
                <div className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                  {t("auth.resetPasswordSuccess")}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-slate-800/50 border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
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
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setResetSuccessBanner(false);
                    setStep("forgotPassword");
                  }}
                  className="text-xs font-medium text-cyan-400/90 hover:text-cyan-300 underline-offset-2 hover:underline"
                >
                  {t("auth.forgotPassword")}
                </button>
              </div>
              {loginRequiresTotp && (
                <div>
                  <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                    Code 2FA
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={loginTotpCode}
                      onChange={(e) => setLoginTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="123456"
                      className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                    />
                  </div>
                </div>
              )}
              {loginError && (
                <div className="text-red-400 text-sm text-center">
                  {"data" in loginError
                    ? (loginError as { data?: { error?: string } }).data?.error
                    : t("auth.loginError")}
                </div>
              )}
              <button
                type="submit"
                disabled={isLoggingIn || !isLoginFormValid}
                className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${
                  isLoginFormValid && !isLoggingIn
                    ? "bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70 before:animate-[sh02_2s_linear_infinite]"
                    : "bg-slate-950/20 text-white/45 font-normal shadow-[0_0_11px_2px_rgba(59,130,246,0.18)] border-blue-300/40 opacity-80 cursor-not-allowed"
                } before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("auth.loggingIn")}</span>
                  </>
                ) : (
                  <span>{t("auth.login")}</span>
                )}
              </button>
            </form>
          )}

          {/* Mot de passe oublié — réponse secrète + nouveau mot de passe */}
          {step === "forgotPassword" && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-slate-800/50 border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
              {isLoadingRecovery && !recoveryError && recoveryQuestionId === null && (
                <div className="flex items-center justify-center gap-2 text-sm text-slate-400 py-4">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t("common.loading")}
                </div>
              )}
              {recoveryError && (
                <div className="text-amber-400/90 text-sm leading-relaxed">{recoveryError}</div>
              )}
              {recoveryQuestionId != null && !recoveryError && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                      {t("auth.secretQuestionLabel")}
                    </label>
                    <p className="text-sm text-slate-300 bg-slate-800/60 border border-[#414141] rounded-lg px-4 py-3">
                      {t(`auth.secretQuestions.q${recoveryQuestionId}`)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                      {t("auth.secretAnswer")}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      value={forgotSecretAnswer}
                      onChange={(e) => setForgotSecretAnswer(e.target.value)}
                      placeholder={t("auth.secretAnswerPlaceholder")}
                      className="w-full bg-transparent border border-[#414141] rounded-lg px-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                      {t("auth.newPassword")}
                    </label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#717171] hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-4 bg-black/30 p-3 rounded-lg border border-[#313131]">
                      <Criterion met={forgotPasswordCriteria.length} label={t("auth.criteriaLength")} />
                      <Criterion met={forgotPasswordCriteria.uppercase} label={t("auth.criteriaUppercase")} />
                      <Criterion met={forgotPasswordCriteria.number} label={t("auth.criteriaNumber")} />
                      <Criterion met={forgotPasswordCriteria.special} label={t("auth.criteriaSpecial")} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                      {t("auth.confirmPassword")}
                    </label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-transparent border border-[#414141] rounded-lg px-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                    />
                    {forgotConfirmPassword && forgotNewPassword !== forgotConfirmPassword && (
                      <p className="text-red-400 text-[10px] mt-1 ml-1">{t("auth.passwordMismatch")}</p>
                    )}
                  </div>
                  {forgotRequiresTotp && (
                    <div>
                      <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                        Code 2FA
                      </label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={forgotTotpCode}
                          onChange={(e) => setForgotTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="123456"
                          className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                        />
                      </div>
                    </div>
                  )}
                  {resetPasswordError && (
                    <div className="text-red-400 text-sm text-center">{resetPasswordError}</div>
                  )}
                  <button
                    type="submit"
                    disabled={isResetting || !isForgotFormValid}
                    className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${
                      isForgotFormValid && !isResetting
                        ? "bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70 before:animate-[sh02_2s_linear_infinite]"
                        : "bg-slate-950/20 text-white/45 font-normal shadow-[0_0_11px_2px_rgba(59,130,246,0.18)] border-blue-300/40 opacity-80 cursor-not-allowed"
                    } before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t("common.loading")}</span>
                      </>
                    ) : (
                      <span>{t("auth.resetPasswordSubmit")}</span>
                    )}
                  </button>
                </>
              )}
            </form>
          )}

          {/* Step 2b: Register */}
          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.username")}
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="PokerMaster"
                    className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                    required
                    minLength={3}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171]" />
                  <input
                    type="email"
                    value={email}
                    readOnly
                    className="w-full bg-slate-800/50 border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-gray-400 cursor-not-allowed"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.dateOfBirth")}
                </label>
                <div className="relative group">
                  <Calendar
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300"
                    aria-hidden
                  />
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    min={dobBounds.min}
                    max={dobBounds.max}
                    required
                    className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400 [color-scheme:dark]"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2 ml-1">{t("auth.dateOfBirthHint")}</p>
              </div>
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
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
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
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-red-400 text-[10px] mt-1 ml-1">
                    {t("auth.passwordMismatch")}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.secretQuestionLabel")}
                </label>
                <select
                  value={secretQuestionId}
                  onChange={(e) => setSecretQuestionId(Number(e.target.value))}
                  className="w-full bg-slate-800/80 border border-[#414141] rounded-lg px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                >
                  {SECRET_QUESTION_IDS.map((id) => (
                    <option key={id} value={id} className="bg-slate-900">
                      {t(`auth.secretQuestions.q${id}`)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-2 ml-1">{t("auth.secretQuestionHint")}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                  {t("auth.secretAnswer")}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={secretAnswer}
                  onChange={(e) => setSecretAnswer(e.target.value)}
                  placeholder={t("auth.secretAnswerPlaceholder")}
                  className="w-full bg-transparent border border-[#414141] rounded-lg px-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                />
              </div>
              {registerError && (
                <div className="text-red-400 text-sm text-center">
                  {translateRegisterApiError(registerError, t)}
                </div>
              )}
              <button
                type="submit"
                disabled={isRegistering || !isRegisterFormValid}
                className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${
                  isRegisterFormValid && !isRegistering
                    ? "bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70 before:animate-[sh02_2s_linear_infinite]"
                    : "bg-slate-950/20 text-white/45 font-normal shadow-[0_0_11px_2px_rgba(59,130,246,0.18)] border-blue-300/40 opacity-80 cursor-not-allowed"
                } before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
              >
                {isRegistering ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("auth.registering")}</span>
                  </>
                ) : (
                  <span>{t("auth.createMyAccount")}</span>
                )}
              </button>
            </form>
          )}
        </div>

        <blockquote className="mt-8 border-t border-slate-600/35 pt-6 text-center">
          <p className="text-sm leading-relaxed text-slate-400 sm:text-[0.9375rem]">{authQuotePick.text}</p>
          <footer className="mt-2.5 text-xs text-slate-500">— {authQuotePick.author}</footer>
        </blockquote>
      </div>

      <AuthPublicFooter />

      <style>{`
        @keyframes sh02 { from { opacity: 0; left: 0%; } 50% { opacity: 1; } to { opacity: 0; left: 100%; } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        @keyframes auth-card-float-a { 0%, 100% { transform: translate3d(0, 0, 0) rotate(12deg); } 50% { transform: translate3d(12px, -24px, 0) rotate(16deg); } }
        @keyframes auth-card-float-b { 0%, 100% { transform: translate3d(0, 0, 0) rotate(-14deg); } 50% { transform: translate3d(-14px, 20px, 0) rotate(-18deg); } }
        @keyframes auth-card-float-c { 0%, 100% { transform: translate3d(0, 0, 0) rotate(-8deg); } 50% { transform: translate3d(18px, 18px, 0) rotate(-4deg); } }
        @keyframes auth-card-float-d { 0%, 100% { transform: translate3d(0, 0, 0) rotate(10deg); } 50% { transform: translate3d(-18px, -18px, 0) rotate(6deg); } }
        @keyframes auth-chip-float { 0%, 100% { transform: translate3d(0, 0, 0); opacity: 0.5; } 50% { transform: translate3d(0, -16px, 0); opacity: 0.82; } }
        @keyframes auth-card-back-drift { 0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--r)); } 50% { transform: translate3d(0, -18px, 0) rotate(calc(var(--r) + 4deg)); } }
        .auth-float-card {
          position: absolute;
          display: flex;
          height: clamp(6.2rem, 10vw, 8.5rem);
          width: clamp(4.4rem, 7.2vw, 6rem);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
          border-radius: 0.8rem;
          border: 1px solid rgba(226,232,240,0.2);
          background:
            linear-gradient(145deg, rgba(248,250,252,0.14), rgba(15,23,42,0.5)),
            linear-gradient(160deg, rgba(15,23,42,0.82), rgba(30,41,59,0.56));
          color: rgba(224,242,254,0.72);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 24px 50px rgba(0,0,0,0.34);
          backdrop-filter: blur(10px);
        }
        .auth-float-card span {
          font-size: clamp(1rem, 1.6vw, 1.35rem);
          font-weight: 800;
          line-height: 1;
        }
        .auth-red-card { color: rgba(254,202,202,0.74); }
        .auth-float-card-a { left: 7%; top: 17%; opacity: 0.58; animation: auth-card-float-a 7s ease-in-out infinite; }
        .auth-float-card-b { right: 8%; top: 19%; opacity: 0.55; animation: auth-card-float-b 7.8s ease-in-out infinite; animation-delay: -2s; }
        .auth-float-card-c { left: 13%; bottom: 14%; opacity: 0.48; animation: auth-card-float-c 8.4s ease-in-out infinite; animation-delay: -3s; }
        .auth-float-card-d { right: 14%; bottom: 15%; opacity: 0.48; animation: auth-card-float-d 7.4s ease-in-out infinite; animation-delay: -4s; }
        .auth-card-back {
          position: absolute;
          display: block;
          height: clamp(4.9rem, 8vw, 6.8rem);
          width: clamp(3.45rem, 5.6vw, 4.8rem);
          border-radius: 0.58rem;
          border: 1px solid rgba(226,232,240,0.16);
          background:
            radial-gradient(circle at center, rgba(125,211,252,0.24) 0 14%, transparent 15%),
            linear-gradient(135deg, transparent 42%, rgba(125,211,252,0.18) 43%, rgba(125,211,252,0.18) 57%, transparent 58%),
            linear-gradient(45deg, transparent 42%, rgba(125,211,252,0.14) 43%, rgba(125,211,252,0.14) 57%, transparent 58%),
            linear-gradient(145deg, rgba(15,23,42,0.9), rgba(30,64,175,0.48));
          background-size: 100% 100%, 100% 100%, auto;
          opacity: 0.35;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 0 26px rgba(14,165,233,0.08);
          animation: auth-card-back-drift 7s ease-in-out infinite;
        }
        .auth-card-back-a { --r: -18deg; left: 24%; top: 16%; animation-delay: -1s; }
        .auth-card-back-b { --r: 16deg; right: 24%; bottom: 16%; animation-delay: -3s; }
        .auth-card-back-c { --r: 8deg; right: 20%; top: 50%; opacity: 0.25; animation-delay: -5s; }
        .auth-chip {
          position: absolute;
          display: grid;
          gap: 0.16rem;
          animation: auth-chip-float 5.6s ease-in-out infinite;
        }
        .auth-chip span {
          display: block;
          height: 0.52rem;
          width: 3.1rem;
          border-radius: 9999px;
          border: 1px solid rgba(251,191,36,0.24);
          background:
            linear-gradient(90deg, rgba(251,191,36,0.08), rgba(254,240,138,0.24), rgba(251,191,36,0.08)),
            rgba(15,23,42,0.42);
          box-shadow: 0 0 18px rgba(251,191,36,0.08);
        }
        .auth-chip-a { left: 20%; top: 38%; animation-delay: -0.8s; }
        .auth-chip-b { right: 21%; top: 36%; animation-delay: -2.4s; }
        .auth-chip-c { left: 24%; bottom: 22%; animation-delay: -4s; }
        .auth-chip-dot {
          position: absolute;
          color: rgba(254,240,138,0.52);
          animation: auth-chip-float 6.2s ease-in-out infinite;
        }
        .auth-chip-dot-a { left: 31%; top: 23%; animation-delay: -1.3s; }
        .auth-chip-dot-b { right: 31%; bottom: 28%; animation-delay: -3.2s; }
        @media (max-width: 767px) {
          .auth-float-card-a { left: -2rem; top: 14%; }
          .auth-float-card-b { right: -2rem; top: 18%; }
          .auth-float-card-c,
          .auth-float-card-d,
          .auth-card-back,
          .auth-chip { display: none; }
        }
      `}</style>
    </ClientAuthShellBackground>
  );
}
