import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useUser } from "../hooks/useUser";

interface Challenge {
  id: number;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
}

export function DailyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const { userId } = useUser(); 

  // FETCH CHALLENGES
  const fetchChallenges = async () => {
    if (!userId) return;

    try {
      const res = await fetch(
        `http://localhost:3000/api/daily-challenges/${userId}`
      );

      const data = await res.json();

      setChallenges(data.challenges || []); 
    } catch (err) {
      console.error("DailyChallenges error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [userId]); 

  // CLAIM REWARD
  const handleClaim = async (challengeId: number) => {
    try {
      const res = await fetch(
        "http://localhost:3000/api/daily-challenges/claim",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
            challengeId,
          }),
        }
      );

      const data = await res.json();

      if (data.success) {
        await fetchChallenges(); // refresh
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error("Claim error:", err);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-2xl p-5 border border-yellow-500 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">
          🎯 Daily Challenges
        </h2>
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-yellow-500 shadow-lg">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        🎯 Daily Challenges
      </h2>

      {challenges.length === 0 && (
        <p className="text-gray-400 text-sm">No challenges available</p>
      )}

      <div className="space-y-3">
        {challenges.map((c) => {
          const percent =
            c.goal > 0 ? Math.min(100, (c.progress / c.goal) * 100) : 0;

          return (
            <div
              key={c.id}
              className={`p-3 rounded-lg border transition ${
                c.completed
                  ? "bg-green-900/30 border-green-500"
                  : "bg-slate-700 border-slate-600"
              }`}
            >
              {/* TEXT */}
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-white flex items-center gap-2">
                  {c.completed && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  Challenge #{c.id}
                </span>

                <span className="text-gray-400">
                  {c.progress}/{c.goal}
                </span>
              </div>

              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-600 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    c.completed ? "bg-green-400" : "bg-yellow-400"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* CLAIM BUTTON */}
              {c.completed && !c.claimed && (
                <button
                  className="mt-3 w-full bg-green-500 py-2 rounded hover:bg-green-600 transition"
                  onClick={() => handleClaim(c.id)}
                >
                  Claim Reward
                </button>
              )}

              {/* CLAIMED */}
              {c.claimed && (
                <div className="text-green-400 text-xs mt-2">
                  ✔ Reward claimed
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}