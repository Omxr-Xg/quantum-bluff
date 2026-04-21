import React, { createContext, useContext } from "react";
import { useWaitingRoomInvitationAccept } from "../hooks/useWaitingRoomInvitationAccept";
import { InvitationLeaveGameModal } from "../components/InvitationLeaveGameModal";

type Ctx = ReturnType<typeof useWaitingRoomInvitationAccept>;

const InvitationAcceptContext = createContext<Ctx | null>(null);

export function InvitationAcceptProvider({ children }: { children: React.ReactNode }) {
  const value = useWaitingRoomInvitationAccept();

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
