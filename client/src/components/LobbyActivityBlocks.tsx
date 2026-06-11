import type { CSSProperties, ReactNode, RefObject } from "react";
import { Loader2, UsersRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LobbyListSkeleton } from "./LobbyPanelSkeleton";

export const lobbyActivitySectionClass =
  "flex shrink-0 flex-col rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.07] to-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_8px_32px_rgba(0,0,0,0.18)] backdrop-blur-md sm:p-3.5";

export const lobbyActivityListClass =
  "space-y-2 overflow-y-auto overscroll-contain pr-1";

const DEFAULT_LIST_GAP_PX = 8;

export const lobbyTournamentSectionClass =
  "flex shrink-0 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md";

export function lobbyActivityListMaxHeight(
  itemCount: number,
  scrollAfter: number,
  rowHeightPx: number,
  gapPx = DEFAULT_LIST_GAP_PX,
): CSSProperties | undefined {
  if (itemCount <= 0) return undefined;
  const visible = Math.min(itemCount, scrollAfter);
  const gaps = Math.max(0, visible - 1) * gapPx;
  return { maxHeight: `${visible * rowHeightPx + gaps}px` };
}

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
  itemCount: number;
  /** Nombre de lignes visibles avant scroll interne. */
  scrollAfter: number;
  /** Hauteur estimée d’une ligne (px). */
  rowHeightPx: number;
  emptyMessage: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  sectionClassName?: string;
  listClassName?: string;
  listGapPx?: number;
  children: ReactNode;
};

export function LobbyActivitySection({
  title,
  tourRef,
  loading,
  hasItems,
  itemCount,
  scrollAfter,
  rowHeightPx,
  emptyMessage,
  errorMessage,
  onRetry,
  sectionClassName,
  listClassName = lobbyActivityListClass,
  listGapPx = DEFAULT_LIST_GAP_PX,
  children,
}: LobbyActivitySectionProps) {
  const { t } = useTranslation();
  const listStyle = lobbyActivityListMaxHeight(itemCount, scrollAfter, rowHeightPx, listGapPx);

  return (
    <div ref={tourRef} className={sectionClassName ?? lobbyActivitySectionClass}>
      <p className="mb-1.5 flex shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-slate-100">
        {title}
        {loading && hasItems ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" aria-hidden />
        ) : null}
      </p>
      {loading && !hasItems ? (
        <LobbyListSkeleton rows={1} />
      ) : !hasItems && errorMessage ? (
        <div className="py-2 text-center">
          <p className="mb-2 text-sm text-red-400">{errorMessage}</p>
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
        <p className="py-1.5 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className={listClassName} style={listStyle}>
          {children}
        </ul>
      )}
    </div>
  );
}
