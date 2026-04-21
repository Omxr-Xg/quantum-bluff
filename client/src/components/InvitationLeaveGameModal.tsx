import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  roomName: string;
  senderName: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

export function InvitationLeaveGameModal({
  open,
  roomName,
  senderName,
  onCancel,
  onConfirm,
  confirming = false,
}: Props) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inv-leave-game-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-amber-500/40 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="inv-leave-game-title" className="text-lg font-bold text-white">
          {t("invitation.leaveGameTitle")}
        </h2>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">
          {t("invitation.leaveGameBody", { room: roomName, sender: senderName })}
        </p>
        <p className="mt-2 text-xs text-amber-200/90">{t("invitation.leaveGameHint")}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={confirming}
            onClick={onCancel}
            className="rounded-xl border border-slate-500 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            {t("invitation.leaveGameCancel")}
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500 disabled:opacity-50"
          >
            {confirming ? t("common.loading") : t("invitation.leaveGameConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
