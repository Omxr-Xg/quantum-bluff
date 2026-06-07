import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Check, Gift, Users, Coins, Loader2 } from "lucide-react";
import { useGetReferralMeQuery } from "../services/api";

const cardClass =
  "rounded-2xl border border-white/10 bg-white/[0.055] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl";

export function ReferralSection() {
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetReferralMeQuery();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copyText = async (text: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
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

  return (
    <section className={`p-5 sm:p-6 ${cardClass}`}>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
        <Gift className="h-5 w-5 text-cyan-200" />
        {t("referral.title")}
      </h2>
      <p className="mb-4 text-sm text-slate-400">{t("referral.subtitle")}</p>

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
  );
}
