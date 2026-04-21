import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronLeft,
  ChevronRight,
  Circle,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Trash2,
} from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { clearAuthStorage } from "../utils/userProfile";

type Tab = "users" | "history" | "poker" | "bj" | "ratings";

const PAGE_SIZE = 25;

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type PokerRow = {
  gameId: string;
  kind?: string;
  roomId?: string;
  cashId?: string;
  phase?: string;
  pot?: number;
  playerCount?: number;
  players?: Array<{
    id: string;
    name: string;
    chips: number;
    isConnected?: boolean;
    isActive?: boolean;
  }>;
};

type UserRow = {
  id: string;
  username: string;
  email: string;
  chips: number;
  bannedUntil?: string | null;
};

type HistoryRow = {
  id: string;
  gameId: string;
  tableId: string;
  pot: number;
  createdAt: string;
  winner?: { username: string } | null;
};

type BjRoom = {
  id: string;
  name: string;
  status: string;
  gameId: string | null;
  host: { username: string };
  seats: Array<{ user: { username: string; id: string } }>;
};

type RatingRow = {
  id: string;
  stars: number;
  message: string | null;
  createdAt: string;
  user: { username: string; email: string };
};

export function AdminConsole() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("poker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [json, setJson] = useState<unknown>(null);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [skip, setSkip] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 320);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setSkip(0);
    setJson(null);
  }, [tab]);

  const listParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("take", String(PAGE_SIZE));
    p.set("skip", String(skip));
    if (debouncedSearch) p.set("q", debouncedSearch);
    return p.toString();
  }, [skip, debouncedSearch]);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let path = "";
      if (tab === "users") path = `/api/admin/console/users?${listParams}`;
      else if (tab === "history") path = `/api/admin/console/games/history?${listParams}`;
      else if (tab === "poker") {
        const p = new URLSearchParams();
        if (debouncedSearch) p.set("q", debouncedSearch);
        path = `/api/admin/console/games/active-poker?${p.toString()}`;
      } else if (tab === "bj") path = `/api/admin/console/games/blackjack-rooms?${listParams}`;
      else path = `/api/admin/console/ratings?${listParams}`;

      const res = await fetch(apiUrl(path), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.loadError"));
        setJson(null);
        return;
      }
      setJson(data);
    } catch {
      setError(t("adminConsole.networkError"));
      setJson(null);
    } finally {
      setLoading(false);
    }
  }, [tab, listParams, debouncedSearch, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const patchUser = async (userId: string, action: "suspend" | "ban" | "reactivate") => {
    setError(null);
    try {
      const body: { action: typeof action; suspendDays?: number } = { action };
      if (action === "suspend") body.suspendDays = 7;
      const res = await fetch(apiUrl(`/api/admin/console/users/${encodeURIComponent(userId)}`), {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.actionError"));
        return;
      }
      await load();
    } catch {
      setError(t("adminConsole.networkError"));
    }
  };

  const closePokerGame = async (gameId: string) => {
    if (!window.confirm(t("adminConsole.pokerCloseConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/games/active-poker/${encodeURIComponent(gameId)}`),
        { method: "DELETE", headers: authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.actionError"));
        return;
      }
      await load();
    } catch {
      setError(t("adminConsole.networkError"));
    }
  };

  const closeBlackjackRoom = async (roomId: string) => {
    if (!window.confirm(t("adminConsole.blackjackCloseConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/games/blackjack-rooms/${encodeURIComponent(roomId)}`),
        { method: "DELETE", headers: authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.actionError"));
        return;
      }
      await load();
    } catch {
      setError(t("adminConsole.networkError"));
    }
  };

  const logout = () => {
    clearAuthStorage();
    navigate("/auth/admin", { replace: true });
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "poker", label: t("adminConsole.tabPokerActive") },
    { id: "bj", label: t("adminConsole.tabBlackjack") },
    { id: "users", label: t("adminConsole.tabUsers") },
    { id: "history", label: t("adminConsole.tabHistory") },
    { id: "ratings", label: t("adminConsole.tabRatings") },
  ];

  const totalPages =
    json && typeof json === "object" && "total" in json && typeof (json as { total: number }).total === "number"
      ? Math.max(1, Math.ceil((json as { total: number }).total / PAGE_SIZE))
      : 1;
  const currentPage = Math.floor(skip / PAGE_SIZE) + 1;
  const canPrev = skip > 0;
  const canNext =
    json &&
    typeof json === "object" &&
    "total" in json &&
    skip + PAGE_SIZE < (json as { total: number }).total;

  const listPayload = json as { items?: unknown[]; total?: number } | null;
  const totalCount = listPayload?.total;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-700/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
              <Shield className="h-7 w-7 text-amber-400" aria-hidden />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                {t("adminConsole.title")}
              </h1>
              <p className="text-sm text-slate-400">{t("adminConsole.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-4 py-2.5 text-sm text-white transition hover:bg-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("adminConsole.refresh")}
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600/90 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-500"
            >
              <LogOut className="h-4 w-4" />
              {t("adminConsole.logout")}
            </button>
          </div>
        </header>

        <nav
          className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-2"
          aria-label="Admin sections"
        >
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === x.id
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-900/30"
                  : "text-slate-300 hover:bg-slate-700/80 hover:text-white"
              }`}
            >
              {x.label}
            </button>
          ))}
        </nav>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("adminConsole.searchPlaceholder")}
              className="w-full rounded-xl border border-slate-600 bg-slate-900/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-amber-500/60 focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              autoComplete="off"
            />
            {searchInput && (
              <button
                type="button"
                aria-label={t("adminConsole.clearSearch")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
                onClick={() => setSearchInput("")}
              >
                ×
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500 sm:max-w-xs">{t("adminConsole.filterHint")}</p>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-100">
            {error}
          </p>
        )}

        {loading && !json && (
          <div className="flex justify-center py-20 text-slate-400">{t("adminConsole.loading")}</div>
        )}

        {tab === "poker" && json && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">
                {(json as { count?: number }).count ?? 0}
              </span>{" "}
              {t("adminConsole.pokerGamesCount")}
            </p>
            {(json as { items: PokerRow[] }).items?.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-800/30 px-6 py-16 text-center text-slate-400">
                {t("adminConsole.pokerEmpty")}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(json as { items: PokerRow[] }).items?.map((row) => (
                  <div
                    key={row.gameId}
                    className="flex flex-col rounded-2xl border border-slate-600/80 bg-slate-800/50 p-4 shadow-lg shadow-black/20"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-amber-200/90">{row.gameId}</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                            {row.kind ?? "—"}
                          </span>
                          {row.phase && (
                            <span className="rounded-md bg-violet-900/50 px-2 py-0.5 text-xs text-violet-200">
                              {row.phase}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => void closePokerGame(row.gameId)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("adminConsole.pokerCloseGame")}
                      </button>
                    </div>
                    {row.roomId && (
                      <p className="mb-2 text-xs text-slate-400">
                        {t("adminConsole.pokerRoomId")}:{" "}
                        <span className="font-mono text-slate-300">{row.roomId}</span>
                      </p>
                    )}
                    <div className="mb-3 flex gap-4 text-sm border-t border-slate-700/80 pt-3">
                      <span className="text-slate-400">
                        {t("adminConsole.pokerPot")}:{" "}
                        <span className="font-semibold text-emerald-300">{row.pot ?? 0}</span>
                      </span>
                      <span className="text-slate-400">
                        {t("adminConsole.pokerParticipants")}:{" "}
                        <span className="text-white">{row.playerCount ?? row.players?.length ?? 0}</span>
                      </span>
                    </div>
                    <div className="border-t border-slate-700/60 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("adminConsole.pokerPlayerList")}
                      </p>
                      <ul className="max-h-40 space-y-1.5 overflow-y-auto text-sm">
                        {(row.players ?? []).map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/60 px-2 py-1.5"
                          >
                            <span className="truncate font-medium text-slate-100">{p.name}</span>
                            <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                              <span className="text-emerald-400/90">{p.chips}</span>
                              <Circle
                                className={`h-2 w-2 ${
                                  p.isConnected === false ? "text-red-400" : "text-emerald-400"
                                }`}
                                fill="currentColor"
                                aria-hidden
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "bj" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.bjColName")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColHost")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColStatus")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColSeats")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as BjRoom[]).map((room) => (
                  <tr key={room.id} className="text-slate-200">
                    <td className="px-3 py-2 font-medium">{room.name}</td>
                    <td className="px-3 py-2">{room.host.username}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs">{room.status}</span>
                    </td>
                    <td className="px-3 py-2">{room.seats.length}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">
                      {room.gameId ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void closeBlackjackRoom(room.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600/85 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("adminConsole.blackjackCloseRoom")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.blackjackEmpty")}</p>
            )}
          </div>
        )}

        {tab === "users" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <p className="px-3 py-2 text-xs text-slate-400">
              {totalCount != null ? (
                <>
                  {t("adminConsole.totalCount")}: <span className="text-slate-200">{totalCount}</span>
                </>
              ) : null}
            </p>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.colUsername")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colEmail")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colChips")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colBanned")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as UserRow[]).map((u) => (
                  <tr key={u.id} className="text-slate-200">
                    <td className="px-3 py-2 font-medium text-white">{u.username}</td>
                    <td className="px-3 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-3 py-2">{u.chips}</td>
                    <td className="px-3 py-2 text-xs">
                      {u.bannedUntil ? new Date(u.bannedUntil).toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="rounded-lg bg-orange-900/80 px-2 py-1 text-xs hover:bg-orange-800"
                          onClick={() => void patchUser(u.id, "suspend")}
                        >
                          {t("adminConsole.suspend7")}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-900/80 px-2 py-1 text-xs hover:bg-red-800"
                          onClick={() => void patchUser(u.id, "ban")}
                        >
                          {t("adminConsole.ban")}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-emerald-900/80 px-2 py-1 text-xs hover:bg-emerald-800"
                          onClick={() => void patchUser(u.id, "reactivate")}
                        >
                          {t("adminConsole.reactivate")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.listEmpty")}</p>
            )}
          </div>
        )}

        {tab === "history" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.historyColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColPot")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColWinner")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as HistoryRow[]).map((h) => (
                  <tr key={h.id} className="text-slate-200">
                    <td className="px-3 py-2 font-mono text-xs text-amber-200/90">{h.gameId}</td>
                    <td className="px-3 py-2">{h.pot}</td>
                    <td className="px-3 py-2">{h.winner?.username ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(h.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.listEmpty")}</p>
            )}
          </div>
        )}

        {tab === "ratings" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.colUsername")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColStars")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColMessage")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as RatingRow[]).map((r) => (
                  <tr key={r.id} className="text-slate-200">
                    <td className="px-3 py-2">{r.user.username}</td>
                    <td className="px-3 py-2">{r.stars}</td>
                    <td className="px-3 py-2 max-w-xs truncate text-slate-300" title={r.message ?? ""}>
                      {r.message ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.listEmpty")}</p>
            )}
          </div>
        )}

        {tab !== "poker" &&
          ["users", "history", "bj", "ratings"].includes(tab) &&
          json &&
          totalCount != null &&
          totalCount > PAGE_SIZE && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/80 pt-4">
              <p className="text-sm text-slate-400">
                {t("adminConsole.pageInfo", {
                  current: currentPage,
                  total: totalPages,
                })}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!canPrev || loading}
                  onClick={() => setSkip((s) => Math.max(0, s - PAGE_SIZE))}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("adminConsole.paginationPrev")}
                </button>
                <button
                  type="button"
                  disabled={!canNext || loading}
                  onClick={() => setSkip((s) => s + PAGE_SIZE)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-40"
                >
                  {t("adminConsole.paginationNext")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
