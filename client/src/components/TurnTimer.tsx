import { Clock } from "lucide-react";
import { useState, useEffect } from "react";

interface TurnTimerProps {
  isMyTurn: boolean;
  maxTime?: number;
}

export function TurnTimer({ isMyTurn, maxTime = 30 }: TurnTimerProps) {
  const [timeLeft, setTimeLeft] = useState(maxTime);

  useEffect(() => {
    if (!isMyTurn) {
      setTimeLeft(maxTime);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, maxTime]);

  if (!isMyTurn) return null;

  const percentage = (timeLeft / maxTime) * 100;
  const isUrgent = percentage < 30;
  const isCritical = percentage < 15;

  return (
    <div
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all ${
        isCritical
          ? "bg-red-600 text-white animate-pulse"
          : isUrgent
          ? "bg-orange-600 text-white"
          : "bg-blue-600 text-white"
      }`}
    >
      <Clock className={`w-5 h-5 ${isCritical ? "animate-bounce" : ""}`} />
      <span className="text-lg tabular-nums">{timeLeft}s</span>
    </div>
  );
}