import { useState } from "react";
import { useDeviceType } from "../ui/use-mobile";

interface ActionControlsProps {
  onFold?: () => void;
  onCheck?: () => void;
  onCall?: () => void;
  onRaise?: (amount: number) => void;
  minRaise?: number;
  maxRaise?: number;
  playerChips?: number;
  currentBet?: number;
  isPlayerTurn?: boolean;
}

export const ActionControls = ({
  onFold,
  onCheck,
  onCall,
  onRaise,
  minRaise = 20,
  maxRaise = 1000,
  playerChips = 1000,
  currentBet = 0,
  isPlayerTurn = true,
}: ActionControlsProps) => {
  const [raiseAmount, setRaiseAmount] = useState(minRaise);
  const deviceType = useDeviceType();
  const isMobile = deviceType === "mobile";

  if (!isPlayerTurn) return null;

  return (
    <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 p-4 bg-gray-800 rounded-lg`}>
      <button
        onClick={onFold}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        Fold
      </button>
      <button
        onClick={onCheck}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Check
      </button>
      <button
        onClick={onCall}
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Call {currentBet}
      </button>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={minRaise}
          max={maxRaise}
          value={raiseAmount}
          onChange={(e) => setRaiseAmount(Number(e.target.value))}
          className="w-32"
        />
        <span>{raiseAmount}</span>
        <button
          onClick={() => onRaise?.(raiseAmount)}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
        >
          Raise
        </button>
      </div>
    </div>
  );
};
