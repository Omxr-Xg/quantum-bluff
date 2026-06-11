type LobbyListSkeletonProps = {
  rows?: number;
  className?: string;
};

export function LobbyListSkeleton({ rows = 3, className = "" }: LobbyListSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="min-h-[5rem] animate-pulse rounded-xl border border-white/8 bg-white/[0.04] px-3.5 py-3.5"
        >
          <div className="mb-2.5 h-4 w-2/5 rounded bg-white/10" />
          <div className="h-3 w-1/3 rounded bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}

export function DailyChallengesSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-white/8 bg-white/[0.04] p-2"
        >
          <div className="mb-2 h-2 w-16 rounded bg-white/10" />
          <div className="mb-2 h-3 w-4/5 rounded bg-white/10" />
          <div className="h-1 w-full rounded-full bg-white/[0.07]" />
        </div>
      ))}
    </div>
  );
}

export function FriendsListSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 2 }, (_, i) => (
        <div
          key={i}
          className="flex h-[4.75rem] shrink-0 animate-pulse items-center gap-3 rounded-xl border border-white/8 bg-white/[0.04] px-3"
        >
          <div className="h-9 w-9 shrink-0 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-2 w-16 rounded bg-white/[0.07]" />
            <div className="h-2 w-20 rounded bg-white/[0.06]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LobbySidebarSkeleton() {
  return (
    <div className="space-y-4 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:gap-3 lg:space-y-0">
      <div className="rounded-2xl border border-amber-200/16 bg-slate-900/58 p-3 xl:p-4">
        <div className="mb-3 h-5 w-40 animate-pulse rounded bg-white/10" />
        <DailyChallengesSkeleton />
      </div>
      <div className="rounded-2xl border border-amber-200/16 bg-slate-900/58 p-4 xl:p-5">
        <div className="mb-3 h-6 w-32 animate-pulse rounded bg-white/10" />
        <FriendsListSkeleton />
      </div>
    </div>
  );
}
