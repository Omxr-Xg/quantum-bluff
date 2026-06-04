import { useTranslation } from "react-i18next";
import { NeonButton } from "../NeonButton";
import { BelotePlayingCard } from "./BelotePlayingCard";
import { BELOTE_SUITS, BELOTE_SUIT_LABEL } from "../../features/belote/beloteCardUtils";
import type { BeloteCard, BeloteSanitizedState } from "../../features/belote/useBeloteSocket";

export function BeloteActionBar({
  state,
  myUserId,
  onAction,
  disabled = false,
}: {
  state: BeloteSanitizedState;
  myUserId: string;
  onAction: (action: Record<string, unknown>) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const me = state.players.find((p) => p.userId === myUserId);
  const myPos = me?.position ?? -1;
  const isMyTurn =
    state.phase === "PLAYING" && state.deal.currentPlayerPosition === myPos;
  const isBidTurn =
    (state.phase === "BIDDING_ROUND_1" || state.phase === "BIDDING_ROUND_2") &&
    state.biddingTurnPosition === myPos;

  const takerBid = state.phase === "BIDDING_ROUND_2" && state.deal.takerPosition === myPos;
  const round2Open = state.phase === "BIDDING_ROUND_2" && state.deal.takerPosition == null;

  const btnBase = "px-5 py-3 text-xs md:px-7 md:py-3.5 md:text-sm min-w-[6.5rem]";

  if (!isBidTurn && !isMyTurn) {
    return (
      <p className="text-center text-sm text-emerald-200/55">
        {t("belote.waitingTurn")}
      </p>
    );
  }

  if (isBidTurn) {
    if (state.phase === "BIDDING_ROUND_1") {
      return (
        <div className="flex flex-wrap justify-center gap-3">
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
          <NeonButton
            variant="green"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "TAKE" })}
          >
            {t("belote.take")}
          </NeonButton>
        </div>
      );
    }

    if (takerBid) {
      return (
        <div className="flex flex-col items-center gap-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-200/80">
            {t("belote.chooseTrump")}
          </p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {BELOTE_SUITS.map((suit) => (
              <NeonButton
                key={suit}
                variant="gold"
                disabled={disabled}
                className={`${btnBase} min-w-[5rem]`}
                onClick={() => onAction({ type: "CHOOSE_TRUMP", trump: suit })}
              >
                <span className="text-lg leading-none">{BELOTE_SUIT_LABEL[suit]}</span>
                <span className="ml-1.5">{t("belote.trump")}</span>
              </NeonButton>
            ))}
          </div>
        </div>
      );
    }

    if (round2Open) {
      return (
        <div className="flex flex-col items-center gap-3">
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.passRound2")}
          </NeonButton>
          <p className="text-center text-xs text-emerald-200/60">{t("belote.orChooseTrump")}</p>
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {BELOTE_SUITS.map((suit) => (
              <NeonButton
                key={suit}
                variant="gold"
                disabled={disabled}
                className={`${btnBase} min-w-[5rem]`}
                onClick={() => onAction({ type: "CHOOSE_TRUMP", trump: suit })}
              >
                <span className="text-lg leading-none">{BELOTE_SUIT_LABEL[suit]}</span>
              </NeonButton>
            ))}
          </div>
        </div>
      );
    }
  }

  const hand = me?.hand ?? [];

  return (
    <div className="flex flex-col items-center gap-3">
      {isMyTurn ? (
        <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-300">
          {t("belote.playCard")}
        </p>
      ) : null}
      <div className="flex max-w-full flex-wrap justify-center gap-2 px-1 sm:gap-3">
        {hand.map((card, i) => (
          <button
            key={`${card.rank}-${card.suit}-${i}`}
            type="button"
            disabled={disabled || !isMyTurn}
            onClick={() => onAction({ type: "PLAY_CARD", card })}
            className="rounded-lg transition enabled:hover:-translate-y-1 enabled:hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] disabled:cursor-not-allowed disabled:opacity-45"
            aria-label={`${card.rank} ${card.suit}`}
          >
            <BelotePlayingCard card={card} size="lg" highlight={isMyTurn && !disabled} />
          </button>
        ))}
      </div>
    </div>
  );
}
