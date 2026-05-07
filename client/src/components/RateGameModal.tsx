import { useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Star, X } from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { useToast } from "../contexts/ToastContext";
import { getAuthItem } from "../utils/authStorage";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RateGameModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [stars, setStars] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    if (stars < 1 || stars > 5) {
      addToast(t("rateGame.pickStars"), "error");
      return;
    }
    setSubmitting(true);
    try {
      const token = getAuthItem("token");
      const res = await fetch(apiUrl("/api/feedback/game-rating"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          stars,
          message: message.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("rateGame.error"));
      }
      addToast(t("rateGame.thanks"), "success");
      setStars(0);
      setMessage("");
      onClose();
    } catch {
      addToast(t("rateGame.error"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    if (!submitting) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("rateGame.close")}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rate-game-title"
        className="relative z-[251] w-full max-w-md rounded-2xl border border-amber-500/50 bg-slate-900/98 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="rate-game-title" className="text-xl font-bold text-white">
            {t("rateGame.title")}
          </h2>
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            aria-label={t("rateGame.close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-300">{t("rateGame.subtitle")}</p>

        <div className="mb-4 flex justify-center gap-2" role="group" aria-label={t("rateGame.starsLabel")}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              className="rounded-lg p-1 transition hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              aria-pressed={stars === n}
              aria-label={t("rateGame.starAria", { n })}
            >
              <Star
                className={`h-10 w-10 ${
                  n <= stars ? "fill-amber-400 text-amber-300" : "text-slate-600"
                }`}
                strokeWidth={1.5}
              />
            </button>
          ))}
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="rate-game-message">
          {t("rateGame.messageLabel")}
        </label>
        <textarea
          id="rate-game-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder={t("rateGame.messagePlaceholder")}
          className="mb-4 w-full resize-y rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={close}
            disabled={submitting}
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {t("rateGame.later")}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || stars < 1}
            className="ml-auto rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? t("rateGame.sending") : t("rateGame.send")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
