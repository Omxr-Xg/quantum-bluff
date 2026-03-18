import {
  X,
  Trophy,
  Target,
  TrendingUp,
  DollarSign,
  GripVertical,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, useRef, useCallback } from "react";
import { useHiddenBets } from "../contexts/HiddenBetsContext";
import { useDeviceType } from "./ui/use-mobile";
import { ChipIcon } from "./ChipIcon";

interface HiddenBetsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  players: { id: string | number; name: string }[];
  combinations?: string[];
}

export function HiddenBetsPanel({
  isOpen,
  onToggle,
  players,
  combinations = [
    "Paire",
    "Double Paire",
    "Brelan",
    "Quinte",
    "Couleur",
    "Full",
    "Carré",
    "Quinte Flush",
    "Quinte Flush Royale",
  ],
}: HiddenBetsPanelProps) {
  const [selectedType, setSelectedType] = useState<"winner" | "combination">(
    "winner"
  );
  const [selectedChoice, setSelectedChoice] = useState("");
  const [amount, setAmount] = useState(50);
  const [isPlacing, setIsPlacing] = useState(false);

  const { placeBet, totalBets, totalAmount } = useHiddenBets();
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";
  const [position, setPosition] = useState({ x: 20, y: 96 });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    dragging.current = true;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragOffset.current = { x: clientX - position.x, y: clientY - position.y };
    e.preventDefault();

    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;
      const cx = "touches" in ev ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = "touches" in ev ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      setPosition({ x: cx - dragOffset.current.x, y: cy - dragOffset.current.y });
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
  }, [position]);

  const getOdds = (type: "winner" | "combination", choice: string) => {
    if (type === "winner") {
      return (players.length * 1.5).toFixed(1);
    }
    const rare = ["Quinte Flush Royale", "Quinte Flush", "Carré"];
    return rare.includes(choice) ? "8.0" : "4.5";
  };

  const handlePlaceBet = async () => {
    if (!selectedChoice || amount < 10) return;

    setIsPlacing(true);
    await placeBet({
      playerName: "Vous",
      playerId: "current-player",
      betType: selectedType,
      betChoice: selectedChoice,
      amount,
    });
    setIsPlacing(false);
    setSelectedChoice("");
    setAmount(50);
  };

  const winnerChoices = players.map((p) => p.name);
  const displayedChoices =
    selectedType === "winner" ? winnerChoices : combinations;

  const panelClassName = isMobile
    ? "fixed z-[60] left-2 right-2 top-20 md:top-24 max-h-[85vh] overflow-y-auto bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-yellow-500 shadow-2xl"
    : "fixed z-[60] w-80 md:w-96 bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-md rounded-2xl border-2 border-yellow-500 shadow-2xl";

  const panelStyle = isMobile ? undefined : { left: position.x, top: position.y };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25 }}
          className={panelClassName}
          style={panelStyle}
        >
          {/* Header with drag handle */}
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 touch-none"
                onMouseDown={onDragStart}
                onTouchStart={onDragStart}
              >
                <GripVertical className="w-5 h-5" />
              </div>
              <div className="w-8 h-8 bg-yellow-600 rounded-full flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
              <h3 className="text-white font-bold">Paris Cachés</h3>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-4 py-3 bg-slate-700/30 border-b border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Paris en cours</span>
              <span className="text-white font-bold">{totalBets}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-400">Total misé</span>
              <span className="text-yellow-400 font-bold">
                {totalAmount} <ChipIcon size="sm" className="inline-block align-middle ml-0.5" />
              </span>
            </div>
          </div>

          {/* Type de pari */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-gray-400 text-sm mb-3">Type de pari</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedType("winner")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                  selectedType === "winner"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                }`}
              >
                <Target className="w-4 h-4 inline mr-2" />
                Gagnant
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("combination")}
                className={`flex-1 py-2 px-3 rounded-lg font-semibold transition-all ${
                  selectedType === "combination"
                    ? "bg-purple-600 text-white"
                    : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-2" />
                Combinaison
              </button>
            </div>
          </div>

          {/* Choix */}
          <div className="p-4 border-b border-slate-700">
            <div className="text-gray-400 text-sm mb-3">
              {selectedType === "winner"
                ? "Choisir le gagnant"
                : "Choisir la combinaison"}
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {displayedChoices.map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setSelectedChoice(item)}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    selectedChoice === item
                      ? selectedType === "winner"
                        ? "bg-blue-600 text-white"
                        : "bg-purple-600 text-white"
                      : "bg-slate-700 text-gray-300 hover:bg-slate-600"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {/* Montant + cote */}
          <div className="p-4 border-b border-slate-700">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="text-gray-400 text-xs mb-2">Montant</div>
                <div className="flex items-center bg-slate-700 rounded-lg overflow-hidden">
                  <DollarSign className="w-5 h-5 text-gray-400 ml-3" />
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    value={amount}
                    onChange={(e) =>
                      setAmount(
                        Math.min(
                          1000,
                          Math.max(10, parseInt(e.target.value, 10) || 0)
                        )
                      )
                    }
                    className="w-full bg-transparent text-white p-2 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-gray-400 text-xs mb-2">Cote</div>
                <div className="bg-slate-700 rounded-lg p-2 text-center">
                  <span className="text-yellow-400 font-bold">
                    x
                    {selectedChoice
                      ? getOdds(selectedType, selectedChoice)
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
            {selectedChoice && (
              <div className="mt-3 text-sm">
                <span className="text-gray-400">Gain potentiel :</span>
                <span className="text-green-400 font-bold ml-2">
                  {Math.round(
                    amount * parseFloat(getOdds(selectedType, selectedChoice))
                  )}{" "}
                  <ChipIcon size="sm" className="inline-block align-middle" />
                </span>
              </div>
            )}
          </div>

          {/* Bouton placer le pari */}
          <div className="p-4">
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={!selectedChoice || amount < 10 || isPlacing}
              className={`w-full py-3 rounded-xl font-bold transition-all ${
                selectedChoice && !isPlacing
                  ? "bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white shadow-lg"
                  : "bg-slate-700 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isPlacing ? "Mise en cours..." : "Placer le pari secret"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
