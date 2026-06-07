/** Montant jetons dans une notification (clés historiques + actuelles). */
export function notificationChipsLabel(payload: Record<string, unknown>): string {
  const raw = payload.chips ?? payload.rewardTokens ?? payload.amount;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw.toLocaleString();
  }
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n.toLocaleString();
  }
  return "—";
}
