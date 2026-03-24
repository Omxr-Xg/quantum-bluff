import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { updateUserBalance } from "../utils/userProfile";
import {
  mergeGamificationFromServerResponse,
  readGamification,
  refreshGamificationFromServer,
} from "../utils/gamificationStorage";
import { apiUrl } from "../utils/apiBase";

const MIN_BET = 10;
const ABS_CAP = 1000;

type BjCard = { rank: string; suit: string };

function suitSymbol(s: string): string {
  switch (s) {
    case "h":
      return "♥";
    case "d":
      return "♦";
    case "c":
      return "♣";
    case "s":
      return "♠";
    default:
      return s;
  }
}

function suitColor(s: string): string {
  return s === "h" || s === "d" ? "text-rose-600" : "text-slate-900";
}

function CardFace({ card, hidden }: { card?: BjCard; hidden?: boolean }) {
  if (hidden || !card) {
    return (
      <div className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg border-2 border-rose-900/60 bg-gradient-to-br from-rose-900 to-slate-900 shadow-lg md:h-28 md:w-[5.25rem]">
        <span className="text-xs font-bold text-rose-300/50">?</span>
      </div>
    );
  }
  return (
    <div className="flex h-24 w-[4.5rem] shrink-0 flex-col justify-between rounded-lg border-2 border-white/90 bg-white p-1.5 shadow-lg md:h-28 md:w-[5.25rem]">
      <div className={`text-sm font-bold leading-none ${suitColor(card.suit)}`}>
        {card.rank}
        <span className="ml-0.5 text-xs">{suitSymbol(card.suit)}</span>
      </div>
      <div className={`text-center text-2xl ${suitColor(card.suit)}`}>{suitSymbol(card.suit)}</div>
      <div className={`text-right text-sm font-bold leading-none ${suitColor(card.suit)}`}>
        {card.rank}
        <span className="ml-0.5 text-xs">{suitSymbol(card.suit)}</span>
      </div>
    </div>
  );
}

export function Blackjack() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [chips, setChips] = useState<number | null>(null);
  const [maxBet, setMaxBet] = useState(ABS_CAP);
  const [bet, setBet] = useState(MIN_BET);
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "player" | "complete">("idle");
  const [playerCards, setPlayerCards] = useState<BjCard[]>([]);
  const [dealerCards, setDealerCards] = useState<BjCard[]>([]);
  const [dealerHole, setDealerHole] = useState(false);
  const [canDouble, setCanDouble] = useState(false);
  const [totalBet, setTotalBet] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<{ reason: string; payout: number } | null>(null);

  const loadBalance = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/lobby");
      return;
    }
    const url = apiUrl("/api/auth/balance");
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("balance");
      const data = await res.json();
      const c = typeof data?.chips === "number" ? Math.max(0, Math.floor(data.chips)) : 0;
      updateUserBalance(c);
      setChips(c);
    } catch {
      addToast(t("blackjack.errorLoadBalance"), "error");
      setChips(0);
    }
  }, [addToast, navigate, t]);

  const loadCaps = useCallback(async () => {
    await refreshGamificationFromServer();
    const g = readGamification();
    let cap = ABS_CAP;
    if (typeof g.maxBetBlackjack === "number") {
      cap = Math.min(ABS_CAP, g.maxBetBlackjack);
    }
    setMaxBet(cap);
  }, []);

  useEffect(() => {
    void loadCaps();
    void loadBalance();
  }, [loadCaps, loadBalance]);

  const effectiveMax = useMemo(() => {
    if (chips === null) return maxBet;
    return Math.min(maxBet, chips);
  }, [chips, maxBet]);

  const betPresets = useMemo(() => {
    const cap = effectiveMax;
    const raw = [MIN_BET, 25, 50, 100, 250, cap].filter((v, i, a) => v >= MIN_BET && v <= cap && a.indexOf(v) === i);
    return raw.sort((a, b) => a - b);
  }, [effectiveMax]);

  useEffect(() => {
    if (betPresets.length === 0) return;
    if (!betPresets.includes(bet)) {
      setBet(betPresets[0]!);
    }
  }, [betPresets, bet]);

  const resetToIdle = useCallback(() => {
    setPhase("idle");
    setPlayerCards([]);
    setDealerCards([]);
    setDealerHole(false);
    setCanDouble(false);
    setTotalBet(0);
    setLastOutcome(null);
  }, []);

  const startHand = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || chips === null || loading) return;
    if (bet < MIN_BET || bet > effectiveMax) {
      addToast(t("blackjack.invalidBet"), "error");
      return;
    }
    setLoading(true);
    setLastOutcome(null);
    try {
      const url = apiUrl("/api/blackjack/start");
      // #region agent log
      fetch("http://127.0.0.1:7455/ingest/a5f146bd-eb1c-4b6d-8988-e596e0518ead", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "bc6f20" },
        body: JSON.stringify({
          sessionId: "bc6f20",
          runId: "pre-fix",
          hypothesisId: "H1-H4",
          location: "Blackjack.tsx:startHand:beforeFetch",
          message: "Resolved blackjack start URL",
          data: {
            url,
            pageOrigin: typeof window !== "undefined" ? window.location.origin : "",
            hostname: typeof window !== "undefined" ? window.location.hostname : "",
            apiBase: getApiBaseUrl(),
            viteApiUrlSet: Boolean(import.meta.env.VITE_API_URL),
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.code === "SESSION_ACTIVE") {
          addToast(t("blackjack.sessionActive"), "error");
        } else {
          addToast(typeof data?.error === "string" ? data.error : t("blackjack.errorDeal"), "error");
        }
        return;
      }

      mergeGamificationFromServerResponse(data as Record<string, unknown>);

      if (data.phase === "complete" || (data.player && data.dealer && data.payout !== undefined)) {
        setPhase("complete");
        setPlayerCards((data.player as BjCard[]) ?? []);
        setDealerCards((data.dealer as BjCard[]) ?? []);
        setDealerHole(false);
        setTotalBet(typeof data.totalBet === "number" ? data.totalBet : bet);
        setLastOutcome({
          reason: String(data.reason ?? ""),
          payout: typeof data.payout === "number" ? data.payout : 0,
        });
        if (typeof data.chips === "number") {
          const c = Math.max(0, Math.floor(data.chips));
          updateUserBalance(c);
          setChips(c);
        }
        return;
      }

      if (data.phase === "player") {
        setPhase("player");
        setPlayerCards((data.player as BjCard[]) ?? []);
        const up = (data.dealerUp as BjCard[]) ?? [];
        setDealerCards(up);
        setDealerHole(true);
        setCanDouble(!!data.canDouble);
        setTotalBet(typeof data.totalBet === "number" ? data.totalBet : bet);
        if (typeof data.chips === "number") {
          const c = Math.max(0, Math.floor(data.chips));
          updateUserBalance(c);
          setChips(c);
        }
      }
    } catch {
      addToast(t("blackjack.errorDeal"), "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, bet, chips, effectiveMax, loading, t]);

  const sendAction = useCallback(
    async (action: "hit" | "stand" | "double") => {
      const token = localStorage.getItem("token");
      if (!token || loading) return;
      setLoading(true);
      try {
        const url = apiUrl("/api/blackjack/action");
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ action }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          addToast(typeof data?.error === "string" ? data.error : t("blackjack.errorAction"), "error");
          return;
        }

        mergeGamificationFromServerResponse(data as Record<string, unknown>);

        if (data.phase === "complete") {
          setPhase("complete");
          setPlayerCards((data.player as BjCard[]) ?? []);
          setDealerCards((data.dealer as BjCard[]) ?? []);
          setDealerHole(false);
          setCanDouble(false);
          setTotalBet(typeof data.totalBet === "number" ? data.totalBet : totalBet);
          setLastOutcome({
            reason: String(data.reason ?? ""),
            payout: typeof data.payout === "number" ? data.payout : 0,
          });
          if (typeof data.chips === "number") {
            const c = Math.max(0, Math.floor(data.chips));
            updateUserBalance(c);
            setChips(c);
          }
        } else if (data.phase === "player") {
          setPlayerCards((data.player as BjCard[]) ?? []);
          setDealerCards((data.dealerUp as BjCard[]) ?? []);
          setDealerHole(!!data.dealerHole);
          setCanDouble(!!data.canDouble);
          if (typeof data.chips === "number") {
            const c = Math.max(0, Math.floor(data.chips));
            updateUserBalance(c);
            setChips(c);
          }
        }
      } catch {
        addToast(t("blackjack.errorAction"), "error");
      } finally {
        setLoading(false);
      }
    },
    [addToast, loading, t, totalBet]
  );

  const outcomeLabel = useMemo(() => {
    if (!lastOutcome) return "";
    const r = lastOutcome.reason;
    const net = lastOutcome.payout - totalBet;
    if (r === "player_blackjack") return t("blackjack.outcomeBlackjack");
    if (r === "push") return t("blackjack.outcomePush");
    if (r === "player_bust") return t("blackjack.outcomeBust");
    if (r === "dealer_blackjack") return t("blackjack.outcomeDealerBlackjack");
    if (r === "dealer_bust" || r === "player_win") return t("blackjack.outcomeWin", { net });
    if (r === "dealer_win") return t("blackjack.outcomeLose");
    return t("blackjack.outcomeDone", { payout: lastOutcome.payout });
  }, [lastOutcome, t, totalBet]);

  return (
    <div className="relative flex min-h-0 w-full max-w-[100%] flex-1 flex-col overflow-hidden bg-[#1a0a12]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_20%,rgba(190,24,93,0.2),transparent_55%),radial-gradient(ellipse_70%_50%_at_80%_80%,rgba(30,10,20,0.9),transparent)]" />
      <div className="relative z-10 mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col overflow-y-auto px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] md:max-w-xl md:px-4">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate("/lobby")}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/80 px-3 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/90"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("blackjack.back")}
          </button>
          <div className="rounded-xl border border-amber-500/40 bg-black/40 px-3 py-2 text-right">
            <p className="text-[10px] uppercase tracking-wide text-amber-200/70">{t("blackjack.balance")}</p>
            <p className="font-mono text-lg font-bold text-amber-300">{chips ?? "—"}</p>
          </div>
        </div>

        <h1 className="mb-1 text-center font-serif text-2xl font-bold tracking-wide text-rose-100 md:text-3xl">
          {t("blackjack.title")}
        </h1>
        <p className="mb-6 text-center text-sm text-rose-200/60">{t("blackjack.subtitle")}</p>

        <div className="mb-6 rounded-2xl border border-emerald-800/60 bg-gradient-to-b from-emerald-950/95 to-[#0d2818] p-4 shadow-[inset_0_2px_20px_rgba(0,0,0,0.45)] md:p-6">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-emerald-200/70">
            {t("blackjack.dealer")}
          </p>
          <div className="flex min-h-[6rem] flex-wrap items-start justify-center gap-2">
            {phase === "idle" ? (
              <p className="py-8 text-center text-sm text-emerald-300/50">{t("blackjack.placeBet")}</p>
            ) : (
              <>
                {dealerCards.map((c, i) => (
                  <CardFace key={`d-${i}-${c.rank}${c.suit}`} card={dealerHole && i === 1 ? undefined : c} hidden={dealerHole && i === 1} />
                ))}
                {dealerHole && dealerCards.length === 1 ? <CardFace hidden /> : null}
              </>
            )}
          </div>

          <div className="my-6 border-t border-emerald-800/50" />

          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-wider text-emerald-200/70">
            {t("blackjack.you")}
          </p>
          <div className="flex min-h-[6rem] flex-wrap items-start justify-center gap-2">
            {phase === "idle" ? null : playerCards.map((c, i) => <CardFace key={`p-${i}-${c.rank}${c.suit}`} card={c} />)}
          </div>
        </div>

        {phase === "complete" && lastOutcome ? (
          <div className="mb-4 rounded-xl border border-rose-500/35 bg-rose-950/50 px-4 py-3 text-center">
            <p className="font-semibold text-rose-100">{outcomeLabel}</p>
            <p className="mt-1 text-sm text-rose-200/80">
              {t("blackjack.payoutLine", { payout: lastOutcome.payout, totalBet })}
            </p>
          </div>
        ) : null}

        {phase === "idle" ? (
          <div className="space-y-4">
            <p className="text-center text-sm text-rose-200/70">{t("blackjack.chooseBet", { min: MIN_BET, max: effectiveMax })}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {betPresets.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setBet(v)}
                  className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                    bet === v ? "bg-rose-600 text-white ring-2 ring-rose-300" : "bg-slate-800 text-slate-300 ring-1 ring-slate-600 hover:bg-slate-700"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={loading || chips === null || chips < bet}
              onClick={() => void startHand()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-800 py-4 text-lg font-bold text-white shadow-lg transition hover:from-rose-500 hover:to-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {t("blackjack.deal")}
            </button>
          </div>
        ) : null}

        {phase === "player" ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => void sendAction("hit")}
                className="rounded-xl bg-slate-700 py-3 text-sm font-bold text-white transition hover:bg-slate-600 disabled:opacity-50"
              >
                {t("blackjack.hit")}
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => void sendAction("stand")}
                className="rounded-xl bg-amber-700 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {t("blackjack.stand")}
              </button>
              <button
                type="button"
                disabled={loading || !canDouble}
                onClick={() => void sendAction("double")}
                className="rounded-xl bg-violet-700 py-3 text-sm font-bold text-white transition hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("blackjack.double")}
              </button>
            </div>
          </div>
        ) : null}

        {phase === "complete" ? (
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              resetToIdle();
              void loadBalance();
            }}
            className="mt-2 w-full rounded-2xl border border-rose-500/50 bg-rose-950/80 py-4 text-lg font-bold text-rose-100 transition hover:bg-rose-900 disabled:opacity-50"
          >
            {t("blackjack.newHand")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
