import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Globe,
  Loader2,
  Lock,
  Plus,
  Server,
  Settings2,
  X,
} from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useUser } from "../hooks/useUser";
import { apiFetch, apiUrl } from "../utils/apiBase";
import { formatFetchError } from "../utils/fetchErrors";
import { shouldShowPollError } from "../utils/resilientPoll";
import { getAuthItem } from "../utils/authStorage";
import {
  BELOTE_BUY_IN_DEFAULT,
  BELOTE_BUY_IN_PRESETS,
  belotePotTotal,
  beloteWinnerShare,
  normalizeBeloteBuyIn,
} from "../features/belote/beloteBuyIn";
import {
  BELOTE_VARIANT_OPTIONS,
  type BeloteGameVariant,
  variantLabelKey,
} from "../features/belote/beloteVariants";
import { useIsInVoiceCall } from "../features/voice/useIsInVoiceCall";

type BeloteVisibility = "PUBLIC" | "PRIVATE";

export type BeloteRoomListItem = {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  visibility: BeloteVisibility;
  status: string;
  targetScore: number;
  buyIn: number;
  variant: BeloteGameVariant;
  gameId: string | null;
  hasPassword?: boolean;
  autoFillBotsEnabled?: boolean;
  autoFillBotsDelaySec?: number;
  defaultBotDifficulty?: string;
  counts?: { humans: number; bots: number; total: number; empty: number };
  canFillTable?: boolean;
  canStart?: boolean;
  players: Array<{
    id: string;
    seatId?: string;
    type?: "HUMAN" | "BOT";
     isBot?: boolean;
    botId?: string;
    username: string;
    position: number;
    isReady: boolean;
    level?: number;
    avatarUrl?: string | null;
  }>;
  presentUserIds?: string[];
};

export type BeloteGameInProgressItem = {
  roomId: string;
  roomName: string;
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  canJoin: boolean;
  canSpectate?: boolean;
};

const beloteAccent = {
  serverIcon: "text-emerald-200",
  primaryBtn:
    "border-emerald-300/15 bg-emerald-950/75 hover:border-emerald-200/25 hover:bg-emerald-900/80",
  joinBtn: "bg-emerald-900 hover:bg-emerald-800",
  minBalance: "text-emerald-200/95",
};

function authHeaders(): HeadersInit {
  const token = getAuthItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function phaseLabel(phase: string, t: (k: string) => string): string {
  if (phase === "BIDDING" || phase === "BIDDING_ROUND_1" || phase === "BIDDING_ROUND_2") {
    return t("belote.phaseBidding");
  }
  if (phase === "CONTREE_ROUND") return t("belote.phaseContree");
  if (phase === "PLAYING") return t("belote.phasePlaying");
  if (phase === "DEAL_END") return t("belote.phaseDealEnd");
  return phase;
}

export function LobbyBeloteSection({ active }: { active: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { userId } = useUser();
  const { addToast } = useToast();
  const inVoiceCall = useIsInVoiceCall();

  const [rooms, setRooms] = useState<BeloteRoomListItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const roomsPollFailuresRef = useRef(0);
  const roomsCacheRef = useRef<BeloteRoomListItem[]>([]);
  const [games, setGames] = useState<BeloteGameInProgressItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);

  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState<BeloteVisibility>("PUBLIC");
  const [newTarget, setNewTarget] = useState(1500);
  const [newVariant, setNewVariant] = useState<BeloteGameVariant>("CONTEE");
  const [newBuyIn, setNewBuyIn] = useState(BELOTE_BUY_IN_DEFAULT);
  const [customBuyIn, setCustomBuyIn] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [autoFillBots, setAutoFillBots] = useState(false);
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);
  const [passwordJoinRoom, setPasswordJoinRoom] = useState<BeloteRoomListItem | null>(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState("");

  const waitingRooms = useMemo(
    () => rooms.filter((r) => r.status === "WAITING"),
    [rooms],
  );

  const loadLobby = useCallback(async () => {
    try {
      const res = await apiFetch(apiUrl("/api/belote-rooms/lobby"), { headers: authHeaders() });
      if (!res.ok) throw new Error(t("common.error"));
      const data = (await res.json()) as {
        waitingRooms?: BeloteRoomListItem[];
        gamesInProgress?: BeloteGameInProgressItem[];
      };
      const nextRooms = data.waitingRooms ?? [];
      roomsCacheRef.current = nextRooms;
      setRooms(nextRooms);
      setGames(Array.isArray(data.gamesInProgress) ? data.gamesInProgress : []);
      roomsPollFailuresRef.current = 0;
      setRoomsError(null);
    } catch (e) {
      roomsPollFailuresRef.current += 1;
      if (shouldShowPollError(roomsCacheRef.current.length > 0, roomsPollFailuresRef.current)) {
        setRoomsError(formatFetchError(e, t));
      }
    } finally {
      setRoomsLoading(false);
      setGamesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!active || inVoiceCall) return;
    let cancelled = false;
    setRoomsLoading(true);
    setGamesLoading(true);
    void (async () => {
      await loadLobby();
      if (cancelled) return;
    })();
    const iv = window.setInterval(() => void loadLobby(), 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(iv);
    };
  }, [active, loadLobby, inVoiceCall]);

  useEffect(() => {
    const roomId = searchParams.get("beloteRoom");
    if (active && roomId) {
      navigate(`/belote/waiting-room?roomId=${encodeURIComponent(roomId)}`, { replace: true });
    }
  }, [active, searchParams, navigate]);

  const openCreateModal = () => {
    setShowCreate(true);
    setNewName("");
    setNewVis("PUBLIC");
    setNewTarget(1500);
    setNewVariant("CONTEE");
    setNewBuyIn(BELOTE_BUY_IN_DEFAULT);
    setCustomBuyIn("");
    setNewPassword("");
    setAutoFillBots(false);
    setShowCreateAdvanced(false);
  };

  const closeCreateModal = () => {
    if (creating) return;
    setShowCreate(false);
  };

  useEffect(() => {
    if (!showCreate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !creating) setShowCreate(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCreate, creating]);

  useEffect(() => {
    if (!showCreate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showCreate]);

  const createRoom = async () => {
    const name = newName.trim() || t("belote.defaultRoomName");
    setCreating(true);
    setShowCreate(false);
    try {
      const res = await fetch(apiUrl("/api/belote-rooms/create"), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name,
          visibility: newVis,
          targetScore: newTarget,
          buyIn: newBuyIn,
          variant: newVariant,
          ...(newPassword ? { password: newPassword } : {}),
          autoFillBotsEnabled: autoFillBots,
          defaultBotDifficulty: "NORMAL",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("common.error"));
      }
      const data = (await res.json()) as { room: BeloteRoomListItem };
      navigate(`/belote/waiting-room?roomId=${data.room.id}`, {
        state: newPassword ? { joinPassword: newPassword } : undefined,
      });
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setCreating(false);
    }
  };

  const joinWaitingRoom = (room: BeloteRoomListItem) => {
    if (room.hasPassword) {
      setJoinPasswordInput("");
      setPasswordJoinRoom(room);
      return;
    }
    navigate(`/belote/waiting-room?roomId=${room.id}`);
  };

  const confirmPasswordJoin = () => {
    if (!passwordJoinRoom) return;
    const pwd = joinPasswordInput.trim();
    if (!pwd) {
      addToast(t("belote.passwordRequired"), "error");
      return;
    }
    navigate(`/belote/waiting-room?roomId=${passwordJoinRoom.id}`, {
      state: { joinPassword: pwd },
    });
    setPasswordJoinRoom(null);
    setJoinPasswordInput("");
  };

  const joinGame = (game: BeloteGameInProgressItem) => {
    navigate(`/belote/game?gameId=${encodeURIComponent(game.gameId)}`);
  };

  const spectateGame = (game: BeloteGameInProgressItem) => {
    navigate(`/belote/game?gameId=${encodeURIComponent(game.gameId)}&spectate=1`);
  };

  const handleRequestJoin = async (roomId: string) => {
    setRequestingRoom(roomId);
    try {
      const res = await fetch(apiUrl(`/api/belote-rooms/${roomId}/request-join`), {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? t("common.error"));
      }
      addToast(t("lobby.requestSent"), "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : t("common.error"), "error");
    } finally {
      setRequestingRoom(null);
    }
  };

  if (!active) return null;

  const passwordJoinModal =
    passwordJoinRoom && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
            onClick={() => setPasswordJoinRoom(null)}
            role="presentation"
          >
            <div
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-1 text-lg font-bold text-white">{passwordJoinRoom.name}</h3>
              <p className="mb-4 text-sm text-slate-400">{t("belote.enterPassword")}</p>
              <input
                type="password"
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none focus:border-emerald-400/50"
                value={joinPasswordInput}
                onChange={(e) => setJoinPasswordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmPasswordJoin();
                }}
                autoComplete="current-password"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPasswordJoinRoom(null)}
                  className="flex-1 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/5"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={confirmPasswordJoin}
                  className="flex-1 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  {t("lobby.join")}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  const createModal =
    showCreate && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-start justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200 md:items-center"
            onClick={closeCreateModal}
            role="presentation"
          >
            <div
              className="my-auto mx-2 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl"
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">{t("lobby.createServerTitle")}</h3>
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="p-1 text-slate-400 hover:text-white"
                  aria-label={t("common.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-6">
                <label htmlFor="belote-create-room-name" className="mb-2 block text-sm font-medium text-slate-300">
                  {t("lobby.createRoomNameLabel")}
                </label>
                <input
                  id="belote-create-room-name"
                  type="text"
                  maxLength={80}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("lobby.createRoomNamePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-slate-500">{t("lobby.createRoomNameHint")}</p>
              </div>

              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-slate-300">{t("lobby.visibility")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewVis("PUBLIC")}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                      newVis === "PUBLIC"
                        ? "border-emerald-500 bg-emerald-600/20 text-emerald-400"
                        : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <Globe className="h-5 w-5" />
                    {t("lobby.public")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewVis("PRIVATE")}
                    className={`flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold transition-all ${
                      newVis === "PRIVATE"
                        ? "border-red-400/80 bg-red-600/20 text-red-200 shadow-[0_0_24px_rgba(248,113,113,0.18)]"
                        : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                    }`}
                  >
                    <Lock className="h-5 w-5" />
                    {t("lobby.private")}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {newVis === "PUBLIC" ? t("lobby.publicDesc") : t("lobby.privateDesc")}
                </p>
              </div>

              {!showCreateAdvanced ? (
                <p className="mb-4 text-xs text-slate-500">
                  {t(variantLabelKey(newVariant))} · {newTarget} {t("belote.points")} ·{" "}
                  {t("belote.buyInShort", { amount: newBuyIn })}
                  {autoFillBots ? ` · ${t("belote.autoFillBotsShort")}` : ""}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => setShowCreateAdvanced((v) => !v)}
                className="mb-2 flex w-full items-center justify-center gap-2 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-300"
                aria-expanded={showCreateAdvanced}
                aria-label={showCreateAdvanced ? t("lobby.hideOptions") : t("lobby.seeMore")}
              >
                <Settings2 className="h-4 w-4" />
                <span>{showCreateAdvanced ? t("lobby.hideOptions") : t("lobby.seeMore")}</span>
                {showCreateAdvanced ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              <AnimatePresence initial={false}>
                {showCreateAdvanced ? (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                    animate={{ height: "auto", opacity: 1, marginBottom: 24 }}
                    exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <motion.div
                      initial={{ y: -8 }}
                      animate={{ y: 0 }}
                      exit={{ y: -8 }}
                      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      className="space-y-5 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                    >
                      <div>
                        <p className="mb-3 text-sm font-medium text-slate-300">{t("belote.gameVariant")}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {BELOTE_VARIANT_OPTIONS.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setNewVariant(v)}
                              className={`rounded-xl border-2 px-3 py-2.5 text-left text-xs font-semibold leading-tight transition sm:text-sm ${
                                newVariant === v
                                  ? "border-emerald-400/70 bg-emerald-950/70 text-emerald-100 shadow-[0_0_22px_rgba(16,185,129,0.18)]"
                                  : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                              }`}
                            >
                              {t(variantLabelKey(v))}
                            </button>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{t(`belote.variantDesc.${newVariant}`)}</p>
                      </div>

                      <label className="block text-sm font-medium text-slate-300">
                        {t("belote.targetScore")}
                        <input
                          type="number"
                          min={500}
                          max={2000}
                          step={100}
                          className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                          value={newTarget}
                          onChange={(e) => setNewTarget(Number(e.target.value) || 1500)}
                        />
                      </label>

                      <div>
                        <p className="mb-3 text-sm font-medium text-slate-300">{t("belote.buyInLabel")}</p>
                        <div className="flex flex-wrap gap-2">
                          {BELOTE_BUY_IN_PRESETS.map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => {
                                setNewBuyIn(v);
                                setCustomBuyIn("");
                              }}
                              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
                                newBuyIn === v && !customBuyIn
                                  ? "border border-emerald-400/50 bg-emerald-950/70 text-emerald-100"
                                  : "bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <label className="mt-3 block text-xs text-slate-500">
                          {t("belote.buyInCustom")}
                          <input
                            type="number"
                            min={10}
                            step={10}
                            placeholder={t("belote.buyInCustomPlaceholder")}
                            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                            value={customBuyIn}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setCustomBuyIn(raw);
                              if (raw.trim()) {
                                setNewBuyIn(normalizeBeloteBuyIn(Number(raw)));
                              }
                            }}
                          />
                        </label>
                        <p className="mt-2 text-xs text-emerald-200/70">
                          {t("belote.buyInPotHint", {
                            pot: belotePotTotal(newBuyIn),
                            share: beloteWinnerShare(belotePotTotal(newBuyIn)),
                          })}
                        </p>
                      </div>

                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                        <input
                          type="checkbox"
                          checked={autoFillBots}
                          onChange={(e) => setAutoFillBots(e.target.checked)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-500"
                        />
                        <span className="text-sm text-slate-200">{t("belote.autoFillBots")}</span>
                      </label>

                      <div>
                        <label
                          htmlFor="belote-create-password"
                          className="mb-2 block text-sm font-medium text-slate-300"
                        >
                          {t("belote.passwordOptional")}
                        </label>
                        <input
                          id="belote-create-password"
                          type="password"
                          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                      </div>
                    </motion.div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="button"
                disabled={creating || !userId}
                onClick={() => void createRoom()}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-lg font-bold transition md:py-4 ${
                  creating || !userId
                    ? "cursor-not-allowed border border-white/10 bg-white/[0.035] text-slate-500"
                    : "border border-emerald-300/45 bg-emerald-950/80 text-white shadow-[0_0_34px_rgba(16,185,129,0.22)] hover:border-emerald-200/55 hover:bg-emerald-900/85"
                }`}
              >
                {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {t("lobby.validateCreate")}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
      <h2 className="mb-3 flex items-center gap-3 text-xl font-bold text-white xl:text-2xl">
        <Server className={`h-7 w-7 xl:h-8 xl:w-8 ${beloteAccent.serverIcon}`} />
        {t("lobby.multiplayerServers")}
      </h2>

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <button
          type="button"
          onClick={openCreateModal}
          disabled={!userId || creating}
          className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-bold text-white shadow-lg shadow-black/20 transition disabled:cursor-not-allowed disabled:bg-slate-700/70 md:py-4 ${beloteAccent.primaryBtn}`}
        >
          {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
          {creating ? t("lobby.creating") : t("lobby.createNewServer")}
        </button>

        {/* Salles d'attente */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold text-gray-300">{t("lobby.waitingRooms")}</p>
          {roomsLoading && waitingRooms.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-2 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </p>
          ) : waitingRooms.length === 0 && roomsError ? (
            <p className="py-2 text-center text-sm text-red-400">{roomsError}</p>
          ) : waitingRooms.length === 0 ? (
            <p className="py-2 text-center text-gray-500">{t("lobby.noServersAvailable")}</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {waitingRooms.map((room) => {
                const count = room.players?.length ?? 0;
                const isHost = userId && room.hostId === userId;
                const isFull = count >= room.maxPlayers;
                const isPrivate = room.visibility === "PRIVATE";
                const alreadyIn = room.players.some((p) => p.id === userId);
                return (
                  <li
                    key={room.id}
                    className="relative rounded-md border border-white/10 bg-white/[0.055] px-1.5 py-1 pr-[13rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:pr-[15rem]"
                  >
                    <div className="min-w-0">
                      <p className="min-w-0 truncate text-left text-xs font-medium leading-none text-white sm:text-[13px]">
                        {room.name}
                      </p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-px text-[10px] leading-none text-gray-400">
                        <span className="shrink-0 text-[10px] text-gray-400">
                          {t("lobby.playersCount", { count, max: room.maxPlayers })}
                        </span>
                        {room.counts ? (
                          <span className="shrink-0 text-[10px] text-cyan-200/80">
                            {t("belote.seatCounts", {
                              humans: room.counts.humans,
                              bots: room.counts.bots,
                            })}
                          </span>
                        ) : null}
                        <span className={`shrink-0 text-[10px] ${beloteAccent.minBalance}`}>
                          {room.targetScore} {t("belote.points")}
                        </span>
                        <span className="shrink-0 text-[10px] text-amber-200/90">
                          {t("belote.buyInShort", { amount: room.buyIn ?? BELOTE_BUY_IN_DEFAULT })}
                        </span>
                        <span className="shrink-0 text-[10px] text-purple-200/90">
                          {t(variantLabelKey(room.variant ?? "CONTEE"))}
                        </span>
                      </div>
                    </div>
                    <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap">
                      {isPrivate ? (
                        <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-purple-500/35 bg-purple-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-purple-200 sm:w-28 sm:text-[10px]">
                          <Lock className="h-2.5 w-2.5" aria-hidden />
                          {t("lobby.private")}
                        </span>
                      ) : (
                        <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-green-500/35 bg-green-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-green-200 sm:w-28 sm:text-[10px]">
                          <Globe className="h-2.5 w-2.5" aria-hidden />
                          {t("lobby.public")}
                        </span>
                      )}
                      {isFull && !alreadyIn ? (
                        <span className="flex min-h-7 w-24 cursor-not-allowed items-center justify-center rounded bg-slate-700 px-1 py-1 text-[9px] font-semibold text-gray-500 sm:w-28 sm:text-[10px]">
                          {t("lobby.roomFull")}
                        </span>
                      ) : isPrivate && !isHost && !alreadyIn ? (
                        <button
                          type="button"
                          onClick={() => void handleRequestJoin(room.id)}
                          disabled={requestingRoom === room.id}
                          className="flex min-h-7 w-24 max-w-full items-center justify-center gap-0.5 rounded bg-purple-600 px-1 py-1 text-[9px] font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-800 sm:w-28 sm:text-[10px]"
                        >
                          {requestingRoom === room.id ? (
                            <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" />
                          ) : (
                            <Lock className="h-2.5 w-2.5 shrink-0" />
                          )}
                          {t("lobby.requestJoin")}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => joinWaitingRoom(room)}
                          className={`min-h-7 w-24 shrink-0 rounded px-1 py-1 text-[9px] font-semibold text-white transition sm:w-28 sm:text-[10px] ${beloteAccent.joinBtn}`}
                        >
                          {t("lobby.join")}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Parties en cours */}
        <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
          <p className="mb-2 text-sm font-semibold text-gray-300">{t("lobby.gamesInProgress")}</p>
          {gamesLoading && games.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-2 text-center text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </p>
          ) : games.length === 0 ? (
            <p className="py-2 text-center text-gray-500">{t("belote.noGamesInProgress")}</p>
          ) : (
            <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {games.map((g) => (
                <li
                  key={g.gameId}
                  className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                >
                  <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-1.5 sm:gap-x-2">
                    <p className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-white sm:text-[15px]">
                      {g.roomName}
                    </p>
                    <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 sm:gap-1.5">
                      {g.canJoin ? (
                        <button
                          type="button"
                          onClick={() => joinGame(g)}
                          className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-white transition sm:px-2 sm:text-[11px] ${beloteAccent.joinBtn}`}
                        >
                          {t("lobby.join")}
                        </button>
                      ) : null}
                      {g.canSpectate !== false ? (
                        <button
                          type="button"
                          onClick={() => spectateGame(g)}
                          className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-700/80 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-600/90 sm:gap-1 sm:px-2 sm:text-[11px]"
                        >
                          <Eye className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                          <span className="whitespace-nowrap">{t("lobby.spectate")}</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    {t("lobby.playersCount", { count: g.playerCount, max: g.maxPlayers })} ·{" "}
                    {phaseLabel(g.phase, t)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {passwordJoinModal}
      {createModal}
    </div>
  );
}
