import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { LogOut, X } from "lucide-react";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Fenêtre de confirmation pour quitter la partie — animation douce (sans bounce).
 */
export function QuitGameConfirmDialog({ open, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-[1100ms] ease-out"
        aria-label={t("lobby.help.close")}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quit-confirm-title"
        className="relative z-10 w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-[1100ms] ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-600/50 bg-slate-900/95 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.65)] ring-1 ring-white/10 backdrop-blur-md">
          <div className="h-1 bg-gradient-to-r from-red-600/80 via-amber-500/40 to-red-600/80" aria-hidden />
          <div className="p-6 sm:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex min-w-0 flex-1 items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                  aria-hidden
                >
                  <LogOut className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h2
                    id="quit-confirm-title"
                    className="text-lg font-semibold tracking-tight text-white sm:text-xl"
                  >
                    {t("nav.quitGameTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">
                    {t("nav.quitGameMessage")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCancel}
                className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
                aria-label={t("lobby.help.close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="w-full rounded-xl border border-slate-600/80 bg-slate-800/90 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-700/90 sm:w-auto sm:min-w-[120px]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-red-500 sm:w-auto sm:min-w-[120px]"
              >
                {t("nav.confirmQuit")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
