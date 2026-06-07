const KEY = "quantum_bluff_pending_referral";

export function normalizeReferralInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function persistPendingReferralCode(raw: string | null | undefined): void {
  const code = normalizeReferralInput(raw ?? "");
  if (!code || typeof window === "undefined") return;
  sessionStorage.setItem(KEY, code);
}

export function getPendingReferralCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const code = sessionStorage.getItem(KEY)?.trim();
  return code || undefined;
}

export function clearPendingReferralCode(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
