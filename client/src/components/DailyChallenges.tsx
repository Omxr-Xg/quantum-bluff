import React, { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { apiUrl } from "../utils/apiBase";
import { useTranslation } from "react-i18next";

interface Challenge {
  code: string;
  i18nKey: string;
  progress: number;
  goal: number;
  completed: boolean;
  claimed: boolean;
  rewardTokens: number;
}

export function DailyChallenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  const { userId } = useUser();

  // FETCH CHALLENGES
  const fetchChallenges = async () => {
    if (!userId) {
      setChallenges([]);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setChallenges([]);
        setError("Missing auth token");
        return;
      }

      const res = await fetch(apiUrl("/api/daily-challenges/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setChallenges([]);
        setError(data?.error || `HTTP ${res.status}`);
        return;
      }

      setChallenges(data.challenges || []); 
      setError(null);
    } catch (err) {
      console.error("DailyChallenges error:", err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [userId]); 

  // CLAIM REWARD
  const handleClaim = async (challengeCode: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Missing auth token");
        return;
      }

      const res = await fetch(apiUrl(`/api/daily-challenges/${challengeCode}/claim`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (data.success) {
        setError(null);
        await fetchChallenges(); // refresh
      } else {
        console.error(data.error);
        setError(data?.error || "Claim failed");
      }
    } catch (err) {
      console.error("Claim error:", err);
      setError("Claim network error");
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
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}

      <div className="space-y-3">
        {challenges.map((c) => {
          const percent =
            c.goal > 0 ? Math.min(100, (c.progress / c.goal) * 100) : 0;

          return (
            <div
              key={c.code}
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
                  {t(c.i18nKey)}
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
              <div className="text-yellow-300 text-xs mt-2">
                {t("dailyChallenges.reward")} {c.rewardTokens}
              </div>

              {/* CLAIM BUTTON */}
              {c.completed && !c.claimed && (
                <button
                  className="mt-3 w-full bg-green-500 py-2 rounded hover:bg-green-600 transition"
                  onClick={() => handleClaim(c.code)}
                >
                  {t("dailyChallenges.claimReward")}
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