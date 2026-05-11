type Props = {
  bracketJson?: unknown;
};

export function TournamentBracketPanel({ bracketJson }: Props) {
  if (!bracketJson) {
    return (
      <div className="text-sm text-white/60">Bracket disponible après le tirage.</div>
    );
  }
  return (
    <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/80">
      {JSON.stringify(bracketJson, null, 2)}
    </pre>
  );
}
