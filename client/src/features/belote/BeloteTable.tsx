import { useTranslation } from "react-i18next";
import type { BeloteCard, BeloteSanitizedState } from "./useBeloteSocket";

const SUIT_SYM: Record<string, string> = {
  HEARTS: "♥",
  DIAMONDS: "♦",
  CLUBS: "♣",
  SPADES: "♠",
};

function CardButton({
  card,
  onPlay,
  disabled,
}: {
  card: BeloteCard;
  onPlay: () => void;
  disabled: boolean;
}) {
  const red = card.suit === "HEARTS" || card.suit === "DIAMONDS";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPlay}
      className={`rounded-lg border px-2 py-3 text-sm font-bold shadow ${
        red ? "border-rose-400/40 text-rose-200" : "border-slate-400/40 text-slate-100"
      } disabled:opacity-40`}
    >
      {card.rank}
      {SUIT_SYM[card.suit] ?? card.suit}
    </button>
  );
}

export function BeloteTable({
  state,
  myUserId,
  onAction,
}: {
  state: BeloteSanitizedState;
  myUserId: string;
  onAction: (action: Record<string, unknown>) => void;
}) {
  const { t } = useTranslation();
  const me = state.players.find((p) => p.userId === myUserId);
  const myPos = me?.position ?? -1;
  const isMyTurn =
    state.phase === "PLAYING" && state.deal.currentPlayerPosition === myPos;
  const isBidTurn =
    (state.phase === "BIDDING_ROUND_1" || state.phase === "BIDDING_ROUND_2") &&
    state.biddingTurnPosition === myPos;

  return (
    <div className="space-y-4 text-white">
      <div className="flex justify-between rounded-xl border border-white/10 bg-black/30 px-4 py-2 text-sm">
        <span>
          {t("belote.teamA")}: {state.teamScoreA}
        </span>
        <span className="text-gray-400">{state.phase}</span>
        <span>
          {t("belote.teamB")}: {state.teamScoreB}
        </span>
      </div>
      {state.deal.trump ? (
        <p className="text-center text-sm text-emerald-300">
          {t("belote.trump")}: {SUIT_SYM[state.deal.trump] ?? state.deal.trump}
        </p>
      ) : null}

      {state.deal.currentTrick.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {state.deal.currentTrick.map((t, i) => (
            <span key={i} className="rounded bg-white/10 px-2 py-1 text-xs">
              {t.card.rank}
              {SUIT_SYM[t.card.suit]}
            </span>
          ))}
        </div>
      ) : null}

      {isBidTurn ? (
        <div className="flex flex-wrap justify-center gap-2">
          {state.phase === "BIDDING_ROUND_1" ? (
            <>
              <button
                type="button"
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold"
                onClick={() => onAction({ type: "PASS" })}
              >
                {t("belote.pass")}
              </button>
              <button
                type="button"
                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold"
                onClick={() => onAction({ type: "TAKE" })}
              >
                {t("belote.take")}
              </button>
            </>
          ) : (
            (["HEARTS", "DIAMONDS", "CLUBS", "SPADES"] as const).map((suit) => (
              <button
                key={suit}
                type="button"
                className="rounded-lg bg-emerald-800 px-3 py-2 font-semibold"
                onClick={() => onAction({ type: "CHOOSE_TRUMP", trump: suit })}
              >
                {SUIT_SYM[suit]} {t("belote.trump")}
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap justify-center gap-2">
        {(me?.hand ?? []).map((card, i) => (
          <CardButton
            key={`${card.rank}-${card.suit}-${i}`}
            card={card}
            disabled={!isMyTurn}
            onPlay={() => onAction({ type: "PLAY_CARD", card })}
          />
        ))}
      </div>
    </div>
  );
}
