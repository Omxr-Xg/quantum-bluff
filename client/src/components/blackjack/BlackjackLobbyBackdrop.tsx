/**
 * Fond slate + halo feutre discret — même ADN que la table Hold’em / shell lobby.
 */
export function BlackjackLobbyBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-15%,rgba(16,185,129,0.12),transparent_55%),radial-gradient(ellipse_70%_50%_at_100%_50%,rgba(15,23,42,0.9),transparent_50%),radial-gradient(ellipse_60%_45%_at_0%_80%,rgba(245,158,11,0.06),transparent_45%)]" />
      <div className="absolute -top-24 left-1/4 h-[28rem] w-[28rem] rounded-full bg-emerald-500/10 blur-[100px]" />
      <div className="absolute -right-16 top-1/3 h-72 w-72 rounded-full bg-amber-500/8 blur-[90px]" />
      <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-slate-950/50 blur-[80px]" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
