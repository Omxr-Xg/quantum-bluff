import { X, Check, TrendingUp, Loader2, Activity, Eye, HelpCircle } from "lucide-react";
import { useState, useRef } from "react";
import { useDeviceType } from "./ui/use-mobile";
import { NeonButton } from "./NeonButton";

interface Card {
  suit: string;
  value: string;
}

interface PlayerDashboardProps {
  name: string;
  chips: number;
  cards: Card[];
  onFold: () => void;
  onCall: (amount: number) => void;
  onRaise: (amount: number) => void;
  callAmount: number;
  minRaise: number;
  maxRaise: number;
  isMyTurn: boolean;
  hasFolded: boolean;
  hasActed?: boolean;
  waitingForPlayer?: string;
  onToggleQuantum?: () => void;
  onToggleHiddenBets?: () => void;
  onToggleChat?: () => void;
  isQuantumOpen?: boolean;
  isHiddenBetsOpen?: boolean;
  isChatOpen?: boolean;
}

export function PlayerDashboard({
  name,
  chips,
  cards,
  onFold,
  onCall,
  onRaise,
  callAmount,
  minRaise,
  maxRaise,
  isMyTurn,
  hasFolded,
  hasActed,
  waitingForPlayer,
  onToggleQuantum,
  onToggleHiddenBets,
  isQuantumOpen,
  isHiddenBetsOpen,
}: PlayerDashboardProps) {
  const [raiseAmount, setRaiseAmount] = useState(50);
  const [showRaiseOptions, setShowRaiseOptions] = useState(false);
  const [showCustomSlider, setShowCustomSlider] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isQuantumHovered, setIsQuantumHovered] = useState(false);
  const [isQuantumPinned, setIsQuantumPinned] = useState(false);
  const [showGameHelp, setShowGameHelp] = useState(false);
  const quantumTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const isTablet = deviceType === "tablet";

  // Gestion du hover pour Probabilités Quantiques
  const handleQuantumMouseEnter = () => {
    if (!isQuantumPinned) {
      setIsQuantumHovered(true);
      if (quantumTimeoutRef.current) {
        clearTimeout(quantumTimeoutRef.current);
      }
      setTimeout(() => {
        if (!isQuantumPinned && !isQuantumOpen) {
          onToggleQuantum?.();
        }
      }, 0);
    }
  };

  const handleQuantumMouseLeave = () => {
    if (!isQuantumPinned) {
      quantumTimeoutRef.current = setTimeout(() => {
        setIsQuantumHovered(false);
        if (isQuantumOpen) {
          onToggleQuantum?.();
        }
      }, 300);
    }
  };

  const handleQuantumClick = () => {
    setIsQuantumPinned(!isQuantumPinned);
    if (isQuantumPinned) {
      setTimeout(() => onToggleQuantum?.(), 0);
    } else {
      if (!isQuantumOpen) {
        setTimeout(() => onToggleQuantum?.(), 0);
      }
    }
  };

  const getSuitSymbol = (suit: string) => {
    const suits: { [key: string]: string } = {
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      spades: "♠",
    };
    return suits[suit] || "";
  };

  const getSuitColor = (suit: string) => {
    return suit === "hearts" || suit === "diamonds"
      ? "text-red-600"
      : "text-gray-900";
  };

  const handleRaiseClick = () => {
    setShowRaiseOptions(!showRaiseOptions);
    setShowCustomSlider(false);
  };

  const handleQuickRaiseSelect = (amount: number) => {
    setRaiseAmount(amount);
  };

  const handleCustomClick = () => {
    setShowCustomSlider(true);
  };

  const handleValidateRaise = () => {
    onRaise(raiseAmount);
    setShowRaiseOptions(false);
    setShowCustomSlider(false);
    showSuccessNotification(raiseAmount);
  };

  const showSuccessNotification = (amount: number) => {
    setSuccessMessage(`$${amount.toLocaleString()} relancé`);
    setShowSuccessPopup(true);
    setTimeout(() => setShowSuccessPopup(false), 2000);
  };

  return (
    <div className="w-full shadow-2xl transition-all duration-300 relative">
      {/* Popup de succès */}
      {showSuccessPopup && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
          <div className={`bg-green-600 text-white ${isMobile ? 'px-4 py-2' : 'px-8 py-4'} rounded-2xl shadow-2xl ${isMobile ? 'border-2' : 'border-4'} border-green-400`}>
            <div className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-center`}>
              ✓ {successMessage}
            </div>
          </div>
        </div>
      )}

      <div className={`w-full ${isMobile ? 'px-4 py-1 pb-4' : 'px-25 py-1 pb-10'}`}>
        {/* Indicateur "COUCHÉ" */}
        {hasFolded && (
          <div className="text-center mb-2">
            <div className={`inline-flex items-center ${isMobile ? 'gap-2 px-4 py-1.5' : 'gap-3 px-6 py-2'} bg-red-500 text-white rounded-full font-bold ${isMobile ? 'text-sm' : 'text-lg'} shadow-xl`}>
              <X className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
              <span>{isMobile ? 'COUCHÉ' : 'COUCHÉ - Vous êtes hors du coup'}</span>
            </div>
          </div>
        )}

        {/* Indicateur "EN ATTENTE" */}
        {!isMyTurn && !hasFolded && waitingForPlayer && (
          <div className="text-center flex items-center justify-center gap-3 mb-2">
            <div className={`inline-flex items-center ${isMobile ? 'gap-2 px-4 py-1.5' : 'gap-3 px-6 py-2'} bg-blue-500 text-white rounded-full font-bold ${isMobile ? 'text-sm' : 'text-lg'} shadow-xl`}>
              <Loader2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
              <span>{isMobile ? waitingForPlayer : `En attente de ${waitingForPlayer}...`}</span>
            </div>
          </div>
        )}

        {/* Options de relance */}
        {showRaiseOptions && (
          <div className={`mb-2 bg-gray-800/95 backdrop-blur-sm rounded-xl ${isMobile ? 'px-3 py-3' : 'px-6 py-6'} ${isMobile ? 'border' : 'border-2'} border-yellow-500 shadow-xl`}>
            {!showCustomSlider ? (
              <div className={`flex flex-col ${isMobile ? 'gap-2' : 'gap-4'}`}>
                <div className={`text-white ${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-center ${isMobile ? 'mb-1' : 'mb-2'}`}>
                  {isMobile ? 'Montant' : 'Choisissez le montant de la relance'}
                </div>
                
                <div className={`grid grid-cols-5 ${isMobile ? 'gap-1.5' : 'gap-3'}`}>
                  <button
                    onClick={() => handleQuickRaiseSelect(50)}
                    className={`${isMobile ? 'py-2 px-2' : 'py-3 px-4'} rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} transition-all ${
                      raiseAmount === 50 && !showCustomSlider
                        ? "bg-yellow-500 text-gray-900 ring-4 ring-yellow-400"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    $50
                  </button>
                  <button
                    onClick={() => handleQuickRaiseSelect(100)}
                    className={`${isMobile ? 'py-2 px-2' : 'py-3 px-4'} rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} transition-all ${
                      raiseAmount === 100 && !showCustomSlider
                        ? "bg-yellow-500 text-gray-900 ring-4 ring-yellow-400"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    $100
                  </button>
                  <button
                    onClick={() => handleQuickRaiseSelect(150)}
                    className={`${isMobile ? 'py-2 px-2' : 'py-3 px-4'} rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} transition-all ${
                      raiseAmount === 150 && !showCustomSlider
                        ? "bg-yellow-500 text-gray-900 ring-4 ring-yellow-400"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    $150
                  </button>
                  <button
                    onClick={() => handleQuickRaiseSelect(200)}
                    className={`${isMobile ? 'py-2 px-2' : 'py-3 px-4'} rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} transition-all ${
                      raiseAmount === 200 && !showCustomSlider
                        ? "bg-yellow-500 text-gray-900 ring-4 ring-yellow-400"
                        : "bg-slate-700 text-white hover:bg-slate-600"
                    }`}
                  >
                    $200
                  </button>
                  <button
                    onClick={handleCustomClick}
                    className={`bg-purple-600 hover:bg-purple-500 text-white ${isMobile ? 'py-2 px-2' : 'py-3 px-4'} rounded-xl font-bold ${isMobile ? 'text-sm' : 'text-lg'} transition-all`}
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={handleValidateRaise}
                  className={`bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold ${isMobile ? 'py-2.5 px-4 text-sm' : 'py-4 px-6'} rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all`}
                >
                  {isMobile ? `Valider $${raiseAmount.toLocaleString()}` : `Valider la relance de $${raiseAmount.toLocaleString()}`}
                </button>
              </div>
            ) : (
              <div className={`flex flex-col ${isMobile ? 'gap-2' : 'gap-4'}`}>
                <div className={`text-white ${isMobile ? 'text-sm' : 'text-lg'} font-semibold text-center`}>
                  Montant personnalisé
                </div>
                <div className={`text-yellow-400 ${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-center`}>
                  ${raiseAmount.toLocaleString()}
                </div>
                <div className={`flex items-center ${isMobile ? 'gap-2' : 'gap-4'}`}>
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 whitespace-nowrap`}>
                    ${minRaise.toLocaleString()}
                  </span>
                  <input
                    type="range"
                    min={minRaise}
                    max={maxRaise}
                    value={raiseAmount}
                    onChange={(e) => setRaiseAmount(Number(e.target.value))}
                    className={`flex-1 ${isMobile ? 'h-2' : 'h-3'} bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500`}
                  />
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-gray-400 whitespace-nowrap`}>
                    ${maxRaise.toLocaleString()}
                  </span>
                </div>
                
                <div className={`flex ${isMobile ? 'gap-2' : 'gap-3'}`}>
                  <button
                    onClick={() => setShowCustomSlider(false)}
                    className={`flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'} rounded-xl transition-all`}
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleValidateRaise}
                    className={`flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold ${isMobile ? 'py-2 px-3 text-sm' : 'py-3 px-6'} rounded-xl shadow-lg transform hover:scale-105 active:scale-95 transition-all`}
                  >
                    Valider ${raiseAmount.toLocaleString()}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className={`flex items-end justify-between ${isMobile ? 'flex-col gap-2' : 'gap-4'}`}>
          {/* GAUCHE : Cartes */}
          <div className="flex relative items-end">
            {cards.map((card, index) => (
              <div
                key={index}
                className="relative transition-all duration-300 hover:z-30"
                style={{
                  marginLeft: index > 0 ? (isMobile ? '-20px' : isTablet ? '-30px' : '-40px') : '0',
                  transform: `rotate(${index === 0 ? -6 : 8}deg) translateY(${index === 0 ? '2px' : '0px'})`,
                  transformOrigin: 'bottom center',
                  zIndex: index,
                }}
              >
                <div
                  className={`relative ${
                    isMobile ? 'w-16 h-24 rounded' : isTablet ? 'w-20 h-30 rounded' : 'w-24 h-36 rounded'
                  } flex flex-col justify-between ${
                    isMobile ? 'p-1.5' : 'p-2'
                  } bg-gradient-to-br from-white via-slate-50 to-gray-200 transition-all duration-300 hover:-translate-y-6 hover:scale-110 cursor-pointer overflow-hidden group/card`}
                  style={{
                    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.9), inset -2px -2px 6px rgba(0,0,0,0.03), 0 10px 40px rgba(0,0,0,0.5)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/60 to-white/0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none transform -skew-x-12 translate-x-[-100%] group-hover/card:translate-x-[100%] z-10"></div>

                  <div className="self-start flex flex-col items-center leading-none relative z-20">
                    <div className={`${isMobile ? 'text-sm' : isTablet ? 'text-base' : 'text-xl'} font-extrabold tracking-tighter ${getSuitColor(card.suit)}`}>
                      {card.value}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-base'} ${getSuitColor(card.suit)} -mt-0.5`}>
                      {getSuitSymbol(card.suit)}
                    </div>
                  </div>

                  <div className={`${isMobile ? 'text-4xl' : isTablet ? 'text-5xl' : 'text-6xl'} self-center ${getSuitColor(card.suit)} drop-shadow-sm relative z-20`}>
                    {getSuitSymbol(card.suit)}
                  </div>

                  <div className="self-end flex flex-col items-center leading-none rotate-180 relative z-20">
                    <div className={`${isMobile ? 'text-sm' : isTablet ? 'text-base' : 'text-xl'} font-extrabold tracking-tighter ${getSuitColor(card.suit)}`}>
                      {card.value}
                    </div>
                    <div className={`${isMobile ? 'text-xs' : isTablet ? 'text-sm' : 'text-base'} ${getSuitColor(card.suit)} -mt-0.5`}>
                      {getSuitSymbol(card.suit)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CENTRE : Boutons d'action (Desktop uniquement) */}
          {!isMobile && (
            <div className="flex flex-col gap-2 flex-1 items-center">
              <div className="flex gap-2">
                {/* Bouton Se coucher - NEON ROUGE */}
                <div className="relative group">
                  <NeonButton
                    onClick={onFold}
                    disabled={!isMyTurn || hasFolded || hasActed}
                    variant="red"
                    className="w-[130px] h-[56px] rounded-full text-sm"
                  >
                    <span>Coucher</span>
                  </NeonButton>
                  {isMyTurn && !hasFolded && !hasActed && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-red-400 whitespace-nowrap">
                        <div className="font-bold mb-0.5">Se Coucher (Fold)</div>
                        <div className="text-[10px] text-gray-300">Abandonner ce coup</div>
                      </div>
                    </div>
                  )}
                  <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-red-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Bouton Suivre - NEON BLEU */}
                <div className="relative group">
                  <NeonButton
                    onClick={() => onCall(callAmount)}
                    disabled={!isMyTurn || hasFolded || hasActed}
                    variant="blue"
                    className="w-[130px] h-[56px] rounded-full text-sm relative"
                  >
                    <span>Suivre</span>
                    
                  </NeonButton>
                  
                  {isMyTurn && !hasFolded && !hasActed && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-blue-400 whitespace-nowrap">
                        <div className="font-bold mb-0.5">Suivre (Call)</div>
                        <div className="text-[10px] text-gray-300">Égaler la mise actuelle</div>
                      </div>
                    </div>
                  )}
                  <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-blue-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Bouton Relancer - NEON VERT */}
                <div className="relative group">
                  <NeonButton
                    onClick={handleRaiseClick}
                    disabled={!isMyTurn || hasFolded || hasActed}
                    variant="green"
                    icon={<TrendingUp className="w-5 h-5" />}
                    className={`w-[130px] h-[56px] rounded-full text-sm ${
                      showRaiseOptions ? "ring-2 ring-yellow-400/50" : ""
                    }`}
                  >
                    Relancer
                  </NeonButton>
                  {isMyTurn && !hasFolded && !hasActed && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-green-400 whitespace-nowrap">
                        <div className="font-bold mb-0.5">Relancer (Raise)</div>
                        <div className="text-[10px] text-gray-300">Augmenter la mise</div>
                      </div>
                    </div>
                  )}
                  <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-green-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          )}

          {/* Mobile : Boutons d'action Mobile - Version compacte 3 boutons côte à côte */}
          {isMobile && (
            <div className="flex gap-1.5 px-2 h-[48px]">
              <div className="relative group flex-1">
                <button
                  onClick={onFold}
                  disabled={!isMyTurn || hasFolded || hasActed}
                  className={`relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 text-white w-full h-full rounded-full shadow-xl border-2 border-red-500 transition-all transform ${
                    isMyTurn && !hasFolded && !hasActed
                      ? "hover:from-red-500 hover:to-red-600 hover:scale-105 active:scale-95 cursor-pointer"
                      : "opacity-50 cursor-not-allowed grayscale"
                  }`}
                >
                  <div className="flex items-center justify-center relative z-10 w-full h-full">
                    <div className="font-bold text-xs">COUCHER</div>
                  </div>
                </button>
                <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-red-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="relative group flex-1">
                <button
                  onClick={() => onCall(callAmount)}
                  disabled={!isMyTurn || hasFolded || hasActed}
                  className={`relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 text-white w-full h-full rounded-full shadow-xl border-2 border-blue-500 transition-all transform ${
                    isMyTurn && !hasFolded && !hasActed
                      ? "hover:from-blue-500 hover:to-blue-600 hover:scale-105 active:scale-95 cursor-pointer"
                      : "opacity-50 cursor-not-allowed grayscale"
                  }`}
                >
                  <div className="flex items-center justify-center relative z-10 w-full h-full">
                    <div className="font-bold text-xs">SUIVRE</div>
                    <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-normal text-white/70">
                      ${callAmount.toLocaleString()}
                    </div>
                  </div>
                </button>
                <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-blue-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="relative group flex-1">
                <button
                  onClick={handleRaiseClick}
                  disabled={!isMyTurn || hasFolded || hasActed}
                  className={`relative overflow-hidden bg-gradient-to-br from-green-600 to-green-700 text-white w-full h-full rounded-full shadow-xl border-2 transition-all transform ${
                    isMyTurn && !hasFolded && !hasActed
                      ? showRaiseOptions
                        ? "border-yellow-400 ring-1 ring-yellow-400/50 hover:scale-105 cursor-pointer"
                        : "border-green-500 hover:from-green-500 hover:to-green-600 hover:scale-105 active:scale-95 cursor-pointer"
                      : "opacity-50 cursor-not-allowed grayscale border-green-500"
                  }`}
                >
                  <div className="flex items-center gap-1 justify-center relative z-10 w-full h-full">
                    <TrendingUp className="w-4 h-4" />
                    <div className="font-bold text-xs">RELANCER</div>
                  </div>
                </button>
                <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-green-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}

          {/* DROITE : Boutons utilitaires (Paris, Probas) - Desktop uniquement */}
          {!isMobile && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {/* Bouton Paris */}
                {onToggleHiddenBets && (
                  <div className="relative group">
                    <NeonButton
                      onClick={onToggleHiddenBets}
                      variant="gold"
                      icon={<Eye className="w-4 h-4" />}
                      className={`px-3 py-2 rounded-full w-[130px] text-xs ${
                        isHiddenBetsOpen
                          ? "ring-2 ring-yellow-300/50"
                          : ""
                      }`}
                    >
                      Paris
                    </NeonButton>
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-yellow-400 whitespace-nowrap">
                        <div className="font-bold mb-0.5">Paris Cachés</div>
                        <div className="text-[10px] text-gray-300">Pariez sur le résultat du coup</div>
                      </div>
                    </div>
                    <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-yellow-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}

                {/* Bouton Probas */}
                {onToggleQuantum && (
                  <div className="relative group">
                    <NeonButton
                      onClick={handleQuantumClick}
                      variant="amber"
                      icon={<Activity className="w-4 h-4" />}
                      className={`px-3 py-2 rounded-full w-[75px] text-xs ${
                        isQuantumOpen || isQuantumPinned
                          ? "ring-2 ring-amber-300/50"
                          : ""
                      }`}
                    >
                      Probas
                    </NeonButton>
                    {isQuantumPinned && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-white rounded-full z-20"></div>
                    )}
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-amber-400 whitespace-nowrap">
                        <div className="font-bold mb-0.5">Probabilités Quantiques</div>
                        <div className="text-[10px] text-gray-300">Survoler pour ouvrir, cliquer pour épingler</div>
                      </div>
                    </div>
                    <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-amber-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mobile : Boutons utilitaires */}
          {isMobile && (
            <div className="w-full flex items-center justify-center gap-1.5 mb-2">
              {onToggleQuantum && (
                <div className="relative group">
                  <button
                    onClick={handleQuantumClick}
                    onMouseEnter={handleQuantumMouseEnter}
                    onMouseLeave={handleQuantumMouseLeave}
                    className={`relative overflow-hidden bg-gradient-to-br from-purple-600 to-purple-700 text-white px-2 py-1.5 rounded-full shadow-lg border-2 transition-all transform hover:scale-105 w-auto ${
                      isQuantumOpen || isQuantumPinned
                        ? "border-purple-300 ring-2 ring-purple-300/50"
                        : "border-purple-500"
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center relative z-10">
                      <Activity className="w-3 h-3" />
                    </div>
                    {isQuantumPinned && (
                      <div className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-400 rounded-full"></div>
                    )}
                  </button>
                  <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-purple-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {onToggleHiddenBets && (
                <div className="relative group">
                  <button
                    onClick={onToggleHiddenBets}
                    className={`relative overflow-hidden bg-gradient-to-br from-yellow-600 to-yellow-700 text-white px-2 py-1.5 rounded-full shadow-lg border-2 transition-all transform hover:scale-105 w-auto ${
                      isHiddenBetsOpen
                        ? "border-yellow-300 ring-2 ring-yellow-300/50"
                        : "border-yellow-500"
                    }`}
                  >
                    <div className="flex items-center gap-1 justify-center relative z-10">
                      <Eye className="w-3 h-3" />
                    </div>
                  </button>
                  <HelpCircle className="absolute -top-1 -right-1 w-4 h-4 text-white bg-yellow-900 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal d'aide du jeu */}
      {showGameHelp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setShowGameHelp(false)}>
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border-2 border-indigo-500 shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                <HelpCircle className="w-8 h-8 text-indigo-400" />
                Guide de Quantum Bluff
              </h2>
              <button onClick={() => setShowGameHelp(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 text-white">
              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🎮 Objectif du Jeu</h3>
                <p className="text-gray-300">Remporter les jetons des autres joueurs en ayant la meilleure main de poker ou en les faisant se coucher.</p>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🃏 Actions Principales</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><strong className="text-red-400">Coucher (Fold)</strong> : Abandonner le coup en cours</li>
                  <li><strong className="text-blue-400">Suivre (Call)</strong> : Égaler la mise actuelle</li>
                  <li><strong className="text-green-400">Relancer (Raise)</strong> : Augmenter la mise</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">✨ Fonctionnalités Spéciales</h3>
                <ul className="space-y-2 text-gray-300">
                  <li><strong className="text-purple-400">Probabilités Quantiques</strong> : Survolez pour voir vos chances de gagner, cliquez pour épingler</li>
                  <li><strong className="text-yellow-400">Paris Cachés</strong> : Pariez discrètement sur le résultat du coup</li>
                </ul>
              </section>

              <section>
                <h3 className="text-xl font-bold text-indigo-400 mb-2">🏆 Combinaisons de Poker (du plus fort au plus faible)</h3>
                <ol className="space-y-1 text-gray-300 list-decimal list-inside">
                  <li>Quinte Flush Royale</li>
                  <li>Quinte Flush</li>
                  <li>Carré</li>
                  <li>Full</li>
                  <li>Couleur</li>
                  <li>Suite</li>
                  <li>Brelan</li>
                  <li>Double Paire</li>
                  <li>Paire</li>
                  <li>Carte Haute</li>
                </ol>
              </section>
            </div>

            <button
              onClick={() => setShowGameHelp(false)}
              className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold py-3 px-6 rounded-xl transition-all transform hover:scale-105"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </div>
  );
}