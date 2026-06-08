import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { UserPlus, Users, Loader2, AlertCircle, Lock, Globe, Check, UserCheck, Zap, Clock, AlertTriangle, Trash2, LogOut, X } from "lucide-react";
import { ChipIcon } from "../components/ChipIcon";
import { useSocket } from "../hooks/useSocket";
import { useUser } from "../hooks/useUser";
import { fetchBalanceFromServer, getUserAvatar } from "../utils/userProfile";
import {
  useGetBlockedUsersQuery,
  useGetFriendsQuery,
  useGetShopCosmeticsQuery,
  useGetShopLoadoutQuery,
} from "../services/api";
import type { PublicPlayerCosmetics } from "../utils/publicCosmetics";
import { resolvePublicCosmeticsFromShop } from "../utils/publicCosmetics";
import { CosmeticAvatar, CosmeticBannerCard, CosmeticTitle } from "../components/PlayerCosmetics";
import { useToast } from "../contexts/ToastContext";
import { trackEvent } from "../utils/analytics";
import { apiUrl } from "../utils/apiBase";
import { getAuthItem } from "../utils/authStorage";
import { getPlayerAvatar } from "../utils/avatars";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { useVoice } from "../contexts/VoiceContext";
import { TableVoicePanel } from "../features/voice/TableVoicePanel";
import { pickVoicePanelState } from "../features/voice/useTableVoiceChat";

interface Player {
  id: string;
  name: string;
  level: number;
  isReady: boolean;
  avatarUrl?: string | null;
  cosmetics?: PublicPlayerCosmetics;
}

type RoomPlayerSnapshot = {
  id: string;
  username: string;
  level?: number;
  isReady?: boolean;
  avatarUrl?: string | null;
  cosmetics?: PublicPlayerCosmetics;
};

export function WaitingRoom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [defeatBanner] = useState(() => {
    const st = location.state as { outcome?: string; message?: string } | null;
    return st?.outcome === "lost" && st.message ? st.message : null;
  });
  const { userId, username } = useUser();
  const { socket, joinRoom, leaveRoom } = useSocket();
  const voice = useVoice();
  const queryParams = new URLSearchParams(location.search);
  const rawRoomId = queryParams.get("roomId");
  const roomId = rawRoomId || `room_${Date.now()}`;

  const [players, setPlayers] = useState<Player[]>([]);
  /** Invitations poker salle d'attente : en attente de réponse ou refusée (affichage rose). */
  const [friendInviteStatus, setFriendInviteStatus] = useState<Record<string, "pending" | "rejected">>({});
  const [isCreator, setIsCreator] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [roomVisibility, setRoomVisibility] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC');
  const [roomTurbo, setRoomTurbo] = useState(false);
  const [roomMinBalance, setRoomMinBalance] = useState<number | null>(null);
  const [roomLoading, setRoomLoading] = useState(true);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [blockedWarningAccepted, setBlockedWarningAccepted] = useState(false);
  const [blockedRoomWarning, setBlockedRoomWarning] = useState<{ names: string[] } | null>(null);
  const [blockedPresenceWarning, setBlockedPresenceWarning] = useState<{ id: string; name: string } | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [myIsReady, setMyIsReady] = useState(false);
  const [myCosmetics, setMyCosmetics] = useState<PublicPlayerCosmetics | null>(null);
  const [presentUserIds, setPresentUserIds] = useState<string[]>([]);

  interface JoinRequestItem {
    id: string;
    userId: string;
    username: string;
    level: number;
    avatarUrl?: string | null;
  }
  const [joinRequests, setJoinRequests] = useState<JoinRequestItem[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const roomPollInFlightRef = useRef(false);
  const seenPlayerIdsRef = useRef<Set<string> | null>(null);
  const warnedBlockedPresenceIdsRef = useRef<Set<string>>(new Set());

  const authHeaders = useCallback(() => {
    const token = getAuthItem("token");
    return {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const applyRoomSnapshot = useCallback((room: {
    name?: string;
    visibility?: 'PUBLIC' | 'PRIVATE';
    turbo?: boolean;
    hostId?: string;
    minBalance?: number | null;
    presentUserIds?: string[];
    players?: RoomPlayerSnapshot[];
    blockedPlayers?: Array<{ id: string; username: string }>;
  }) => {
    setRoomName(room.name || "");
    setRoomVisibility(room.visibility || 'PUBLIC');
    setRoomTurbo(!!room.turbo);
    setRoomMinBalance(room.minBalance ?? null);
    setIsCreator(room.hostId === userId);
    const me = room.players?.find((p) => p.id === userId);
    setMyIsReady(me?.isReady ?? false);
    setMyCosmetics(me?.cosmetics ?? null);
    setPresentUserIds(Array.isArray(room.presentUserIds) ? room.presentUserIds : []);
    setPlayers(
      (room.players || [])
        .filter((p) => p.id !== userId)
        .map((p) => ({
          id: p.id,
          name: p.username,
          level: p.level ?? 0,
          isReady: p.isReady ?? false,
          avatarUrl: p.avatarUrl ?? null,
          cosmetics: p.cosmetics,
        }))
    );
  }, [userId]);

  const { data: friends } = useGetFriendsQuery(userId!, { skip: !userId });
  const { data: shopCosmetics } = useGetShopCosmeticsQuery(undefined, { skip: !userId });
  const { data: shopLoadout } = useGetShopLoadoutQuery(undefined, { skip: !userId });
  const localCosmetics = useMemo(
    () => resolvePublicCosmeticsFromShop(shopCosmetics?.items, shopLoadout),
    [shopCosmetics?.items, shopLoadout],
  );
  const displayMyCosmetics = myCosmetics ?? localCosmetics;
  const { data: blockedUsers = [], isLoading: blockedUsersLoading } = useGetBlockedUsersQuery(undefined, {
    skip: !userId,
  });
  const { addToast } = useToast();

  useEffect(() => {
    setFriendInviteStatus({});
  }, [rawRoomId]);

  useEffect(() => {
    seenPlayerIdsRef.current = null;
    warnedBlockedPresenceIdsRef.current = new Set();
    setBlockedPresenceWarning(null);
  }, [rawRoomId]);

  useEffect(() => {
    if (roomLoading || blockedUsersLoading) return;
    const currentIds = new Set(players.map((player) => player.id));
    const previousIds = seenPlayerIdsRef.current;

    if (!previousIds) {
      seenPlayerIdsRef.current = currentIds;
      return;
    }

    const blockedIds = new Set(blockedUsers.map((entry) => entry.user.id));
    const enteredBlockedPlayer = players.find(
      (player) =>
        blockedIds.has(player.id) &&
        !previousIds.has(player.id) &&
        !warnedBlockedPresenceIdsRef.current.has(player.id),
    );
    seenPlayerIdsRef.current = currentIds;

    if (enteredBlockedPlayer) {
      warnedBlockedPresenceIdsRef.current.add(enteredBlockedPlayer.id);
      setBlockedPresenceWarning({
        id: enteredBlockedPlayer.id,
        name: enteredBlockedPlayer.name,
      });
    }
  }, [players, blockedUsers, roomLoading, blockedUsersLoading]);

  useEffect(() => {
    setFriendInviteStatus((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of Object.keys(next)) {
        if (players.some((p) => p.id === id)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [players]);

  useEffect(() => {
    if (!socket || !rawRoomId || rawRoomId.startsWith("room_")) return;
    const onInviteRejected = (data: { userId?: string; roomId?: string }) => {
      if (data.roomId && data.roomId !== rawRoomId) return;
      if (!data.userId) return;
      setFriendInviteStatus((prev) => {
        if (prev[data.userId!] !== "pending") return prev;
        return { ...prev, [data.userId!]: "rejected" };
      });
      const name =
        friends?.find((f) => f.id === data.userId)?.username ??
        t("waitingRoom.inviteRejectedSomeone");
      addToast(t("waitingRoom.inviteRejectedToast", { name }), "info");
    };
    const onInviteAccepted = (data: { userId?: string; roomId?: string }) => {
      if (data.roomId && data.roomId !== rawRoomId) return;
      if (!data.userId) return;
      setFriendInviteStatus((prev) => {
        if (!(data.userId! in prev)) return prev;
        const { [data.userId!]: _, ...rest } = prev;
        return rest;
      });
    };
    socket.on("INVITATION_REJECTED", onInviteRejected);
    socket.on("INVITATION_ACCEPTED", onInviteAccepted);
    return () => {
      socket.off("INVITATION_REJECTED", onInviteRejected);
      socket.off("INVITATION_ACCEPTED", onInviteAccepted);
    };
  }, [socket, rawRoomId, friends, addToast, t]);

  const extractErrorMessage = useCallback(
    async (res: Response, fallback: string) => {
      try {
        const raw = await res.text();
        if (!raw) return fallback;
        const parsed = JSON.parse(raw) as { error?: string };
        return parsed?.error || fallback;
      } catch {
        return fallback;
      }
    },
    []
  );

  const fetchRoom = useCallback(
    async (id: string) => {
      const url = userId
        ? `${apiUrl(`/api/waiting-room/${id}`)}?userId=${encodeURIComponent(userId)}`
        : apiUrl(`/api/waiting-room/${id}`);
      const res = await fetch(url, { headers: authHeaders() });
      if (res.status === 410) {
        const msg = await extractErrorMessage(
          res,
          t("waitingRoom.roomGameEnded", "Cette partie est terminée ou n’est plus disponible."),
        );
        return { fetchError: msg, code: "ROOM_GAME_ENDED" as const };
      }
      if (!res.ok) return null;
      return res.json();
    },
    [authHeaders, extractErrorMessage, t, userId]
  );

  useEffect(() => {
    const st = location.state as { outcome?: string } | null;
    if (st?.outcome === "lost") {
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    if (!userId) {
      navigate("/auth");
      return;
    }

    let cancelled = false;

    const init = async () => {
      setRoomLoading(true);
      setRoomError(null);
      try {
        if (!rawRoomId || rawRoomId.startsWith("room_")) {
          if (!userId) {
            setRoomError(t("waitingRoom.cannotCreateRoom"));
            setRoomLoading(false);
            return;
          }
          const createUrl = apiUrl("/api/waiting-room/create");
          const res = await fetch(createUrl, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({
              hostId: userId,
              roomName: t("lobby.roomOf", { name: username || t("lobby.defaultPlayerName") }),
              maxPlayers: 5,
              avatarUrl: getUserAvatar(),
            }),
          });
          if (cancelled) return;
          if (!res.ok) {
            const msg = await extractErrorMessage(res, t('waitingRoom.cannotCreateRoom'));
            setRoomError(msg);
            setRoomLoading(false);
            return;
          }
          const room = await res.json();
          navigate(`/waiting-room?roomId=${room.id}`, { replace: true });
          return;
        }

        const room = await fetchRoom(rawRoomId);
        if (cancelled) return;
        if (room && typeof room === "object" && "fetchError" in room) {
          setRoomError(room.fetchError);
          setRoomLoading(false);
          return;
        }
        if (!room) {
          setRoomError(t('waitingRoom.roomNotFound'));
          setRoomLoading(false);
          return;
        }
        if (room.status !== "WAITING") {
          setRoomError(t('waitingRoom.gameAlreadyStarted'));
          setRoomLoading(false);
          return;
        }

        const inRoom = room.players?.some((p: { id: string }) => p.id === userId);
        const blockedPlayers = Array.isArray(room.blockedPlayers) ? room.blockedPlayers : [];
        if (!inRoom && blockedPlayers.length > 0 && !blockedWarningAccepted) {
          setBlockedRoomWarning({
            names: blockedPlayers.map((player: { username: string }) => player.username).filter(Boolean),
          });
          applyRoomSnapshot(room);
          setRoomLoading(false);
          return;
        }
        const joinUrl = apiUrl(`/api/waiting-room/${rawRoomId}/join`);
        const joinRes = await fetch(joinUrl, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ userId, avatarUrl: getUserAvatar(), confirmBlockedWarning: blockedWarningAccepted }),
        });
        if (cancelled) return;
        if (!joinRes.ok) {
          if (!inRoom) {
            const msg = await extractErrorMessage(joinRes, t('waitingRoom.cannotJoin'));
            setRoomError(msg);
            setRoomLoading(false);
            return;
          }
          applyRoomSnapshot(room);
        } else {
          const payload = await joinRes.json();
          applyRoomSnapshot(payload);
        }
        // Récupérer la balance serveur avant démarrage (le serveur utilise user.chips en DB)
        fetchBalanceFromServer().catch(() => {});
      } catch (e) {
        if (!cancelled) setRoomError(e instanceof Error ? e.message : t('common.error'));
      } finally {
        if (!cancelled) setRoomLoading(false);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [userId, username, rawRoomId, navigate, fetchRoom, applyRoomSnapshot, extractErrorMessage, t, blockedWarningAccepted, authHeaders]);

  useEffect(() => {
    if (!userId || !rawRoomId || rawRoomId.startsWith("room_") || roomLoading) return;
    joinRoom(rawRoomId);
    const voiceTimer = window.setTimeout(() => {
      voice.joinWaitingRoom(rawRoomId);
    }, 200);
    return () => {
      window.clearTimeout(voiceTimer);
      leaveRoom(rawRoomId);
    };
  }, [userId, rawRoomId, roomLoading, joinRoom, leaveRoom, voice.joinWaitingRoom]);

  useEffect(() => {
    if (!socket || !navigate) return;
    const onGameStarted = (data: {
      gameId: string;
      players: { id: string; name: string }[];
      voiceMigrate?: { fromChannelId: string; toChannelId: string; mode: 'continue' | 'replace' };
    }) => {
      try {
        if (data.gameId && data.players?.length) {
          localStorage.setItem("gamePlayers", JSON.stringify(data.players));
          localStorage.setItem("gameId", data.gameId);
          if (data.voiceMigrate) {
            voice.applyMigrateHint(
              data.voiceMigrate,
              data.players.map((p) => p.id),
            );
          }
          trackEvent("play_poker");
          leaveRoom(rawRoomId!);
          navigate(`/game?gameId=${data.gameId}`);
        }
      } catch { /* no-op */ }
    };
    socket.on("GAME_STARTED", onGameStarted);
    return () => socket.off("GAME_STARTED", onGameStarted);
  }, [socket, navigate, rawRoomId, voice, leaveRoom]);

  useEffect(() => {
    if (!socket || !userId || !addToast) return;
    const onHostRequestedStart = (data: { message?: string; notReadyPlayers?: { id: string; name: string }[] }) => {
      const notReady = data?.notReadyPlayers ?? [];
      const amINotReady = notReady.some((p: { id: string }) => String(p.id) === String(userId));
      if (amINotReady) {
        addToast(data?.message ?? t('waitingRoom.hostWantsStart'), "info");
      }
    };
    socket.on("HOST_REQUESTED_START", onHostRequestedStart);
    const onWaitingRoomUpdated = (room: {
      id?: string;
      status?: string;
      name?: string;
      visibility?: 'PUBLIC' | 'PRIVATE';
      turbo?: boolean;
      hostId?: string;
      presentUserIds?: string[];
      players?: RoomPlayerSnapshot[];
    } | null) => {
      if (!room) {
        if (rawRoomId && !rawRoomId.startsWith("room_")) {
          leaveRoom(rawRoomId);
        }
        navigate("/lobby");
        return;
      }
      if (room.status !== "WAITING") return;
      applyRoomSnapshot(room);
    };
    socket.on("WAITING_ROOM_UPDATED", onWaitingRoomUpdated);
    return () => {
      socket.off("HOST_REQUESTED_START", onHostRequestedStart);
      socket.off("WAITING_ROOM_UPDATED", onWaitingRoomUpdated);
    };
  }, [socket, userId, addToast, applyRoomSnapshot, rawRoomId, leaveRoom, navigate]);

  useEffect(() => {
    if (!rawRoomId || rawRoomId.startsWith("room_")) return;
    const interval = setInterval(async () => {
      if (roomPollInFlightRef.current) return;
      roomPollInFlightRef.current = true;
      let room: Awaited<ReturnType<typeof fetchRoom>> = null;
      try {
        room = await fetchRoom(rawRoomId);
      } finally {
        roomPollInFlightRef.current = false;
      }
      if (!room || room.status !== "WAITING") return;
      applyRoomSnapshot(room);
    }, 5000);
    return () => clearInterval(interval);
  }, [rawRoomId, fetchRoom, applyRoomSnapshot]);

  // Polling join requests for private rooms (host only)
  const fetchJoinRequests = useCallback(async () => {
    if (!rawRoomId || !userId || !isCreator || roomVisibility !== 'PRIVATE') return;
    try {
      const url = `${apiUrl(`/api/waiting-room/${rawRoomId}/join-requests`)}?hostId=${userId}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setJoinRequests(data);
      }
    } catch { /* ignore */ }
  }, [rawRoomId, userId, isCreator, roomVisibility, authHeaders]);

  useEffect(() => {
    fetchJoinRequests();
    // nosemgrep: javascript.lang.security.detect-eval-with-expression.detect-eval-with-expression
    const interval = setInterval(fetchJoinRequests, 3000);
    return () => clearInterval(interval);
  }, [fetchJoinRequests]);

  // Listen for new join requests via socket (instant refresh)
  useEffect(() => {
    if (!socket || !isCreator) return;
    const onJoinRequest = () => { fetchJoinRequests(); };
    socket.on('JOIN_REQUEST_RECEIVED', onJoinRequest);
    return () => { socket.off('JOIN_REQUEST_RECEIVED', onJoinRequest); };
  }, [socket, isCreator, fetchJoinRequests]);

  const handleAcceptRequest = async (requestId: string) => {
    if (!rawRoomId || !userId) return;
    setProcessingRequest(requestId);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/join-requests/${requestId}/accept`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ hostId: userId }),
      });
      if (res.ok) void fetchJoinRequests();
    } catch { /* ignore */ }
    setProcessingRequest(null);
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!rawRoomId || !userId) return;
    setProcessingRequest(requestId);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/join-requests/${requestId}/reject`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ hostId: userId }),
      });
      if (res.ok) void fetchJoinRequests();
    } catch { /* ignore */ }
    setProcessingRequest(null);
  };

  const handleInvite = (friend: { id: string; username: string; level?: number }) => {
    socket?.emit("invite-to-room", {
      roomId,
      invitedUserId: friend.id,
      inviterId: userId,
    });
    setFriendInviteStatus((prev) => ({ ...prev, [friend.id]: "pending" }));
  };

  const _handleRemoveInvite = (playerId: string) => {
    socket?.emit("cancel-invitation", {
      roomId,
      playerId,
    });
    setFriendInviteStatus((prev) => {
      const { [playerId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleReady = () => {
    socket?.emit("player-ready", { roomId, userId });
    setMyIsReady(true); // Optimistic update
    if (rawRoomId && !rawRoomId.startsWith("room_")) {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/ready`);
      fetch(url, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ userId, isReady: true }),
      }).catch(() => {});
    }
  };

  const handleStartGame = async () => {
    if (!rawRoomId || rawRoomId.startsWith("room_") || !userId) return;
    setStartError(null);
    setStarting(true);
    try {
      const url = apiUrl(`/api/waiting-room/${rawRoomId}/start`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const ct = res.headers.get("content-type") ?? "";
        let err: Record<string, unknown> = {};
        if (ct.includes("application/json")) {
          err = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        } else {
          const text = await res.text().catch(() => "");
          err = text.trim() ? { error: text.trim().slice(0, 500) } : {};
        }
        const code = typeof err.code === "string" ? err.code : "";
        const rawMsg =
          (typeof err.error === "string" && err.error) ||
          (typeof err.message === "string" && err.message) ||
          "";

        const notReadyNames = Array.isArray(err.notReadyPlayers)
          ? (err.notReadyPlayers as unknown[]).filter((n): n is string => typeof n === "string")
          : [];

        const isNotAllReady =
          code === "WAITING_ROOM_NOT_ALL_READY" ||
          rawMsg === "Tous les joueurs ne sont pas prêts" ||
          rawMsg === "Not all players are ready";

        if (isNotAllReady && notReadyNames.length > 0) {
          setStartError(
            `${t("waitingRoom.notAllReady")} : ${notReadyNames.join(", ")} ${t("waitingRoom.mustBeReady")}`,
          );
        } else if (isNotAllReady) {
          setStartError(t("waitingRoom.startErrorNotReady"));
        } else if (code === "WAITING_ROOM_START_NOT_HOST") {
          setStartError(t("waitingRoom.startErrorNotHost"));
        } else if (code === "WAITING_ROOM_NOT_FOUND" || res.status === 404) {
          setStartError(t("waitingRoom.startErrorRoomNotFound"));
        } else if (code === "WAITING_ROOM_NOT_ENOUGH_PLAYERS") {
          setStartError(t("waitingRoom.startErrorNeedTwoPlayers"));
        } else if (code === "START_INSUFFICIENT_CHIPS") {
          const reqAmt = typeof err.required === "number" ? err.required : null;
          const curAmt = typeof err.current === "number" ? err.current : null;
          setStartError(
            t("waitingRoom.startErrorInsufficientChips", {
              required: reqAmt ?? "?",
              current: curAmt ?? "?",
            }),
          );
        } else if (code === "RATE_LIMITED" || res.status === 429) {
          setStartError(t("waitingRoom.startErrorRateLimited"));
        } else if (code === "CASH_OPEN_DEBIT_FAILED") {
          setStartError(t("waitingRoom.startErrorCashDebit"));
        } else if (rawMsg) {
          setStartError(rawMsg);
        } else {
          setStartError(t("waitingRoom.cannotStart"));
        }
        return;
      }
      const data = await res.json() as {
        gameId?: string;
        players?: { id: string; name: string }[];
        voiceMigrate?: { fromChannelId: string; toChannelId: string; mode: 'continue' | 'replace' };
      };
      if (data.players?.length) {
        localStorage.setItem("gamePlayers", JSON.stringify(data.players));
        localStorage.setItem("gameId", data.gameId || "");
      }
      if (data.gameId && data.voiceMigrate) {
        voice.applyMigrateHint(
          data.voiceMigrate,
          data.players?.map((p) => p.id) ?? [],
        );
      }
      leaveRoom(rawRoomId);
      navigate(data.gameId ? `/game?gameId=${data.gameId}` : "/game");
    } catch (e) {
      setStartError(e instanceof Error ? e.message : t("waitingRoom.cannotStart"));
    } finally {
      setStarting(false);
    }
  };

  const handleDeleteAndLeaveRoom = async () => {
    if (rawRoomId && !rawRoomId.startsWith("room_") && userId) {
      try {
        const url = apiUrl(`/api/waiting-room/${rawRoomId}${isCreator ? "" : "/leave"}`);
        const res = await fetch(url, {
          method: isCreator ? "DELETE" : "POST",
          headers: authHeaders(),
          body: isCreator ? undefined : JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          addToast(data.error || t("waitingRoom.deleteAndLeaveFailed"), "error");
          return;
        }
      } catch {
        addToast(t("waitingRoom.deleteAndLeaveFailed"), "error");
        return;
      }
    }
    voice.leaveChannel();
    leaveRoom(rawRoomId || roomId);
    navigate("/lobby");
  };

  const presentSet = new Set(presentUserIds);
  if (userId) presentSet.add(userId);

  if (roomLoading && !roomName) {
    return (
      <div className="w-full min-h-screen app-shell-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="w-10 h-10 animate-spin text-green-400" />
          <p>{t('waitingRoom.loadingRoom')}</p>
        </div>
      </div>
    );
  }

  if (roomError) {
    return (
      <div className="w-full min-h-screen app-shell-bg flex items-center justify-center p-6">
        <div className="bg-slate-800 rounded-2xl p-8 border border-red-500/50 max-w-md w-full text-center">
          <p className="text-red-400 mb-4">{roomError}</p>
          <button
            onClick={() => navigate("/lobby")}
            className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-6 py-2 rounded-xl"
          >
            {t('waitingRoom.backToLobby')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full app-shell-bg overflow-x-hidden">
      {blockedRoomWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/20 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/50">
                <AlertTriangle className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("lobby.blockedRoomWarningTitle")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {t("lobby.blockedRoomWarningBody", { names: blockedRoomWarning.names.join(", ") })}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/lobby")}
                className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setBlockedRoomWarning(null);
                  setBlockedWarningAccepted(true);
                  setRoomLoading(true);
                }}
                className="rounded-full border border-amber-300/20 bg-amber-700 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
              >
                {t("lobby.blockedRoomWarningContinue")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {blockedPresenceWarning ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-amber-300/20 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/50">
                <AlertTriangle className="h-6 w-6 text-amber-200" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{t("waitingRoom.blockedMemberEnteredTitle")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {t("waitingRoom.blockedMemberEnteredBody", { name: blockedPresenceWarning.name })}
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => void handleDeleteAndLeaveRoom()}
                className="rounded-full border border-red-300/20 bg-red-700 px-4 py-2.5 font-semibold text-white transition hover:bg-red-600"
              >
                {t("waitingRoom.blockedMemberLeave")}
              </button>
              <button
                type="button"
                onClick={() => setBlockedPresenceWarning(null)}
                className="rounded-full border border-amber-300/20 bg-amber-700 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
              >
                {t("waitingRoom.blockedMemberStay")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="w-full min-w-0 p-4 sm:p-6">
        {defeatBanner ? (
          <div
            className="mb-6 rounded-xl border border-rose-500/35 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
            role="status"
          >
            {defeatBanner}
          </div>
        ) : null}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-600 to-green-800 shadow-xl">
              <Users className="h-8 w-8 text-white" />
            </div>
            <div className="min-w-0">
              <div className="mb-1 flex min-w-0 flex-wrap items-center gap-3">
                <h1 className="min-w-0 break-words text-4xl font-bold text-white">{roomName || t('waitingRoom.waitingRoomTitle')}</h1>
                {roomVisibility === 'PRIVATE' ? (
                  <span className="flex items-center gap-1 bg-purple-600/30 text-purple-300 text-xs font-semibold px-2 py-1 rounded-full border border-purple-500/40">
                    <Lock className="w-3 h-3" />
                    {t('lobby.private')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 bg-green-600/30 text-green-300 text-xs font-semibold px-2 py-1 rounded-full border border-green-500/40">
                    <Globe className="w-3 h-3" />
                    {t('lobby.public')}
                  </span>
                )}
                {roomTurbo ? (
                  <span className="flex items-center gap-1 border border-amber-500/50 bg-amber-600/25 text-amber-200 text-xs font-semibold px-2 py-1 rounded-full">
                    <Zap className="w-3 h-3" />
                    {t("waitingRoom.turboMode")}
                  </span>
                ) : null}
              </div>
              {roomMinBalance && roomMinBalance > 0 && (
                <div className="flex items-center gap-2 text-sm text-slate-400 mt-1">
                  <ChipIcon size="sm" />
                  <span>
                    {t("waitingRoom.minStakeRequiredBefore")}
                    <span className="text-amber-400 font-bold">
                      {" "}
                      {roomMinBalance.toLocaleString()}{" "}
                    </span>
                    {t("waitingRoom.minStakeRequiredAfter")}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleDeleteAndLeaveRoom()}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-red-400/35 bg-red-950/55 px-3 text-sm font-semibold text-red-100 transition hover:border-red-300/60 hover:bg-red-900/70 hover:text-white sm:self-start"
            aria-label={isCreator ? t("waitingRoom.deleteAndLeave") : t("waitingRoom.leave")}
            title={isCreator ? t("waitingRoom.deleteAndLeave") : t("waitingRoom.leave")}
          >
            {isCreator ? <Trash2 className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
            <span>{isCreator ? t("waitingRoom.deleteAndLeave") : t("waitingRoom.leave")}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Joueurs dans la salle */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <Users className="w-6 h-6" />
              {t('waitingRoom.playersInRoom', { count: players.length + 1 })}
            </h2>

            {/* Toi-même */}
            <CosmeticBannerCard cosmetics={displayMyCosmetics} className="mb-3 border-blue-700/50">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <CosmeticAvatar cosmetics={displayMyCosmetics} sizeClass="w-12 h-12">
                      <ImageWithFallback
                        src={getPlayerAvatar(username || "Vous", userId, userId)}
                        alt={`${username || "Vous"} avatar`}
                        className="h-full w-full object-cover"
                      />
                    </CosmeticAvatar>
                    <div className={`absolute bottom-0 right-0 w-5 h-5 ${myIsReady ? 'bg-green-500' : isCreator ? 'bg-amber-500' : 'bg-yellow-500'} rounded-full border-2 border-slate-800`} title={myIsReady ? t('waitingRoom.ready') : t('game.waiting')}></div>
                  </div>
                  <div>
                    <div className="text-white font-bold">{username}</div>
                    <CosmeticTitle cosmetics={displayMyCosmetics} className="text-xs font-semibold" />
                    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                      {myIsReady ? (
                        <>
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                          {t("waitingRoom.ready")}
                        </>
                      ) : (
                        t("waitingRoom.readyQuestion")
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {!myIsReady && (
                    <button
                      onClick={handleReady}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg font-semibold"
                    >
                      {t('waitingRoom.ready')}
                    </button>
                  )}
                  {myIsReady && (
                    <span className="inline-flex items-center gap-1.5 text-green-400 font-medium">
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                      {t("waitingRoom.ready")}
                    </span>
                  )}
                  <span
                    className={`text-[10px] font-semibold ${
                      userId && presentSet.has(userId) ? "text-emerald-400" : "text-slate-500"
                    }`}
                  >
                    {userId && presentSet.has(userId) ? t("belote.present") : t("belote.absent")}
                  </span>
                </div>
              </div>
            </CosmeticBannerCard>

            {/* Autres joueurs */}
            {players.map((player) => (
              <CosmeticBannerCard key={player.id} cosmetics={player.cosmetics} className="mb-3 border-slate-700/50">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <CosmeticAvatar cosmetics={player.cosmetics} sizeClass="w-12 h-12">
                        <ImageWithFallback
                          src={getPlayerAvatar(player.name, player.id, userId, player.avatarUrl)}
                          alt={`${player.name} avatar`}
                          className="h-full w-full object-cover"
                        />
                      </CosmeticAvatar>
                      <div className={`absolute bottom-0 right-0 w-5 h-5 ${player.isReady ? 'bg-green-500' : 'bg-yellow-500'} rounded-full border-2 border-slate-800`}></div>
                    </div>
                    <div>
                      <div className="text-white font-bold">{player.name}</div>
                      <CosmeticTitle cosmetics={player.cosmetics} className="text-xs font-semibold" />
                      <div className="text-gray-400 text-sm">{t('friends.level', { level: player.level })}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 text-sm text-gray-400">
                    {player.isReady ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden />
                        {t("waitingRoom.ready")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-amber-400/90 shrink-0" aria-hidden />
                        {t("game.waiting")}
                      </span>
                    )}
                    <span
                      className={`text-[10px] font-semibold ${
                        presentSet.has(player.id) ? "text-emerald-400" : "text-slate-500"
                      }`}
                    >
                      {presentSet.has(player.id) ? t("belote.present") : t("belote.absent")}
                    </span>
                  </div>
                </div>
              </CosmeticBannerCard>
            ))}

            {players.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl">
                <div className="text-gray-400">
                  {t('waitingRoom.waitingForOthers')}
                </div>
              </div>
            )}

            {userId && presentSet.has(userId) ? (
              <p className="mt-3 text-center text-xs text-emerald-300/80">{t("belote.youArePresent")}</p>
            ) : (
              <p className="mt-3 text-center text-xs text-amber-300/80">{t("belote.connectingPresence")}</p>
            )}
          </div>

          {/* Invitations aux amis */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              {t('waitingRoom.inviteFriends')}
            </h2>

            <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
              {friends?.filter(f => !players.some(p => p.id === f.id) && f.id !== userId)
                .map((friend) => (
                  <div key={friend.id} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                          <ImageWithFallback
                            src={getPlayerAvatar(friend.username, friend.id, userId, friend.avatarUrl)}
                            alt={`${friend.username} avatar`}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        </div>
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-800"></div>
                      </div>
                      <div>
                        <div className="text-white font-bold">{friend.username}</div>
                        <div className="text-yellow-400 text-sm">{t('friends.level', { level: friend.level })}</div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <button
                        type="button"
                        onClick={() => handleInvite(friend)}
                        disabled={friendInviteStatus[friend.id] === "pending"}
                        className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                          friendInviteStatus[friend.id] === "pending"
                            ? "bg-emerald-600 text-white cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-500 text-white"
                        }`}
                      >
                        {friendInviteStatus[friend.id] === "pending"
                          ? t("waitingRoom.invited")
                          : t("waitingRoom.invite")}
                      </button>
                      {friendInviteStatus[friend.id] === "rejected" ? (
                        <span className="max-w-[11rem] text-right text-[11px] leading-snug text-rose-300/90 sm:text-left">
                          {t("waitingRoom.inviteAlreadyRejected")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}

              {(!friends || friends.length === 0) && (
                <div className="text-center py-8">
                  <div className="text-gray-400">{t('waitingRoom.noFriendsOnline')}</div>
                </div>
              )}
            </div>

            {/* Join requests panel (private rooms, host only) */}
            {isCreator && roomVisibility === 'PRIVATE' && (
              <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/40 mb-4">
                <h3 className="text-lg font-bold text-purple-300 flex items-center gap-2 mb-3">
                  <UserCheck className="w-5 h-5" />
                  {t('waitingRoom.joinRequests')}
                  {joinRequests.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {joinRequests.length}
                    </span>
                  )}
                </h3>
                {joinRequests.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-2">{t('waitingRoom.noJoinRequests')}</p>
                ) : (
                  <div className="space-y-2">
                    {joinRequests.map((req) => (
                      <div key={req.id} className="flex items-center justify-between bg-slate-800/70 rounded-lg px-3 py-2 border border-slate-600">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white bg-blue-500 shadow-lg transition">
                            <ImageWithFallback
                              src={getPlayerAvatar(req.username, req.userId, userId, req.avatarUrl)}
                              alt={`${req.username} avatar`}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{req.username}</p>
                            <p className="text-gray-400 text-xs">{t('friends.level', { level: req.level })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAcceptRequest(req.id)}
                            disabled={processingRequest === req.id}
                            className="bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white p-1.5 rounded-lg transition"
                            title={t('friends.accept')}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRejectRequest(req.id)}
                            disabled={processingRequest === req.id}
                            className="bg-red-600 hover:bg-red-500 disabled:bg-slate-600 text-white p-1.5 rounded-lg transition"
                            title={t('friends.reject')}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isCreator && (
              <div className="space-y-3">
                {startError && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-200">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{startError}</p>
                      <button
                        type="button"
                        onClick={() => setStartError(null)}
                        className="mt-2 text-xs text-amber-300 hover:text-amber-200 underline"
                      >
                        {t('waitingRoom.close')}
                      </button>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleStartGame}
                  disabled={!myIsReady || players.length < 1 || starting}
                  className={`w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                    myIsReady && players.length >= 1 && !starting
                      ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white transform hover:scale-105"
                      : "bg-slate-700 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {starting ? t('waitingRoom.starting') : t('waitingRoom.startGameWithCount', { count: players.length + 1 })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {userId && rawRoomId && !rawRoomId.startsWith("room_") ? (
        <div className="pointer-events-none fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 z-40 sm:left-6">
          <TableVoicePanel
            layout="room"
            panelHideMs={1000}
            voice={pickVoicePanelState(voice)}
            myUserId={userId}
            channelLabel={voice.channel?.label ?? null}
            tablePlayers={players.map((p) => ({ userId: p.id, username: p.name }))}
          />
        </div>
      ) : null}
    </div>
  );
}
