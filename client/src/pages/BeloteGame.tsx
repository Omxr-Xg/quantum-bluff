import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useUser } from "../hooks/useUser";
import { BeloteTable } from "../features/belote/BeloteTable";
import { useBeloteSocket } from "../features/belote/useBeloteSocket";

export function BeloteGame() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get("gameId");
  const { userId } = useUser();
  const { state, ended, sendAction } = useBeloteSocket(gameId);

  if (!gameId) {
    return <p className="p-8 text-center text-gray-400">{t("belote.missingGame")}</p>;
  }

  if (ended) {
    return (
      <div className="mx-auto max-w-md p-8 text-center text-white">
        <h1 className="mb-4 text-2xl font-bold">{t("belote.gameOver")}</h1>
        <p className="mb-2">
          {t("belote.finalScore", {
            a: ended.teamScoreA,
            b: ended.teamScoreB,
          })}
        </p>
        <p className="mb-6 text-emerald-300">
          {t("belote.winnerTeam", { team: ended.winningTeam })}
        </p>
        <button
          type="button"
          className="rounded-xl bg-emerald-700 px-6 py-3 font-bold"
          onClick={() => navigate("/lobby?tab=belote")}
        >
          {t("belote.backLobby")}
        </button>
      </div>
    );
  }

  if (!state || !userId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4">
      <BeloteTable state={state} myUserId={userId} onAction={sendAction} />
    </div>
  );
}
