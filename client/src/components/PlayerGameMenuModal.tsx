import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Copy, MessageCircle, UserPlus, Flag, X, Loader2, ArrowLeft } from "lucide-react";
import { useSendFriendRequestMutation } from "../services/api";
import { apiUrl } from "../utils/apiBase";
import { useToast } from "../contexts/ToastContext";
import { getAuthItem } from "../utils/authStorage";

export type PlayerMenuTarget = {
  id: string;
  name: string;
};

type ReportReason = "INAPPROPRIATE_LANGUAGE" | "CHEATING" | "HARASSMENT" | "SPAM" | "OTHER";

interface Props {
  open: boolean;
  onClose: () => void;
  player: PlayerMenuTarget | null;
  gameId: string | null;
  currentUserId: string;
}

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function PlayerGameMenuModal({ open, onClose, player, gameId, currentUserId }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [sendFriendRequest, { isLoading: inviting }] = useSendFriendRequestMutation();
  const [step, setStep] = useState<"menu" | "report">("menu");
  const [reportReason, setReportReason] = useState<ReportReason>("INAPPROPRIATE_LANGUAGE");
  const [reportDetail, setReportDetail] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  useEffect(() => {
    if (!open) {
      setStep("menu");
      setReportDetail("");
      setReportReason("INAPPROPRIATE_LANGUAGE");
    }
  }, [open]);

  if (!open || !player) return null;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(player.id);
      addToast(t("game.playerMenu.idCopied"), "success");
    } catch {
      addToast(t("game.playerMenu.copyFailed"), "error");
    }
  };

  const inviteFriend = async () => {
    try {
      await sendFriendRequest({
        senderId: currentUserId,
        receiverUsername: player.name.trim(),
      }).unwrap();
      addToast(t("game.playerMenu.inviteSent"), "success");
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "data" in e
          ? String((e as { data?: { error?: string } }).data?.error ?? "")
          : "";
      addToast(msg || t("game.playerMenu.inviteError"), "error");
    }
  };

  const openMessages = () => {
    navigate(`/friends?tab=messages&with=${encodeURIComponent(player.id)}`);
    onClose();
  };

  const submitReport = async () => {
    setSubmittingReport(true);
    try {
      const res = await fetch(apiUrl("/api/reports/player"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          reportedUserId: player.id,
          gameId: gameId ?? undefined,
          reason: reportReason,
          detail: reportDetail.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast((data as { error?: string }).error ?? t("game.playerMenu.reportError"), "error");
        return;
      }
      addToast(t("game.playerMenu.reportSent"), "success");
      setStep("menu");
      setReportDetail("");
      onClose();
    } catch {
      addToast(t("game.playerMenu.reportError"), "error");
    } finally {
      setSubmittingReport(false);
    }
  };

  const reasonOptions: { value: ReportReason; labelKey: string }[] = [
    { value: "INAPPROPRIATE_LANGUAGE", labelKey: "game.playerMenu.reasonLanguage" },
    { value: "CHEATING", labelKey: "game.playerMenu.reasonCheating" },
    { value: "HARASSMENT", labelKey: "game.playerMenu.reasonHarassment" },
    { value: "SPAM", labelKey: "game.playerMenu.reasonSpam" },
    { value: "OTHER", labelKey: "game.playerMenu.reasonOther" },
  ];

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="player-menu-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setStep("menu");
            onClose();
          }}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          aria-label={t("common.close")}
        >
          <X className="h-5 w-5" />
        </button>

        {step === "menu" && (
          <>
            <h2 id="player-menu-title" className="pr-10 text-lg font-bold text-white">
              {player.name}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t("game.playerMenu.subtitle")}</p>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-300">
              <span className="min-w-0 flex-1 truncate" title={player.id}>
                ID: {player.id}
              </span>
              <button
                type="button"
                onClick={() => void copyId()}
                className="shrink-0 rounded-md p-1.5 text-amber-400 hover:bg-slate-800"
                title={t("game.playerMenu.copyId")}
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                disabled={inviting}
                onClick={() => void inviteFriend()}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700/90 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
              >
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                {t("game.playerMenu.inviteFriend")}
              </button>
              <button
                type="button"
                onClick={openMessages}
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-700/90 py-3 text-sm font-semibold text-white transition hover:bg-blue-600"
              >
                <MessageCircle className="h-4 w-4" />
                {t("game.playerMenu.sendMessage")}
              </button>
              <button
                type="button"
                onClick={() => setStep("report")}
                className="flex items-center justify-center gap-2 rounded-xl border border-red-500/50 bg-red-950/40 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-900/50"
              >
                <Flag className="h-4 w-4" />
                {t("game.playerMenu.report")}
              </button>
            </div>
          </>
        )}

        {step === "report" && (
          <>
            <button
              type="button"
              onClick={() => setStep("menu")}
              className="mb-3 flex items-center gap-1 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("game.playerMenu.back")}
            </button>
            <h2 className="text-lg font-bold text-white">{t("game.playerMenu.reportTitle")}</h2>
            <p className="mt-1 text-sm text-slate-400">{player.name}</p>

            <div className="mt-4 space-y-2">
              {reasonOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                    reportReason === opt.value
                      ? "border-amber-500/60 bg-amber-950/40 text-white"
                      : "border-slate-600 bg-slate-800/50 text-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    className="accent-amber-500"
                    checked={reportReason === opt.value}
                    onChange={() => setReportReason(opt.value)}
                  />
                  {t(opt.labelKey)}
                </label>
              ))}
            </div>

            <label className="mt-4 block text-xs font-medium text-slate-400">
              {t("game.playerMenu.reportDetail")}
              <textarea
                value={reportDetail}
                onChange={(e) => setReportDetail(e.target.value)}
                rows={3}
                maxLength={2000}
                className="mt-1 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600"
                placeholder={t("game.playerMenu.reportDetailPlaceholder")}
              />
            </label>

            <button
              type="button"
              disabled={submittingReport}
              onClick={() => void submitReport()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
            >
              {submittingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("game.playerMenu.submitReport")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
