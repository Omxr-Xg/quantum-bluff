import { useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { useLoginMutation } from "../services/api";

export function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/lobby";

  const isFormValid = email.length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!isFormValid) return

  try {
    const response = await login({ email, password }).unwrap()
    console.log("✅ Connexion réussie:", response)

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
    const avatarUrl = (response.user as { avatarUrl?: string | null }).avatarUrl
    if (typeof avatarUrl === 'string' && avatarUrl.trim() !== '') {
      localStorage.setItem('quantum_bluff_avatar', avatarUrl.trim())
    } else {
      localStorage.removeItem('quantum_bluff_avatar')
    }

    window.dispatchEvent(new Event('auth-changed'))

    navigate(from, { replace: true })
  } catch (err) {
    console.error("❌ Erreur de connexion:", err)
  }
};

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-slate-900 flex items-center justify-center min-h-screen p-4 sm:p-6 font-sans">
      
      {/* FONDS IMMERSIF (inchangé) */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_70%_at_50%_-10%,rgba(30,64,175,0.24),transparent_55%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(37, 99, 235, 0.24) 60px, rgba(37, 99, 235, 0.24) 61px)` }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-700/14 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-700/14 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Cartes animées (inchangé) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[15%] left-[8%] animate-float-card">
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-blue-300/24 rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-6xl text-blue-300/40 font-bold">♠</div>
          </div>
        </div>
        
        <div className="absolute top-[55%] right-[12%] animate-float-card-delayed" style={{ animationDelay: "1s" }}>
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-blue-300/24 -rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-6xl text-blue-300/40 font-bold">♥</div>
          </div>
        </div>
      </div>

      {/* Formulaire */}
      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <QuantumBluffLogo className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">{t('auth.title')}</h1>
          <p className="text-sm text-gray-400">{t('auth.secureAccess')}</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 transition-all duration-300 backdrop-blur-xl" style={{
            background: 'linear-gradient(145deg, rgba(7,16,34,0.88), rgba(10,24,48,0.76)) padding-box, linear-gradient(145deg, rgba(96,165,250,0.18), rgba(103,232,249,0.62), rgba(37,99,235,0.28)) border-box',
            border: '1px solid transparent',
            boxShadow: '0 24px 80px rgba(2,6,23,0.48), 0 0 34px rgba(37,99,235,0.16), inset 0 1px 0 rgba(255,255,255,0.08)'
          }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.email')}</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-cyan-300" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="joueur@quantum.com"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-blue-400/20 focus:border-blue-400"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">{t('auth.password')}</label>
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
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="text-red-400 text-sm text-center">
                {'data' in error ? (error as { data?: { error?: string } }).data?.error : t('auth.loginError')}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${isFormValid && !isLoading ? 'bg-gradient-to-r from-blue-950 via-blue-700 to-cyan-900 text-white font-semibold shadow-[0_0_30px_5px_rgba(59,130,246,0.42)] border-blue-300/70 before:animate-[sh02_2s_linear_infinite]' : 'bg-slate-950/20 text-white/45 font-normal shadow-[0_0_11px_2px_rgba(59,130,246,0.18)] border-blue-300/40 opacity-80 cursor-not-allowed'} before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('auth.loggingIn')}</span>
                </>
              ) : (
                <span>{t('auth.login')}</span>
              )}
            </button>
          </form>

          {/* Lien inscription */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              {t('auth.newPlayer')}{" "}
              <button onClick={() => navigate("/register")} className="text-blue-300 font-semibold hover:underline">
                {t('auth.createAccount')}
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

