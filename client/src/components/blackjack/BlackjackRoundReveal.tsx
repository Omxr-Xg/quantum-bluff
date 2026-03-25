import { useTranslation } from "react-i18next";
import {
  PlayingCard,
  handValueFromCards,
  type BjTableState,
} from "./BlackjackMultiCasinoTable";

export type BjRoundSummaryRow = {
  userId: string;
  username: string;
  payout: number;
  reason: string;
};

function outcomeKind(reason: string): "win" | "lose" | "push" {
  if (reason === "push") return "push";
  if (reason === "player_win" || reason === "player_blackjack" || reason === "dealer_bust") return "win";
  return "lose";
}

export function BlackjackRoundReveal({
  state,
  roundSummary,
  userId,
}: {
  state: BjTableState;
  roundSummary: BjRoundSummaryRow[];
  userId: string | null;
}) {
  const { t } = useTranslation();
  const dealer = state.dealerCards;
  const dv = handValueFromCards(dealer);
  const dealerLabel = dv.bust ? t("bjMulti.bust") : dv.soft ? `S${dv.total}` : String(dv.total);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-[bj-overlay-in_0.35s_ease-out_both]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bj-round-reveal-title"
    >
      <div className="absolute inset-0 bg-[#050208]/88 backdrop-blur-md" />
      <div className="relative z-10 flex max-h-[min(90vh,820px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border-2 border-[#c9a227]/50 bg-gradient-to-b from-[#1a120e] via-[#120c0a] to-[#0a0608] shadow-[0_0_80px_rgba(201,162,39,0.2)]">
        <div className="border-b border-[#c9a227]/25 bg-black/30 px-5 py-4 text-center">
          <h2 id="bj-round-reveal-title" className="font-serif text-xl font-bold tracking-wide text-amber-100 sm:text-2xl">
            {t("bjMulti.roundResultTitle")}
          </h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-amber-200/60">{t("bjMulti.phase_payout")}</p>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-6 sm:px-8">
          {/* Croupier */}
          <section>
            <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-emerald-400/90">
              {t("bjMulti.dealer")}
            </p>
            <div className="flex flex-wrap justify-center gap-1 pl-6 sm:pl-10">
              {dealer.map((c, i) => (
                <div
                  key={`rev-d-${i}-${c.rank}-${c.suit}`}
                  className="bj-card-reveal -ml-5 first:ml-0 sm:-ml-6"
                  style={{ animationDelay: `${i * 0.12}s` }}
                >
                  <PlayingCard card={c} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-center font-mono text-lg font-bold text-white">
              {t("bjMulti.dealerTotalLabel")}{" "}
              <span className="rounded-lg bg-emerald-950/80 px-3 py-1 text-emerald-200">{dealerLabel}</span>
            </p>
          </section>

          {/* Joueurs */}
          {roundSummary.length > 0 ? (
            <section>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-amber-300/90">
                {t("bjMulti.playerOutcomes")}
              </p>
              <ul className="space-y-2">
                {roundSummary.map((row, i) => {
                  const kind = outcomeKind(row.reason);
                  const isYou = row.userId === userId;
                  const border =
                    kind === "win"
                      ? "border-emerald-500/50 bg-emerald-950/40"
                      : kind === "push"
                        ? "border-amber-500/40 bg-amber-950/30"
                        : "border-rose-900/50 bg-rose-950/35";
                  const labelKey = `bjMulti.settle_${row.reason}` as const;
                  const reasonText = t(labelKey, { defaultValue: row.reason });

                  return (
                    <li
                      key={row.userId}
                      className={`bj-row-reveal flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 ${border}`}
                      style={{ animationDelay: `${0.35 + i * 0.1}s` }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-white">
                          {row.username}
                          {isYou ? (
                            <span className="ml-2 text-xs font-normal text-amber-300/90">({t("bjMulti.you")})</span>
                          ) : null}
                        </p>
                        <p className="text-xs text-white/60">{reasonText}</p>
                      </div>
                      <div
                        className={`shrink-0 font-mono text-lg font-bold ${
                          kind === "win"
                            ? "text-emerald-300"
                            : kind === "push"
                              ? "text-amber-200"
                              : "text-rose-300"
                        }`}
                      >
                        {row.payout > 0
                          ? `+${row.payout}`
                          : kind === "push"
                            ? `+${row.payout}`
                            : t("bjMulti.noReturn")}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </div>

        <div className="border-t border-white/10 bg-black/40 px-4 py-3 text-center">
          <p className="text-xs text-white/50">{t("bjMulti.roundRevealNext")}</p>
        </div>
      </div>
    </div>
  );
}
