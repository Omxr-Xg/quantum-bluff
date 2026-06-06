import { useTranslation } from "react-i18next";
import { handValueFromCards, type BjTableState } from "./BlackjackMultiCasinoTable";
import { ImageWithFallback } from "../figma/ImageWithFallback";
import dealerBjAvatar from "../../assets/avatars/D1.webp";

export type BjRoundSummaryRow = {
  userId: string;
  username: string;
  payout: number;
  reason: string;
};

export function bjOutcomeKind(reason: string): "win" | "lose" | "push" {
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
  const myRow = userId ? roundSummary.find((r) => r.userId === userId) : undefined;
  const myKind = myRow ? bjOutcomeKind(myRow.reason) : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-4 pb-8 animate-[bj-overlay-in_0.35s_ease-out_both] sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bj-round-reveal-title"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" aria-hidden />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-[#c9a227]/45 bg-gradient-to-b from-[#1a120e] to-slate-950 shadow-[0_12px_48px_rgba(0,0,0,0.65),0_0_40px_rgba(201,162,39,0.12)] animate-[bj-overlay-in_0.4s_ease-out_0.05s_both]"
        style={{ animationFillMode: "both" }}
      >
        <div className="border-b border-[#c9a227]/20 px-4 py-3 text-center sm:px-5">
          <h2 id="bj-round-reveal-title" className="text-base font-bold tracking-wide text-amber-100 sm:text-lg">
            {t("bjMulti.roundResultTitle")}
          </h2>
          {myRow && myKind ? (
            <p
              className={`mt-2 font-serif text-xl font-extrabold tracking-tight sm:text-2xl ${
                myKind === "win"
                  ? "text-emerald-300"
                  : myKind === "push"
                    ? "text-amber-200"
                    : "text-red-300"
              }`}
            >
              {myKind === "win"
                ? t("bjMulti.outcomeYouWin", { chips: myRow.payout })
                : myKind === "push"
                  ? t("bjMulti.outcomeYouPush", { chips: myRow.payout })
                  : t("bjMulti.outcomeYouLose")}
            </p>
          ) : null}
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-emerald-200/75">
            <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full border border-[#c9a227]/40 bg-black/40 shadow">
              <ImageWithFallback
                src={dealerBjAvatar}
                alt={t("bjMulti.dealer")}
                className="h-full w-full object-cover"
              />
            </div>
            <p>
              <span className="font-bold uppercase tracking-wide text-emerald-200/90">
                {t("bjMulti.dealer")}
              </span>
              {": "}
              <span className="font-mono font-semibold text-emerald-100">{dealerLabel}</span>
            </p>
          </div>
        </div>

        <div className="max-h-[min(55vh,420px)] overflow-y-auto px-3 py-3 sm:px-4">
          {roundSummary.length > 0 ? (
            <ul className="space-y-2">
              {roundSummary.map((row, i) => {
                const kind = bjOutcomeKind(row.reason);
                const isYou = row.userId === userId;
                const border =
                  kind === "win"
                    ? "border-emerald-500/45 bg-emerald-950/35"
                    : kind === "push"
                      ? "border-amber-500/35 bg-amber-950/25"
                      : "border-red-800/45 bg-red-950/30";
                const labelKey = `bjMulti.settle_${row.reason}` as const;
                const reasonText = t(labelKey, { defaultValue: row.reason });
                const amountLabel =
                  row.payout > 0
                    ? `+${row.payout}`
                    : kind === "push"
                      ? `${row.payout}`
                      : t("bjMulti.noReturn");

                return (
                  <li
                    key={row.userId}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${border}`}
                    style={{ animationDelay: `${i * 0.06}s` }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">
                        {row.username}
                        {isYou ? (
                          <span className="ml-1.5 text-[11px] font-normal text-amber-300/90">
                            ({t("bjMulti.you")})
                          </span>
                        ) : null}
                      </p>
                      <p className="truncate text-[11px] text-white/55">{reasonText}</p>
                    </div>
                    <div
                      className={`shrink-0 font-mono text-base font-bold tabular-nums sm:text-lg ${
                        kind === "win"
                          ? "text-emerald-300"
                          : kind === "push"
                            ? "text-amber-200"
                            : "text-red-300"
                      }`}
                    >
                      {amountLabel}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-4 text-center text-sm text-white/50">{t("bjMulti.roundRevealNext")}</p>
          )}
        </div>

        <div className="border-t border-white/10 px-3 py-2.5 text-center sm:px-4">
          <p className="text-[11px] leading-snug text-white/45">{t("bjMulti.roundRevealNext")}</p>
        </div>
      </div>
    </div>
  );
}
