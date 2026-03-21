import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react"; // Plus besoin d'AnimatePresence ici
import { Trophy, Crown, Sparkles, Clock } from "lucide-react";

interface RoundTransitionProps {
  roundNumber: number;
  winner?: {
    name: string;
    amount: number;
  };
  duration?: number;
  onComplete: () => void;
}

export function RoundTransition({ 
  roundNumber, 
  winner, 
  duration = 6,
  onComplete 
}: RoundTransitionProps) {
  const [countdown, setCountdown] = useState(duration);
  
  // FIX 2 : On garde onComplete dans une ref pour éviter les re-renders du timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => onCompleteRef.current(), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []); // Plus de dépendance toxique ici !

  return (
    // FIX 1 : Retrait du AnimatePresence local. Le motion.div gère son apparition/sortie.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)",
        backdropFilter: "blur(10px)"
      }}
    >
      {/* Particules d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/40 rounded-full"
            initial={{ 
              // FIX 3 : Utilisation de 'vw' et 'vh' pour éviter les crashs liés à window
              x: `${Math.random() * 100}vw`, 
              y: "-10px",
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{ 
              y: "110vh",
              opacity: [0, 1, 1, 0]
            }}
            transition={{ 
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      <div className="relative z-10 text-center">
        {/* Résultat de la manche précédente */}
        {winner && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-yellow-600/20 via-yellow-500/30 to-yellow-600/20 
                          border-2 border-yellow-500/50 rounded-2xl px-8 py-4 backdrop-blur-md"
            >
              <Crown className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
              <div className="text-left">
                <p className="text-sm text-yellow-200/80 font-serif">Gagnant de la manche</p>
                <p className="text-2xl font-bold text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.6)]">
                  {winner.name}
                </p>
                <p className="text-lg text-yellow-400/90 font-semibold">
                  +{winner.amount.toLocaleString()} jetons
                </p>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
            </div>
          </motion.div>
        )}


          {/* Timer de compte à rebours */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative"
          >
            {/* Cercle externe pulsant */}
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 0.2, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 -m-8 rounded-full border-4 border-yellow-400/30"
            />

            {/* Cercle principal avec gradient */}
            <div className="relative w-64 h-64 mx-auto">
              {/* Gradient de fond */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-yellow-600/20 via-amber-500/30 to-yellow-700/20 
                            backdrop-blur-xl border-4 border-yellow-500/50 shadow-[0_0_60px_20px_rgba(251,191,36,0.3)]"
              />
              
              {/* Timer circulaire animé */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="rgba(251,191,36,0.2)"
                  strokeWidth="6"
                  fill="none"
                />
                <motion.circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  stroke="url(#gradient)"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 1 }}
                  animate={{ pathLength: countdown / duration }}
                  transition={{ duration: 1, ease: "linear" }}
                  style={{
                    filter: "drop-shadow(0 0 8px rgba(251,191,36,0.8))"
                  }}
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Contenu central */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.div
                  key={countdown}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <p className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-yellow-200 via-yellow-400 to-amber-600 
                               drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] font-serif">
                    {countdown}
                  </p>
                  <p className="text-sm text-yellow-200/80 mt-2 tracking-widest uppercase font-semibold">
                    {countdown === 1 ? "seconde" : "secondes"}
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Étoiles décoratives */}
            <div className="absolute -top-4 -left-4">
              <motion.div
                animate={{ 
                  rotate: 360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              </motion.div>
            </div>
            <div className="absolute -bottom-4 -right-4">
              <motion.div
                animate={{ 
                  rotate: -360,
                  scale: [1, 1.2, 1]
                }}
                transition={{ 
                  rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                  scale: { duration: 2, repeat: Infinity, ease: "easeInOut", delay: 1 }
                }}
              >
                <Sparkles className="w-8 h-8 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" />
              </motion.div>
            </div>
          </motion.div>

          {/* Message principal */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <div className="inline-flex items-center gap-3 bg-slate-900/80 border-2 border-yellow-500/30 rounded-xl px-6 py-3 backdrop-blur-md">
              <Clock className="w-5 h-5 text-yellow-400" />
              <p className="text-xl font-serif text-yellow-100">
                Prochaine manche dans...
              </p>
            </div>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-4 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500"
            >
              Manche #{roundNumber}
            </motion.p>
          </motion.div>

          {/* Barre de progression en bas */}
          <motion.div
            className="absolute bottom-12 left-1/2 -translate-x-1/2 w-96"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden border border-yellow-500/20">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-600 via-yellow-500 to-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.6)]"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: duration, ease: "linear" }}
              />
            </div>
          </motion.div>
        </div>

        {/* Effet de lumière rayonnante */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(circle at center, rgba(251,191,36,0.1) 0%, transparent 70%)"
          }}
          animate={{
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>
  );
}
