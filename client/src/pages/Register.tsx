import { useState } from "react";  // Removed useEffect
import { useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { QuantumBluffLogo } from "../assets/QuantumBluffLogo";
import { getUserProfile, saveUserProfile } from "../utils/userProfile";

// ==========================================
// 1. MOVE Criterion OUTSIDE the component
// ==========================================
const Criterion = ({ met, label }: { met: boolean; label: string }) => (
  <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-green-400' : 'text-red-500'}`}>
    {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    <span>{label}</span>
  </div>
);

export function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; email?: string; confirmPassword?: string }>({});
  
  // ==========================================
  // 2. REMOVED useState for passwordCriteria
  // ==========================================

  const navigate = useNavigate();

  // ==========================================
  // 3. REMOVED useEffect entirely
  // ==========================================

  const validateEmailFormat = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  };

  const handleEmailBlur = () => {
    if (!email) {
      setErrors(prev => ({ ...prev, email: "L'email est requis" }));
    } else if (!validateEmailFormat(email)) {
      setErrors(prev => ({ ...prev, email: "Format d'email invalide" }));
    } else {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handleUsernameBlur = () => {
    if (username.length < 3) {
      setErrors(prev => ({ ...prev, username: "Minimum 3 caractères" }));
    } else {
      setErrors(prev => ({ ...prev, username: undefined }));
    }
  };

  // ==========================================
  // 4. Calculate passwordCriteria directly
  // ==========================================
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isFormValid = 
    username.length >= 3 && 
    validateEmailFormat(email) && 
    Object.values(passwordCriteria).every(Boolean) && 
    password === confirmPassword && 
    confirmPassword.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsLoading(true);
    setTimeout(() => {
      const userProfile = getUserProfile();
      saveUserProfile({ 
        ...userProfile, 
        username: username,
        email: email 
      });
      navigate("/lobby");
      setIsLoading(false);
    }, 1500);
  };

  // ==========================================
  // 5. REMOVED Criterion from inside component
  // ==========================================

  return (
    <div className="size-full relative overflow-hidden bg-slate-900 flex items-center justify-center min-h-screen p-4 sm:p-6 font-sans">
      
      {/* FONDS IMMERSIF */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 60px, rgba(139, 92, 246, 0.2) 60px, rgba(139, 92, 246, 0.2) 61px)` }} />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      <div className="relative z-10 w-full max-w-md my-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <QuantumBluffLogo className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">Quantum Bluff</h1>
          <p className="text-sm text-gray-400">Créer votre compte joueur</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 transition-all duration-300" style={{
            background: 'linear-gradient(#151b2b, #151b2b) padding-box, linear-gradient(145deg, transparent 35%, #e81cff, #40c9ff) border-box',
            border: '2px solid transparent'
          }}>
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Nom d'utilisateur */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">Nom d'utilisateur</label>
              <div className="relative group">
                <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.username ? 'text-red-500' : 'text-[#717171] group-focus-within:text-[#e81cff]'}`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if(errors.username) setErrors(prev => ({...prev, username: undefined}));
                  }}
                  onBlur={handleUsernameBlur}
                  placeholder="PokerMaster"
                  className={`w-full bg-transparent border rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 ${errors.username ? 'border-red-500' : 'border-[#414141] focus:border-[#e81cff]'}`}
                />
              </div>
              {errors.username && <p className="text-red-400 text-[10px] mt-1 ml-1">{errors.username}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">Email</label>
              <div className="relative group">
                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${errors.email ? 'text-red-500' : 'text-[#717171] group-focus-within:text-[#e81cff]'}`} />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if(errors.email) setErrors(prev => ({...prev, email: undefined}));
                  }}
                  onBlur={handleEmailBlur}
                  placeholder="joueur@quantum.com"
                  className={`w-full bg-transparent border rounded-lg pl-12 pr-4 py-3.5 text-white transition-all focus:outline-none focus:ring-1 ${errors.email ? 'border-red-500' : 'border-[#414141] focus:border-[#e81cff]'}`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-[10px] mt-1 ml-1">{errors.email}</p>}
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">Mot de passe</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#717171] group-focus-within:text-[#e81cff]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent border border-[#414141] rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 focus:ring-[#e81cff]/20 focus:border-[#e81cff]"
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
                <Criterion met={passwordCriteria.length} label="8+ caractères" />
                <Criterion met={passwordCriteria.uppercase} label="1 Majuscule" />
                <Criterion met={passwordCriteria.number} label="1 Chiffre" />
                <Criterion met={passwordCriteria.special} label="1 Spécial" />
              </div>
            </div>

            {/* Confirmation mot de passe */}
            <div>
              <label className="block text-xs font-bold text-[#717171] uppercase tracking-wider mb-2 ml-1">Confirmation</label>
              <div className="relative group">
                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${confirmPassword ? (password === confirmPassword ? 'text-green-400' : 'text-red-500') : 'text-[#717171]'}`} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-transparent border rounded-lg pl-12 pr-12 py-3.5 text-white transition-all focus:outline-none focus:ring-1 ${confirmPassword ? (password === confirmPassword ? 'border-green-400' : 'border-red-500') : 'border-[#414141] focus:border-[#e81cff]'}`}
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
                <p className="text-red-400 text-[10px] mt-1 ml-1">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className={`relative w-full py-4 rounded-[20px] text-[12px] uppercase tracking-[2px] overflow-hidden transition-all duration-300 flex items-center justify-center gap-3 border-[0.1px] ${isFormValid ? 'bg-[#e81cff] text-white font-semibold shadow-[0_0_30px_5px_rgba(232,28,255,0.6)] border-[#e81cff] before:animate-[sh02_0.5s_linear_infinite] cursor-pointer' : 'bg-transparent text-white/50 font-normal shadow-[0_0_11px_2px_rgba(232,28,255,0.3)] border-[#e81cff] opacity-80 cursor-not-allowed'} active:scale-95 before:content-[''] before:block before:w-0 before:h-[86%] before:absolute before:top-[7%] before:left-0 before:opacity-0 before:bg-white before:shadow-[0_0_50px_30px_#fff] before:-skew-x-[20deg]`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>Créer mon compte</span>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-400">
              Déjà un compte ?{" "}
              <button onClick={() => navigate("/login")} className="text-[#e81cff] font-semibold hover:underline">
                Se connecter
              </button>
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sh02 { from { opacity: 0; left: 0%; } 50% { opacity: 1; } to { opacity: 0; left: 100%; } }
        @keyframes pulse-slow { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
      `}</style>
    </div>
  );
}