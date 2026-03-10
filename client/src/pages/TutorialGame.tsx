import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Play } from "lucide-react";
import { PokerTable } from "../components/PokerTable";
import { CommunityCards } from "../components/CommunityCards";
import { QuantumBluffLogo } from "../assets/logo";

export function TutorialGame() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const players = [
    { id: 1, name: "Bot Alpha", chips: 5000, bet: 50, position: 1, isActive: true, isDealer: false, cards: ["", ""], isConnected: true },
    { id: 2, name: "Bot Beta", chips: 4500, bet: 50, position: 2, isActive: false, isDealer: false, cards: ["", ""], isConnected: true },
    { id: 3, name: "Bot Gamma", chips: 5500, bet: 50, position: 3, isActive: false, isDealer: false, cards: ["", ""], isConnected: true },
    {
      id: 4,
      name: "Vous",
      chips: 7000,
      bet: 0,
      position: 0,
      isActive: false,
      isDealer: false,
      cards: [
        { suit: "hearts", value: "10" },
        { suit: "hearts", value: "9" },
      ],
      isConnected: true,
    },
  ];

  const communityCards = [
    { suit: "hearts", value: "A" },
    { suit: "diamonds", value: "K" },
    { suit: "clubs", value: "Q" },
    { suit: "spades", value: "J" },
    null,
  ];

  const heroCards = [
    { suit: "hearts", value: "10" },
    { suit: "hearts", value: "9" },
  ];

  const tutorialSteps = [
    {
      title: "Bienvenue à la table de poker !",
      message: "Laissez-moi vous expliquer comment jouer. Suivez le guide !",
      highlight: null,
      position: "center",
    },
    {
      title: "Vos cartes",
      message: "Ça c'est votre carte 1 et votre carte 2 ! Ce sont vos cartes privées que vous seul pouvez voir. Elles déterminent votre main.",
      highlight: "player-cards",
      position: "bottom-center",
      arrow: "up",
    },
    {
      title: "Les cartes communes",
      message: "Ici ce sont les cartes du deck partagées par tous les joueurs ! Elles se révèlent progressivement au cours de la partie.",
      highlight: "community-cards",
      position: "top-center",
      arrow: "down",
    },
    {
      title: "Le Pot",
      message: "C'est le montant total des mises de tous les joueurs. Le gagnant de la manche remporte le pot !",
      highlight: "pot",
      position: "top-center",
      arrow: "down",
    },
    {
      title: "Bouton COUCHER (Fold)",
      message: "Appuyez sur COUCHER si vous n'aimez pas vos cartes et voulez abandonner cette manche. Vous ne perdrez que votre mise actuelle.",
      highlight: "fold-button",
      position: "bottom-left",
      arrow: "up",
    },
    {
      title: "Bouton SUIVRE (Call)",
      message: "Appuyez sur SUIVRE si vos cartes sont correctes et que vous voulez égaler la mise actuelle pour continuer à jouer.",
      highlight: "call-button",
      position: "bottom-center",
      arrow: "up",
    },
    {
      title: "Bouton RELANCER (Raise)",
      message: "Appuyez sur RELANCER si vous pensez avoir une combinaison gagnante ! Augmentez la mise pour mettre la pression sur vos adversaires.",
      highlight: "raise-button",
      position: "bottom-right",
      arrow: "up",
    },
    {
      title: "Vous êtes prêt !",
      message: "Maintenant vous connaissez les bases ! Bonne chance à la table de poker !",
      highlight: null,
      position: "center",
    },
  ];

  const currentStep = tutorialSteps[step];

  const handleNext = () => {
    if (step < tutorialSteps.length - 1) {
      setStep(step + 1);
    } else {
      navigate("/lobby");
    }
  };

  const handleSkip = () => {
    navigate("/lobby");
  };

  const getHighlightStyle = (elementId: string | null) => {
    if (!elementId || currentStep.highlight !== elementId) return {};

    return {
      animation: "pulse-highlight 2s ease-in-out infinite",
      boxShadow: "0 0 0 4px rgba(234, 179, 8, 0.8), 0 0 30px 10px rgba(234, 179, 8, 0.6)",
      position: "relative" as const,
      zIndex: 60,
      borderRadius: "1rem",
    };
  };

  const getDialogPosition = () => {
    switch (currentStep.position) {
      case "top-center":
        return "top-32 left-1/2 -translate-x-1/2";
      case "bottom-center":
        return "bottom-48 left-1/2 -translate-x-1/2";
      case "bottom-left":
        return "bottom-48 left-8";
      case "bottom-right":
        return "bottom-48 right-8";
      case "center":
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default:
        return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
    }
  };

  const getArrowStyle = () => {
    switch (currentStep.arrow) {
      case "up":
        return "top-full left-1/2 -translate-x-1/2 mt-2 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[20px] border-t-yellow-400";
      case "down":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-b-[20px] border-b-yellow-400";
      default:
        return "";
    }
  };

  return (
    <div className="size-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col overflow-hidden relative">
      {/* Fenêtre de dialogue */}
      <div className={`fixed ${getDialogPosition()} z-[70] max-w-lg animate-bounce-in`}>
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-950 rounded-2xl border-4 border-yellow-400 shadow-2xl p-6 relative">
          {/* Badge étape */}
          <div className="absolute -top-4 -right-4 bg-gradient-to-br from-purple-400 to-purple-600 text-white font-bold text-sm px-4 py-2 rounded-full shadow-lg border-2 border-purple-300">
            {step + 1} / {tutorialSteps.length}
          </div>

          {/* Icône */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg">
              <Play className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">
              {currentStep.title}
            </h2>
          </div>

          {/* Message */}
          <p className="text-yellow-100 text-lg leading-relaxed mb-6">
            {currentStep.message}
          </p>

          {/* Boutons */}
          <div className="flex gap-3">
            <button
              onClick={handleSkip}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Passer
            </button>
            <button
              onClick={handleNext}
              className="flex-1 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-yellow-600/50 flex items-center justify-center gap-2"
            >
              {step < tutorialSteps.length - 1 ? "Suivant" : "Terminé"}
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Flèche pointant vers l'élément */}
        {currentStep.arrow && (
          <div className={`absolute w-0 h-0 animate-bounce ${getArrowStyle()}`}></div>
        )}
      </div>

      {/* Barre de navigation - En haut */}
      <div className="absolute top-4 left-8 right-8 z-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <QuantumBluffLogo className="w-12 h-12 drop-shadow-2xl" />
          <div>
            <h1 className="text-xl font-bold text-white">Quantum Bluff</h1>
            <p className="text-gray-400 text-sm">Tutoriel - Table de poker</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-white font-bold text-lg">🪙 7,000</div>
        </div>
      </div>

      {/* Zone centrale - Table de poker */}
      <div className="flex-1 flex items-center justify-center relative px-6 pt-24">
        <div style={getHighlightStyle("pot")}>
          <PokerTable players={players} communitySafeZone={230}>
            <div style={getHighlightStyle("community-cards")}>
              <CommunityCards cards={communityCards} pot={500} />
            </div>
          </PokerTable>
        </div>
      </div>

      {/* Dashboard du joueur - EN BAS */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent backdrop-blur-sm">
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex items-center justify-between gap-4">
            {/* GAUCHE : Cartes du joueur */}
            <div className="flex flex-col gap-3">
              <div className="flex gap-3" style={getHighlightStyle("player-cards")}>
                {heroCards.map((card, index) => {
                  const suitSymbols: Record<string, string> = {
                    hearts: "♥",
                    diamonds: "♦",
                    clubs: "♣",
                    spades: "♠",
                  };

                  const suitColors: Record<string, string> = {
                    hearts: "text-red-600",
                    diamonds: "text-red-600",
                    clubs: "text-black",
                    spades: "text-black",
                  };

                  return (
                    <div
                      key={index}
                      className="w-24 h-36 bg-white rounded-xl shadow-2xl border-4 border-yellow-400 flex flex-col items-center justify-center relative transform hover:scale-105 transition-transform"
                    >
                      <div className={`text-5xl font-bold ${suitColors[card.suit]}`}>
                        {card.value}
                      </div>
                      <div className={`text-4xl ${suitColors[card.suit]}`}>
                        {suitSymbols[card.suit]}
                      </div>
                      {/* Badge "Votre carte" */}
                      <div className="absolute -top-2 -right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="text-center">
                <div className="text-white font-bold text-xl">Vous</div>
                <div className="text-gray-400 text-sm">Vos jetons: 🪙 7,000</div>
              </div>
            </div>

            {/* CENTRE : Boutons d'action */}
            <div className="flex flex-col gap-2 flex-1 items-center">
              <div className="flex gap-3">
                {/* Bouton Se coucher */}
                <div style={getHighlightStyle("fold-button")}>
                  <button
                    className="group relative overflow-hidden px-6 py-5 text-lg font-bold text-white rounded-xl shadow-2xl transform transition-all duration-300"
                    style={{
                      background: "transparent",
                      border: "3px solid rgb(239, 68, 68)",
                      boxShadow: "0 0 11px 2px rgba(239, 68, 68, 0.6)",
                    }}
                  >
                    <div className="flex items-center gap-2 relative z-10">
                      <X className="w-6 h-6" />
                      COUCHER
                    </div>
                  </button>
                </div>

                {/* Bouton Suivre */}
                <div style={getHighlightStyle("call-button")}>
                  <button
                    className="group relative overflow-hidden px-6 py-5 text-lg font-bold text-white rounded-xl shadow-2xl transform transition-all duration-300"
                    style={{
                      background: "transparent",
                      border: "3px solid rgb(59, 130, 246)",
                      boxShadow: "0 0 11px 2px rgba(59, 130, 246, 0.6)",
                    }}
                  >
                    <div className="flex items-center gap-2 relative z-10">
                      <Check className="w-6 h-6" />
                      SUIVRE
                    </div>
                  </button>
                </div>

                {/* Bouton Relancer */}
                <div style={getHighlightStyle("raise-button")}>
                  <button
                    className="group relative overflow-hidden px-6 py-5 text-lg font-bold text-white rounded-xl shadow-2xl transform transition-all duration-300"
                    style={{
                      background: "transparent",
                      border: "3px solid rgb(7, 221, 0)",
                      boxShadow: "0 0 11px 2px rgba(7, 221, 0, 0.6)",
                    }}
                  >
                    <div className="flex items-center gap-2 relative z-10">
                      <TrendingUp className="w-6 h-6" />
                      RELANCER
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* DROITE : Espace vide pour équilibre */}
            <div className="w-[200px]"></div>
          </div>
        </div>
      </div>

      {/* Styles d'animation */}
      <style>{`
        @keyframes bounce-in {
          0% {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
          }
          50% {
            transform: translateY(10px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes pulse-highlight {
          0%, 100% {
            box-shadow: 0 0 0 4px rgba(234, 179, 8, 0.8), 0 0 30px 10px rgba(234, 179, 8, 0.6);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(234, 179, 8, 1), 0 0 50px 20px rgba(234, 179, 8, 0.8);
          }
        }

        .animate-bounce-in {
          animation: bounce-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}