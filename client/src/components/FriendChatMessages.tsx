import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FriendMessage } from "../services/api";

export function formatFriendChatDateTime(dateStr: string, locale: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCallDuration(seconds: number, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return t("friends.callDurationMinutes", { minutes: mins, seconds: secs });
  }
  return t("friends.callDurationSeconds", { seconds: secs });
}

function callLabel(
  msg: FriendMessage,
  viewerUserId: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const isOutgoing = msg.senderId === viewerUserId;
  const outcome = msg.callOutcome ?? "completed";
  const peerName = isOutgoing
    ? (msg.receiver?.username ?? t("friends.callPeer"))
    : (msg.sender?.username ?? t("friends.callPeer"));

  if (outcome === "completed" && msg.callDurationSec && msg.callDurationSec > 0) {
    return isOutgoing
      ? t("friends.callOutgoingCompleted", {
          username: peerName,
          duration: formatCallDuration(msg.callDurationSec, t),
        })
      : t("friends.callIncomingCompleted", {
          username: peerName,
          duration: formatCallDuration(msg.callDurationSec, t),
        });
  }

  if (outcome === "missed") {
    return isOutgoing
      ? t("friends.callOutgoingMissed", { username: peerName })
      : t("friends.callIncomingMissed", { username: peerName });
  }
  if (outcome === "cancelled") {
    return isOutgoing
      ? t("friends.callOutgoingCancelled", { username: peerName })
      : t("friends.callIncomingCancelled", { username: peerName });
  }
  if (outcome === "rejected") {
    return isOutgoing
      ? t("friends.callOutgoingRejected", { username: peerName })
      : t("friends.callIncomingRejected", { username: peerName });
  }

  return isOutgoing
    ? t("friends.callOutgoing", { username: peerName })
    : t("friends.callIncoming", { username: peerName });
}

function dayKey(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type FriendChatMessagesProps = {
  messages: FriendMessage[];
  viewerUserId: string;
  locale: string;
};

export function FriendChatMessages({ messages, viewerUserId, locale }: FriendChatMessagesProps) {
  const { t } = useTranslation();
  let lastDayKey = "";

  return (
    <>
      {messages.map((msg) => {
        const isMe = msg.senderId === viewerUserId;
        const isCall = msg.kind === "VOICE_CALL";
        const currentDayKey = dayKey(msg.createdAt);
        const showDaySeparator = currentDayKey && currentDayKey !== lastDayKey;
        if (showDaySeparator) lastDayKey = currentDayKey;

        const dayLabel = showDaySeparator
          ? new Date(msg.createdAt).toLocaleDateString(locale, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : null;

        return (
          <div key={msg.id}>
            {showDaySeparator ? (
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="shrink-0 text-[11px] font-medium text-slate-500">{dayLabel}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
            ) : null}

            {isCall ? (
              <div className="my-3 flex justify-center">
                <div className="flex max-w-[90%] flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <p className="text-xs font-medium">{callLabel(msg, viewerUserId, t)}</p>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {formatFriendChatDateTime(msg.createdAt, locale)}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                    isMe
                      ? "rounded-tr-none border border-blue-300/20 bg-blue-900/80"
                      : "rounded-tl-none border border-white/10 bg-white/[0.07]"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-white">{msg.content}</p>
                  <span className={`mt-1 block text-xs ${isMe ? "text-blue-200" : "text-gray-400"}`}>
                    {formatFriendChatDateTime(msg.createdAt, locale)}
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
