import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Gift, Users, Coins, Loader2, MoreVertical, History, X } from "lucide-react";
import { useGetReferralInvitesQuery, useGetReferralMeQuery } from "../services/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";

function formatReferralDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ReferralSection() {
  const { t, i18n } = useTranslation();
  const { data, isLoading, error, refetch } = useGetReferralMeQuery();
  const {
    data: invitesData,
    isLoading: invitesLoading,
    refetch: refetchInvites,
  } = useGetReferralInvitesQuery(undefined, { skip: false });
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const copyText = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  };

  const openHistory = () => {
    setHistoryOpen(true);
    void refetchInvites();
    void refetch();
  };

  if (isLoading) {
    return (
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <div className="flex justify-center py-8 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <p className="text-center text-sm text-rose-300">{t("referral.error")}</p>
      </section>
    );
  }

  const invites = invitesData?.invites ?? [];

  return (
    <>
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <Gift className="h-5 w-5 text-cyan-200" />
              {t("referral.title")}
            </h2>
            <p className="mt-2 text-sm text-slate-400">{t("referral.subtitle")}</p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/65 text-slate-300 transition hover:border-white/20 hover:bg-slate-900/80 hover:text-white"
                aria-label={t("referral.menuAria")}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="min-w-[12rem] border-white/10 bg-slate-950/95 text-slate-100"
            >
              <DropdownMenuItem
                className="cursor-pointer focus:bg-white/10 focus:text-white"
                onSelect={() => openHistory()}
              >
                <History className="h-4 w-4" />
                {t("referral.historyMenu")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("referral.yourCode")}</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate text-lg font-bold text-cyan-100">{data.referralCode}</code>
              <button
                type="button"
                onClick={() => void copyText(data.referralCode, "code")}
                className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label={t("referral.copyCode")}
              >
                {copied === "code" ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{t("referral.inviteLink")}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="flex-1 truncate text-sm text-slate-300">{data.referralLink}</span>
              <button
                type="button"
                onClick={() => void copyText(data.referralLink, "link")}
                className="shrink-0 rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
                aria-label={t("referral.copyLink")}
              >
                {copied === "link" ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 rounded-xl border border-blue-300/20 bg-blue-950/35 px-4 py-3">
            <Users className="h-5 w-5 text-blue-200" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-white">{data.invitesCount}</p>
              <p className="text-xs text-slate-400">{t("referral.invitesCount")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-950/25 px-4 py-3">
            <Coins className="h-5 w-5 text-amber-200" />
            <div>
              <p className="text-2xl font-bold tabular-nums text-amber-100">{data.chipsEarned.toLocaleString()}</p>
              <p className="text-xs text-slate-400">{t("referral.chipsEarned")}</p>
            </div>
          </div>
        </div>
      </section>

      {historyOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="referral-history-title"
        >
          <div className={`relative w-full max-w-lg p-5 sm:p-6 ${cardClass}`}>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              className="absolute right-4 top-4 rounded-lg border border-white/10 p-2 text-slate-400 transition hover:text-white"
              aria-label={t("referral.closeHistory")}
            >
              <X className="h-4 w-4" />
            </button>

            <h3 id="referral-history-title" className="mb-1 pr-10 text-lg font-bold text-white">
              {t("referral.historyTitle")}
            </h3>
            <p className="mb-4 text-sm text-slate-400">{t("referral.historySubtitle")}</p>

            {invitesLoading ? (
              <div className="flex justify-center py-10 text-slate-400">
                <Loader2 className="h-7 w-7 animate-spin" />
              </div>
            ) : invites.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-8 text-center text-sm text-slate-400">
                {t("referral.historyEmpty")}
              </p>
            ) : (
              <ul className="max-h-[min(50vh,22rem)] space-y-2 overflow-y-auto pr-1">
                {invites.map((invite) => (
                  <li
                    key={invite.userId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{invite.username}</p>
                      <p className="text-xs text-slate-500">
                        {formatReferralDate(invite.rewardedAt ?? invite.createdAt, i18n.language)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {invite.status === "COMPLETED" ? (
                        <p className="text-sm font-bold tabular-nums text-emerald-300">
                          {t("referral.historyGain", { chips: invite.chipsEarned.toLocaleString() })}
                        </p>
                      ) : (
                        <p className="text-xs font-medium uppercase tracking-wide text-amber-300/90">
                          {t("referral.historyPending")}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 flex items-center justify-between rounded-xl border border-amber-300/25 bg-amber-950/30 px-4 py-3">
              <span className="text-sm font-medium text-slate-300">{t("referral.historyTotal")}</span>
              <span className="text-lg font-bold tabular-nums text-amber-100">
                {data.chipsEarned.toLocaleString()} {t("referral.chipsLabel")}
              </span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
