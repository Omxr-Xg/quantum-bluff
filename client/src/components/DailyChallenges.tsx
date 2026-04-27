import React, { useEffect, useState } from "react";
import { CheckCircle, Target } from "lucide-react";
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
  /** Clé i18n (dailyChallenges.errors.*) pour que le libellé suive la langue */
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const { t } = useTranslation();

  const { userId } = useUser();

  const fetchChallenges = async () => {
    if (!userId) {
      setChallenges([]);
      setErrorKey(null);
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setChallenges([]);
        setErrorKey("dailyChallenges.errors.auth");
        setLoading(false);
        return;
      }

      const res = await fetch(apiUrl("/api/daily-challenges/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (!res.ok) {
        setChallenges([]);
        setErrorKey("dailyChallenges.errors.loadFailed");
        return;
      }

      setChallenges(data.challenges || []);
      setErrorKey(null);
    } catch (err) {
      console.error("DailyChallenges error:", err);
      setErrorKey("dailyChallenges.errors.network");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchChallenges();
  }, [userId]);

  const handleClaim = async (challengeCode: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setErrorKey("dailyChallenges.errors.auth");
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
        setErrorKey(null);
        await fetchChallenges();
      } else {
        console.error(data.error);
        setErrorKey("dailyChallenges.errors.claimFailed");
      }
    } catch (err) {
      console.error("Claim error:", err);
      setErrorKey("dailyChallenges.errors.claimNetwork");
    }
  };

  const heading = (
    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
      <Target className="w-6 h-6 text-blue-200 shrink-0" aria-hidden />
      {t("dailyChallenges.title")}
    </h2>
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
        {heading}
        <p className="text-gray-400 text-sm">{t("dailyChallenges.loading")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl">
      {heading}

      {challenges.length === 0 && (
        <p className="text-gray-400 text-sm">{t("dailyChallenges.empty")}</p>
      )}
      {errorKey && (
        <p className="text-red-400 text-xs mt-2">{t(errorKey)}</p>
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
                  ? "border-emerald-400/25 bg-emerald-950/25"
                  : "border-white/10 bg-white/[0.045] backdrop-blur-md"
              }`}
            >
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-white flex items-center gap-2">
                  {c.completed && (
                    <CheckCircle className="w-4 h-4 text-green-400 shrink-0" aria-hidden />
                  )}
                  {t(c.i18nKey)}
                </span>

                <span className="text-gray-400">
                  {c.progress}/{c.goal}
                </span>
              </div>

              <div className="w-full bg-slate-950/55 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    c.completed ? "bg-green-400" : "bg-blue-300"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="text-blue-200 text-xs mt-2">
                {t("dailyChallenges.rewardWithChips", {
                  amount: c.rewardTokens,
                })}
              </div>

              {c.completed && !c.claimed && (
                <button
                  type="button"
                  className="mt-3 w-full bg-green-500 py-2 rounded hover:bg-green-600 transition"
                  onClick={() => void handleClaim(c.code)}
                >
                  {t("dailyChallenges.claimReward")}
                </button>
              )}

              {c.claimed && (
                <div className="text-green-400 text-xs mt-2 flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" aria-hidden />
                  {t("dailyChallenges.claimed")}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
