import bl1Bg from "../assets/background/BL1.png";

/** Fond lobby — image BL1 légèrement floutée, sous les dégradés par onglet. */
export function LobbyShellBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={bl1Bg}
          alt=""
          className="h-full w-full scale-105 object-cover blur-[6px]"
        />
      </div>
      <div className="absolute inset-0 bg-slate-950/35" />
    </div>
  );
}
