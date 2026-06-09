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
  const isBiddingTurn =
    (state.phase === "BIDDING" ||
      state.phase === "CONTREE_ROUND" ||
      state.phase === "CLASSIQUE_TAKE" ||
      state.phase === "CLASSIQUE_CHOOSE") &&
    state.biddingTurnPosition === myPos;

  const allowsSpecial =
    state.variant === "COINCHE" || state.variant === "MODERNE";

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

  const showHandDock =
    hand.length > 0 &&
    (state.phase === "BIDDING" ||
      state.phase === "CONTREE_ROUND" ||
      state.phase === "CLASSIQUE_TAKE" ||
      state.phase === "CLASSIQUE_CHOOSE" ||
      state.phase === "PLAYING");

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
    if (pendingBid == null || bidSent) return;
    submitBid(pendingBid, card.suit);
  };

  const btnBase = "px-4 py-2 text-xs md:px-5 md:py-2.5 md:text-sm min-w-[5.5rem]";

  const renderHand = () => {
    if (!showHandDock) return null;

    if (isBiddingTurn && state.phase === "BIDDING" && pendingBid != null) {
      const pickingDisabled = disabled || bidSent;
      return (
        <div className="flex w-full min-w-0 flex-col items-center gap-2 border-b border-white/10 pb-2">
          <BelotePlayerHand
            hand={hand}
            mode="trump"
            size="md"
            trump={state.deal.trump}
            disabled={pickingDisabled}
            onCardClick={onCardTrumpPick}
          />
        </div>
      );
    }

    if (state.phase === "PLAYING") {
      return (
        <div className="flex w-full min-w-0 flex-col items-center gap-1 border-b border-white/10 pb-2">
          <BelotePlayerHand
            hand={hand}
            mode={isMyTurn ? "play" : "view"}
            size="md"
            trump={state.deal.trump}
            legalCards={isMyTurn ? state.myLegalPlays : undefined}
            disabled={disabled || !isMyTurn}
            onCardClick={(card) => onAction({ type: "PLAY_CARD", card })}
          />
        </div>
      );
    }

    return (
      <div className="w-full min-w-0 border-b border-white/10 pb-2">
        <BelotePlayerHand
          hand={hand}
          mode="view"
          size="md"
          trump={state.deal.trump}
        />
      </div>
    );
  };

  const renderControls = () => {
    if (!isBiddingTurn && !isMyTurn) {
      return (
        <p className="py-1 text-center text-sm text-emerald-200/55">
          {t("belote.waitingTurn")}
        </p>
      );
    }

    if (isBiddingTurn && state.phase === "CLASSIQUE_TAKE") {
      return (
        <div className="flex flex-wrap justify-center gap-2 py-1">
          <NeonButton
            variant="green"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "TAKE" })}
          >
            {t("belote.take")}
          </NeonButton>
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
        </div>
      );
    }

    if (isBiddingTurn && state.phase === "CLASSIQUE_CHOOSE") {
      const turned = state.deal.turnedCard?.suit;
      return (
        <div className="flex w-full flex-col items-center gap-2 py-1">
          <p className="text-center text-xs text-amber-200/90">{t("belote.chooseTrumpSuit")}</p>
          <BeloteSuitPicker
            disabled={disabled}
            size="sm"
            onSelect={(suit) => onAction({ type: "CHOOSE_TRUMP", trump: suit })}
          />
          <NeonButton
            variant="red"
            disabled={disabled}
            className={btnBase}
            onClick={() => onAction({ type: "PASS" })}
          >
            {t("belote.pass")}
          </NeonButton>
        </div>
      );
    }

    if (isBiddingTurn && state.phase === "BIDDING") {
      if (pendingBid != null) {
        const pickingDisabled = disabled || bidSent;
        return (
          <div className="flex w-full flex-col items-center gap-2 py-1">
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
            {allowsSpecial ? (
              <div className="flex flex-wrap justify-center gap-2">
                <NeonButton
                  variant="green"
                  disabled={pickingDisabled}
                  className="text-xs"
                  onClick={() => submitBid(pendingBid, "ALL_TRUMP")}
                >
                  {t("belote.allTrump")}
                </NeonButton>
                <NeonButton
                  variant="green"
                  disabled={pickingDisabled}
                  className="text-xs"
                  onClick={() => submitBid(pendingBid, "NO_TRUMP")}
                >
                  {t("belote.noTrump")}
                </NeonButton>
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
        <div className="flex flex-col items-center gap-2 py-1">
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

    if (isBiddingTurn && state.phase === "CONTREE_ROUND") {
      const contreeLevel = state.contreeLevel ?? 0;
      const canContree =
        state.contreePhase === "DEFENSE" && isDefense && contreeLevel === 0;
      const canSurcontree =
        state.contreePhase === "ATTACK" && isAttack && contreeLevel === 1;

      if (canContree || canSurcontree) {
        return (
          <div className="flex flex-wrap justify-center gap-2 py-1">
            <NeonButton variant="red" disabled={disabled} className={btnBase} onClick={() => onAction({ type: "PASS" })}>
              {t("belote.pass")}
            </NeonButton>
            {canContree ? (
              <NeonButton variant="amber" disabled={disabled} className={btnBase} onClick={() => onAction({ type: "CONTREE" })}>
                {t("belote.contree")}
              </NeonButton>
            ) : null}
            {canSurcontree ? (
              <NeonButton variant="amber" disabled={disabled} className={btnBase} onClick={() => onAction({ type: "SURCONTREE" })}>
                {t("belote.surcontree")}
              </NeonButton>
            ) : null}
          </div>
        );
      }

      if (
        (state.contreePhase === "DEFENSE" && isDefense) ||
        (state.contreePhase === "ATTACK" && isAttack)
      ) {
        return (
          <div className="flex flex-col items-center gap-1.5 py-1">
            <div className="flex flex-wrap justify-center gap-2">
              <NeonButton variant="red" disabled={disabled} className={btnBase} onClick={() => onAction({ type: "PASS" })}>
                {t("belote.pass")}
              </NeonButton>
            </div>
            {state.contreePhase === "ATTACK" && isAttack && contreeLevel === 0 ? (
              <p className="max-w-[18rem] text-center text-[10px] text-amber-200/70">
                {t("belote.surcontreeRequiresContree")}
              </p>
            ) : null}
          </div>
        );
      }
      return (
        <p className="py-1 text-center text-sm text-emerald-200/55">
          {t("belote.waitingContree")}
        </p>
      );
    }

    if (isMyTurn) {
      return (
        <div className="flex flex-col items-center gap-1 py-1">
          <p className="text-center text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
            {t("belote.playCard")}
          </p>
          <p className="text-center text-[9px] text-emerald-300/80">
            {t("belote.legalCardsHint")}
          </p>
        </div>
      );
    }

    return (
      <p className="py-1 text-center text-sm text-emerald-200/55">
        {t("belote.waitingTurn")}
      </p>
    );
  };

  return (
    <div className="flex w-full min-w-0 flex-col">
      {renderHand()}
      {renderControls()}
    </div>
  );
}
