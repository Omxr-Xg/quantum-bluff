import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Coins, Loader2, Plus, RefreshCw, Sparkles, User, Users, X } from "lucide-react";
import { apiUrl } from "../../utils/apiBase";
import { getAuthItem } from "../../utils/authStorage";
import { adminGlassCardClass, adminGlassPanelClass } from "../AdminShellBackground";

const adminInputClass =
  "w-full rounded-xl border border-white/10 bg-slate-900/75 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-amber-400/60 focus:outline-none focus:ring-2 focus:ring-amber-400/20";

type PlayerSummary = { id: string; username: string };

export type AdminPlayerDetail = {
  user: {
    id: string;
    username: string;
    email: string;
    chips: number;
    level: number;
    experience: number;
    loginStreakCount: number;
    bannedUntil: string | null;
    antiCheatAlerts: number;
    lastIp: string | null;
    createdAt: string;
  };
  friends: Array<{
    id: string;
    username: string;
    level: number;
    chips: number;
    friendsSince: string;
  }>;
  pendingFriendRequests: Array<{
    id: string;
    direction: "incoming" | "outgoing";
    other: { id: string; username: string };
    createdAt: string;
  }>;
  history: {
    items: Array<{
      id: string;
      gameType: string;
      summary: string;
      amount: number | null;
      endedAt: string;
    }>;
  };
  stats: Record<string, unknown> | null;
  cosmetics: Array<{
    cosmeticId: string;
    acquiredAt: string;
    type: string;
    nameKey: string;
    rarity: string | null;
    purchasable: boolean;
  }>;
  recentLedger: Array<{
    id: string;
    amount: number;
    reason: string;
    gameType: string | null;
    balanceAfter: number | null;
    createdAt: string;
  }>;
  reports: {
    filed: Array<{ id: string; reason: string; reported?: { username: string } }>;
    received: Array<{ id: string; reason: string; reporter?: { username: string } }>;
  };
};

type AdminCosmeticRow = {
  id: string;
  type: string;
  nameKey: string;
  purchasable: boolean;
  rarity: string | null;
  isCatalog: boolean;
};

type DetailTab = "overview" | "history" | "friends" | "cosmetics" | "ledger";

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

type AdminPlayerDetailPanelProps = {
  player: PlayerSummary;
  onClose: () => void;
  onChipsUpdated: () => void;
  onOpenPlayer?: (player: PlayerSummary) => void;
};

export function AdminPlayerDetailPanel({
  player,
  onClose,
  onChipsUpdated,
  onOpenPlayer,
}: AdminPlayerDetailPanelProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>("overview");
  const [detail, setDetail] = useState<AdminPlayerDetail | null>(null);
  const [catalog, setCatalog] = useState<AdminCosmeticRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chipAmount, setChipAmount] = useState("1000");
  const [chipNote, setChipNote] = useState("");
  const [chipLoading, setChipLoading] = useState(false);
  const [grantCosmeticId, setGrantCosmeticId] = useState("");
  const [grantLoading, setGrantLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    id: "",
    type: "BANNER" as "BANNER" | "AVATAR_FRAME" | "TITLE",
    displayName: "",
    gradient: "linear-gradient(135deg, #fbbf24, #dc2626)",
    border: "#c9a84c",
    color: "#fde047",
  });
  const [createLoading, setCreateLoading] = useState(false);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detailRes, cosmeticsRes] = await Promise.all([
        fetch(apiUrl(`/api/admin/console/users/${encodeURIComponent(player.id)}/detail`), {
          headers: authHeaders(),
        }),
        fetch(apiUrl("/api/admin/console/cosmetics"), { headers: authHeaders() }),
      ]);
      const detailData = (await detailRes.json()) as AdminPlayerDetail & { error?: string };
      const cosmeticsData = (await cosmeticsRes.json()) as { items?: AdminCosmeticRow[]; error?: string };
      if (!detailRes.ok) throw new Error(detailData.error ?? t("adminConsole.loadError"));
      setDetail(detailData);
      setCatalog(cosmeticsData.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.loadError"));
    } finally {
      setLoading(false);
    }
  }, [player.id, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const grantChips = async () => {
    const amount = parseInt(chipAmount, 10);
    if (!Number.isFinite(amount) || amount === 0) return;
    setChipLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/console/users/${encodeURIComponent(player.id)}/chips`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ amount, note: chipNote.trim() || undefined }),
      });
      const data = (await res.json()) as { error?: string; chips?: number };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.actionError"));
      onChipsUpdated();
      await loadDetail();
      setChipNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.actionError"));
    } finally {
      setChipLoading(false);
    }
  };

  const grantCosmetic = async (cosmeticId: string) => {
    if (!cosmeticId) return;
    setGrantLoading(true);
    setError(null);
    try {
      const res = await fetch(
        apiUrl(`/api/admin/console/users/${encodeURIComponent(player.id)}/cosmetics/grant`),
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ cosmeticId }),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.actionError"));
      await loadDetail();
      setGrantCosmeticId("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.actionError"));
    } finally {
      setGrantLoading(false);
    }
  };

  const revokeCosmetic = async (cosmeticId: string) => {
    if (!window.confirm(t("adminConsole.playerDetailRevokeConfirm"))) return;
    setError(null);
    try {
      const res = await fetch(
        apiUrl(
          `/api/admin/console/users/${encodeURIComponent(player.id)}/cosmetics/${encodeURIComponent(cosmeticId)}`,
        ),
        { method: "DELETE", headers: authHeaders() },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.actionError"));
      await loadDetail();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.actionError"));
    }
  };

  const createUniqueCosmetic = async () => {
    const slug = createForm.id.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!slug || !createForm.displayName.trim()) return;
    setCreateLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        id: slug,
        type: createForm.type,
        displayName: createForm.displayName.trim(),
        rarity: "unique",
        grantToUserId: player.id,
      };
      if (createForm.type === "BANNER") body.gradient = createForm.gradient;
      else if (createForm.type === "AVATAR_FRAME") body.border = createForm.border;
      else body.color = createForm.color;

      const res = await fetch(apiUrl("/api/admin/console/cosmetics"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? t("adminConsole.actionError"));
      await loadDetail();
      setCreateForm((f) => ({ ...f, id: "", displayName: "" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("adminConsole.actionError"));
    } finally {
      setCreateLoading(false);
    }
  };

  const ownedIds = new Set(detail?.cosmetics.map((c) => c.cosmeticId) ?? []);
  const grantable = catalog.filter((c) => !ownedIds.has(c.id));

  const tabs: { id: DetailTab; label: string; icon: typeof User }[] = [
    { id: "overview", label: t("adminConsole.playerDetailTabOverview"), icon: User },
    { id: "history", label: t("adminConsole.playerDetailTabHistory"), icon: RefreshCw },
    { id: "friends", label: t("adminConsole.playerDetailTabFriends"), icon: Users },
    { id: "cosmetics", label: t("adminConsole.playerDetailTabCosmetics"), icon: Sparkles },
    { id: "ledger", label: t("adminConsole.playerDetailTabLedger"), icon: Coins },
  ];

  return (
    <div
      className="fixed inset-0 z-[450] flex items-end justify-center bg-black/75 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden sm:rounded-2xl ${adminGlassCardClass}`}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-white">{player.username}</h2>
            <p className="font-mono text-xs text-slate-400">{player.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadDetail()}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              title={t("adminConsole.refresh")}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/10 px-2 py-2 sm:px-4">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tab === id
                  ? "bg-amber-600/30 text-amber-100"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {error && (
            <p className="mb-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}

          {loading && !detail ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
            </div>
          ) : detail ? (
            <>
              {tab === "overview" && (
                <div className="space-y-4">
                  <div className={`grid gap-3 p-4 sm:grid-cols-2 ${adminGlassPanelClass}`}>
                    <Stat label={t("adminConsole.colEmail")} value={detail.user.email} />
                    <Stat label={t("adminConsole.colChips")} value={detail.user.chips.toLocaleString()} />
                    <Stat
                      label={t("adminConsole.playerDetailLevel")}
                      value={`${detail.user.level} · ${detail.user.experience} XP`}
                    />
                    <Stat
                      label={t("adminConsole.colBanned")}
                      value={
                        detail.user.bannedUntil
                          ? new Date(detail.user.bannedUntil).toLocaleString()
                          : "—"
                      }
                    />
                    <Stat label="IP" value={detail.user.lastIp ?? "—"} mono />
                    <Stat
                      label={t("adminConsole.playerDetailRegistered")}
                      value={new Date(detail.user.createdAt).toLocaleString()}
                    />
                    <Stat
                      label={t("adminConsole.playerDetailAntiCheat")}
                      value={String(detail.user.antiCheatAlerts)}
                    />
                    <Stat
                      label={t("adminConsole.playerDetailLoginStreak")}
                      value={String(detail.user.loginStreakCount)}
                    />
                  </div>

                  <div className={`p-4 ${adminGlassPanelClass}`}>
                    <h3 className="mb-3 text-sm font-semibold text-amber-200/90">
                      {t("adminConsole.playerDetailGrantChips")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="number"
                        value={chipAmount}
                        onChange={(e) => setChipAmount(e.target.value)}
                        className={`w-32 px-3 py-2 ${adminInputClass}`}
                        placeholder="1000"
                      />
                      <input
                        type="text"
                        value={chipNote}
                        onChange={(e) => setChipNote(e.target.value)}
                        className={`min-w-[140px] flex-1 px-3 py-2 ${adminInputClass}`}
                        placeholder={t("adminConsole.playerDetailChipNote")}
                      />
                      <button
                        type="button"
                        disabled={chipLoading}
                        onClick={() => void grantChips()}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {chipLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        {t("adminConsole.playerDetailAddChips")}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t("adminConsole.playerDetailChipHint")}</p>
                  </div>

                  {(detail.reports.filed.length > 0 || detail.reports.received.length > 0) && (
                    <div className={`p-4 ${adminGlassPanelClass}`}>
                      <h3 className="mb-2 text-sm font-semibold text-amber-200/90">
                        {t("adminConsole.playerDetailReports")}
                      </h3>
                      {detail.reports.received.length > 0 && (
                        <p className="text-xs text-red-300/90">
                          {t("adminConsole.playerDetailReportsReceived", {
                            count: detail.reports.received.length,
                          })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tab === "history" && (
                <div className={`overflow-x-auto ${adminGlassPanelClass}`}>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColType")}</th>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColSummary")}</th>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColAmount")}</th>
                        <th className="px-3 py-2">{t("adminConsole.historyColDate")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detail.history.items.map((h) => (
                        <tr key={h.id} className="text-slate-300">
                          <td className="px-3 py-2 text-xs uppercase text-amber-200/70">{h.gameType}</td>
                          <td className="px-3 py-2">{h.summary}</td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {h.amount != null ? (h.amount >= 0 ? `+${h.amount}` : h.amount) : "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(h.endedAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.history.items.length === 0 && (
                    <p className="py-8 text-center text-slate-500">{t("adminConsole.listEmpty")}</p>
                  )}
                </div>
              )}

              {tab === "friends" && (
                <div className="space-y-4">
                  {detail.pendingFriendRequests.length > 0 && (
                    <div className={`p-4 ${adminGlassPanelClass}`}>
                      <h3 className="mb-2 text-sm font-semibold text-slate-300">
                        {t("adminConsole.playerDetailPendingRequests")}
                      </h3>
                      <ul className="space-y-1 text-sm">
                        {detail.pendingFriendRequests.map((r) => (
                          <li key={r.id} className="text-slate-400">
                            {r.direction === "outgoing" ? "→" : "←"}{" "}
                            <button
                              type="button"
                              className="text-amber-200 hover:underline"
                              onClick={() => onOpenPlayer?.(r.other)}
                            >
                              {r.other.username}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className={`overflow-x-auto ${adminGlassPanelClass}`}>
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">{t("adminConsole.colUsername")}</th>
                          <th className="px-3 py-2">{t("adminConsole.playerDetailLevel")}</th>
                          <th className="px-3 py-2">{t("adminConsole.colChips")}</th>
                          <th className="px-3 py-2">{t("adminConsole.playerDetailFriendsSince")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {detail.friends.map((f) => (
                          <tr key={f.id}>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                className="font-medium text-amber-200 hover:underline"
                                onClick={() => onOpenPlayer?.({ id: f.id, username: f.username })}
                              >
                                {f.username}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-slate-300">{f.level}</td>
                            <td className="px-3 py-2 text-slate-300">{f.chips.toLocaleString()}</td>
                            <td className="px-3 py-2 text-xs text-slate-500">
                              {new Date(f.friendsSince).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {detail.friends.length === 0 && (
                      <p className="py-8 text-center text-slate-500">{t("adminConsole.playerDetailNoFriends")}</p>
                    )}
                  </div>
                </div>
              )}

              {tab === "cosmetics" && (
                <div className="space-y-4">
                  <div className={`p-4 ${adminGlassPanelClass}`}>
                    <h3 className="mb-3 text-sm font-semibold text-amber-200/90">
                      {t("adminConsole.playerDetailGrantCosmetic")}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <select
                        value={grantCosmeticId}
                        onChange={(e) => setGrantCosmeticId(e.target.value)}
                        className={`min-w-[200px] flex-1 px-3 py-2 ${adminInputClass}`}
                      >
                        <option value="">{t("adminConsole.playerDetailPickCosmetic")}</option>
                        {grantable.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nameKey} ({c.type}){c.isCatalog ? "" : " ★"}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={grantLoading || !grantCosmeticId}
                        onClick={() => void grantCosmetic(grantCosmeticId)}
                        className="rounded-xl bg-violet-800 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                      >
                        {t("adminConsole.playerDetailGrant")}
                      </button>
                    </div>
                  </div>

                  <div className={`p-4 ${adminGlassPanelClass}`}>
                    <h3 className="mb-3 text-sm font-semibold text-amber-200/90">
                      {t("adminConsole.playerDetailCreateUnique")}
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        className={`px-3 py-2 ${adminInputClass}`}
                        placeholder={t("adminConsole.playerDetailCosmeticSlug")}
                        value={createForm.id}
                        onChange={(e) => setCreateForm((f) => ({ ...f, id: e.target.value }))}
                      />
                      <input
                        className={`px-3 py-2 ${adminInputClass}`}
                        placeholder={t("adminConsole.playerDetailCosmeticName")}
                        value={createForm.displayName}
                        onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                      />
                      <select
                        className={`px-3 py-2 ${adminInputClass}`}
                        value={createForm.type}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            type: e.target.value as "BANNER" | "AVATAR_FRAME" | "TITLE",
                          }))
                        }
                      >
                        <option value="BANNER">BANNER</option>
                        <option value="AVATAR_FRAME">AVATAR_FRAME</option>
                        <option value="TITLE">TITLE</option>
                      </select>
                      {createForm.type === "BANNER" && (
                        <input
                          className={`px-3 py-2 font-mono text-xs ${adminInputClass}`}
                          value={createForm.gradient}
                          onChange={(e) => setCreateForm((f) => ({ ...f, gradient: e.target.value }))}
                        />
                      )}
                      {createForm.type === "AVATAR_FRAME" && (
                        <input
                          className={`px-3 py-2 ${adminInputClass}`}
                          value={createForm.border}
                          onChange={(e) => setCreateForm((f) => ({ ...f, border: e.target.value }))}
                        />
                      )}
                      {createForm.type === "TITLE" && (
                        <input
                          className={`px-3 py-2 ${adminInputClass}`}
                          value={createForm.color}
                          onChange={(e) => setCreateForm((f) => ({ ...f, color: e.target.value }))}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={createLoading}
                      onClick={() => void createUniqueCosmetic()}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
                    >
                      {createLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {t("adminConsole.playerDetailCreateAndGrant")}
                    </button>
                  </div>

                  <div className={`overflow-x-auto ${adminGlassPanelClass}`}>
                    <table className="w-full text-left text-sm">
                      <thead className="text-xs uppercase text-slate-500">
                        <tr>
                          <th className="px-3 py-2">{t("adminConsole.playerDetailColName")}</th>
                          <th className="px-3 py-2">{t("adminConsole.playerDetailColType")}</th>
                          <th className="px-3 py-2">{t("adminConsole.playerDetailColRarity")}</th>
                          <th className="px-3 py-2" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {detail.cosmetics.map((c) => (
                          <tr key={c.cosmeticId}>
                            <td className="px-3 py-2 text-white">
                              {c.nameKey}
                              {!c.purchasable && (
                                <span className="ml-2 text-xs text-amber-400">★</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-xs text-slate-400">{c.type}</td>
                            <td className="px-3 py-2 text-xs text-slate-400">{c.rarity ?? "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => void revokeCosmetic(c.cosmeticId)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                {t("adminConsole.playerDetailRevoke")}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {detail.cosmetics.length === 0 && (
                      <p className="py-8 text-center text-slate-500">{t("adminConsole.playerDetailNoCosmetics")}</p>
                    )}
                  </div>
                </div>
              )}

              {tab === "ledger" && (
                <div className={`overflow-x-auto ${adminGlassPanelClass}`}>
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColAmount")}</th>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColReason")}</th>
                        <th className="px-3 py-2">{t("adminConsole.playerDetailColBalance")}</th>
                        <th className="px-3 py-2">{t("adminConsole.historyColDate")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {detail.recentLedger.map((e) => (
                        <tr key={e.id}>
                          <td
                            className={`px-3 py-2 font-mono text-xs ${
                              e.amount >= 0 ? "text-emerald-400" : "text-red-400"
                            }`}
                          >
                            {e.amount >= 0 ? `+${e.amount}` : e.amount}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-300">{e.reason}</td>
                          <td className="px-3 py-2 font-mono text-xs text-slate-400">
                            {e.balanceAfter?.toLocaleString() ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-500">
                            {new Date(e.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {detail.recentLedger.length === 0 && (
                    <p className="py-8 text-center text-slate-500">{t("adminConsole.listEmpty")}</p>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-sm text-white ${mono ? "font-mono text-xs" : ""}`}>{value}</p>
    </div>
  );
}
