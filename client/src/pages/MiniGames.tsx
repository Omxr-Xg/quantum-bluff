import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Menu, User, Users, HelpCircle, LogOut, Plus, ArrowLeft, Sparkles } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";
import { SlotMachine } from "../pages/SlotMachine";
import { Roulette } from "../pages/Roulette";
import { getUserBalance, BALANCE_CHANGED_EVENT } from "../utils/userProfile";

type MiniGameTab = "slots" | "roulette";

export function MiniGames() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MiniGameTab>("slots");
  const [showMenu, setShowMenu] = useState(false);
  // 1. On initialise avec le vrai solde local
  const [playerChips, setPlayerChips] = useState(getUserBalance());

  // 2. On écoute les changements (ex: quand la machine à sous te fait gagner)
  useEffect(() => {
    const syncBalance = () => setPlayerChips(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, syncBalance);
    
    // Nettoyage de l'écouteur quand on quitte la page
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, syncBalance);
  }, []);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-y-auto overflow-x-hidden">
      {/* Particules dorées flottantes */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-500/30 rounded-full"
            initial={{
              x: Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000),
              y: Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800),
            }}
            animate={{
              y: [null, Math.random() * (typeof window !== "undefined" ? window.innerHeight : 800)],
              x: [null, Math.random() * (typeof window !== "undefined" ? window.innerWidth : 1000)],
            }}
            transition={{
              duration: Math.random() * 10 + 10,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* Barre de navigation supérieure */}
      <div className="relative z-50 border-b border-yellow-600/20 bg-slate-900/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Partie GAUCHE */}
            <div className="flex items-center gap-6">
              {/* Logo */}
              <QuantumBluffLogo className="w-12 h-12 drop-shadow-2xl" />

              {/* Bouton retour */}
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg border border-slate-700 transition-all shadow-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="font-semibold">Lobby</span>
              </button>

              {/* Menu Hamburger */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="bg-slate-800/90 hover:bg-slate-700/90 backdrop-blur-sm text-white p-3 rounded-lg border border-slate-700 transition-all shadow-lg"
                  title="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Menu déroulant */}
                {showMenu && (
                  <div className="absolute top-14 left-0 bg-slate-800/95 backdrop-blur-sm rounded-xl shadow-2xl border border-slate-700 overflow-hidden min-w-[220px] z-50">
                    <button
                      onClick={() => {
                        navigate("/profile");
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-6 py-4 text-white hover:bg-slate-700 transition-all"
                    >
                      <User className="w-5 h-5" />
                      <span className="font-semibold">Profil</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate("/friends");
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-6 py-4 text-white hover:bg-slate-700 transition-all"
                    >
                      <Users className="w-5 h-5" />
                      <span className="font-semibold">Amis</span>
                    </button>
                    <button
                      onClick={() => {
                        navigate("/tutorial-game");
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-6 py-4 text-cyan-400 hover:bg-slate-700 transition-all"
                    >
                      <HelpCircle className="w-5 h-5" />
                      <span className="font-semibold">Tutoriel</span>
                    </button>
                    <div className="border-t border-slate-700"></div>
                    <button
                      onClick={() => {
                        navigate("/");
                        setShowMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-6 py-4 text-red-400 hover:bg-slate-700 transition-all"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-semibold">Quitter</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Partie DROITE */}
            <div className="flex items-center gap-4">
              {/* Capsule Solde + Bouton Ajouter */}
              <div className="flex items-center bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-full pl-4 pr-1 py-1 shadow-lg gap-3">
                <div className="text-white font-bold flex items-center gap-2 text-lg">
                  <span className="text-yellow-400 drop-shadow-sm">🪙</span>
                  <span>{playerChips.toLocaleString()}</span>
                </div>

                <button
                  onClick={() => console.log("Ajouter de l'argent")}
                  className="bg-gradient-to-b from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all transform hover:scale-105 border border-green-400"
                  title="Ajouter des crédits"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Titre de la page avec décoration */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pt-8 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" />
            <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
              Mini-Jeux Quantum
            </h1>
            <Sparkles className="w-8 h-8 text-yellow-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>
          <p className="text-yellow-200/70 text-lg font-serif">Tentez votre chance dans l'univers quantique</p>
        </motion.div>
      </div>

      {/* Sélecteur d'onglets */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 mb-8">
        <div className="flex items-center justify-center gap-4">
          <motion.button
            onClick={() => setActiveTab("slots")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg relative overflow-hidden ${
              activeTab === "slots"
                ? "bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-white border-2 border-yellow-400 shadow-[0_0_40px_10px_rgba(202,138,4,0.5)]"
                : "bg-slate-800/80 text-yellow-200/70 border-2 border-slate-700 hover:border-yellow-600/50"
            }`}
          >
            {activeTab === "slots" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              🎰 Slot Machine
            </span>
          </motion.button>

          <motion.button
            onClick={() => setActiveTab("roulette")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-lg relative overflow-hidden ${
              activeTab === "roulette"
                ? "bg-gradient-to-r from-yellow-600 via-yellow-500 to-yellow-600 text-white border-2 border-yellow-400 shadow-[0_0_40px_10px_rgba(202,138,4,0.5)]"
                : "bg-slate-800/80 text-yellow-200/70 border-2 border-slate-700 hover:border-yellow-600/50"
            }`}
          >
            {activeTab === "roulette" && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ["-100%", "200%"],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              🎡 Roulette
            </span>
          </motion.button>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 max-w-7xl mx-auto px-8 pb-12">
        {activeTab === "slots" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <SlotMachine />
          </motion.div>
        )}

        {activeTab === "roulette" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Roulette />
          </motion.div>
        )}
      </div>
    </div>
  );
}