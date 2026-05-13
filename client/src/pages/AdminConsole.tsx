import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Circle,
  Copy,
  KeyRound,
  LogOut,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  Gift,
  ClipboardList,
  Eye,
} from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { clearAuthStorage } from "../utils/userProfile";
import { getAuthItem } from "../utils/authStorage";

type Tab =
  | "users"
  | "history"
  | "poker"
  | "bj"
  | "waitingRooms"
  | "tournaments"
  | "ratings"
  | "reports"
  | "giftCodes";

const PAGE_SIZE = 25;

/** Chemin app joueur (basename Vite) pour ouvrir /game, /blackjack, /tournaments depuis la console admin. */
function playerAppHref(pathAndQuery: string): string {
  const base = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const pq = pathAndQuery.startsWith("/") ? pathAndQuery : `/${pathAndQuery}`;
  const combined = base ? `${base}${pq}` : pq;
  return new URL(combined, window.location.origin).toString();
}

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
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
  lifecycleKey?: string;
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
  host?: { username: string } | null;
  seats?: Array<{ user: { username: string; id: string } }>;
  runtimeAlive?: boolean;
  adminStatusKey?: string;
};

type TournamentAdminRow = {
  id: string;
  name: string;
  status: string;
  maxPlayers: number;
  initialStack: number;
  startAt: string;
  currentRoundNumber: number;
  host?: { username: string; id: string } | null;
  _count?: { players: number };
};

type RatingRow = {
  id: string;
  stars: number;
  message: string | null;
  createdAt: string;
  user?: { username: string; email: string };
};

type ReportRow = {
  id: string;
  gameId: string | null;
  reason: string;
  detail: string | null;
  createdAt: string;
  reviewedAt: string | null;
  reporter?: { id: string; username: string; email: string };
  reported?: { id: string; username: string; email: string };
};

type WaitingRoomAdminRow = {
  id: string;
  name: string;
  hostId: string;
  status: string;
  gameId: string | null;
  maxPlayers: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
};

type GiftCodeRow = {
  id: string;
  code: string;
  amount: number;
  usageType: string;
  type: string;
  description: string | null;
  expiresAt: string | null;
  maxUses: number;
  usedCount: number;
  createdAt: string;
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
  const [reportUnread, setReportUnread] = useState(0);

  const [pwdModal, setPwdModal] = useState<{ id: string; username: string } | null>(null);
  const [pwdInput, setPwdInput] = useState("");
  const [pwdResult, setPwdResult] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Gift Codes states
  const [codeForm, setCodeForm] = useState({
    code: "",
    amount: 500,
    usageType: "TOKENS",
    type: "SPECIAL",
    description: "",
    expiresAt: "",
    maxUses: -1
  });
  const [giftCodes, setGiftCodes] = useState<GiftCodeRow[]>([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);

  const fetchReportUnread = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/console/player-reports/unread-count"), {
        headers: authHeaders(),
      });
      if (!res.ok) return;
      const d = (await res.json()) as { count?: number };
      setReportUnread(typeof d.count === "number" ? d.count : 0);
    } catch {
      /* ignore */
    }
  }, []);

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

  const loadGiftCodes = useCallback(async () => {
    setCodeLoading(true);
    setCodeError(null);
    try {
      const res = await fetch(apiUrl("/api/gift-codes/admin/list?limit=50"), { headers: authHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError((data as { error?: string }).error ?? "Erreur lors du chargement");
        return;
      }
      setGiftCodes((data as { codes?: GiftCodeRow[] }).codes || []);
    } catch {
      setCodeError("Erreur réseau");
    } finally {
      setCodeLoading(false);
    }
  }, []);

  const createGiftCode = useCallback(async () => {
    if (!codeForm.code.trim()) {
      setCodeError("Le code est requis");
      return;
    }
    if (codeForm.amount < 1) {
      setCodeError("Le montant doit être >= 1");
      return;
    }

    setCodeLoading(true);
    setCodeError(null);
    setCodeSuccess(null);

    try {
      const res = await fetch(apiUrl("/api/gift-codes/admin/create"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          code: codeForm.code,
          amount: codeForm.amount,
          usageType: codeForm.usageType,
          type: codeForm.type,
          description: codeForm.description || null,
          expiresAt: codeForm.expiresAt || null,
          maxUses: codeForm.maxUses === -1 ? -1 : codeForm.maxUses
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCodeError((data as { error?: string }).error ?? "Erreur lors de la création");
        return;
      }

      setCodeSuccess(`Code créé : ${codeForm.code}`);
      setCodeForm({
        code: "",
        amount: 500,
        usageType: "TOKENS",
        type: "SPECIAL",
        description: "",
        expiresAt: "",
        maxUses: -1
      });

      // Reload the list
      setTimeout(() => {
        void loadGiftCodes();
        setCodeSuccess(null);
      }, 1500);
    } catch {
      setCodeError("Erreur réseau");
    } finally {
      setCodeLoading(false);
    }
  }, [codeForm, loadGiftCodes]);

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
      else if (tab === "tournaments") path = `/api/admin/console/tournaments?${listParams}`;
      else if (tab === "waitingRooms") path = `/api/admin/console/waiting-rooms?${listParams}`;
      else if (tab === "reports") path = `/api/admin/console/player-reports?${listParams}`;
      else if (tab === "giftCodes") {
        void loadGiftCodes();
        setLoading(false);
        return;
      } else path = `/api/admin/console/ratings?${listParams}`;

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

  useEffect(() => {
    void fetchReportUnread();
    const id = window.setInterval(() => void fetchReportUnread(), 15000);
    return () => window.clearInterval(id);
  }, [fetchReportUnread]);

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

  const markReportRead = async (reportId: string) => {
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/player-reports/${encodeURIComponent(reportId)}/read`),
        { method: "PATCH", headers: authHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.actionError"));
        return;
      }
      await load();
      await fetchReportUnread();
    } catch {
      setError(t("adminConsole.networkError"));
    }
  };

  const deleteWaitingRoomAdmin = async (roomId: string) => {
    if (!window.confirm(t("adminConsole.waitingRoomsDeleteConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/waiting-rooms/${encodeURIComponent(roomId)}`),
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

  const openPasswordModal = (u: UserRow) => {
    setPwdModal({ id: u.id, username: u.username });
    setPwdInput("");
    setPwdResult(null);
  };

  const closePasswordModal = () => {
    setPwdModal(null);
    setPwdInput("");
    setPwdResult(null);
  };

  const submitAdminPassword = async (opts?: { generateOnly?: boolean }) => {
    if (!pwdModal) return;
    setPwdLoading(true);
    setError(null);
    try {
      const body: { newPassword?: string } = {};
      if (opts?.generateOnly) {
        /* corps vide → le serveur génère un mot de passe */
      } else {
        const trimmed = pwdInput.trim();
        if (trimmed.length > 0) {
          if (trimmed.length < 8) {
            setError(t("adminConsole.passwordTooShort"));
            setPwdLoading(false);
            return;
          }
          body.newPassword = trimmed;
        }
      }
      const res = await fetch(apiUrl(`/api/admin/console/users/${encodeURIComponent(pwdModal.id)}/password`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as { error?: string }).error ?? t("adminConsole.actionError"));
        return;
      }
      const plain = (data as { plainPassword?: string }).plainPassword;
      if (plain) setPwdResult(plain);
    } catch {
      setError(t("adminConsole.networkError"));
    } finally {
      setPwdLoading(false);
    }
  };

  const copyPlainPassword = async () => {
    if (!pwdResult) return;
    try {
      await navigator.clipboard.writeText(pwdResult);
    } catch {
      /* ignore */
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "poker", label: t("adminConsole.tabPokerActive") },
    { id: "bj", label: t("adminConsole.tabBlackjack") },
    { id: "tournaments", label: t("adminConsole.tabTournaments") },
    { id: "waitingRooms", label: t("adminConsole.tabWaitingRooms") },
    { id: "users", label: t("adminConsole.tabPlayers") },
    { id: "history", label: t("adminConsole.tabHistory") },
    { id: "ratings", label: t("adminConsole.tabRatings") },
    { id: "reports", label: t("adminConsole.tabReports") },
    { id: "giftCodes", label: "Codes Cadeaux" },
  ];

  const reportReasonLabel = (reason: string) =>
    t(`adminConsole.reportReason.${reason}`, { defaultValue: reason });

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
      <div className="w-full min-w-0 px-4 py-6 md:px-8">
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTab("reports");
                void fetchReportUnread();
              }}
              className="relative inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 px-3 py-2.5 text-sm text-white transition hover:bg-slate-700"
              title={t("adminConsole.reportsBellTitle")}
              aria-label={t("adminConsole.reportsBellTitle")}
            >
              <Bell className="h-5 w-5 text-amber-300" />
              {reportUnread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {reportUnread > 99 ? "99+" : reportUnread}
                </span>
              )}
            </button>
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
              {x.id === "giftCodes" ? (
                <span className="inline-flex items-center gap-2">
                  <Gift className="h-4 w-4 shrink-0" aria-hidden />
                  {x.label}
                </span>
              ) : (
                x.label
              )}
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
          <p className="text-xs text-slate-500 sm:max-w-xs">
            {tab === "waitingRooms"
              ? t("adminConsole.filterHintWaitingRooms")
              : tab === "tournaments"
                ? t("adminConsole.filterHintTournaments")
                : t("adminConsole.filterHint")}
          </p>
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
                          {row.lifecycleKey && (
                            <span
                              className="rounded-md bg-emerald-950/60 px-2 py-0.5 text-xs text-emerald-200"
                              title={row.phase ?? ""}
                            >
                              {t(`adminConsole.pokerLifecycle.${row.lifecycleKey}`, {
                                defaultValue: row.lifecycleKey,
                              })}
                            </span>
                          )}
                          {row.phase && (
                            <span className="rounded-md bg-violet-900/50 px-2 py-0.5 text-xs text-violet-200">
                              {row.phase}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              playerAppHref(
                                `/game?gameId=${encodeURIComponent(row.gameId)}&spectate=1`,
                              ),
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-500 bg-slate-700/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("adminConsole.spectate")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void closePokerGame(row.gameId)}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-red-600/90 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t("adminConsole.pokerCloseGame")}
                        </button>
                      </div>
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

        {tab === "waitingRooms" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <p className="px-3 py-2 text-xs text-slate-400">
              {totalCount != null ? (
                <>
                  {t("adminConsole.totalCount")}: <span className="text-slate-200">{totalCount}</span>
                </>
              ) : null}
            </p>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.waitingRoomsColName")}</th>
                  <th className="px-3 py-3">{t("adminConsole.waitingRoomsColHost")}</th>
                  <th className="px-3 py-3">{t("adminConsole.waitingRoomsColStatus")}</th>
                  <th className="px-3 py-3">{t("adminConsole.waitingRoomsColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.waitingRoomsColUpdated")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as WaitingRoomAdminRow[]).map((row) => (
                  <tr key={row.id} className="text-slate-200">
                    <td className="px-3 py-2">
                      <span className="font-medium text-white">{row.name}</span>
                      <div className="font-mono text-[10px] text-slate-500">{row.id}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{row.hostId}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs">{row.status}</span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">{row.gameId ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(row.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void deleteWaitingRoomAdmin(row.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600/85 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                        {t("adminConsole.waitingRoomsDelete")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.waitingRoomsEmpty")}</p>
            )}
          </div>
        )}

        {tab === "bj" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <table className="w-full min-w-[860px] text-left text-sm">
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
                {(listPayload.items as BjRoom[]).map((room) => {
                  const seatCount = room.seats?.length ?? 0;
                  const statusShown =
                    room.adminStatusKey === "BJ_ENDED_NO_RUNTIME"
                      ? t("adminConsole.bjStatusEndedNoRuntime")
                      : room.status;
                  const gid = room.gameId?.trim() ?? "";
                  return (
                    <tr key={room.id} className="text-slate-200">
                      <td className="px-3 py-2 font-medium">{room.name}</td>
                      <td className="px-3 py-2">{room.host?.username ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs">{statusShown}</span>
                      </td>
                      <td className="px-3 py-2">{seatCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">
                        {room.gameId ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {gid.length > 0 ? (
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  playerAppHref(
                                    `/blackjack/table/${encodeURIComponent(gid)}?spectate=1`,
                                  ),
                                  "_blank",
                                  "noopener,noreferrer",
                                )
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-500 bg-slate-700/80 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-600"
                            >
                              <Eye className="h-3 w-3" />
                              {t("adminConsole.spectate")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void closeBlackjackRoom(room.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600/85 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("adminConsole.blackjackCloseRoom")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.blackjackEmpty")}</p>
            )}
          </div>
        )}

        {tab === "tournaments" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <p className="px-3 py-2 text-xs text-slate-400">{t("adminConsole.tournamentsCreateHint")}</p>
            <p className="px-3 pb-2 text-xs text-slate-400">
              {totalCount != null ? (
                <>
                  {t("adminConsole.totalCount")}: <span className="text-slate-200">{totalCount}</span>
                </>
              ) : null}
            </p>
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.tournamentsColName")}</th>
                  <th className="px-3 py-3">{t("adminConsole.tournamentsColStatus")}</th>
                  <th className="px-3 py-3">{t("adminConsole.tournamentsColPlayers")}</th>
                  <th className="px-3 py-3">{t("adminConsole.tournamentsColStart")}</th>
                  <th className="px-3 py-3">{t("adminConsole.tournamentsColCreator")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as TournamentAdminRow[]).map((row) => (
                  <tr key={row.id} className="text-slate-200">
                    <td className="px-3 py-2">
                      <span className="font-medium text-white">{row.name}</span>
                      <div className="font-mono text-[10px] text-slate-500">{row.id}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs">
                        {t(`adminConsole.tournamentStatus.${row.status}`, { defaultValue: row.status })}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {row._count?.players ?? 0}
                      <span className="text-slate-500"> / {row.maxPlayers}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(row.startAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">{row.host?.username ?? "—"}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          window.open(playerAppHref(`/tournaments/${encodeURIComponent(row.id)}`), "_blank", "noopener,noreferrer")
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-600/50 bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-900/50"
                      >
                        {t("adminConsole.tournamentOpenApp")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.tournamentsEmpty")}</p>
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
            <p className="px-3 pb-2 text-xs text-amber-200/80">{t("adminConsole.playersPasswordHint")}</p>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.colUsername")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colEmail")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colPassword")}</th>
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
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => openPasswordModal(u)}
                        className="inline-flex max-w-full items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-2 py-1.5 text-left font-mono text-[11px] text-amber-200/90 hover:border-amber-500/50 hover:bg-slate-800"
                      >
                        <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span className="truncate">{t("adminConsole.passwordRevealCta")}</span>
                      </button>
                    </td>
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
                    <td className="px-3 py-2">{r.user?.username ?? "—"}</td>
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

        {tab === "reports" && json && listPayload?.items && (
          <div className="overflow-x-auto rounded-2xl border border-slate-600/80 bg-slate-800/40 p-2">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.reportsColDate")}</th>
                  <th className="px-3 py-3">{t("adminConsole.reportsColReporter")}</th>
                  <th className="px-3 py-3">{t("adminConsole.reportsColReported")}</th>
                  <th className="px-3 py-3">{t("adminConsole.reportsColReason")}</th>
                  <th className="px-3 py-3">{t("adminConsole.reportsColGame")}</th>
                  <th className="px-3 py-3">{t("adminConsole.reportsColDetail")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/80">
                {(listPayload.items as ReportRow[]).map((r) => (
                  <tr
                    key={r.id}
                    className={`text-slate-200 ${!r.reviewedAt ? "bg-amber-950/20" : ""}`}
                  >
                    <td className="px-3 py-2 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      {r.reporter?.username ?? "—"}
                      <div className="font-mono text-[10px] text-slate-500">{r.reporter?.id ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      {r.reported?.username ?? "—"}
                      <div className="font-mono text-[10px] text-slate-500">{r.reported?.id ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2">{reportReasonLabel(r.reason)}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-400">
                      {r.gameId ?? "—"}
                    </td>
                    <td className="px-3 py-2 max-w-[200px] truncate text-slate-300" title={r.detail ?? ""}>
                      {r.detail ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {!r.reviewedAt ? (
                        <button
                          type="button"
                          onClick={() => void markReportRead(r.id)}
                          className="rounded-lg bg-slate-600 px-2 py-1 text-xs hover:bg-slate-500"
                        >
                          {t("adminConsole.reportsMarkRead")}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-500">
                          {new Date(r.reviewedAt).toLocaleString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.reportsEmpty")}</p>
            )}
          </div>
        )}

        {tab !== "poker" &&
          ["users", "history", "bj", "tournaments", "waitingRooms", "ratings", "reports"].includes(tab) &&
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

        {tab === "giftCodes" && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-600 bg-slate-800/50 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <Gift className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
                Créer un nouveau code
              </h3>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Code</label>
                  <input
                    type="text"
                    value={codeForm.code}
                    onChange={(e) => setCodeForm({ ...codeForm, code: e.target.value.toUpperCase() })}
                    placeholder="BIENVENUE"
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type d'utilisation</label>
                    <select
                      value={codeForm.usageType}
                      onChange={(e) => setCodeForm({ ...codeForm, usageType: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="TOKENS">Jetons</option>
                      <option value="FIXED_DISCOUNT">Réduction fixe (€)</option>
                      <option value="PERCENTAGE_DISCOUNT">Réduction % (CB)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {codeForm.usageType === "TOKENS" ? "Montant (jetons)" : codeForm.usageType === "FIXED_DISCOUNT" ? "Réduction (€)" : "Réduction (%)"}
                    </label>
                    <input
                      type="number"
                      value={codeForm.amount}
                      onFocus={(e) => {
                        if (e.currentTarget.value === "0") e.currentTarget.select();
                      }}
                      onChange={(e) => {
                        /* Saisie libre : on accepte n'importe quel chiffre ;
                         * la bordure passe au rouge si la valeur est < 1. */
                        const raw = e.target.value === "" ? 0 : Number.parseInt(e.target.value, 10);
                        setCodeForm({ ...codeForm, amount: Number.isFinite(raw) ? raw : 0 });
                      }}
                      min="1"
                      className={`w-full rounded-lg border bg-slate-900 px-3 py-2 text-white focus:outline-none ${
                        codeForm.amount < 1
                          ? "border-red-500 focus:border-red-500"
                          : "border-slate-600 focus:border-blue-500"
                      }`}
                      aria-invalid={codeForm.amount < 1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
                    <select
                      value={codeForm.type}
                      onChange={(e) => setCodeForm({ ...codeForm, type: e.target.value })}
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    >
                      <option>ACHIEVEMENT</option>
                      <option>EVENT</option>
                      <option>SEASONAL</option>
                      <option>SPECIAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Max utilisations</label>
                    <input
                      type="number"
                      value={codeForm.maxUses === -1 ? "∞" : codeForm.maxUses}
                      onChange={(e) => setCodeForm({ ...codeForm, maxUses: e.target.value === "∞" ? -1 : parseInt(e.target.value) || -1 })}
                      placeholder="-1 pour illimité"
                      className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Description (optionnel)</label>
                  <input
                    type="text"
                    value={codeForm.description}
                    onChange={(e) => setCodeForm({ ...codeForm, description: e.target.value })}
                    placeholder="Bienvenue! Réclamez votre bonus..."
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date d'expiration (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={codeForm.expiresAt}
                    onChange={(e) => setCodeForm({ ...codeForm, expiresAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {codeError && <p className="mb-3 text-sm text-red-400">{codeError}</p>}
              {codeSuccess && <p className="mb-3 text-sm text-emerald-400">{codeSuccess}</p>}

              <button
                onClick={createGiftCode}
                disabled={codeLoading || !codeForm.code.trim()}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed px-4 py-2 font-medium text-white transition"
              >
                {codeLoading ? "Création..." : "Créer le code"}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-600 bg-slate-800/40 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <ClipboardList className="h-5 w-5 text-emerald-300 shrink-0" aria-hidden />
                Codes existants
              </h3>

              {codeLoading && giftCodes.length === 0 && <p className="text-slate-400">Chargement...</p>}

              {giftCodes.length === 0 && !codeLoading && <p className="text-slate-400">Aucun code</p>}

              {giftCodes.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {giftCodes.map((code) => (
                    <div key={code.id} className="rounded-lg border border-slate-700 bg-slate-900/50 p-3 text-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono font-bold text-blue-300">{code.code}</p>
                          <p className="text-xs text-slate-400">{code.type} · {code.usageType === "TOKENS" ? "Jetons" : code.usageType === "FIXED_DISCOUNT" ? "Réduction €" : "Réduction %"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-300">
                            {code.usageType === "TOKENS" ? `${code.amount} jetons` : code.usageType === "FIXED_DISCOUNT" ? `${code.amount}€` : `${code.amount}%`}
                          </p>
                          <p className="text-xs text-slate-400">{code.usedCount} / {code.maxUses === -1 ? "∞" : code.maxUses} utilisé</p>
                        </div>
                      </div>
                      {code.description && <p className="text-xs text-slate-400 mb-2">{code.description}</p>}
                      {code.expiresAt && (
                        <p className="text-xs text-orange-400">
                          Expire: {new Date(code.expiresAt).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {pwdModal && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-pwd-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-600 bg-slate-900 p-6 shadow-2xl">
            <h2 id="admin-pwd-modal-title" className="mb-2 text-lg font-bold text-white">
              {t("adminConsole.setPasswordTitle")}
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              {t("adminConsole.setPasswordIntro", { username: pwdModal.username })}
            </p>
            {!pwdResult ? (
              <>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {t("adminConsole.newPasswordOptional")}
                </label>
                <input
                  type="text"
                  autoComplete="off"
                  value={pwdInput}
                  onChange={(e) => setPwdInput(e.target.value)}
                  placeholder={t("adminConsole.newPasswordPlaceholder")}
                  className="mb-4 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pwdLoading}
                    onClick={() => void submitAdminPassword()}
                    className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {pwdLoading ? t("common.loading") : t("adminConsole.applyAndShow")}
                  </button>
                  <button
                    type="button"
                    disabled={pwdLoading}
                    onClick={() => void submitAdminPassword({ generateOnly: true })}
                    className="rounded-xl border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                  >
                    {t("adminConsole.generatePassword")}
                  </button>
                  <button
                    type="button"
                    onClick={closePasswordModal}
                    className="rounded-xl px-4 py-2 text-sm text-slate-400 hover:text-white"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-2 text-xs font-medium text-emerald-400/90">{t("adminConsole.plainPasswordOnce")}</p>
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-slate-950 px-3 py-2 font-mono text-sm text-emerald-100">
                  <span className="min-w-0 flex-1 break-all">{pwdResult}</span>
                  <button
                    type="button"
                    onClick={() => void copyPlainPassword()}
                    className="shrink-0 rounded-lg p-2 text-emerald-300 hover:bg-slate-800"
                    title={t("adminConsole.copyPassword")}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="w-full rounded-xl bg-slate-700 py-2 text-sm text-white hover:bg-slate-600"
                >
                  {t("common.close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
