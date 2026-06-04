import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { NeonButton } from "../NeonButton";
import { BelotePlayerHand } from "./BelotePlayerHand";
import { BeloteSuitPicker } from "./BeloteSuitPicker";
import type { BeloteSanitizedState } from "../../features/belote/useBeloteSocket";
import type { BeloteCard } from "../../features/belote/useBeloteSocket";
import { BELOTE_SUITS } from "../../features/belote/beloteCardUtils";

const BID_VALUES = [80, 90, 100, 110, 120, 130, 140, 150, 160, 250] as const;

function normalizeTrump(suit: string): (typeof BELOTE_SUITS)[number] {
  const upper = suit.toUpperCase();
  if ((BELOTE_SUITS as readonly string[]).includes(upper)) {
    return upper as (typeof BELOTE_SUITS)[number];
  }
  const fromClient: Record<string, (typeof BELOTE_SUITS)[number]> = {
    hearts: "HEARTS",
    diamonds: "DIAMONDS",
    clubs: "CLUBS",
    spades: "SPADES",
  };
  return fromClient[suit.toLowerCase()] ?? "SPADES";
}

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
  const [pendingBid, setPendingBid] = useState<number | null>(null);
  const [bidSent, setBidSent] = useState(false);

  const me = state.players.find((p) => p.userId === myUserId);
  const myPos = me?.position ?? -1;
  const myTeam = me?.team;
  const hand = me?.hand ?? [];

  const isMyTurn =
    state.phase === "PLAYING" && state.deal.currentPlayerPosition === myPos;
  const isAuctionTurn =
    (state.phase === "BIDDING" || state.phase === "CONTREE_ROUND") &&
    state.biddingTurnPosition === myPos;

  const contractTeam = state.deal.contractTeam;
  const isDefense = contractTeam && myTeam && myTeam !== contractTeam;
  const isAttack = contractTeam && myTeam && myTeam === contractTeam;

  const minBid = useMemo(() => {
    const bids = state.myLegalBids;
    if (!bids?.length) return 80;
    return Math.min(...bids.map((b) => b.value));
  }, [state.myLegalBids]);

  const bidValues = useMemo(() => {
    return BID_VALUES.filter((v) => v >= minBid);
  }, [minBid]);

  /** Réinitialise le flux enchère quand ce n’est plus notre tour (après acceptation serveur). */
  useEffect(() => {
    if (state.phase !== "BIDDING" || state.biddingTurnPosition !== myPos) {
      setPendingBid(null);
      setBidSent(false);
    }
  }, [state.phase, state.biddingTurnPosition, myPos]);

  const submitBid = (value: number, trump: string) => {
    setBidSent(true);
    onAction({ type: "BID", value, trump: normalizeTrump(trump) });
  };

  const onCardTrumpPick = (card: BeloteCard) => {
    if (pendingBid == null) return;
    submitBid(pendingBid, card.suit);
  };

  const btnBase = "px-4 py-2 text-xs md:px-5 md:py-2.5 md:text-sm min-w-[5.5rem]";

  if (!isAuctionTurn && !isMyTurn) {
    return (
      <p className="text-center text-sm text-emerald-200/55">
        {t("belote.waitingTurn")}
      </p>
    );
  }

  if (isAuctionTurn && state.phase === "BIDDING") {
    if (pendingBid != null) {
      const pickingDisabled = disabled || bidSent;

      return (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-200/90">
            {pendingBid >= 250
              ? t("belote.bidCapot", { value: pendingBid })
              : t("belote.bidChooseTrump", { value: pendingBid })}
          </p>
          {bidSent ? (
            <p className="text-center text-[10px] font-medium text-amber-200/80">
              {t("belote.bidSending")}
            </p>
          ) : (
            <p className="text-center text-[10px] text-emerald-200/65">
              {t("belote.chooseTrumpAnySuit")}
            </p>
          )}

          <BeloteSuitPicker
            disabled={pickingDisabled}
            size="sm"
            onSelect={(suit) => submitBid(pendingBid, suit)}
          />

          {hand.length > 0 ? (
            <div className="flex w-full flex-col items-center gap-1 border-t border-white/10 pt-2">
              <p className="text-[10px] text-emerald-200/50">
                {t("belote.orTrumpFromCard")}
              </p>
              <BelotePlayerHand
                hand={hand}
                mode="trump"
                size="sm"
                trump={state.deal.trump}
                disabled={pickingDisabled}
                onCardClick={onCardTrumpPick}
              />
            </div>
          ) : null}

          <NeonButton
            variant="red"
            disabled={pickingDisabled}
            className="text-xs"
            onClick={() => {
              setPendingBid(null);
              setBidSent(false);
            }}
          >
            {t("belote.cancelBid")}
          </NeonButton>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-wrap justify-center gap-1.5">
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
          {bidValues.map((v) => (
            <NeonButton
              key={v}
              variant="green"
              disabled={disabled}
              className="min-w-[3.25rem] px-3 py-2 text-xs md:text-sm"
              onClick={() => setPendingBid(v)}
            >
              {v >= 250 ? t("belote.capot") : v}
            </NeonButton>
          ))}
        </div>
      </div>
    );
  }

  if (isAuctionTurn && state.phase === "CONTREE_ROUND") {
    if (state.contreePhase === "DEFENSE" && isDefense) {
      return (
        <div className="flex flex-wrap justify-center gap-2">
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
          <NeonButton
            variant="amber"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "CONTREE" })}
          >
            {t("belote.contree")}
          </NeonButton>
        </div>
      );
    }
    if (state.contreePhase === "ATTACK" && isAttack) {
      return (
        <div className="flex flex-wrap justify-center gap-2">
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
          <NeonButton
            variant="amber"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "SURCONTREE" })}
          >
            {t("belote.surcontree")}
          </NeonButton>
        </div>
      );
    }
    return (
      <p className="text-center text-sm text-emerald-200/55">
        {t("belote.waitingContree")}
      </p>
    );
  }

  if (isMyTurn && hand.length > 0) {
    const legalPlays = state.myLegalPlays ?? [];

    return (
      <div className="flex w-full flex-col items-center gap-1">
        <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
          {t("belote.playCard")}
        </p>
        <p className="text-center text-[9px] text-emerald-300/80">
          {t("belote.legalCardsHint")}
        </p>
        <BelotePlayerHand
          hand={hand}
          legalCards={legalPlays}
          mode="play"
          size="sm"
          trump={state.deal.trump}
          disabled={disabled}
          onCardClick={(card) => onAction({ type: "PLAY_CARD", card })}
        />
      </div>
    );
  }

  return (
    <p className="text-center text-sm text-emerald-200/55">
      {t("belote.waitingTurn")}
    </p>
  );
}
