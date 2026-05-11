import { useParams } from "react-router-dom";
import { useTournamentSocket } from "../hooks/useTournamentSocket";
import { ZipRushMiniGame } from "../components/ZipRushMiniGame";
import { useState } from "react";

export function TournamentWaiting() {
  const { id } = useParams<{ id: string }>();
  const [paused, setPaused] = useState(false);

  useTournamentSocket(id, {
    onNextRound: () => setPaused(true),
    onTableAssigned: () => setPaused(false),
  });

  if (!id) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6 text-white">
      <h1 className="text-xl font-semibold">En attente du prochain tour</h1>
      <p className="text-sm text-white/70">
        Mini-jeu local — la partie poker s’ouvre dans un autre onglet quand la
        table est prête.
      </p>
      <ZipRushMiniGame paused={paused} />
    </div>
  );
}
