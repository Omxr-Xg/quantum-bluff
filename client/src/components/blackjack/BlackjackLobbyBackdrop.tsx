/**
 * Fond bordeaux / rose aligné sur l’onglet Blackjack du lobby principal (`Lobby.tsx`).
 */
export function BlackjackLobbyBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(190,24,93,0.22),transparent_52%),radial-gradient(ellipse_80%_55%_at_100%_40%,rgba(30,10,24,0.85),transparent_50%),linear-gradient(165deg,#1a0a12_0%,#120810_45%,#080406_100%)]" />
      <div className="absolute -top-28 left-1/3 h-[34rem] w-[34rem] rounded-full bg-rose-600/14 blur-[110px]" />
      <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-fuchsia-900/20 blur-[95px]" />
      <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-rose-950/40 blur-[90px]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(251,113,133,0.4) 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
      />
    </div>
  );
}
