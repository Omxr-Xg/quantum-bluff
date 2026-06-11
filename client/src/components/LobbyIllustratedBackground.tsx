export const lobbyIllustratedOverlays = {
  pokerServer: "from-blue-950/95 via-slate-950/92 to-slate-950/96",
  beloteServer: "from-emerald-950/95 via-slate-950/92 to-slate-950/96",
  pokerTournament: "from-amber-950/95 via-slate-950/92 to-slate-950/96",
  beloteTournament: "from-emerald-950/95 via-slate-950/92 to-slate-950/96",
  dailyChallenges: "from-amber-950/95 via-slate-950/92 to-slate-950/96",
  blackjackMulti: "from-rose-950/95 via-slate-950/92 to-slate-950/96",
} as const;

type LobbyIllustratedBackgroundProps = {
  image: string;
  overlay: (typeof lobbyIllustratedOverlays)[keyof typeof lobbyIllustratedOverlays];
};

export function LobbyIllustratedBackground({ image, overlay }: LobbyIllustratedBackgroundProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat brightness-[0.42]"
        style={{ backgroundImage: `url(${image})` }}
        aria-hidden
      />
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${overlay}`}
        aria-hidden
      />
    </>
  );
}
