import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { useLoginMutation } from "../services/api";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();

  const isFormValid = email.length > 0 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      const response = await login({ email, password }).unwrap();
      console.log("✅ Connexion réussie:", response);

      // 🔵 Stockage du token + user dans localStorage
      localStorage.setItem("userId", String(response.id));
      localStorage.setItem("username", response.username);
      localStorage.setItem("token", response.token);

      navigate("/lobby");
    } catch (err) {
      console.error("❌ Erreur de connexion:", err);
    }
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-slate-900 flex items-center justify-center p-4 sm:p-6 font-sans">
      
      {/* BACKGROUND */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <QuantumBluffLogo className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">Quantum Bluff</h1>
          <p className="text-gray-400 text-sm">Accès sécurisé à la table</p>
        </div>

        <div className="rounded-2xl p-6 sm:p-8 border border-purple-500/30 bg-slate-800/60 backdrop-blur">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div>
              <label className="text-xs text-gray-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 py-3 bg-slate-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-xs text-gray-400">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 py-3 bg-slate-900 border border-gray-700 rounded-lg text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">
                {'data' in error ? error.data?.error : 'Erreur de connexion'}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isFormValid}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Connexion...
                </>
              ) : (
                "Se connecter"
              )}
            </button>
          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/register")}
              className="text-purple-400 hover:underline"
            >
              Créer un compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}