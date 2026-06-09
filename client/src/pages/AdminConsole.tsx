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
  Megaphone,
} from "lucide-react";
import { apiUrl } from "../utils/apiBase";
import { clearAuthStorage } from "../utils/userProfile";
import { getAuthItem } from "../utils/authStorage";
import {
  createAdminGiftCode,
  listAdminGiftCodes,
  parseAdminGiftCodesList,
  type AdminGiftCodeRow,
} from "../utils/adminGiftCodes";
import {
  AdminShellBackground,
  adminGlassCardClass,
  adminGlassPanelClass,
  adminLanguageButtonClass,
} from "../components/AdminShellBackground";
import { QuantumBluffLogo } from "../assets/logo";
import { LanguageSwitcher } from "../components/LanguageSwitcher";

const adminBtnSecondary =
  "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-2.5 text-sm text-white shadow-sm transition hover:border-amber-300/25 hover:bg-slate-900/70";
const adminInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900/75 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

type Tab =
  | "users"
  | "history"
  | "poker"
  | "bj"
  | "belote"
  | "ratings"
  | "reports"
  | "giftCodes"
  | "broadcast";

type BroadcastSegment =
  | "new_7d"
  | "new_30d"
  | "active_7d"
  | "low_chips"
  | "high_chips"
  | "level_beginner"
  | "level_advanced"
  | "custom";

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

type BeloteRoom = {
  id: string;
  name: string;
  status: string;
  variant?: string;
  gameId: string | null;
  host?: { username: string } | null;
  seats?: Array<{ user?: { username: string; id: string } | null }>;
  runtimeAlive?: boolean;
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

export function AdminConsole() {
  const { t, i18n } = useTranslation();
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
  const [giftCodes, setGiftCodes] = useState<AdminGiftCodeRow[]>([]);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);

  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    body: "",
    audience: "all" as "all" | "users" | "segment",
    usernamesText: "",
    segment: "new_7d" as BroadcastSegment,
    minLevel: "",
    maxLevel: "",
    minChips: "",
    maxChips: "",
    registeredWithinDays: "",
  });
  const [broadcastPreviewCount, setBroadcastPreviewCount] = useState<number | null>(null);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const buildBroadcastPayload = useCallback(() => {
    const payload: Record<string, unknown> = {
      title: broadcastForm.title.trim() || undefined,
      body: broadcastForm.body.trim(),
      audience: broadcastForm.audience,
    };
    if (broadcastForm.audience === "users") {
      payload.usernamesText = broadcastForm.usernamesText;
    }
    if (broadcastForm.audience === "segment") {
      payload.segment = broadcastForm.segment;
      if (broadcastForm.segment === "custom") {
        const filters: Record<string, number> = {};
        const minLevel = Number.parseInt(broadcastForm.minLevel, 10);
        const maxLevel = Number.parseInt(broadcastForm.maxLevel, 10);
        const minChips = Number.parseInt(broadcastForm.minChips, 10);
        const maxChips = Number.parseInt(broadcastForm.maxChips, 10);
        const registeredWithinDays = Number.parseInt(broadcastForm.registeredWithinDays, 10);
        if (Number.isFinite(minLevel)) filters.minLevel = minLevel;
        if (Number.isFinite(maxLevel)) filters.maxLevel = maxLevel;
        if (Number.isFinite(minChips)) filters.minChips = minChips;
        if (Number.isFinite(maxChips)) filters.maxChips = maxChips;
        if (Number.isFinite(registeredWithinDays)) filters.registeredWithinDays = registeredWithinDays;
        payload.filters = filters;
      }
    }
    return payload;
  }, [broadcastForm]);

  const previewBroadcast = useCallback(async () => {
    if (!broadcastForm.body.trim()) {
      setBroadcastError(t("adminConsole.broadcastError"));
      return;
    }
    setBroadcastLoading(true);
    setBroadcastError(null);
    setBroadcastSuccess(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/broadcast/preview"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildBroadcastPayload()),
      });
      const data = (await res.json().catch(() => ({}))) as {
        recipientCount?: number;
        error?: string;
      };
      if (res.status === 401) {
        clearAuthStorage();
        navigate("/auth/admin", { replace: true });
        return;
      }
      if (!res.ok) {
        setBroadcastError(data.error ?? t("adminConsole.broadcastError"));
        setBroadcastPreviewCount(null);
        return;
      }
      setBroadcastPreviewCount(
        typeof data.recipientCount === "number" ? data.recipientCount : 0,
      );
    } catch {
      setBroadcastError(t("adminConsole.networkError"));
    } finally {
      setBroadcastLoading(false);
    }
  }, [broadcastForm.body, buildBroadcastPayload, navigate, t]);

  const sendBroadcast = useCallback(async () => {
    if (!broadcastForm.body.trim()) {
      setBroadcastError(t("adminConsole.broadcastError"));
      return;
    }
    if (
      broadcastForm.audience === "all" &&
      !window.confirm(t("adminConsole.broadcastAudienceAll") + " ?")
    ) {
      return;
    }
    setBroadcastLoading(true);
    setBroadcastError(null);
    setBroadcastSuccess(null);
    try {
      const res = await fetch(apiUrl("/api/admin/console/broadcast"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(buildBroadcastPayload()),
      });
      const data = (await res.json().catch(() => ({}))) as {
        sentCount?: number;
        error?: string;
      };
      if (res.status === 401) {
        clearAuthStorage();
        navigate("/auth/admin", { replace: true });
        return;
      }
      if (!res.ok) {
        setBroadcastError(data.error ?? t("adminConsole.broadcastError"));
        return;
      }
      const count = typeof data.sentCount === "number" ? data.sentCount : 0;
      setBroadcastSuccess(t("adminConsole.broadcastSent", { count }));
      setBroadcastPreviewCount(count);
      setBroadcastForm((prev) => ({ ...prev, body: "" }));
    } catch {
      setBroadcastError(t("adminConsole.networkError"));
    } finally {
      setBroadcastLoading(false);
    }
  }, [broadcastForm.audience, broadcastForm.body, buildBroadcastPayload, navigate, t]);

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
      const res = await listAdminGiftCodes();
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearAuthStorage();
        navigate("/auth/admin", { replace: true });
        return;
      }
      if (res.status === 404) {
        setCodeError("Backend à mettre à jour. Relancez le déploiement backend sur la VM.");
        return;
      }
      if (!res.ok) {
        setCodeError((data as { error?: string }).error ?? "Erreur lors du chargement");
        return;
      }
      setGiftCodes(parseAdminGiftCodesList(data));
    } catch {
      setCodeError("Erreur réseau");
    } finally {
      setCodeLoading(false);
    }
  }, [navigate]);

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
      const res = await createAdminGiftCode({
        code: codeForm.code,
        amount: codeForm.amount,
        usageType: codeForm.usageType,
        type: codeForm.type,
        description: codeForm.description || null,
        expiresAt: codeForm.expiresAt || null,
        maxUses: codeForm.maxUses === -1 ? -1 : codeForm.maxUses,
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        clearAuthStorage();
        navigate("/auth/admin", { replace: true });
        return;
      }
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
  }, [codeForm, loadGiftCodes, navigate]);

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
      else if (tab === "belote") path = `/api/admin/console/games/belote-rooms?${listParams}`;
      else if (tab === "reports") path = `/api/admin/console/player-reports?${listParams}`;
      else if (tab === "giftCodes") {
        void loadGiftCodes();
        setLoading(false);
        return;
      } else if (tab === "broadcast") {
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
  }, [tab, listParams, debouncedSearch, t, loadGiftCodes]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void fetchReportUnread();
    const id = window.setInterval(() => void fetchReportUnread(), 15000);
    return () => window.clearInterval(id);
  }, [fetchReportUnread]);

  const deleteUser = async (userId: string, username: string) => {
    if (!window.confirm(t("adminConsole.deleteUserConfirm", { username }))) return;
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/console/users/${encodeURIComponent(userId)}`), {
        method: "DELETE",
        headers: authHeaders(),
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

  const forceCloseBeloteGame = async (gameId: string) => {
    if (!window.confirm(t("adminConsole.beloteCloseConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/belote/force-close/${encodeURIComponent(gameId)}`),
        { method: "POST", headers: authHeaders() },
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

  const deleteBeloteRoom = async (roomId: string) => {
    if (!window.confirm(t("adminConsole.beloteDeleteConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/games/belote-rooms/${encodeURIComponent(roomId)}`),
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
    { id: "belote", label: t("adminConsole.tabBelote") },
    { id: "users", label: t("adminConsole.tabPlayers") },
    { id: "history", label: t("adminConsole.tabHistory") },
    { id: "ratings", label: t("adminConsole.tabRatings") },
    { id: "reports", label: t("adminConsole.tabReports") },
    { id: "giftCodes", label: "Codes Cadeaux" },
    { id: "broadcast", label: t("adminConsole.tabBroadcast") },
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
    <AdminShellBackground>
      <div className="w-full min-w-0 px-4 py-6 md:px-8 lg:px-10">
        <header
          className={`mb-6 flex flex-wrap items-center justify-between gap-4 p-5 md:p-6 ${adminGlassCardClass}`}
        >
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-500/10 shadow-[0_0_24px_rgba(245,158,11,0.15)]">
              <QuantumBluffLogo className="h-9 w-9" />
            </div>
            <div>
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-950/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-200/90">
                <Shield className="h-3 w-3" aria-hidden />
                {t("adminConsole.title")}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {t("adminConsole.title")}
              </h1>
              <p className="text-sm text-slate-300/85">{t("adminConsole.subtitle")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <LanguageSwitcher buttonClassName={adminLanguageButtonClass} />
            <button
              type="button"
              onClick={() => {
                setTab("reports");
                void fetchReportUnread();
              }}
              className={`relative ${adminBtnSecondary} px-3`}
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
            <button type="button" onClick={() => void load()} className={adminBtnSecondary}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {t("adminConsole.refresh")}
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-700 to-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-red-600 hover:to-red-500"
            >
              <LogOut className="h-4 w-4" />
              {t("adminConsole.logout")}
            </button>
          </div>
        </header>

        <div className={`${adminGlassCardClass} p-4 md:p-6`}>
        <nav
          className={`mb-6 flex flex-wrap gap-2 p-2 ${adminGlassPanelClass}`}
          aria-label="Admin sections"
        >
          {tabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                tab === x.id
                  ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-900/35"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
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
              className={`${adminInputClass} pl-10 pr-10`}
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
          <p className="mb-4 rounded-xl border border-red-500/35 bg-red-950/45 px-4 py-3 text-sm text-red-100 backdrop-blur-sm">
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
              <div className={`rounded-2xl border border-dashed border-amber-200/20 bg-slate-950/35 px-6 py-16 text-center text-slate-400 ${adminGlassPanelClass}`}>
                {t("adminConsole.pokerEmpty")}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(json as { items: PokerRow[] }).items?.map((row) => (
                  <div
                    key={row.gameId}
                    className={`flex flex-col p-4 ${adminGlassPanelClass}`}
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

        {tab === "bj" && json && listPayload?.items && (
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.bjColName")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColHost")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColStatus")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColSeats")}</th>
                  <th className="px-3 py-3">{t("adminConsole.bjColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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

        {tab === "belote" && json && listPayload?.items && (
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.beloteColName")}</th>
                  <th className="px-3 py-3">{t("adminConsole.beloteColHost")}</th>
                  <th className="px-3 py-3">{t("adminConsole.beloteColVariant")}</th>
                  <th className="px-3 py-3">{t("adminConsole.beloteColStatus")}</th>
                  <th className="px-3 py-3">{t("adminConsole.beloteColSeats")}</th>
                  <th className="px-3 py-3">{t("adminConsole.beloteColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(listPayload.items as BeloteRoom[]).map((room) => {
                  const seatCount = room.seats?.length ?? 0;
                  const gid = room.gameId?.trim() ?? "";
                  const inGame = room.status === "IN_GAME" && gid.length > 0;
                  const statusShown =
                    inGame && !room.runtimeAlive
                      ? t("adminConsole.beloteStatusEndedNoRuntime")
                      : room.status;
                  return (
                    <tr key={room.id} className="text-slate-200">
                      <td className="px-3 py-2 font-medium">{room.name}</td>
                      <td className="px-3 py-2">{room.host?.username ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-slate-400">{room.variant ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-md bg-slate-700 px-2 py-0.5 text-xs">{statusShown}</span>
                      </td>
                      <td className="px-3 py-2">{seatCount}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-400">
                        {room.gameId ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {inGame && room.runtimeAlive ? (
                            <button
                              type="button"
                              onClick={() =>
                                window.open(
                                  playerAppHref(
                                    `/belote/game?gameId=${encodeURIComponent(gid)}&spectate=1`,
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
                          {inGame && room.runtimeAlive ? (
                            <button
                              type="button"
                              onClick={() => void forceCloseBeloteGame(gid)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-500/50 bg-amber-900/70 px-2 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-800/80"
                            >
                              {t("adminConsole.beloteForceClose")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void deleteBeloteRoom(room.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-600/85 px-2 py-1 text-xs font-semibold text-white hover:bg-red-500"
                          >
                            <Trash2 className="h-3 w-3" />
                            {t("adminConsole.beloteDeleteRoom")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {listPayload.items.length === 0 && (
              <p className="py-12 text-center text-slate-500">{t("adminConsole.beloteEmpty")}</p>
            )}
          </div>
        )}

        {tab === "users" && json && listPayload?.items && (
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <p className="px-3 py-2 text-xs text-slate-400">
              {totalCount != null ? (
                <>
                  {t("adminConsole.totalCount")}: <span className="text-slate-200">{totalCount}</span>
                </>
              ) : null}
            </p>
            <p className="px-3 pb-2 text-xs text-amber-200/80">{t("adminConsole.playersPasswordHint")}</p>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.colUsername")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colEmail")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colPassword")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colChips")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colBanned")}</th>
                  <th className="px-3 py-3">{t("adminConsole.colActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-red-200 hover:bg-red-950"
                          onClick={() => void deleteUser(u.id, u.username)}
                        >
                          <Trash2 className="h-3 w-3" aria-hidden />
                          {t("adminConsole.deleteUser")}
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
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.historyColGameId")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColPot")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColWinner")}</th>
                  <th className="px-3 py-3">{t("adminConsole.historyColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
                <tr>
                  <th className="px-3 py-3">{t("adminConsole.colUsername")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColStars")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColMessage")}</th>
                  <th className="px-3 py-3">{t("adminConsole.ratingsColDate")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
          <div className={`overflow-x-auto p-2 ${adminGlassPanelClass}`}>
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-slate-950/70 text-xs uppercase tracking-wide text-amber-200/70">
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
              <tbody className="divide-y divide-white/5">
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
          ["users", "history", "bj", "ratings", "reports"].includes(tab) &&
          json &&
          totalCount != null &&
          totalCount > PAGE_SIZE && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-amber-200/10 pt-4">
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
                  className={`${adminBtnSecondary} gap-1 px-3 disabled:opacity-40`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("adminConsole.paginationPrev")}
                </button>
                <button
                  type="button"
                  disabled={!canNext || loading}
                  onClick={() => setSkip((s) => s + PAGE_SIZE)}
                  className={`${adminBtnSecondary} gap-1 px-3 disabled:opacity-40`}
                >
                  {t("adminConsole.paginationNext")}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

        {tab === "broadcast" && (
          <div className={`space-y-4 p-6 ${adminGlassPanelClass}`}>
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
              <Megaphone className="h-5 w-5 shrink-0 text-amber-400" aria-hidden />
              {t("adminConsole.broadcastTitle")}
            </h3>
            <p className="mb-4 text-sm text-slate-400">{t("adminConsole.broadcastSubtitle")}</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {t("adminConsole.broadcastMessageTitle")}
                </label>
                <input
                  type="text"
                  value={broadcastForm.title}
                  onChange={(e) =>
                    setBroadcastForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder={t("adminConsole.broadcastMessageTitlePlaceholder")}
                  className={`${adminInputClass} px-3`}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  {t("adminConsole.broadcastMessageBody")}
                </label>
                <textarea
                  value={broadcastForm.body}
                  onChange={(e) =>
                    setBroadcastForm((prev) => ({ ...prev, body: e.target.value }))
                  }
                  placeholder={t("adminConsole.broadcastMessageBodyPlaceholder")}
                  rows={5}
                  className={`${adminInputClass} resize-y px-3 py-2`}
                />
              </div>

              <fieldset>
                <legend className="mb-2 text-xs font-medium text-slate-400">
                  {t("adminConsole.broadcastAudience")}
                </legend>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {(
                    [
                      ["all", "broadcastAudienceAll"],
                      ["users", "broadcastAudienceUsers"],
                      ["segment", "broadcastAudienceSegment"],
                    ] as const
                  ).map(([value, labelKey]) => (
                    <label
                      key={value}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/50 px-3 py-2 text-sm text-white"
                    >
                      <input
                        type="radio"
                        name="broadcast-audience"
                        checked={broadcastForm.audience === value}
                        onChange={() => {
                          setBroadcastPreviewCount(null);
                          setBroadcastForm((prev) => ({ ...prev, audience: value }));
                        }}
                      />
                      {t(`adminConsole.${labelKey}`)}
                    </label>
                  ))}
                </div>
              </fieldset>

              {broadcastForm.audience === "users" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t("adminConsole.broadcastUsernamesHint")}
                  </label>
                  <textarea
                    value={broadcastForm.usernamesText}
                    onChange={(e) =>
                      setBroadcastForm((prev) => ({ ...prev, usernamesText: e.target.value }))
                    }
                    placeholder={t("adminConsole.broadcastUsernamesPlaceholder")}
                    rows={4}
                    className={`${adminInputClass} resize-y px-3 py-2 font-mono text-xs`}
                  />
                </div>
              )}

              {broadcastForm.audience === "segment" && (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">
                      {t("adminConsole.broadcastSegment")}
                    </label>
                    <select
                      value={broadcastForm.segment}
                      onChange={(e) => {
                        setBroadcastPreviewCount(null);
                        setBroadcastForm((prev) => ({
                          ...prev,
                          segment: e.target.value as BroadcastSegment,
                        }));
                      }}
                      className={`${adminInputClass} px-3 py-2`}
                    >
                      <option value="new_7d">{t("adminConsole.broadcastSegmentNew7d")}</option>
                      <option value="new_30d">{t("adminConsole.broadcastSegmentNew30d")}</option>
                      <option value="active_7d">{t("adminConsole.broadcastSegmentActive7d")}</option>
                      <option value="low_chips">{t("adminConsole.broadcastSegmentLowChips")}</option>
                      <option value="high_chips">{t("adminConsole.broadcastSegmentHighChips")}</option>
                      <option value="level_beginner">
                        {t("adminConsole.broadcastSegmentLevelBeginner")}
                      </option>
                      <option value="level_advanced">
                        {t("adminConsole.broadcastSegmentLevelAdvanced")}
                      </option>
                      <option value="custom">{t("adminConsole.broadcastSegmentCustom")}</option>
                    </select>
                  </div>

                  {broadcastForm.segment === "custom" && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {(
                        [
                          ["minLevel", "broadcastFilterMinLevel"],
                          ["maxLevel", "broadcastFilterMaxLevel"],
                          ["minChips", "broadcastFilterMinChips"],
                          ["maxChips", "broadcastFilterMaxChips"],
                          ["registeredWithinDays", "broadcastFilterRegisteredDays"],
                        ] as const
                      ).map(([field, labelKey]) => (
                        <div key={field}>
                          <label className="mb-1 block text-xs font-medium text-slate-400">
                            {t(`adminConsole.${labelKey}`)}
                          </label>
                          <input
                            type="number"
                            value={broadcastForm[field]}
                            onChange={(e) =>
                              setBroadcastForm((prev) => ({ ...prev, [field]: e.target.value }))
                            }
                            className={`${adminInputClass} px-3 py-2`}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {broadcastError && <p className="text-sm text-red-400">{broadcastError}</p>}
              {broadcastSuccess && <p className="text-sm text-emerald-400">{broadcastSuccess}</p>}
              {broadcastPreviewCount != null && (
                <p className="text-sm text-cyan-300">
                  {t("adminConsole.broadcastPreviewCount", { count: broadcastPreviewCount })}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void previewBroadcast()}
                  disabled={broadcastLoading || !broadcastForm.body.trim()}
                  className={adminBtnSecondary}
                >
                  {t("adminConsole.broadcastPreview")}
                </button>
                <button
                  type="button"
                  onClick={() => void sendBroadcast()}
                  disabled={broadcastLoading || !broadcastForm.body.trim()}
                  className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(245,158,11,0.22)] transition hover:from-amber-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {broadcastLoading ? t("adminConsole.loading") : t("adminConsole.broadcastSend")}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "giftCodes" && (
          <div className="space-y-4">
            <div className={`p-6 ${adminGlassPanelClass}`}>
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
                    className={`${adminInputClass} px-3 py-2`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Type d'utilisation</label>
                    <select
                      value={codeForm.usageType}
                      onChange={(e) => setCodeForm({ ...codeForm, usageType: e.target.value })}
                      className={`${adminInputClass} px-3 py-2`}
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
                      className={`${adminInputClass} px-3 py-2 ${
                        codeForm.amount < 1 ? "border-red-500/70 focus:border-red-500" : ""
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
                      className={`${adminInputClass} px-3 py-2`}
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
                      className={`${adminInputClass} px-3 py-2`}
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
                    className={`${adminInputClass} px-3 py-2`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date d'expiration (optionnel)</label>
                  <input
                    type="datetime-local"
                    value={codeForm.expiresAt}
                    onChange={(e) => setCodeForm({ ...codeForm, expiresAt: e.target.value })}
                    className={`${adminInputClass} px-3 py-2`}
                  />
                </div>
              </div>

              {codeError && <p className="mb-3 text-sm text-red-400">{codeError}</p>}
              {codeSuccess && <p className="mb-3 text-sm text-emerald-400">{codeSuccess}</p>}

              <button
                onClick={createGiftCode}
                disabled={codeLoading || !codeForm.code.trim()}
                className="w-full rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2.5 font-semibold text-white shadow-[0_8px_24px_rgba(245,158,11,0.22)] transition hover:from-amber-500 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {codeLoading ? "Création..." : "Créer le code"}
              </button>
            </div>

            <div className={`p-6 ${adminGlassPanelClass}`}>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <ClipboardList className="h-5 w-5 text-emerald-300 shrink-0" aria-hidden />
                Codes existants
              </h3>

              {codeLoading && giftCodes.length === 0 && <p className="text-slate-400">Chargement...</p>}

              {giftCodes.length === 0 && !codeLoading && <p className="text-slate-400">Aucun code</p>}

              {giftCodes.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {giftCodes.map((code) => (
                    <div key={code.id} className="rounded-xl border border-white/10 bg-slate-900/55 p-3 text-sm backdrop-blur-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-mono font-bold text-amber-300">{code.code}</p>
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
                          Expire: {new Date(code.expiresAt).toLocaleDateString(i18n.language)}
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
      </div>

      {pwdModal && (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-pwd-modal-title"
        >
          <div className={`w-full max-w-md p-6 ${adminGlassCardClass}`}>
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
                  className={`mb-4 font-mono ${adminInputClass} px-3 py-2`}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pwdLoading}
                    onClick={() => void submitAdminPassword()}
                    className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 py-2 text-sm font-semibold text-white hover:from-amber-500 hover:to-orange-500 disabled:opacity-50"
                  >
                    {pwdLoading ? t("common.loading") : t("adminConsole.applyAndShow")}
                  </button>
                  <button
                    type="button"
                    disabled={pwdLoading}
                    onClick={() => void submitAdminPassword({ generateOnly: true })}
                    className={`${adminBtnSecondary} px-4 py-2 disabled:opacity-50`}
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
    </AdminShellBackground>
  );
}
