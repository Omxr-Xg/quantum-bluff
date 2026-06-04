import { useTranslation } from "react-i18next";
import { ArrowLeft, Clock, LogOut } from "lucide-react";
import { BELOTE_SUIT_LABEL } from "../../features/belote/beloteCardUtils";
import type { BeloteSanitizedState } from "../../features/belote/useBeloteSocket";

function phaseLabelKey(phase: string, contreePhase?: string): string {
  switch (phase) {
    case "CLASSIQUE_TAKE":
      return "belote.phaseClassiqueTake";
    case "CLASSIQUE_CHOOSE":
      return "belote.phaseClassiqueChoose";
    case "BIDDING":
      return "belote.phaseBidding";
    case "CONTREE_ROUND":
      return contreePhase === "ATTACK"
        ? "belote.phaseContreeAttack"
        : "belote.phaseContreeDefense";
    case "PLAYING":
      return "belote.phasePlaying";
    case "DEAL_END":
      return "belote.phaseDealEnd";
    case "GAME_END":
      return "belote.gameOver";
    default:
      return "belote.phasePlaying";
  }
}

export function BeloteGameHud({
  state,
  myTeam,
  turnTimeLeft,
  isMyTurn,
  onBack,
  onQuit,
}: {
  state: BeloteSanitizedState;
  myTeam?: string;
  turnTimeLeft?: number | null;
  isMyTurn?: boolean;
  onBack: () => void;
  onQuit: () => void;
}) {
  const { t } = useTranslation();
  const phase = t(phaseLabelKey(state.phase, state.contreePhase));
  const highlightA = myTeam === "A";
  const highlightB = myTeam === "B";

  const contractLine =
    state.contractPoints != null &&
    (state.phase === "CONTREE_ROUND" ||
      state.phase === "PLAYING" ||
      state.phase === "DEAL_END")
      ? state.contractPoints >= 250
        ? t("belote.contractCapot")
        : t("belote.contractLine", { points: state.contractPoints })
      : null;

  const contreeTag =
    (state.contreeLevel ?? 0) >= 2
      ? t("belote.surcontree")
      : (state.contreeLevel ?? 0) >= 1
        ? t("belote.contree")
        : null;

  return (
    <header className="relative z-20 shrink-0 border-b border-emerald-500/20 bg-slate-950/90 shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="flex items-stretch gap-1 px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5">
        <button
          type="button"
          onClick={onBack}
          className="flex shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40 p-2 text-slate-200"
          aria-label={t("belote.backLobby")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-1 sm:gap-2">
          <div
            className={`flex flex-col items-center rounded-lg border px-1.5 py-0.5 sm:px-2 sm:py-1 ${
              highlightA
                ? "border-amber-400/55 bg-amber-950/55"
                : "border-white/10 bg-black/35"
            }`}
          >
            <span className="text-[7px] font-bold uppercase text-emerald-200/70 sm:text-[8px]">
              {t("belote.teamA")}
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-white sm:text-base">
              {state.teamScoreA}
            </span>
          </div>

          <div className="flex min-w-0 max-w-[11rem] flex-col items-center gap-0.5 px-0.5 sm:max-w-none">
            <div className="flex w-full flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
              <span className="truncate text-[9px] font-bold uppercase tracking-wide text-emerald-300/95 sm:text-[10px]">
                {phase}
              </span>
              {state.deal.trump ? (
                <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-400/40 bg-amber-950/50 px-1 py-px text-[9px] font-bold text-amber-100 sm:text-[10px]">
                  {BELOTE_SUIT_LABEL[state.deal.trump] ?? state.deal.trump}
                </span>
              ) : null}
            </div>
            <span className="text-center text-[8px] leading-tight text-emerald-200/55 sm:text-[9px]">
              {t("belote.targetLine", { score: state.targetScore })}
              {state.potTotal != null && state.potTotal > 0
                ? ` · ${t("belote.potTotal", { amount: state.potTotal })}`
                : ""}
            </span>
            {contractLine ? (
              <span className="text-center text-[8px] font-semibold leading-tight text-amber-200/80 sm:text-[9px]">
                {contractLine}
                {contreeTag ? ` · ${contreeTag}` : ""}
              </span>
            ) : null}
          </div>

          <div
            className={`flex flex-col items-center rounded-lg border px-1.5 py-0.5 sm:px-2 sm:py-1 ${
              highlightB
                ? "border-amber-400/55 bg-amber-950/55"
                : "border-white/10 bg-black/35"
            }`}
          >
            <span className="text-[7px] font-bold uppercase text-emerald-200/70 sm:text-[8px]">
              {t("belote.teamB")}
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-white sm:text-base">
              {state.teamScoreB}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center gap-1">
          {isMyTurn && turnTimeLeft != null ? (
            <div
              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums sm:text-xs ${
                turnTimeLeft <= 5
                  ? "animate-pulse border border-red-500/50 bg-red-950/90 text-red-100"
                  : "border border-amber-400/40 bg-black/70 text-amber-100"
              }`}
            >
              <Clock className="h-3 w-3" />
              {turnTimeLeft}s
            </div>
          ) : null}
          <button
            type="button"
            onClick={onQuit}
            className="flex items-center justify-center rounded-lg border border-slate-600/80 bg-slate-900/80 p-2 text-slate-200"
            aria-label={t("nav.quitGame")}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
