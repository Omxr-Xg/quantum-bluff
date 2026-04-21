import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { useRegisterMutation } from "../services/api";

const SECRET_QUESTION_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

export function Register() {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [secretQuestionId, setSecretQuestionId] = useState(1);
  const [secretAnswer, setSecretAnswer] = useState("");
  const [register, { isLoading, error }] = useRegisterMutation();
  const navigate = useNavigate();

  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isFormValid =
    username.length >= 3 &&
    email.includes("@") &&
    Object.values(passwordCriteria).every(Boolean) &&
    password === confirmPassword &&
    secretAnswer.trim().length >= 2;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!isFormValid) return

  try {
    const response = await register({
      username,
      email,
      password,
      secretQuestionId,
      secretAnswer: secretAnswer.trim(),
    }).unwrap()

    console.log("✅ Inscription réussie:", response)

    localStorage.removeItem('userid')
    localStorage.setItem('token', response.token)
    localStorage.setItem('userId', String(response.user.id))
    localStorage.setItem('username', response.user.username)
    // Mettre à jour le profil local pour l'écran Profile
    localStorage.setItem('quantum_bluff_username', response.user.username)
    localStorage.setItem('quantum_bluff_email', response.user.email)
    if (typeof response.user.chips === 'number') {
      localStorage.setItem('quantum_bluff_balance', String(response.user.chips))
    }

    window.dispatchEvent(new Event('auth-changed'))

    navigate("/lobby")
  } catch (err) {
    console.error("❌ Erreur d'inscription:", err)
  }
};

  const Criterion = ({ met, label }: { met: boolean; label: string }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-400' : 'text-red-500'}`}>
      {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      
      {/* FONDS IMMERSIF (identique au Login) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 app-shell-bg"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(139, 92, 246, 0.2) 60px, rgba(139, 92, 246, 0.2) 61px)` }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Cartes animées (optionnel, peut rester) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[15%] left-[8%] animate-float-card">
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-6xl text-purple-400/40 font-bold">♠</div>
          </div>
        </div>
        <div className="absolute top-[55%] right-[12%] animate-float-card-delayed" style={{ animationDelay: "1s" }}>
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 -rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-6xl text-purple-400/40 font-bold">♥</div>
          </div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md my-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <QuantumBluffLogo className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">{t('auth.title')}</h1>
          <p className="text-sm text-gray-400">{t('auth.createYourAccount')}</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 transition-all duration-300" style={{
            background: 'linear-gradient(#151b2b, #151b2b) padding-box, linear-gradient(145deg, transparent 35%, #e81cff, #40c9ff) border-box',
            border: '2px solid transparent'
          }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.username')}</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-[#e81cff]" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="PokerMaster"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
                  required
                  minLength={3}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.email')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-[#e81cff]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joueur@quantum.com"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.password')}</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-[#e81cff]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
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
                <Criterion met={passwordCriteria.length} label={t('auth.criteriaLength')} />
                <Criterion met={passwordCriteria.uppercase} label={t('auth.criteriaUppercase')} />
                <Criterion met={passwordCriteria.number} label={t('auth.criteriaNumber')} />
                <Criterion met={passwordCriteria.special} label={t('auth.criteriaSpecial')} />
              </div>
            </div>

            {/* Confirmation */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.confirmPassword')}</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${confirmPassword ? (password === confirmPassword ? 'text-green-400' : 'text-red-500') : 'text-[#717171]'}`} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-transparent border rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 ${confirmPassword ? (password === confirmPassword ? 'border-green-400' : 'border-red-500') : 'border-[#414141] focus:border-[#e81cff]'}`}
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
                <p className="text-red-400 text-[10px] mt-1 ml-1">{t('auth.passwordMismatch')}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">
                {t("auth.secretQuestionLabel")}
              </label>
              <select
                value={secretQuestionId}
                onChange={(e) => setSecretQuestionId(Number(e.target.value))}
                className="w-full bg-slate-800/80 border border-[#414141] rounded-lg px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
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
                className="w-full bg-transparent border border-[#414141] rounded-lg px-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
              />
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="text-red-400 text-sm text-center">
                {'data' in error ? (error as { data?: { error?: string } }).data?.error : t('auth.registerError')}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${isFormValid ? 'bg-[#e81cff] text-white font-semibold shadow-[0_0_30px_5px_rgba(232,28,255,0.6)] border-[#e81cff] before:animate-[sh02_0.5s_linear_infinite]' : 'bg-transparent text-white/50 font-normal shadow-[0_0_11px_2px_rgba(232,28,255,0.3)] border-[#e81cff] opacity-80 cursor-not-allowed'} before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('auth.registering')}</span>
                </>
              ) : (
                <span>{t('auth.createMyAccount')}</span>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              {t('auth.alreadyHaveAccount')}{" "}
              <button onClick={() => navigate("/login")} className="text-[#e81cff] font-semibold hover:underline">
                {t('auth.login')}
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sh02 { from { opacity: 0; left: 0%; } 50% { opacity: 1; } to { opacity: 0; left: 100%; } }
        @keyframes float-card { 0%, 100% { transform: translateY(0px) rotate(12deg); } 50% { transform: translateY(-20px) rotate(12deg); } }
        @keyframes float-card-delayed { 0%, 100% { transform: translateY(0px) rotate(-12deg); } 50% { transform: translateY(-20px) rotate(-12deg); } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
        .animate-float-card { animation: float-card 4s ease-in-out infinite; }
        .animate-float-card-delayed { animation: float-card-delayed 4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
