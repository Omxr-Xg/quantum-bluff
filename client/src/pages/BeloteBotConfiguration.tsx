import { useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { Bot, ChevronLeft, Loader2, Target, Users } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import {
  BELOTE_VARIANT_OPTIONS,
  type BeloteGameVariant,
  variantLabelKey,
} from "../features/belote/beloteVariants";
import { startBeloteBotGame } from "../utils/startBeloteBotGame";

const TARGET_PRESETS = [1000, 1500, 2000] as const;

export function BeloteBotConfiguration() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [variant, setVariant] = useState<BeloteGameVariant>("CONTEE");
  const [targetScore, setTargetScore] = useState(1500);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    try {
      const result = await startBeloteBotGame({
        roomName: t("belote.botRoomDefaultName"),
        variant,
        targetScore,
      });
      if (!result.ok) {
        addToast(result.error, "error");
        if (result.waitingRoomId) {
          navigate(`/belote/waiting-room?roomId=${result.waitingRoomId}`);
        }
        return;
      }
      if (result.gameId) {
        navigate(`/belote/game?gameId=${encodeURIComponent(result.gameId)}`);
        return;
      }
      if (result.waitingRoomId) {
        navigate(`/belote/waiting-room?roomId=${result.waitingRoomId}`);
      }
    } catch {
      addToast(t("common.error"), "error");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="relative min-h-full w-full overflow-x-hidden text-white">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(6,95,70,0.22),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(16,185,129,0.08),transparent_48%),linear-gradient(165deg,#020f0a_0%,#041a12_46%,#020806_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-emerald-950/35 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl min-w-0 px-4 pb-10 pt-4 sm:px-8 sm:pt-6">
        <button
          type="button"
          onClick={() => navigate("/lobby?tab=belote")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("belote.backLobby")}
        </button>

        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200/25 bg-emerald-950/70 shadow-[0_0_34px_rgba(16,185,129,0.18)]">
            <Bot className="h-7 w-7 text-emerald-200" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("beloteBotConfig.title")}</h1>
            <p className="text-sm text-slate-400 sm:text-base">{t("beloteBotConfig.subtitle")}</p>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-200" />
            <h2 className="text-lg font-bold">{t("beloteBotConfig.playersTitle")}</h2>
          </div>
          <p className="text-sm text-slate-300">{t("beloteBotConfig.playersHint")}</p>
          <p className="mt-2 text-sm font-medium text-emerald-200/90">{t("beloteBotConfig.freeHint")}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <h2 className="mb-4 text-lg font-bold">{t("belote.gameVariant")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {BELOTE_VARIANT_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold transition sm:text-sm ${
                  variant === v
                    ? "border-emerald-400/70 bg-emerald-950/70 text-emerald-100"
                    : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                }`}
              >
                {t(variantLabelKey(v))}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t(`belote.variantDesc.${variant}`)}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.055] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-200" />
            <h2 className="text-lg font-bold">{t("belote.targetScore")}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {TARGET_PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setTargetScore(v)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  targetScore === v
                    ? "border border-emerald-400/50 bg-emerald-950/70 text-emerald-100"
                    : "bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]"
                }`}
              >
                {v} {t("belote.points")}
              </button>
            ))}
          </div>
          <label className="mt-4 block text-xs text-slate-500">
            {t("beloteBotConfig.customTarget")}
            <input
              type="number"
              min={500}
              max={2000}
              step={100}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value) || 1500)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-emerald-400/50"
            />
          </label>
        </div>

        <button
          type="button"
          disabled={starting}
          onClick={() => void handleStart()}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-200/50 bg-gradient-to-r from-emerald-950/90 via-emerald-800/85 to-emerald-600/80 py-8 text-lg font-bold text-white shadow-[0_0_48px_rgba(16,185,129,0.28)] transition hover:border-emerald-100/60 disabled:cursor-wait disabled:opacity-60 sm:text-xl"
        >
          {starting ? (
            <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
          ) : (
            <Bot className="h-7 w-7" aria-hidden />
          )}
          {starting ? t("belote.startingBotGame") : t("beloteBotConfig.startButton")}
        </button>
      </div>
    </div>
  );
}
