import { useState } from "react";
import { useNavigate } from "react-router";
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { useRegisterMutation } from "../services/api";

export function Register() {

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [register, { isLoading, error }] = useRegisterMutation();
  const navigate = useNavigate();

  const isFormValid =
    username.length >= 3 &&
    email.includes("@") &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    try {
      const response = await register({
        username,
        email,
        password
      }).unwrap();

      console.log("✅ Inscription réussie:", response);

      // 🔵 Stockage local
      localStorage.setItem("userId", String(response.id));
      localStorage.setItem("username", response.username);
      localStorage.setItem("token", response.token);

      navigate("/lobby");

    } catch (err) {
      console.error("❌ Erreur inscription:", err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 flex items-center justify-center p-4">

      <div className="w-full max-w-md">

        <div className="text-center mb-6">
          <QuantumBluffLogo className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">
            Quantum Bluff
          </h1>
          <p className="text-gray-400 text-sm">
            Créer votre compte joueur
          </p>
        </div>

        <div className="bg-slate-800 border border-purple-500/30 rounded-2xl p-6">

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* USERNAME */}
            <div>
              <label className="text-xs text-gray-400">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 py-3 bg-slate-900 border border-gray-700 rounded-lg text-white"
                  required
                />
              </div>
            </div>

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

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-xs text-gray-400">Confirmation</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 py-3 bg-slate-900 border border-gray-700 rounded-lg text-white"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-400 text-sm text-center">
                {'data' in error ? error.data?.error : "Erreur inscription"}
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || isLoading}
              className="w-full py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-bold flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" />
                  Inscription...
                </>
              ) : (
                "Créer mon compte"
              )}
            </button>

          </form>

          <div className="text-center mt-4">
            <button
              onClick={() => navigate("/login")}
              className="text-purple-400 hover:underline"
            >
              Déjà un compte ? Se connecter
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}