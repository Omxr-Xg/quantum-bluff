import bacBg from "../assets/background/BAC.png";

/** Fond lobby — BAC légèrement flouté, sous les teintes par onglet. */
export function LobbyShellBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={bacBg}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[6px] brightness-[0.66] grayscale"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/68 via-slate-900/42 to-blue-950/58" />
      <div className="absolute inset-0 bg-black/28" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.04),transparent_60%)]" />
    </div>
  );
}
