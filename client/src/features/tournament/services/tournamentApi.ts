const API = "/api/tournaments";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchTournaments() {
  const r = await fetch(API, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function fetchTournament(id: string) {
  const r = await fetch(`${API}/${encodeURIComponent(id)}`, { headers: authHeaders() });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createTournament(body: Record<string, unknown>) {
  const r = await fetch(API, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<{ id: string }>;
}

export async function joinTournament(id: string, code?: string) {
  const r = await fetch(`${API}/${encodeURIComponent(id)}/join`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ code }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function leaveTournament(id: string) {
  const r = await fetch(`${API}/${encodeURIComponent(id)}/leave`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function startTournamentHost(id: string) {
  const r = await fetch(`${API}/${encodeURIComponent(id)}/start`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
