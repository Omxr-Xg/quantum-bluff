import type { ReactNode, RefObject } from "react";
import { Loader2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";

export const lobbyActivitySectionClass =
  "flex min-h-0 flex-1 flex-col rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-3.5";

export const lobbyActivityListClass =
  "min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1";

export function LobbyFriendRoomBadge() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-200 sm:text-[11px]">
      <UsersRound className="h-3 w-3 shrink-0" aria-hidden />
      {t("lobby.friendRoom")}
    </span>
  );
}

type LobbyActivitySectionProps = {
  title: string;
  tourRef?: RefObject<HTMLDivElement | null>;
  loading: boolean;
  hasItems: boolean;
  emptyMessage: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  children: ReactNode;
};

export function LobbyActivitySection({
  title,
  tourRef,
  loading,
  hasItems,
  emptyMessage,
  errorMessage,
  onRetry,
  children,
}: LobbyActivitySectionProps) {
  const { t } = useTranslation();

  return (
    <div ref={tourRef} className={lobbyActivitySectionClass}>
      <p className="mb-2 flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-slate-100">
        {title}
      </p>
      {loading && !hasItems ? (
        <p className="flex flex-1 items-center justify-center gap-2 py-6 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </p>
      ) : !hasItems && errorMessage ? (
        <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
          <p className="mb-3 text-sm text-red-400">{errorMessage}</p>
          {onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg border border-white/10 bg-white/[0.07] px-4 py-2 text-sm text-white transition hover:bg-white/[0.12]"
            >
              {t("common.retry")}
            </button>
          ) : null}
        </div>
      ) : !hasItems ? (
        <p className="flex flex-1 items-center justify-center py-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <ul className={lobbyActivityListClass}>{children}</ul>
      )}
    </div>
  );
}
