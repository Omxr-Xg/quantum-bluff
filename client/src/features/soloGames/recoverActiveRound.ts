import { getAuthItem } from "../../utils/authStorage";
import { apiUrl } from "../../utils/apiBase";

type AuthHeaders = { Authorization: string; "Content-Type": "application/json" };

function authHeaders(): AuthHeaders | null {
  const token = getAuthItem("token");
  if (!token) return null;
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export type CrashActiveRound = {
  active: true;
  roundId: string;
  bet: number;
  startedAt: number;
  status: "running";
  multiplier: number;
  serverNow?: number;
};

export type MinesActiveRound = {
  active: true;
  roundId: string;
  bet: number;
  mineCount: number;
  revealedCells: number[];
  multiplier: number;
  status: "running";
  startedAt: number;
};

export async function fetchCrashActiveRound(): Promise<CrashActiveRound | null> {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(apiUrl("/api/crash/active"), { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as { active?: boolean; roundId?: string };
    if (!data.active || !data.roundId) return null;
    return data as CrashActiveRound;
  } catch {
    return null;
  }
}

export async function fetchMinesActiveRound(): Promise<MinesActiveRound | null> {
  const headers = authHeaders();
  if (!headers) return null;
  try {
    const res = await fetch(apiUrl("/api/mines/active"), { headers });
    if (!res.ok) return null;
    const data = (await res.json()) as { active?: boolean; roundId?: string };
    if (!data.active || !data.roundId) return null;
    return data as MinesActiveRound;
  } catch {
    return null;
  }
}

/** Codes 409 « partie fantôme » : le serveur réconcilie d'abord ; un retry suffit en général. */
export function isSoloActiveConflict(code: string | undefined): boolean {
  return (
    code === "ACTIVE_CRASH_ROUND" ||
    code === "ACTIVE_MINES_ROUND" ||
    code === "ACTIVE_WHEEL_SPIN" ||
    code === "ACTIVE_LUCKY_NUMBER_PLAY"
  );
}
