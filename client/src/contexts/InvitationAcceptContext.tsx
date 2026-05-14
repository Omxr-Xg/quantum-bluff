import React, { createContext, useContext } from "react";
import { useTranslation } from "react-i18next";
import { useWaitingRoomInvitationAccept } from "../hooks/useWaitingRoomInvitationAccept";
import { InvitationLeaveGameModal } from "../components/InvitationLeaveGameModal";
import { AlertTriangle } from "lucide-react";

type Ctx = ReturnType<typeof useWaitingRoomInvitationAccept>;

const InvitationAcceptContext = createContext<Ctx | null>(null);

export function InvitationAcceptProvider({ children }: { children: React.ReactNode }) {
  const value = useWaitingRoomInvitationAccept();
  const { t } = useTranslation();

  return (
    <InvitationAcceptContext.Provider value={value}>
      <InvitationLeaveGameModal
        open={value.leavePromptInvitation != null}
        roomName={value.leavePromptInvitation?.roomName ?? ""}
        senderName={value.leavePromptInvitation?.sender.username ?? ""}
        onCancel={value.cancelLeavePrompt}
        onConfirm={value.confirmLeaveAndAccept}
        confirming={value.confirmingLeave}
      />
      {value.blockedWarningInvitation ? (
        <div className="fixed inset-0 z-[350] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/20 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/50">
                <AlertTriangle className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("lobby.blockedRoomWarningTitle")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {t("lobby.blockedRoomWarningBody", {
                    names: value.blockedWarningNames.join(", "),
                  })}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={value.cancelBlockedWarning}
                disabled={value.confirmingLeave}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={value.confirmBlockedWarningAndAccept}
                disabled={value.confirmingLeave}
                className="rounded-full border border-amber-300/20 bg-amber-700 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {t("lobby.blockedRoomWarningContinue")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {children}
    </InvitationAcceptContext.Provider>
  );
}

export function useInvitationAccept() {
  const ctx = useContext(InvitationAcceptContext);
  if (!ctx) {
    throw new Error("useInvitationAccept must be used within InvitationAcceptProvider");
  }
  return ctx;
}
