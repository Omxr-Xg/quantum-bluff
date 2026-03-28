import { apiUrl } from "../utils/apiBase";

const jsonHeaders = { "Content-Type": "application/json" };

export type HiddenBetMarketPhase =
  | "PRE_HAND"
  | "LIVE_FLOP"
  | "LIVE_TURN"
  | "LIVE_RIVER";

export type SelectionPayload =
  | { marketType: "PLAYER_WINS"; playerId: string }
  | { marketType: "WINNING_HAND_CLASS"; class: string }
  | { marketType: "WINNING_HAND_CONTAINS_RANK"; rank: string }
  | { marketType: "PLAYER_WINS_CURRENT_HAND"; playerId: string }
  | { marketType: "HAND_REACHES_SHOWDOWN" }
  | { marketType: "HAND_ENDS_BY_FOLD" }
  | { marketType: "FINAL_WINNING_HAND_CLASS"; class: string };

export interface HiddenBetQuoteResponse {
  quotedOdds: number;
  potentialPayout: number;
  pricingVersion: string;
  quoteExpiresAt: string;
  quoteHash: string;
  quotedProbability?: number;
  marketPhase?: HiddenBetMarketPhase;
}

export async function quoteHiddenBet(body: {
  gameId: string;
  marketPhase: HiddenBetMarketPhase;
  targetHandId: string;
  combinator: "SINGLE" | "AND";
  selections: SelectionPayload[];
  stakePreview?: number;
}): Promise<HiddenBetQuoteResponse> {
  const res = await fetch(apiUrl("/api/hidden-bets/quote"), {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as HiddenBetQuoteResponse;
}

export async function placeHiddenBet(body: {
  gameId: string;
  marketPhase: HiddenBetMarketPhase;
  targetHandId: string;
  stake: number;
  combinator: "SINGLE" | "AND";
  selections: SelectionPayload[];
  actionId: string;
  quoteHash?: string;
  pricingVersion?: string;
  quoteExpiresAt?: string;
}): Promise<{ ticket: unknown }> {
  const res = await fetch(apiUrl("/api/hidden-bets/place"), {
    method: "POST",
    credentials: "include",
    headers: jsonHeaders,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as { ticket: unknown };
}

export async function fetchHiddenBetHistory(limit = 50): Promise<{ tickets: unknown[] }> {
  const res = await fetch(apiUrl(`/api/hidden-bets/history?limit=${limit}`), {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as { tickets: unknown[] };
}

export async function fetchHiddenBetMarkets(gameId: string, phase?: HiddenBetMarketPhase | "ALL") {
  const q = phase ? `&phase=${encodeURIComponent(phase)}` : "";
  const res = await fetch(apiUrl(`/api/hidden-bets/markets?gameId=${encodeURIComponent(gameId)}${q}`), {
    credentials: "include",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? res.statusText);
  return data as { markets: unknown[]; gameId: string };
}
