import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import type { BeloteRoomListItem } from "../components/LobbyBeloteSection";

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchBeloteRoom(roomId: string): Promise<BeloteRoomListItem | null> {
  const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}`), { headers: authHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as { room: BeloteRoomListItem };
  return data.room;
}

export async function addBeloteBot(roomId: string, difficulty = "NORMAL") {
  const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/bots`), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ difficulty }),
  });
  return res.json();
}

export async function fillBeloteBots(roomId: string, difficulty = "NORMAL") {
  const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/bots/fill`), {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ difficulty }),
  });
  const data = (await res.json()) as { error?: string; room?: BeloteRoomListItem };
  if (!res.ok) {
    throw new Error(data.error ?? "fill bots failed");
  }
  return data;
}

export async function removeBeloteBot(roomId: string, botId: string) {
  const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/bots/${encodeURIComponent(botId)}`), {
    method: "DELETE",
    headers: authHeaders(),
  });
  return res.json();
}
