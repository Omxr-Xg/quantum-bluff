import type { BeloteGameVariant } from "../features/belote/beloteVariants";
import { fillBeloteBots } from "../services/beloteApi";
import { apiUrl } from "./apiBase";
import { getAuthItem } from "./authStorage";

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export type StartBeloteBotGameParams = {
  roomName: string;
  variant: BeloteGameVariant;
  targetScore: number;
};

export type StartBeloteBotGameResult =
  | { ok: true; gameId: string }
  | { ok: true; waitingRoomId: string; gameId?: undefined }
  | { ok: false; error: string; waitingRoomId?: string };

/** Crée une table privée, ajoute 3 IA, prêt + démarrage si possible. */
export async function startBeloteBotGame(
  params: StartBeloteBotGameParams,
): Promise<StartBeloteBotGameResult> {
  const createRes = await fetch(apiUrl("/api/belote-rooms/create"), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: params.roomName,
      visibility: "PRIVATE",
      targetScore: params.targetScore,
      variant: params.variant,
      botPractice: true,
      defaultBotDifficulty: "NORMAL",
    }),
  });
  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    return { ok: false, error: (err as { error?: string }).error ?? "create failed" };
  }
  const { room } = (await createRes.json()) as { room: { id: string } };

  await fillBeloteBots(room.id);

  const readyRes = await fetch(apiUrl(`/api/belote-rooms/${room.id}/ready`), {
    method: "POST",
    headers: authHeaders(),
  });
  if (!readyRes.ok) {
    return { ok: true, waitingRoomId: room.id };
  }

  const startRes = await fetch(apiUrl(`/api/belote-rooms/${room.id}/start`), {
    method: "POST",
    headers: authHeaders(),
  });
  if (!startRes.ok) {
    const err = await startRes.json().catch(() => ({}));
    const msg = (err as { error?: string }).error;
    return { ok: false, error: msg ?? "start failed", waitingRoomId: room.id };
  }

  const started = (await startRes.json()) as { gameId: string };
  return { ok: true, gameId: started.gameId };
}
