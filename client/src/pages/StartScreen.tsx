import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, Crown, Gem, Zap } from "lucide-react";
import { QuantumBluffLogo } from "../assets/logo";

export function StartScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(t('startScreen.init'));

  useEffect(() => {
    const messages = [
      { time: 0, text: t('startScreen.init'), progress: 0 },
      { time: 500, text: t('startScreen.shuffling'), progress: 20 },
      { time: 1200, text: t('startScreen.preparingTable'), progress: 40 },
      { time: 2000, text: t('startScreen.loadingChips'), progress: 60 },
      { time: 3000, text: t('startScreen.quantumCalc'), progress: 80 },
      { time: 4000, text: t('startScreen.readyToPlay'), progress: 100 },
    ];
    messages.forEach(({ time, text, progress }) => {
      setTimeout(() => {
        setLoadingText(text);
        setLoadingProgress(progress);
      }, time);
    });

    // Terminer le chargement après 5 secondes
    const loadingTimer = setTimeout(() => {
      setIsLoading(false);
    }, 5000);

    return () => clearTimeout(loadingTimer);
  }, [t]);

  const handleStart = () => {
    navigate("/login");
  };

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-slate-900"> {/* Fond Bleu Foncé conservé */}
      {/* Background sophistiqué */}
      <div className="absolute inset-0">
        {/* Gradient de base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"></div>
        
        {/* Motif géométrique subtil - VIOLET NÉON */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 60px,
                rgba(139, 92, 246, 0.2) 60px,
                rgba(139, 92, 246, 0.2) 61px
              ),
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 60px,
                rgba(139, 92, 246, 0.2) 60px,
                rgba(139, 92, 246, 0.2) 61px
              )
            `
          }}
        />

        {/* Vignette sombre */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]"></div>

        {/* Lumières ambiantes - VIOLET NÉON */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
      </div>

      {/* Particules flottantes - VIOLET NÉON */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={`particle-${i}`}
            className="absolute animate-float-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`,
            }}
          >
            <div 
              className="w-1 h-1 rounded-full bg-gradient-to-r from-purple-400 to-purple-600 opacity-40"
              style={{
                boxShadow: '0 0 10px 2px rgba(168, 85, 247, 0.4)'
              }}
            ></div>
          </div>
        ))}
      </div>

      {/* Cartes de poker stylées - VIOLET NÉON */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {/* Carte 1 */}
        <div className="absolute top-[15%] left-[8%] animate-float-card opacity-20">
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-5xl text-purple-400 font-bold">♠</div>
          </div>
        </div>
        
        {/* Carte 2 */}
        <div className="absolute top-[55%] right-[12%] animate-float-card-delayed opacity-20" style={{ animationDelay: "1s" }}>
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 -rotate-12 flex items-center justify-center backdrop-blur-sm">
            <div className="text-5xl text-purple-400 font-bold">♥</div>
          </div>
        </div>

        {/* Carte 3 */}
        <div className="absolute bottom-[18%] left-[18%] animate-float-card opacity-20" style={{ animationDelay: "2s" }}>
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 rotate-6 flex items-center justify-center backdrop-blur-sm">
            <div className="text-5xl text-purple-400 font-bold">♦</div>
          </div>
        </div>

        {/* Carte 4 */}
        <div className="absolute top-[35%] right-[22%] animate-float-card-delayed opacity-20" style={{ animationDelay: "0.5s" }}>
          <div className="w-24 h-32 bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl shadow-2xl border border-purple-500/30 -rotate-6 flex items-center justify-center backdrop-blur-sm">
            <div className="text-5xl text-purple-400 font-bold">♣</div>
          </div>
        </div>

        {/* Jetons élégants - VIOLET NÉON */}
        <div className="absolute top-[22%] left-[68%] animate-spin-elegant opacity-30">
          <div className="w-20 h-20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full"></div>
            <div className="absolute inset-2 bg-slate-900 rounded-full border-4 border-purple-400/50"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Crown className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>

        <div className="absolute bottom-[32%] right-[8%] animate-spin-elegant opacity-30" style={{ animationDelay: "1.5s" }}>
          <div className="w-20 h-20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full"></div>
            <div className="absolute inset-2 bg-slate-900 rounded-full border-4 border-purple-400/50"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Gem className="w-8 h-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Sparkles scintillants - VIOLET NÉON */}
      <div className="absolute inset-0 pointer-events-noneOpacity-70">
        {[...Array(15)].map((_, i) => (
          <div
            key={`sparkle-${i}`}
            className="absolute animate-twinkle-elegant"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          >
            <Sparkles className="w-5 h-5 text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.7)]" />
          </div>
        ))}
      </div>

      {/* Contenu principal */}
      <div className="relative z-10 size-full flex flex-col items-center justify-center p-8">
        {/* Logo avec effets sophistiqués - VIOLET NÉON */}
        <div className="mb-12 relative">
          {/* Glow pulsant */}
          <div className="absolute inset-0 -m-8">
            <div className="w-full h-full bg-gradient-to-r from-purple-500/20 via-purple-600/20 to-purple-500/20 rounded-full blur-3xl animate-pulse-glow"></div>
          </div>
          
          {/* Anneaux orbitaux - VIOLET NÉON */}
          <div className="absolute inset-0 -m-10">
            <div className="w-60 h-60 border-2 border-purple-500/20 rounded-full animate-spin-orbital"></div>
          </div>
          <div className="absolute inset-0 -m-14">
            <div className="w-68 h-68 border-2 border-purple-500/15 rounded-full animate-spin-orbital-reverse"></div>
          </div>
          <div className="absolute inset-0 -m-18">
            <div className="w-76 h-76 border border-purple-500/10 rounded-full animate-spin-orbital" style={{ animationDuration: "30s" }}></div>
          </div>

          {/* Logo - FIXE */}
          <div className="relative">
            <QuantumBluffLogo
              alt="Quantum Bluff"
              className="relative w-44 h-44Brightness-110" // Légèrement plus lumineux
              style={{
                filter: 'drop-shadow(0 0 30px rgba(168, 85, 247, 0.6))'
              }}
            />
          </div>
        </div>

        {/* Titre avec gradient animé - VIOLET NÉON */}
        <div className="text-center mb-4">
          <h1 className="text-7xl font-bold mb-2">
            <span 
              className="bg-gradient-to-r from-purple-400 via-purple-100 to-purple-400 bg-clip-text text-transparent animate-gradient-flow"
              style={{ 
                backgroundSize: '200% auto',
                textShadow: '0 0 40px rgba(168, 85, 247, 0.5)'
              }}
            >
              Quantum Bluff
            </span>
          </h1>
          <div className="flex items-center justify-center gap-2 text-slate-300"> {/* Texte plus clair */}
            <Zap className="w-5 h-5 text-purple-400 animate-pulse" />
            <p className="text-xl tracking-wider font-light">{t('startScreen.tagline')}</p>
            <Zap className="w-5 h-5 text-purple-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>
        </div>

        {/* Ligne décorative - VIOLET NÉON */}
        <div className="flex items-center gap-3 mb-12">
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
          <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
          <div className="w-16 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
        </div>

        {/* Zone de chargement / bouton Start */}
        {isLoading ? (
          <div className="flex flex-col items-center gap-8 w-full max-w-md">
            {/* Barre de progression Élégante - MODIFIÉE : PLUS FINE ET VIOLET NÉON */}
            <div className="w-full relative">
              {/* Glow de la barre */}
              <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full"></div>
              
              {/* Barre - MODIFIÉE : h-1 (au lieu de h-3) */}
              <div className="relative w-full bg-slate-950/60 rounded-full h-1 overflow-hidden backdrop-blur-sm border border-purple-500/30">
                <div
                  className="h-full bg-gradient-to-r from-purple-600 via-purple-100 to-purple-600 transition-all duration-500 ease-out relative animate-gradient-flow"
                  style={{ 
                    width: `${loadingProgress}%`,
                    backgroundSize: '200% auto',
                    boxShadow: '0 0 15px 1px rgba(168, 85, 247, 0.7)' // Effet Néon
                  }}
                >
                  {/* Brillance mobile */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>

            {/* Texte de chargement */}
            <div className="flex items-center gap-3 bg-slate-950/40 backdrop-blur-md px-6 py-3 rounded-full border border-purple-500/30">
              <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
              <span className="text-lg text-slate-100 font-medium tracking-wide"> {/* Texte clair */}
                {loadingText}
              </span>
            </div>
          </div>
        ) : (
          /* BOUTON ÉTIRÉ : rounded-full et VIOLET NÉON */
          <button
            onClick={handleStart}
            className="group relative overflow-hidden px-16 py-6 text-2xl font-bold text-white rounded-full transform transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(168,85,247,0.5)] border-2 border-purple-400/50 hover:border-purple-300"
          >
            {/* Background avec effet glass - MODIFIÉ : VIOLET NÉON */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-700/90 via-purple-400/90 to-purple-700/90 backdrop-blur-sm animate-gradient-flow" style={{ backgroundSize: '200% auto' }}></div>
            
            {/* Glow externe */}
            <div className="absolute inset-0 -m-1 bg-gradient-to-r from-purple-600 via-purple-300 to-purple-600 rounded-full blur-2xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            {/* Effet de brillance au survol */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
            
            {/* Inner shadow pour profondeur */}
            <div className="absolute inset-0 rounded-full shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),inset_0_-2px_4px_rgba(0,0,0,0.2)]"></div>
            
            {/* Texte - MODIFIÉ : BLANC ET VIOLET CLAIR */}
            <span className="relative z-10 flex items-center gap-4 tracking-wider text-white group-hover:text-purple-50 transition-colors">
              <Crown className="w-7 h-7 text-purple-100 animate-pulse" />
              {t('startScreen.startButton')}
              <Sparkles className="w-7 h-7 text-purple-100 animate-pulse" style={{ animationDelay: "0.5s" }} />
            </span>
          </button>
        )}

        {/* Badge de statut */}
        {!isLoading && (
          <div className="mt-8 flex items-center gap-2 text-slate-300 text-sm animate-fade-in"> {/* Texte clair */}
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.7)]"></div>
            <span className="tracking-wide">{t('startScreen.serverOnline')}</span>
          </div>
        )}
      </div>

      {/* Styles d'animation conservés */}
      <style>{`
        @keyframes float-particle {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0.4;
          }
          50% {
            transform: translate(30px, -40px);
            opacity: 0.7;
          }
        }

        @keyframes float-card {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-25px) rotate(12deg);
          }
        }

        @keyframes float-card-delayed {
          0%, 100% {
            transform: translateY(0px) rotate(-12deg);
          }
          50% {
            transform: translateY(-30px) rotate(-12deg);
          }
        }

        /* Animation supprimée visuellement mais conservée dans le CSS au cas où */
        @keyframes float-logo {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        @keyframes spin-elegant {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-orbital {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes spin-orbital-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes twinkle-elegant {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(180deg);
          }
        }

        @keyframes pulse-slow {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.02); }
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }

        @keyframes gradient-flow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-float-particle { animation: float-particle 8s ease-in-out infinite; }
        .animate-float-card { animation: float-card 4s ease-in-out infinite; }
        .animate-float-card-delayed { animation: float-card-delayed 5s ease-in-out infinite; }
        /* Animation retirée du logo dans le JSX */
        .animate-float-logo { animation: float-logo 3s ease-in-out infinite; }
        .animate-spin-elegant { animation: spin-elegant 12s linear infinite; }
        .animate-spin-orbital { animation: spin-orbital 20s linear infinite; }
        .animate-spin-orbital-reverse { animation: spin-orbital-reverse 25s linear infinite; }
        .animate-twinkle-elegant { animation: twinkle-elegant 3s ease-in-out infinite; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 4s ease-in-out infinite; }
        .animate-gradient-flow { animation: gradient-flow 3s ease infinite; }
        .animate-shimmer { animation: shimmer 2s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 1s ease-out; }
      `}</style>
    </div>
  );
}