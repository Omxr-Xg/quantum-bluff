import { getAuthItem } from "../../utils/authStorage";
import { apiUrl } from "../../utils/apiBase";

function authHeaders(): HeadersInit | null {
  const token = getAuthItem("token");
  if (!token) return null;
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export type CrashActiveResponse =
  | { active: false }
  | {
      active: true;
      roundId: string;
      bet: number;
      startedAt: number;
      status: "running";
      multiplier: number;
      serverNow: number;
    };

export type CrashStartResponse = {
  roundId: string;
  startedAt: number;
  serverNow: number;
  multiplier: number;
  bet: number;
  chips: number;
};

export type CrashCashoutResponse = {
  multiplier: number;
  payout: number;
  profit: number;
  crashPoint: number;
  serverNow: number;
  chips: number;
};

export type CrashTickResponse =
  | {
      status: "running";
      roundId: string;
      bet: number;
      startedAt: number;
      multiplier: number;
      serverNow: number;
    }
  | {
      status: "cashed_out";
      roundId: string;
      multiplier: number;
      payout: number;
      profit: number;
      crashPoint: number;
      chips?: number;
      serverNow: number;
    }
  | {
      status: "crashed";
      roundId: string;
      crashPoint: number;
      lost: number;
      chips?: number;
      serverNow: number;
    };

async function crashPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const headers = authHeaders();
  if (!headers) throw new Error("NO_AUTH");
  const res = await fetch(apiUrl(path), { method: "POST", headers, body: JSON.stringify(body) });
  const data = (await res.json()) as T & { error?: string; code?: string };
  if (!res.ok) {
    const err = new Error(data.error ?? data.code ?? "REQUEST_FAILED") as Error & { code?: string };
    err.code = data.code ?? data.error;
    throw err;
  }
  return data;
}

export async function fetchCrashActive(): Promise<CrashActiveResponse> {
  const headers = authHeaders();
  if (!headers) return { active: false };
  try {
    const res = await fetch(apiUrl("/api/crash/active"), { headers });
    if (!res.ok) return { active: false };
    return (await res.json()) as CrashActiveResponse;
  } catch {
    return { active: false };
  }
}

export function crashStart(bet: number, actionId: string): Promise<CrashStartResponse> {
  return crashPost("/api/crash/start", { bet, actionId, roundId: actionId });
}

export function crashCashout(roundId: string): Promise<CrashCashoutResponse> {
  return crashPost("/api/crash/cashout", { roundId });
}

export function crashTick(roundId: string): Promise<CrashTickResponse> {
  return crashPost("/api/crash/settle", { roundId });
}
