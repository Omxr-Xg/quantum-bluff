import { useState, useEffect, useCallback, useRef, useMemo, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import {
  Bot,
  Server,
  Loader2,
  X,
  Lock,
  Globe,
  Minus,
  Plus,
  Eye,
  ChevronDown,
  ChevronUp,
  Settings2,
  XCircle,
  Spade,
  Club,
  Zap,
  Sparkles,
  Disc,
  SquareStack,
  Trophy,
  AlertTriangle,
  Diamond,
} from "lucide-react";
import { useSocket } from "../hooks/useSocket";
import { useNumberFieldInput, NUMBER_FIELD_INVALID_CLASS } from "../hooks/useNumberFieldInput";
import {
  fetchTournaments,
  fetchLiveSpectateTournaments,
  createTournament,
} from "../features/tournament/services/tournamentApi";
import {
  TOURNAMENT_MIN_PLAYERS,
  TOURNAMENT_MAX_PLAYERS,
} from "../features/tournament/tournamentConstants";
import lobbyHeaderIcon from "../../app-icon.png";
import { FriendsList } from '../components/FriendsList';
import { useUser } from '../hooks/useUser';
import { useToast } from '../contexts/ToastContext';
import { useTopBar } from '../contexts/TopBarContext';
import { LobbyInteractiveTour } from '../components/LobbyInteractiveTour';
import { apiUrl } from "../utils/apiBase";
import {
  getUserBalance,
  BALANCE_CHANGED_EVENT,
  updateUserBalance,
} from "../utils/userProfile";
import { LobbyBlackjackMultiSection } from "../components/LobbyBlackjackMultiSection";
import { LobbyBeloteSection } from "../components/LobbyBeloteSection";
import { DailyChallenges } from "../components/DailyChallenges";
import { getAuthItem } from "../utils/authStorage";
import { FreeRechargeButton } from '../components/FreeRechargeButton';

/* Helpers de formatage de la date de depart d'un tournoi (datetime-local). */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function dateToStartAtLocal(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function defaultTournamentStartLocal(): string {
  return dateToStartAtLocal(new Date(Date.now() + 60 * 60 * 1000));
}

function startAtLocalFromNowPlusMinutes(minutes: number): string {
  return dateToStartAtLocal(new Date(Date.now() + minutes * 60 * 1000));
}

type LobbyMainTab = "poker" | "minigames" | "blackjack" | "belote";

function readLobbyTabFromUrl(): LobbyMainTab {
  if (typeof window === "undefined") return "poker";
  try {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "blackjack") return "blackjack";
    if (tab === "minigames" || tab === "roulette") return "minigames";
    if (tab === "belote") return "belote";
  } catch {
    /* ignore */
  }
  return "poker";
}

interface RoomPlayer {
  id: string;
  username: string;
  level: number;
  isReady: boolean;
  position: number;
}

interface WaitingRoomItem {
  id: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  visibility: 'PUBLIC' | 'PRIVATE';
  status: string;
  turbo?: boolean;
  players: RoomPlayer[];
  playerCount: number;
  minBalance?: number | null;
  smallBlind?: number | null;
  bigBlind?: number | null;
  blockedPlayers?: { id: string; username: string }[];
}

interface GameInProgressItem {
  roomId: string;
  roomName: string;
  gameId: string;
  playerCount: number;
  maxPlayers: number;
  phase: string;
  canJoin: boolean;
  blockedPlayers?: { id: string; username: string }[];
}

interface TournamentOpenItem {
  id: string;
  name: string;
  startAt: string;
  maxPlayers: number;
  blindSmall: number;
  blindBig: number;
  _count: { players: number };
}

interface TournamentLiveTable {
  gameId: string;
  roundNumber: number;
  playerCount: number;
}

interface TournamentLiveItem {
  tournamentId: string;
  name: string;
  status: string;
  tables: TournamentLiveTable[];
}

export function Lobby() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userId, username } = useUser();
  const authHeaders = useCallback(() => {
    const token = getAuthItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);
  const { menuContent } = useTopBar();
  const [rooms, setRooms] = useState<WaitingRoomItem[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createVisibility, setCreateVisibility] = useState<'PUBLIC' | 'PRIVATE' | null>(null);
  const [createMaxPlayers, setCreateMaxPlayers] = useState<number | null>(null);
  const [showCreateAdvanced, setShowCreateAdvanced] = useState(false);
  const [createSmallBlind, setCreateSmallBlind] = useState(5);
  const [createBigBlind, setCreateBigBlind] = useState(10);
  const [createMinBalance, setCreateMinBalance] = useState(100);
  const [createTurbo, setCreateTurbo] = useState(false);
  /** Nom affiché de la salle ; vide = nom par défaut (ex. « Salle de … » / traduction). */
  const [createRoomName, setCreateRoomName] = useState("");
  const [requestingRoom, setRequestingRoom] = useState<string | null>(null);
  const [blockedRoomWarning, setBlockedRoomWarning] = useState<{
    names: string[];
    onContinue: () => void;
  } | null>(null);
  const [gamesInProgress, setGamesInProgress] = useState<GameInProgressItem[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [openTournaments, setOpenTournaments] = useState<TournamentOpenItem[]>([]);
  const [liveTournaments, setLiveTournaments] = useState<TournamentLiveItem[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);
  const [tournamentsError, setTournamentsError] = useState<string | null>(null);
  /* Modal "Creer un tournoi" : compact par defaut (nom + rapide/normale).
   * `tournamentExpanded` revele les champs detailles (SB, BB, joueurs, date...). */
  const [showTournamentCreate, setShowTournamentCreate] = useState(false);
  const [tournamentExpanded, setTournamentExpanded] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentVisibility, setTournamentVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [tournamentJoinCode, setTournamentJoinCode] = useState("");
  const [tournamentMaxPlayers, setTournamentMaxPlayers] = useState(8);
  const [tournamentInitialStack, setTournamentInitialStack] = useState(2000);
  const [tournamentBlindSmall, setTournamentBlindSmall] = useState(10);
  const [tournamentBlindBig, setTournamentBlindBig] = useState(20);
  const [tournamentStartAtLocal, setTournamentStartAtLocal] = useState(defaultTournamentStartLocal);
  const [tournamentCreating, setTournamentCreating] = useState(false);
  const [tournamentCreateError, setTournamentCreateError] = useState<string | null>(null);
  const { socket } = useSocket();
  const [lobbyTourOpen, setLobbyTourOpen] = useState(false);
  const [lobbyTourStep, setLobbyTourStep] = useState(0);
  const lobbyTourOpenRef = useRef(false);
  /** `yes` = première connexion au compte : le tuto n’est pas encore enregistré côté serveur. */
  const [lobbyTutorialFirstRun, setLobbyTutorialFirstRun] = useState<"loading" | "yes" | "no">(
    "loading"
  );
  const [lobbyMainTab, setLobbyMainTabState] = useState<LobbyMainTab>(readLobbyTabFromUrl);
  const { addToast } = useToast();
  const [balance, setBalance] = useState<number>(getUserBalance());
  const [rechargeKey, setRechargeKey] = useState(0);

  const handleRechargeSuccess = (newBalance: number) => {
    // Source de vérité = localStorage + BALANCE_CHANGED_EVENT (écouté par Layout).
    // Sans ça, le header (Layout) gardait l'ancien solde jusqu'au prochain focus / nav.
    updateUserBalance(newBalance);
    setBalance(newBalance);
    setRechargeKey(prev => prev + 1);
    addToast("Recharge effectuée.", "success");
  };

  useEffect(() => {
    const sync = () => setBalance(getUserBalance());
    window.addEventListener(BALANCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(BALANCE_CHANGED_EVENT, sync);
  }, []);

  // Performance: memoize rooms for map operations
  const roomsMemo = useMemo(() => (lobbyMainTab === "belote" ? [] : rooms), [lobbyMainTab, rooms]);
  const gamesMemo = useMemo(() => (lobbyMainTab === "belote" ? [] : gamesInProgress), [lobbyMainTab, gamesInProgress]);
  const openTournamentsMemo = useMemo(() => openTournaments, [openTournaments]);
  const liveTournamentsMemo = useMemo(() => liveTournaments, [liveTournaments]);

  /* Inputs numeriques : saisie libre + bordure rouge si invalide. */
  const smallBlindField = useNumberFieldInput({
    value: createSmallBlind,
    onChange: setCreateSmallBlind,
    min: 1,
    max: 10000,
  });
  const bigBlindField = useNumberFieldInput({
    value: createBigBlind,
    onChange: setCreateBigBlind,
    min: 1,
    max: 10000,
  });
  const minBalanceField = useNumberFieldInput({
    value: createMinBalance,
    onChange: setCreateMinBalance,
    min: 0,
    max: 1_000_000,
  });
  const tournamentMaxPlayersField = useNumberFieldInput({
    value: tournamentMaxPlayers,
    onChange: setTournamentMaxPlayers,
    min: TOURNAMENT_MIN_PLAYERS,
    max: TOURNAMENT_MAX_PLAYERS,
  });
  const tournamentStackField = useNumberFieldInput({
    value: tournamentInitialStack,
    onChange: setTournamentInitialStack,
    min: 100,
    max: 100_000_000,
  });
  const tournamentSmallBlindField = useNumberFieldInput({
    value: tournamentBlindSmall,
    onChange: setTournamentBlindSmall,
    min: 1,
    max: 10_000_000,
  });
  const tournamentBigBlindField = useNumberFieldInput({
    value: tournamentBlindBig,
    onChange: setTournamentBlindBig,
    min: 1,
    max: 10_000_000,
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "blackjack") setLobbyMainTabState("blackjack");
    else if (tab === "minigames" || tab === "roulette") setLobbyMainTabState("minigames");
    else if (tab === "belote") setLobbyMainTabState("belote");
    else setLobbyMainTabState("poker");
  }, [searchParams]);

  const setMainTab = useCallback(
    (tab: LobbyMainTab) => {
      setLobbyMainTabState(tab);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (tab === "blackjack") {
            p.set("tab", "blackjack");
          } else if (tab === "minigames") {
            p.set("tab", "minigames");
            p.delete("bjRoom");
          } else if (tab === "belote") {
            p.set("tab", "belote");
            p.delete("bjRoom");
          } else {
            p.delete("tab");
            p.delete("bjRoom");
          }
          return p;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    lobbyTourOpenRef.current = lobbyTourOpen;
  }, [lobbyTourOpen]);

  /** État du tuto : une fois par compte (champ serveur), pas par navigateur. */
  useEffect(() => {
    if (!userId) {
      setLobbyTutorialFirstRun("no");
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/auth/lobby-tutorial-status"), {
          headers: authHeaders(),
        });
        const data = (await res.json().catch(() => ({}))) as { completed?: boolean };
        if (cancelled) return;
        if (!res.ok) {
          setLobbyTutorialFirstRun("no");
          return;
        }
        setLobbyTutorialFirstRun(data.completed === true ? "no" : "yes");
      } catch {
        if (!cancelled) setLobbyTutorialFirstRun("no");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, authHeaders]);

  /** Première connexion au compte après inscription : lance le tutoriel une seule fois. */
  useEffect(() => {
    if (lobbyTutorialFirstRun !== "yes") return;
    const id = window.setTimeout(() => {
      if (lobbyTourOpenRef.current) return;
      setMainTab("poker");
      setLobbyTourStep(0);
      setLobbyTourOpen(true);
    }, 450);
    return () => clearTimeout(id);
  }, [lobbyTutorialFirstRun, setMainTab]);

  const handleLobbyTourClose = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/auth/lobby-tutorial/complete"), {
        method: "POST",
        headers: authHeaders(),
      });
      setLobbyTutorialFirstRun("no");
    } catch {
      /* ignore */
    }
    setLobbyTourOpen(false);
  }, [authHeaders]);

  const tourRefHeader = useRef<HTMLDivElement>(null);
  const tourRefTopBar = useRef<HTMLDivElement>(null);
  const tourRefBot = useRef<HTMLDivElement>(null);
  const tourRefMultiplayer = useRef<HTMLDivElement>(null);
  const tourRefWaiting = useRef<HTMLDivElement>(null);
  const tourRefGames = useRef<HTMLDivElement>(null);
  const tourRefFriends = useRef<HTMLDivElement>(null);
  const tourRefMinigames = useRef<HTMLDivElement>(null);
  const tourRefBlackjack = useRef<HTMLDivElement>(null);
  const tourRefDaily = useRef<HTMLDivElement>(null);
  const lobbyTabsRef = useRef<HTMLElement>(null);
  const [alignedContentMinHeight, setAlignedContentMinHeight] = useState(0);

  useEffect(() => {
    const sideColumn = tourRefFriends.current;
    const tabs = lobbyTabsRef.current;
    if (!sideColumn || !tabs) return;

    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const sideHeight = Math.max(sideColumn.getBoundingClientRect().height, sideColumn.scrollHeight);
        const tabsHeight = tabs.getBoundingClientRect().height;
        setAlignedContentMinHeight(Math.max(0, Math.ceil(sideHeight - tabsHeight - 24)));
      });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sideColumn);
    observer.observe(tabs);
    window.addEventListener("resize", measure);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [lobbyMainTab]);

  const lobbyAlignmentStyle = {
    "--lobby-content-min-height": `${alignedContentMinHeight}px`,
  } as CSSProperties;

  const lobbyTourRefs = useMemo(
    () => ({
      header: tourRefHeader,
      topBar: tourRefTopBar,
      tabs: lobbyTabsRef,
      bot: tourRefBot,
      multiplayer: tourRefMultiplayer,
      waitingRooms: tourRefWaiting,
      gamesInProgress: tourRefGames,
      minigamesPanel: tourRefMinigames,
      blackjackPanel: tourRefBlackjack,
      dailyChallenges: tourRefDaily,
      friends: tourRefFriends,
    }),
    []
  );

  const fetchGamesInProgress = useCallback(async () => {
    try {
      const base = apiUrl("/api/waiting-room/games-in-progress");
      const url = userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setGamesInProgress(Array.isArray(data) ? data : []);
    } catch {
      setGamesInProgress([]);
    } finally {
      setGamesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGamesInProgress();
    const iv = setInterval(fetchGamesInProgress, 5000);
    return () => clearInterval(iv);
  }, [fetchGamesInProgress]);

  // Auto-navigate when a join request is accepted
  useEffect(() => {
    const onAccepted = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.roomId) {
        navigate(`/waiting-room?roomId=${detail.roomId}`);
      }
    };
    window.addEventListener('join-request-accepted', onAccepted);
    return () => window.removeEventListener('join-request-accepted', onAccepted);
  }, [navigate]);

  const fetchRooms = useCallback(async () => {
    try {
      const base = apiUrl("/api/waiting-room");
      const url = userId ? `${base}?userId=${encodeURIComponent(userId)}` : base;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error(t('common.error'));
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
      setRoomsError(null);
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : t('common.error'));
      setRooms([]);
    } finally {
      setRoomsLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  useEffect(() => {
    const onRefetchWaitingRooms = () => {
      void fetchRooms();
    };
    window.addEventListener("refetch-waiting-rooms", onRefetchWaitingRooms);
    return () => window.removeEventListener("refetch-waiting-rooms", onRefetchWaitingRooms);
  }, [fetchRooms]);

  /* Tournois : on charge en parallele la liste des tournois ouverts (lobby
   * d'inscription) et ceux deja en cours (live spectate). Source de verite
   * identique a la page /tournaments ; rafraichissement par evenement socket
   * `TOURNAMENT_LOBBY_LIST_UPDATED` + fallback polling 10s. */
  const fetchTournamentsBoth = useCallback(async () => {
    try {
      const [openResult, liveResult] = await Promise.allSettled([
        fetchTournaments(),
        fetchLiveSpectateTournaments(),
      ]);

      if (openResult.status === "rejected") {
        throw openResult.reason;
      }

      setOpenTournaments(
        Array.isArray(openResult.value) ? (openResult.value as TournamentOpenItem[]) : [],
      );
      setLiveTournaments(
        liveResult.status === "fulfilled" && Array.isArray(liveResult.value)
          ? (liveResult.value as TournamentLiveItem[])
          : [],
      );
      setTournamentsError(null);
    } catch (e) {
      setTournamentsError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTournamentsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchTournamentsBoth();
    const iv = setInterval(fetchTournamentsBoth, 10_000);
    return () => clearInterval(iv);
  }, [fetchTournamentsBoth]);

  useEffect(() => {
    if (!socket) return;
    const joinLobby = () => {
      if (socket.connected) socket.emit("JOIN_TOURNAMENT_LOBBY");
    };
    const onListUpdated = () => {
      void fetchTournamentsBoth();
    };
    joinLobby();
    socket.on("connect", joinLobby);
    socket.on("TOURNAMENT_LOBBY_LIST_UPDATED", onListUpdated);
    return () => {
      socket.off("connect", joinLobby);
      socket.off("TOURNAMENT_LOBBY_LIST_UPDATED", onListUpdated);
      if (socket.connected) socket.emit("LEAVE_TOURNAMENT_LOBBY");
    };
  }, [socket, fetchTournamentsBoth]);

  const resetTournamentForm = useCallback(() => {
    setTournamentName("");
    setTournamentVisibility("PUBLIC");
    setTournamentJoinCode("");
    setTournamentMaxPlayers(8);
    setTournamentInitialStack(2000);
    setTournamentBlindSmall(10);
    setTournamentBlindBig(20);
    setTournamentStartAtLocal(defaultTournamentStartLocal());
    setTournamentCreateError(null);
    setTournamentExpanded(false);
  }, []);

  const openTournamentModal = useCallback(() => {
    resetTournamentForm();
    setShowTournamentCreate(true);
  }, [resetTournamentForm]);

  const closeTournamentModal = useCallback(() => {
    if (tournamentCreating) return;
    setShowTournamentCreate(false);
    setTournamentCreateError(null);
  }, [tournamentCreating]);

  const autoTournamentName = useCallback(
    () =>
      t("tournament.arena.quickName", {
        time: new Date().toLocaleTimeString(),
      }),
    [t],
  );

  /** Validation alignee sur le backend pour eviter les divergences cote serveur. */
  const validateTournamentForm = useCallback((): string | null => {
    if (tournamentVisibility === "PRIVATE" && tournamentJoinCode.trim().length < 4) {
      return t("tournament.arena.valJoinCode");
    }
    if (
      !Number.isFinite(tournamentMaxPlayers) ||
      Math.floor(tournamentMaxPlayers) !== tournamentMaxPlayers ||
      tournamentMaxPlayers < TOURNAMENT_MIN_PLAYERS ||
      tournamentMaxPlayers > TOURNAMENT_MAX_PLAYERS
    ) {
      return t("tournament.arena.valMaxPlayers", {
        min: TOURNAMENT_MIN_PLAYERS,
        max: TOURNAMENT_MAX_PLAYERS,
      });
    }
    const start = new Date(tournamentStartAtLocal);
    if (Number.isNaN(start.getTime())) return t("tournament.arena.valStartInvalid");
    if (start.getTime() < Date.now() - 15_000) {
      return t("tournament.arena.valStartFuture");
    }
    if (
      !Number.isFinite(tournamentInitialStack) ||
      Math.floor(tournamentInitialStack) !== tournamentInitialStack ||
      tournamentInitialStack < 100 ||
      tournamentInitialStack > 100_000_000
    ) {
      return t("tournament.arena.valStack");
    }
    if (
      !Number.isFinite(tournamentBlindSmall) ||
      !Number.isFinite(tournamentBlindBig) ||
      Math.floor(tournamentBlindSmall) !== tournamentBlindSmall ||
      Math.floor(tournamentBlindBig) !== tournamentBlindBig
    ) {
      return t("tournament.arena.valBlinds");
    }
    if (tournamentBlindSmall < 1 || tournamentBlindBig < 1) return t("tournament.arena.valBlinds");
    if (tournamentBlindSmall > 10_000_000 || tournamentBlindBig > 10_000_000) {
      return t("tournament.arena.valBlindsMax");
    }
    if (tournamentBlindSmall > tournamentBlindBig) return t("tournament.arena.valSbBb");
    return null;
  }, [
    t,
    tournamentVisibility,
    tournamentJoinCode,
    tournamentMaxPlayers,
    tournamentStartAtLocal,
    tournamentInitialStack,
    tournamentBlindSmall,
    tournamentBlindBig,
  ]);

  /** Creation rapide : valeurs par defaut + depart dans ~60s. Le nom saisi est conserve. */
  const handleQuickCreateTournament = useCallback(async () => {
    if (tournamentCreating) return;
    setTournamentCreating(true);
    setTournamentCreateError(null);
    try {
      const { id } = await createTournament({
        name: tournamentName.trim() || autoTournamentName(),
        visibility: "PUBLIC",
        maxPlayers: 8,
        initialStack: 2000,
        startAt: new Date(Date.now() + 60_000).toISOString(),
        blindSmall: 10,
        blindBig: 20,
      });
      setShowTournamentCreate(false);
      resetTournamentForm();
      navigate(`/tournaments/${id}`);
    } catch (e) {
      setTournamentCreateError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTournamentCreating(false);
    }
  }, [tournamentCreating, tournamentName, autoTournamentName, navigate, resetTournamentForm, t]);

  /** Creation detaillee : valide puis envoie tous les parametres saisis. */
  const handleSubmitTournament = useCallback(async () => {
    if (tournamentCreating) return;
    const v = validateTournamentForm();
    if (v) {
      setTournamentCreateError(v);
      return;
    }
    setTournamentCreating(true);
    setTournamentCreateError(null);
    try {
      const body: Record<string, unknown> = {
        name: tournamentName.trim() || autoTournamentName(),
        visibility: tournamentVisibility,
        maxPlayers: tournamentMaxPlayers,
        initialStack: tournamentInitialStack,
        blindSmall: tournamentBlindSmall,
        blindBig: tournamentBlindBig,
        startAt: new Date(tournamentStartAtLocal).toISOString(),
      };
      if (tournamentVisibility === "PRIVATE") body.joinCode = tournamentJoinCode.trim();
      const { id } = await createTournament(body);
      setShowTournamentCreate(false);
      resetTournamentForm();
      navigate(`/tournaments/${id}`);
    } catch (e) {
      setTournamentCreateError(e instanceof Error ? e.message : t("common.error"));
    } finally {
      setTournamentCreating(false);
    }
  }, [
    tournamentCreating,
    validateTournamentForm,
    tournamentName,
    autoTournamentName,
    tournamentVisibility,
    tournamentMaxPlayers,
    tournamentInitialStack,
    tournamentBlindSmall,
    tournamentBlindBig,
    tournamentStartAtLocal,
    tournamentJoinCode,
    navigate,
    resetTournamentForm,
    t,
  ]);

  const handlePlayBot = () => {
    navigate("/bot-configuration");
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setCreateVisibility('PUBLIC');
    setCreateMaxPlayers(5);
    setShowCreateAdvanced(false);
    setCreateSmallBlind(5);
    setCreateBigBlind(10);
    setCreateMinBalance(100);
    setCreateTurbo(false);
    setCreateRoomName("");
  };

  const MIN_BALANCE = 100;
  const isMinBalanceInvalid = createMinBalance < MIN_BALANCE;
  /* Blinds invalides : bornes serveur ; on rejette aussi un SB > BB. */
  const isBlindsInvalid =
    smallBlindField.isInvalid ||
    bigBlindField.isInvalid ||
    createSmallBlind > createBigBlind;
  const canCreateServer =
    createVisibility !== null &&
    createMaxPlayers !== null &&
    !creating &&
    !isMinBalanceInvalid &&
    !minBalanceField.isInvalid &&
    !isBlindsInvalid;

  const handleCreateServer = async () => {
    if (!userId) return;
    if (!createVisibility || createMaxPlayers == null) return;
    if (isMinBalanceInvalid) {
      addToast(t('lobby.minAmount100'), 'error');
      return;
    }
    setCreating(true);
    setShowCreateModal(false);
    try {
      const url = apiUrl("/api/waiting-room/create");
      const custom = createRoomName.trim().slice(0, 80);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          hostId: userId,
          ...(custom.length > 0
            ? { roomName: custom }
            : { roomName: t("lobby.roomOf", { name: username || t("lobby.defaultPlayerName") }) }),
          maxPlayers: createMaxPlayers,
          visibility: createVisibility,
          smallBlind: createSmallBlind,
          bigBlind: createBigBlind,
          minBalance: createMinBalance,
          turbo: createTurbo,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Erreur ${res.status}`);
      }
      const room = await res.json();
      navigate(`/waiting-room?roomId=${room.id}`);
    } catch (e) {
      setRoomsError(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const handleRequestJoin = async (roomId: string) => {
    if (!userId) return;
    setRequestingRoom(roomId);
    try {
      const url = apiUrl(`/api/waiting-room/${roomId}/request-join`);
      const res = await fetch(url, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Erreur ${res.status}`);
      }
      addToast(t('lobby.requestSent'), 'success');
    } catch (e) {
      addToast(e instanceof Error ? e.message : t('common.error'), 'error');
    } finally {
      setRequestingRoom(null);
    }
  };

  const openBlockedRoomWarning = (blockedPlayers: { username: string }[] | undefined, onContinue: () => void) => {
    const names = (blockedPlayers ?? []).map((player) => player.username).filter(Boolean);
    if (names.length === 0) {
      onContinue();
      return;
    }
    setBlockedRoomWarning({ names, onContinue });
  };

  const handleJoinRoom = (roomId: string, room?: WaitingRoomItem) => {
    if (room?.minBalance && room.minBalance > 0 && balance < room.minBalance) {
      addToast(`Jetons insuffisants — il faut au moins ${room.minBalance} jetons pour cette salle.`, 'error');
      return;
    }
    openBlockedRoomWarning(room?.blockedPlayers, () => navigate(`/waiting-room?roomId=${roomId}`));
  };

  const handleJoinGame = (game: GameInProgressItem) => {
    openBlockedRoomWarning(game.blockedPlayers, () => navigate(`/game?gameId=${game.gameId}`));
  };

  const handleSpectateGame = (game: GameInProgressItem) => {
    openBlockedRoomWarning(game.blockedPlayers, () => navigate(`/game?gameId=${game.gameId}&spectate=1`));
  };

  const cardGameAccent = {
    botIcon: "text-blue-200",
    serverIcon: "text-cyan-200",
    primaryBtn: "border-blue-300/15 bg-blue-950/75 hover:border-blue-200/25 hover:bg-blue-900/80",
    joinBtn: "bg-blue-900 hover:bg-blue-800",
    minBalance: "text-blue-200/95",
  };

  return (
    <div
      className={`relative w-full min-h-[100dvh] overflow-x-clip overflow-y-visible px-2 py-4 sm:px-4 md:p-6 transition-[background-color] duration-700 ease-in-out ${
        lobbyMainTab === "poker"
          ? "bg-[#020716]"
          : lobbyMainTab === "belote"
            ? "bg-[#02100c]"
            : lobbyMainTab === "minigames"
              ? "bg-[#120e06]"
              : "bg-[#100409]"
      }`}
    >
      {/* Fond Texas Hold'em */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: lobbyMainTab === "poker" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(30,64,175,0.24),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(14,116,144,0.10),transparent_48%),linear-gradient(165deg,#020716_0%,#061326_46%,#02040c_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-blue-950/40 blur-[120px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-cyan-700/10 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-950/28 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.26) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.08),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(15,23,42,0.55),transparent_58%)]" />
      </div>

      {/* Fond Belote — vert */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: lobbyMainTab === "belote" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(6,78,59,0.42),transparent_50%),radial-gradient(ellipse_90%_70%_at_100%_50%,rgba(20,83,45,0.10),transparent_45%),linear-gradient(165deg,#02100c_0%,#031b14_40%,#020807_100%)]" />
        <div className="absolute -top-32 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-emerald-800/22 blur-[100px]" />
        <div className="absolute -right-16 top-1/4 h-72 w-72 rounded-full bg-teal-950/28 blur-[90px]" />
        <div className="absolute -bottom-20 left-0 h-96 w-96 rounded-full bg-teal-600/10 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.09]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(148,163,184,0.20) 1px, transparent 0)",
            backgroundSize: "20px 20px",
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-[min(140vw,52rem)] w-[min(140vw,52rem)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
          style={{
            background: "conic-gradient(from 0deg, rgba(20,184,166,0.24), transparent 8%, transparent 92%, rgba(5,150,105,0.18))",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(15,23,42,0.45),transparent_58%)]" />
      </div>

      {/* Fond Mini-jeux — orangé */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: lobbyMainTab === "minigames" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_110%_75%_at_50%_-10%,rgba(180,83,9,0.28),transparent_52%),radial-gradient(ellipse_80%_60%_at_100%_40%,rgba(120,53,15,0.12),transparent_48%),linear-gradient(165deg,#120e06_0%,#1a1208_46%,#0a0804_100%)]" />
        <div className="absolute -top-28 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-amber-800/22 blur-[110px]" />
        <div className="absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-orange-900/14 blur-[90px]" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-amber-950/30 blur-[110px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(251,191,36,0.22) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      {/* Fond Blackjack — bordeaux / rose / ardoise */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: lobbyMainTab === "blackjack" ? 1 : 0 }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,rgba(190,24,93,0.22),transparent_52%),radial-gradient(ellipse_80%_55%_at_100%_40%,rgba(30,10,24,0.85),transparent_50%),linear-gradient(165deg,#1a0a12_0%,#120810_45%,#080406_100%)]" />
        <div className="absolute -top-28 left-1/3 h-[34rem] w-[34rem] rounded-full bg-rose-600/14 blur-[110px]" />
        <div className="absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-fuchsia-900/20 blur-[95px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-rose-950/40 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(251,113,133,0.4) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />
      </div>

      <div className="relative z-10 w-full min-w-0">

        {/* HEADER — min-height fixe pour éviter saut de layout au changement d’onglet */}
        <div className="mb-10 flex min-h-[5.25rem] w-full flex-col items-center justify-between gap-4 overflow-visible sm:min-h-[5.75rem] sm:flex-row sm:gap-6">

          {/* Côté Gauche (Logo + Titre) */}
          <div
            ref={tourRefHeader}
            className="flex min-h-[4.75rem] w-full shrink-0 items-center gap-3 sm:min-h-[5rem] sm:gap-4 sm:w-auto sm:justify-start md:min-h-[5.25rem]"
          >
            <img
              src={lobbyHeaderIcon}
              alt="Quantum Bluff"
              className="h-10 w-10 shrink-0 rounded-xl object-contain sm:h-12 sm:w-12 md:h-16 md:w-16"
            />
            <div className="flex-1 min-w-0">
              <h1
                className={`min-h-[2.25rem] truncate text-2xl font-bold leading-tight transition-[background-image,color] duration-300 md:min-h-[2.75rem] md:text-4xl ${
                  lobbyMainTab === "poker"
                    ? "bg-gradient-to-r from-slate-100 via-blue-200 to-cyan-200 bg-clip-text text-transparent"
                    : lobbyMainTab === "belote"
                      ? "bg-gradient-to-r from-slate-100 via-emerald-200 to-teal-200 bg-clip-text text-transparent"
                      : lobbyMainTab === "minigames"
                        ? "bg-gradient-to-r from-slate-100 via-amber-200 to-orange-200 bg-clip-text text-transparent"
                        : "bg-gradient-to-r from-rose-200 via-fuchsia-200 to-slate-200 bg-clip-text text-transparent"
                }`}
              >
                {t('lobby.title')}
              </h1>
              {/* Slogan : juste sous le titre (visible sur >=sm).
               * Point final retire ici uniquement pour un rendu en-tete plus aere.
               * min-height réserve toujours la ligne même si la couleur dépend peu du tab */}
              <p className="mt-0.5 hidden min-h-[1.125rem] truncate text-[0.7rem] font-light italic tracking-[0.16em] text-cyan-200/70 opacity-95 sm:block md:text-xs md:tracking-[0.18em]">
                {t('app.slogan').replace(/[.\u06D4\u3002]+$/u, '')}
              </p>
            </div>
          </div>

          {/* Côté Droit : pleine largeur sur mobile (bleed sur px page), ni débordement ni bande inutile */}
          <div
            ref={tourRefTopBar}
            className="flex min-h-11 w-full min-w-0 max-w-full flex-nowrap items-center overflow-visible py-1 max-sm:box-border max-sm:-mx-2 max-sm:w-[calc(100%+1rem)] max-sm:max-w-none max-sm:self-stretch max-sm:px-2 sm:min-h-12 sm:min-w-0 sm:flex-1 sm:justify-end md:min-h-14"
          >
            {menuContent}
          </div>
        </div>

        {blockedRoomWarning && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
            <div className="w-full max-w-md rounded-2xl border border-amber-300/20 bg-slate-950/90 p-6 shadow-2xl shadow-black/50">
              <div className="mb-4 flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-amber-300/25 bg-amber-950/50">
                  <AlertTriangle className="h-6 w-6 text-amber-200" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t("lobby.blockedRoomWarningTitle")}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {t("lobby.blockedRoomWarningBody", {
                      names: blockedRoomWarning.names.join(", "),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setBlockedRoomWarning(null)}
                  className="rounded-full border border-white/10 bg-white/[0.055] px-4 py-2.5 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const action = blockedRoomWarning.onContinue;
                    setBlockedRoomWarning(null);
                    action();
                  }}
                  className="rounded-full border border-amber-300/20 bg-amber-700 px-4 py-2.5 font-semibold text-white transition hover:bg-amber-600"
                >
                  {t("lobby.blockedRoomWarningContinue")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Créer un serveur - FIX MOBILE SCROLL.
         * Backdrop flou + assombri pour focus visuel sur le panneau. */}
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-start md:items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowCreateModal(false)}>
            <div className="my-auto mx-2 w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">{t('lobby.createServerTitle')}</h3>
                <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-1" aria-label={t('common.close')}>
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <label htmlFor="lobby-create-room-name" className="mb-2 block text-sm font-medium text-slate-300">
                  {t("lobby.createRoomNameLabel")}
                </label>
                <input
                  id="lobby-create-room-name"
                  type="text"
                  maxLength={80}
                  value={createRoomName}
                  onChange={(e) => setCreateRoomName(e.target.value)}
                  placeholder={t("lobby.createRoomNamePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30"
                  autoComplete="off"
                />
                <p className="mt-2 text-xs text-slate-500">{t("lobby.createRoomNameHint")}</p>
              </div>

              {/* Visibility toggle */}
              <div className="mb-6">
                <label className="text-slate-300 text-sm font-medium block mb-3">{t('lobby.visibility')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PUBLIC')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                      createVisibility === 'PUBLIC'
                        ? 'bg-green-600/20 border-green-500 text-green-400'
                        : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20'
                    }`}
                    aria-label={t('lobby.public')}
                  >
                    <Globe className="w-5 h-5" />
                    {t('lobby.public')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateVisibility('PRIVATE')}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                      createVisibility === 'PRIVATE'
                        ? 'bg-red-600/20 border-red-400/80 text-red-200 shadow-[0_0_24px_rgba(248,113,113,0.18)]'
                        : 'border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20'
                    }`}
                    aria-label={t('lobby.private')}
                  >
                    <Lock className="w-5 h-5" />
                    {t('lobby.private')}
                  </button>
                </div>
                {createVisibility && (
                  <p className="text-xs text-slate-500 mt-2">
                    {createVisibility === 'PUBLIC' ? t('lobby.publicDesc') : t('lobby.privateDesc')}
                  </p>
                )}
              </div>

              {/* Mode turbo */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setCreateTurbo((v) => !v)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                    createTurbo
                      ? "border-yellow-300/45 bg-yellow-500/12 text-yellow-100 shadow-[0_0_24px_rgba(250,204,21,0.16)]"
                      : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                  }`}
                  aria-label={t("lobby.turboMode")}
                >
                  <span className="flex items-center gap-2 font-semibold">
                    <Zap className={`h-5 w-5 shrink-0 ${createTurbo ? "text-yellow-300" : "text-slate-400"}`} />
                    {t("lobby.turboMode")}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase ${createTurbo ? "text-yellow-200" : "text-slate-500"}`}
                  >
                    {createTurbo ? t("lobby.turboOn") : t("lobby.turboOff")}
                  </span>
                </button>
                <p className="mt-2 text-xs text-slate-500">{t("lobby.turboModeHint")}</p>
              </div>

              {/* Max players */}
              <div className="mb-6">
                <label className="text-slate-300 text-sm font-medium block mb-3">
                  {t('lobby.maxPlayersLabel')} : <span className="text-white font-bold">{createMaxPlayers ?? "-"}</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCreateMaxPlayers(p => Math.max(2, (p ?? 2) - 1))}
                    disabled={createMaxPlayers == null || createMaxPlayers <= 2}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] font-bold text-white transition hover:bg-white/[0.08] disabled:bg-white/[0.02] disabled:text-slate-600"
                    aria-label={t('common.decrease')}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 flex gap-1.5">
                    {[2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setCreateMaxPlayers(n)}
                        className={`flex-1 py-2 rounded-lg font-bold transition-all ${
                          createMaxPlayers === n
                            ? 'border border-blue-200/45 bg-blue-950/70 text-blue-100 shadow-[0_0_22px_rgba(96,165,250,0.18)]'
                            : 'bg-white/[0.045] text-slate-300 hover:bg-white/[0.08]'
                        }`}
                        aria-label={`${n} ${t('lobby.players')}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateMaxPlayers(p => Math.min(5, (p ?? 2) + 1))}
                    disabled={createMaxPlayers == null || createMaxPlayers >= 5}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.045] font-bold text-white transition hover:bg-white/[0.08] disabled:bg-white/[0.02] disabled:text-slate-600"
                    aria-label={t('common.increase')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">{t("lobby.createServerQuickTip")}</p>
              </div>

              {/* Voir plus — options avancées */}
              <button
                type="button"
                onClick={() => setShowCreateAdvanced(v => !v)}
                className="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 text-sm font-medium py-2 mb-2 transition-colors"
                aria-label={showCreateAdvanced ? t('lobby.hideOptions') : t('lobby.seeMore')}
              >
                <Settings2 className="w-4 h-4" />
                <span>{showCreateAdvanced ? t('lobby.hideOptions') : t('lobby.seeMore')}</span>
                {showCreateAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence initial={false}>
                {showCreateAdvanced && (
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
                      className="space-y-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-md"
                    >
                      <div>
                        <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.smallBlind')}</label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {[5, 10, 25].map((v) => (
                            <button
                              key={`sb-${v}`}
                              type="button"
                              onClick={() => setCreateSmallBlind(v)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                                createSmallBlind === v
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              SB {v}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={smallBlindField.inputValue}
                          onChange={smallBlindField.handleChange}
                          onFocus={smallBlindField.handleFocus}
                          onBlur={smallBlindField.handleBlur}
                          className={`w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 text-sm text-white [appearance:textfield] backdrop-blur-md [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${smallBlindField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                          aria-label={t('lobby.smallBlind')}
                          aria-invalid={smallBlindField.isInvalid}
                        />
                      </div>
                      <div>
                        <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.minRaise')}</label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {[10, 20, 50].map((v) => (
                            <button
                              key={`bb-${v}`}
                              type="button"
                              onClick={() => setCreateBigBlind(v)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                                createBigBlind === v
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              BB {v}
                            </button>
                          ))}
                        </div>
                        <input
                          type="number"
                          min={1}
                          max={10000}
                          value={bigBlindField.inputValue}
                          onChange={bigBlindField.handleChange}
                          onFocus={bigBlindField.handleFocus}
                          onBlur={bigBlindField.handleBlur}
                          className={`w-full rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 text-sm text-white [appearance:textfield] backdrop-blur-md [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${bigBlindField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                          aria-label={t('lobby.minRaise')}
                          aria-invalid={bigBlindField.isInvalid}
                        />
                        <p className="text-slate-500 text-xs mt-1">{t('lobby.minRaiseHint')}</p>
                      </div>
                      <div>
                        <label className="text-slate-300 text-sm font-medium block mb-2">{t('lobby.minBalance')}</label>
                        <div className="mb-2 flex flex-wrap gap-2">
                          {[100, 500, 1000].map((v) => (
                            <button
                              key={`mb-${v}`}
                              type="button"
                              onClick={() => setCreateMinBalance(v)}
                              className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                                createMinBalance === v
                                  ? 'bg-blue-700 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={1000000}
                            step={100}
                            value={minBalanceField.inputValue}
                            onChange={minBalanceField.handleChange}
                            onFocus={minBalanceField.handleFocus}
                            onBlur={minBalanceField.handleBlur}
                            className={`flex-1 rounded-lg border border-white/10 bg-white/[0.055] px-4 py-2 text-sm text-white [appearance:textfield] backdrop-blur-md [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${
                              (minBalanceField.isInvalid || isMinBalanceInvalid) ? NUMBER_FIELD_INVALID_CLASS : ""
                            }`}
                            aria-label={t('lobby.minBalance')}
                            aria-invalid={minBalanceField.isInvalid || isMinBalanceInvalid}
                          />
                          {isMinBalanceInvalid && (
                            <div className="relative flex items-center gap-1">
                              <XCircle className="w-6 h-6 text-red-500 shrink-0" aria-hidden />
                              <div className="absolute left-full top-1/2 z-10 ml-1 -translate-y-1/2 whitespace-nowrap rounded-lg border border-red-500 bg-slate-950/90 px-3 py-2 text-sm font-medium text-red-400 shadow-xl backdrop-blur-md">
                                {t('lobby.minAmount100')}
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-slate-500 text-xs mt-1">{t('lobby.minBalanceHint')}</p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Validate */}
              <button
                type="button"
                onClick={handleCreateServer}
                disabled={!canCreateServer}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-lg font-bold transition md:py-4 ${
                  canCreateServer
                    ? "border border-blue-200/45 bg-blue-950/80 text-white shadow-[0_0_34px_rgba(96,165,250,0.22)] hover:border-cyan-200/55 hover:bg-blue-900/85"
                    : "cursor-not-allowed border border-white/10 bg-white/[0.035] text-slate-500"
                }`}
                aria-label={t('lobby.validateCreate')}
              >
                {creating && <Loader2 className="w-5 h-5 animate-spin" />}
                {t('lobby.validateCreate')}
              </button>
            </div>
          </div>
        )}

        {/* Modal "Creer un tournoi" : compact (nom + rapide/normale), puis etendu (champs).
         * Backdrop flou + assombri pour focus visuel sur le panneau. */}
        {showTournamentCreate && (
          <div
            className="fixed inset-0 z-[100] flex items-start md:items-center justify-center overflow-y-auto bg-slate-950/65 p-4 backdrop-blur-md animate-in fade-in duration-200"
            onClick={closeTournamentModal}
          >
            <div
              className={`my-auto mx-2 w-full ${tournamentExpanded ? "max-w-xl" : "max-w-md"} rounded-2xl border border-amber-300/20 bg-slate-950/75 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl transition-all`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-300" />
                  {t("tournament.arena.modalTitle")}
                </h3>
                <button
                  type="button"
                  onClick={closeTournamentModal}
                  className="text-slate-400 hover:text-white p-1 disabled:opacity-50"
                  disabled={tournamentCreating}
                  aria-label={t("common.close")}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Nom du tournoi (commun aux 2 modes) */}
              <div className="mb-5">
                <label htmlFor="lobby-tournament-name" className="mb-2 block text-sm font-medium text-slate-300">
                  {t("tournament.arena.labelName")}
                </label>
                <input
                  id="lobby-tournament-name"
                  type="text"
                  maxLength={80}
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  placeholder={t("tournament.arena.namePlaceholder")}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white placeholder:text-slate-500 outline-none transition focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30"
                  autoComplete="off"
                />
              </div>

              {/* Mode compact : 2 grands boutons. Cliquer "Normale" -> revele les champs. */}
              {!tournamentExpanded ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleQuickCreateTournament}
                    disabled={tournamentCreating}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-200/45 bg-amber-700/80 py-3 font-bold text-white shadow-[0_0_28px_rgba(251,191,36,0.18)] transition hover:border-amber-200/60 hover:bg-amber-600/90 disabled:opacity-50"
                    aria-label={t("tournament.arena.quickCreate")}
                  >
                    {tournamentCreating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    {t("tournament.arena.quickCreate")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTournamentCreateError(null);
                      setTournamentExpanded(true);
                    }}
                    disabled={tournamentCreating}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] py-3 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
                    aria-label={t("tournament.arena.modalTitle")}
                  >
                    {t("tournament.arena.modalTitle")}
                  </button>
                </div>
              ) : (
                <>
                  {/* Visibilite */}
                  <div className="mb-5">
                    <label className="text-slate-300 text-sm font-medium block mb-3">
                      {t("tournament.arena.labelVisibility")}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setTournamentVisibility("PUBLIC")}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                          tournamentVisibility === "PUBLIC"
                            ? "bg-green-600/20 border-green-500 text-green-400"
                            : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                        }`}
                      >
                        <Globe className="w-5 h-5" />
                        {t("tournament.arena.visibilityPublic")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setTournamentVisibility("PRIVATE")}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all border-2 ${
                          tournamentVisibility === "PRIVATE"
                            ? "bg-red-600/20 border-red-400/80 text-red-200"
                            : "border-white/10 bg-white/[0.045] text-slate-300 hover:border-white/20"
                        }`}
                      >
                        <Lock className="w-5 h-5" />
                        {t("tournament.arena.visibilityPrivate")}
                      </button>
                    </div>
                    {tournamentVisibility === "PRIVATE" && (
                      <input
                        type="text"
                        value={tournamentJoinCode}
                        onChange={(e) => setTournamentJoinCode(e.target.value)}
                        placeholder={t("tournament.arena.labelJoinCode")}
                        className="mt-3 w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white placeholder:text-slate-500 outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30"
                        autoComplete="off"
                        maxLength={32}
                      />
                    )}
                  </div>

                  {/* Joueurs max + stack */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label
                        htmlFor="lobby-tournament-maxplayers"
                        className="text-slate-300 text-sm font-medium block mb-2"
                      >
                        {t("tournament.arena.labelMaxPlayers")} ({TOURNAMENT_MIN_PLAYERS}-{TOURNAMENT_MAX_PLAYERS})
                      </label>
                      <input
                        id="lobby-tournament-maxplayers"
                        type="number"
                        min={TOURNAMENT_MIN_PLAYERS}
                        max={TOURNAMENT_MAX_PLAYERS}
                        value={tournamentMaxPlayersField.inputValue}
                        onChange={tournamentMaxPlayersField.handleChange}
                        onFocus={tournamentMaxPlayersField.handleFocus}
                        onBlur={tournamentMaxPlayersField.handleBlur}
                        className={`w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30 ${tournamentMaxPlayersField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                        aria-invalid={tournamentMaxPlayersField.isInvalid}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lobby-tournament-stack"
                        className="text-slate-300 text-sm font-medium block mb-2"
                      >
                        {t("tournament.arena.labelStack")}
                      </label>
                      <input
                        id="lobby-tournament-stack"
                        type="number"
                        min={100}
                        max={100_000_000}
                        step={100}
                        value={tournamentStackField.inputValue}
                        onChange={tournamentStackField.handleChange}
                        onFocus={tournamentStackField.handleFocus}
                        onBlur={tournamentStackField.handleBlur}
                        className={`w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30 ${tournamentStackField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                        aria-invalid={tournamentStackField.isInvalid}
                      />
                    </div>
                  </div>

                  {/* Blinds */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                    <div>
                      <label
                        htmlFor="lobby-tournament-sb"
                        className="text-slate-300 text-sm font-medium block mb-2"
                      >
                        {t("tournament.arena.labelSmallBlind")}
                      </label>
                      <input
                        id="lobby-tournament-sb"
                        type="number"
                        min={1}
                        max={10_000_000}
                        value={tournamentSmallBlindField.inputValue}
                        onChange={tournamentSmallBlindField.handleChange}
                        onFocus={tournamentSmallBlindField.handleFocus}
                        onBlur={tournamentSmallBlindField.handleBlur}
                        className={`w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30 ${tournamentSmallBlindField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                        aria-invalid={tournamentSmallBlindField.isInvalid}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="lobby-tournament-bb"
                        className="text-slate-300 text-sm font-medium block mb-2"
                      >
                        {t("tournament.arena.labelBigBlind")}
                      </label>
                      <input
                        id="lobby-tournament-bb"
                        type="number"
                        min={1}
                        max={10_000_000}
                        value={tournamentBigBlindField.inputValue}
                        onChange={tournamentBigBlindField.handleChange}
                        onFocus={tournamentBigBlindField.handleFocus}
                        onBlur={tournamentBigBlindField.handleBlur}
                        className={`w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30 ${tournamentBigBlindField.isInvalid ? NUMBER_FIELD_INVALID_CLASS : ""}`}
                        aria-invalid={tournamentBigBlindField.isInvalid}
                      />
                    </div>
                  </div>

                  {/* Depart + presets */}
                  <div className="mb-5">
                    <label
                      htmlFor="lobby-tournament-start"
                      className="text-slate-300 text-sm font-medium block mb-2"
                    >
                      {t("tournament.arena.labelStart")}
                    </label>
                    <input
                      id="lobby-tournament-start"
                      type="datetime-local"
                      value={tournamentStartAtLocal}
                      onChange={(e) => setTournamentStartAtLocal(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-white outline-none focus:border-amber-300/50 focus:ring-1 focus:ring-amber-300/30"
                    />
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[1, 5, 15, 60].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setTournamentStartAtLocal(startAtLocalFromNowPlusMinutes(m))}
                          className="rounded-lg border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs text-slate-300 hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          {t("tournament.arena.plusMinutes", { minutes: m })}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTournamentExpanded(false);
                        setTournamentCreateError(null);
                      }}
                      disabled={tournamentCreating}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.045] py-3 font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
                    >
                      {t("tournament.arena.cancel")}
                    </button>
                    <button
                      type="button"
                      onClick={handleSubmitTournament}
                      disabled={tournamentCreating}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200/45 bg-amber-700/80 py-3 font-bold text-white shadow-[0_0_28px_rgba(251,191,36,0.18)] transition hover:border-amber-200/60 hover:bg-amber-600/90 disabled:opacity-50"
                    >
                      {tournamentCreating && <Loader2 className="w-5 h-5 animate-spin" />}
                      {tournamentCreating ? t("tournament.arena.submitting") : t("tournament.arena.submit")}
                    </button>
                  </div>
                </>
              )}

              {tournamentCreateError && (
                <p className="mt-3 text-sm text-red-300 text-center" role="alert">
                  {tournamentCreateError}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 🆕 FREE RECHARGE BUTTON */}
        <div className="mb-3 max-w-sm mx-auto empty:hidden lg:mb-2">
          <FreeRechargeButton
            key={rechargeKey}
            onClaimed={handleRechargeSuccess}
            showDetails={true}
          />
        </div>

        {/* MAIN GRID - IMPROVED GAP */}
        <div className="grid grid-cols-1 items-start gap-5 sm:gap-6 md:grid-cols-2 md:gap-6 lg:h-[calc(100dvh-9.75rem)] lg:grid-cols-[minmax(0,2.35fr)_minmax(19rem,0.82fr)] lg:items-stretch lg:gap-4 lg:overflow-hidden">
          {/* Colonne jeux : onglets au-dessus du contenu uniquement (pas au-dessus défis / amis) */}
          <div className="md:col-span-2 lg:col-span-1 space-y-6 lg:flex lg:min-h-0 lg:flex-col lg:space-y-0 lg:gap-4">
            <nav
              ref={lobbyTabsRef}
              className={`flex h-14 w-full shrink-0 items-stretch gap-1.5 overflow-x-auto rounded-2xl border p-1.5 scrollbar-hide shadow-2xl shadow-black/30 backdrop-blur-xl transition-[border-color,background-color] duration-300 md:h-[4.25rem] md:gap-2 md:p-2 ${
                lobbyMainTab === "poker"
                  ? "border-white/10 bg-slate-950/55"
                  : lobbyMainTab === "belote"
                    ? "border-white/10 bg-emerald-950/40"
                    : lobbyMainTab === "minigames"
                      ? "border-white/10 bg-orange-950/45"
                      : "border-white/10 bg-rose-950/45"
              }`}
              role="tablist"
              aria-label={t("lobby.tabListAria")}
            >
              <button
                type="button"
                role="tab"
                aria-selected={lobbyMainTab === "poker"}
                onClick={() => setMainTab("poker")}
                className={`relative flex h-full min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 py-1 text-center transition-[color,background-color,box-shadow,ring-color] duration-300 sm:gap-2.5 sm:px-3 ${
                  lobbyMainTab === "poker"
                    ? "bg-gradient-to-br from-blue-950/90 via-slate-900/80 to-slate-950/80 text-blue-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-blue-300/22"
                    : "text-slate-500 ring-1 ring-inset ring-transparent hover:bg-white/[0.06] hover:text-slate-300"
                }`}
              >
                <Spade
                  className={`h-5 w-5 shrink-0 ${lobbyMainTab === "poker" ? "text-blue-200 drop-shadow-[0_0_8px_rgba(59,130,246,0.35)]" : ""}`}
                  strokeWidth={2.2}
                  aria-hidden
                />
                <span className="truncate font-serif text-xs font-bold tracking-wide md:text-sm">
                  {t("lobby.tabPoker")}
                </span>
              </button>
              <div className="hidden w-px shrink-0 self-stretch bg-slate-600/40 md:block" aria-hidden />
              <button
                type="button"
                role="tab"
                aria-selected={lobbyMainTab === "blackjack"}
                onClick={() => setMainTab("blackjack")}
                className={`relative flex h-full min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 py-1 text-center transition-[color,background-color,box-shadow,ring-color] duration-300 sm:gap-2.5 sm:px-3 ${
                  lobbyMainTab === "blackjack"
                    ? "bg-gradient-to-br from-rose-900/75 via-rose-950/55 to-slate-950/80 text-rose-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-rose-300/22"
                    : "text-slate-500 ring-1 ring-inset ring-transparent hover:bg-white/[0.06] hover:text-slate-300"
                }`}
              >
                <Club
                  className={`h-5 w-5 shrink-0 ${lobbyMainTab === "blackjack" ? "text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.35)]" : ""}`}
                  strokeWidth={2.2}
                  aria-hidden
                />
                <span className="truncate font-serif text-xs font-bold tracking-wide md:text-sm">
                  {t("lobby.tabBlackjack")}
                </span>
              </button>
              <div className="hidden w-px shrink-0 self-stretch bg-slate-600/40 md:block" aria-hidden />
              <button
                type="button"
                role="tab"
                aria-selected={lobbyMainTab === "belote"}
                onClick={() => setMainTab("belote")}
                className={`relative flex h-full min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 py-1 text-center transition-[color,background-color,box-shadow,ring-color] duration-300 sm:gap-2.5 sm:px-3 ${
                  lobbyMainTab === "belote"
                    ? "bg-gradient-to-br from-emerald-800/45 via-emerald-950/45 to-slate-950/80 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-emerald-300/22"
                    : "text-slate-500 ring-1 ring-inset ring-transparent hover:bg-white/[0.06] hover:text-slate-300"
                }`}
              >
                <Diamond
                  className={`h-5 w-5 shrink-0 ${lobbyMainTab === "belote" ? "text-emerald-200 drop-shadow-[0_0_10px_rgba(16,185,129,0.35)]" : ""}`}
                  strokeWidth={2.2}
                  aria-hidden
                />
                <span className="truncate font-serif text-xs font-bold tracking-wide md:text-sm">
                  {t("lobby.tabBelote")}
                </span>
              </button>
              <div className="hidden w-px shrink-0 self-stretch bg-slate-600/40 md:block" aria-hidden />
              <button
                type="button"
                role="tab"
                aria-selected={lobbyMainTab === "minigames"}
                onClick={() => setMainTab("minigames")}
                className={`relative flex h-full min-w-0 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 py-1 text-center transition-[color,background-color,box-shadow,ring-color] duration-300 sm:gap-2.5 sm:px-3 ${
                  lobbyMainTab === "minigames"
                    ? "bg-gradient-to-br from-amber-900/55 via-orange-950/50 to-slate-950/80 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.13),0_8px_24px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-amber-300/22"
                    : "text-slate-500 ring-1 ring-inset ring-transparent hover:bg-white/[0.06] hover:text-slate-300"
                }`}
              >
                <Sparkles
                  className={`h-5 w-5 shrink-0 ${lobbyMainTab === "minigames" ? "text-amber-200 drop-shadow-[0_0_10px_rgba(245,158,11,0.35)]" : ""}`}
                  strokeWidth={2.2}
                  aria-hidden
                />
                <span className="truncate font-serif text-xs font-bold tracking-wide md:text-sm">
                  {t("lobby.tabMinigames")}
                </span>
              </button>
            </nav>

          {lobbyMainTab === "poker" && (
            <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0 lg:gap-4">
              {/* Section Jouer contre Bot */}
              <div ref={lobbyMainTab === "poker" ? tourRefBot : undefined} className="rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl lg:shrink-0">
                <h2 className="text-xl text-white font-bold flex items-center gap-3 mb-3 xl:text-2xl">
                  <Bot className={`w-7 h-7 xl:h-8 xl:w-8 ${cardGameAccent.botIcon}`} />
                  {t('lobby.playBot')}
                </h2>

                <button
                  onClick={handlePlayBot}
                  className={`w-full rounded-xl border py-3 font-bold text-white shadow-lg shadow-black/20 transition md:py-4 ${cardGameAccent.primaryBtn}`}
                  aria-label={t('lobby.configureAndPlay')}
                >
                  {t('lobby.configureAndPlay')}
                </button>
              </div>

              {/* Grille : multi-joueurs (+ tournois uniquement sur l’onglet poker). */}
              <div
                className={`grid grid-cols-1 gap-5 sm:gap-6 lg:min-h-0 lg:flex-1 lg:gap-4 ${
                  lobbyMainTab === "poker" ? "md:grid-cols-2" : ""
                }`}
              >

              {/* Section Serveur Multi-joueurs */}
              <div ref={lobbyMainTab === "poker" ? tourRefMultiplayer : undefined} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
                <h2 className="text-xl text-white font-bold flex items-center gap-3 mb-3 xl:text-2xl">
                  <Server className={`w-7 h-7 xl:h-8 xl:w-8 ${cardGameAccent.serverIcon}`} />
                  {t('lobby.multiplayerServers')}
                </h2>

                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <button
                    onClick={openCreateModal}
                    disabled={!userId || creating}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 font-bold text-white shadow-lg shadow-black/20 transition disabled:cursor-not-allowed disabled:bg-slate-700/70 md:py-4 ${cardGameAccent.primaryBtn}`}
                    aria-label={t('lobby.createNewServer')}
                  >
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                    {creating ? t('lobby.creating') : t('lobby.createNewServer')}
                  </button>

                  {/* Salles d'attente */}
                  <div ref={lobbyMainTab === "poker" ? tourRefWaiting : undefined} className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.waitingRooms')}</p>
                    {roomsLoading && roomsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                      </p>
                    ) : roomsError ? (
                      <p className="text-red-400 text-center py-2 text-sm">{roomsError}</p>
                    ) : roomsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2">{t('lobby.noServersAvailable')}</p>
                    ) : (
                      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                        {roomsMemo.map((room) => {
                          const isHost = userId && room.hostId === userId;
                          const isFull = room.playerCount >= room.maxPlayers;
                          const isPrivate = room.visibility === 'PRIVATE';
                          const hasEnoughChips = !room.minBalance || room.minBalance === 0 || balance >= room.minBalance;
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
                                {room.turbo ? (
                                  <span className="flex shrink-0 items-center gap-0.5 rounded border border-orange-300/25 bg-orange-600/15 px-1 py-px text-[9px] font-semibold text-orange-200">
                                    <Zap className="h-2 w-2" aria-hidden />
                                    {t("lobby.turboBadge")}
                                  </span>
                                ) : null}
                                <span className="shrink-0 text-[10px] text-gray-400">
                                  {t('lobby.playersCount', { count: room.playerCount, max: room.maxPlayers })}
                                </span>
                                {room.minBalance && room.minBalance > 0 && (
                                  <span className={`shrink-0 text-[10px] ${cardGameAccent.minBalance}`}>
                                    Min. {room.minBalance.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap">
                                {isPrivate ? (
                                  <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-purple-500/35 bg-purple-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-purple-200 sm:w-28 sm:text-[10px]">
                                    <Lock className="h-2.5 w-2.5" aria-hidden />
                                    {t('lobby.private')}
                                  </span>
                                ) : (
                                  <span className="flex min-h-7 w-24 shrink-0 items-center justify-center gap-0.5 rounded border border-green-500/35 bg-green-600/25 px-1 py-1 text-[9px] font-semibold leading-none text-green-200 sm:w-28 sm:text-[10px]">
                                    <Globe className="h-2.5 w-2.5" aria-hidden />
                                    {t('lobby.public')}
                                  </span>
                                )}
                              {isFull ? (
                                <span className="flex min-h-7 w-24 cursor-not-allowed items-center justify-center rounded bg-slate-700 px-1 py-1 text-[9px] font-semibold text-gray-500 sm:w-28 sm:text-[10px]">
                                  {t('lobby.roomFull')}
                                </span>
                              ) : isPrivate && !isHost ? (
                                <button
                                  onClick={() => openBlockedRoomWarning(room.blockedPlayers, () => void handleRequestJoin(room.id))}
                                  disabled={requestingRoom === room.id}
                                  className="flex min-h-7 w-24 max-w-full items-center justify-center gap-0.5 rounded bg-purple-600 px-1 py-1 text-[9px] font-semibold text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:bg-purple-800 sm:w-28 sm:text-[10px]"
                                  aria-label={t('lobby.requestJoin')}
                                >
                                  {requestingRoom === room.id ? <Loader2 className="h-2.5 w-2.5 shrink-0 animate-spin" /> : <Lock className="h-2.5 w-2.5 shrink-0" />}
                                  {t('lobby.requestJoin')}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleJoinRoom(room.id, room)}
                                  disabled={!hasEnoughChips}
                                  className={`min-h-7 w-24 shrink-0 rounded px-1 py-1 text-[9px] font-semibold text-white transition sm:w-28 sm:text-[10px] ${
                                    hasEnoughChips
                                      ? cardGameAccent.joinBtn
                                      : 'cursor-not-allowed bg-slate-600 opacity-50'
                                  }`}
                                  aria-label={t('lobby.join')}
                                  title={!hasEnoughChips ? `Il faut au moins ${room.minBalance} jetons` : undefined}
                                >
                                  {!hasEnoughChips ? `Min. ${room.minBalance}` : t('lobby.join')}
                                </button>
                              )}
                            </div>
                          </li>
                        )})}
                      </ul>
                    )}
                  </div>

                  {/* Parties en cours */}
                  <div ref={lobbyMainTab === "poker" ? tourRefGames : undefined} className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.gamesInProgress')}</p>
                    {gamesLoading && gamesMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                      </p>
                    ) : gamesMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2">{t('lobby.noServersAvailable')}</p>
                    ) : (
                      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                        {gamesMemo.map((g) => (
                          <li
                            key={g.gameId}
                            className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                          >
                            <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-1.5 sm:gap-x-2">
                              <p className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-white sm:text-[15px]">{g.roomName}</p>
                              <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 sm:gap-1.5">
                              {g.canJoin && (
                                <button
                                  onClick={() => handleJoinGame(g)}
                                  className={`shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold text-white transition sm:px-2 sm:text-[11px] ${cardGameAccent.joinBtn}`}
                                  aria-label={t('lobby.join')}
                                >
                                  {t('lobby.join')}
                                </button>
                              )}
                              <button
                                onClick={() => handleSpectateGame(g)}
                                className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-700/80 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-600/90 sm:gap-1 sm:px-2 sm:text-[11px]"
                                aria-label={t('lobby.spectate')}
                              >
                                <Eye className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                                <span className="whitespace-nowrap">{t('lobby.spectate')}</span>
                              </button>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">
                              {t('lobby.playersCount', { count: g.playerCount, max: g.maxPlayers })} · {g.phase}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {lobbyMainTab === "poker" && (
              <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-amber-400/15 bg-amber-950/30 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
                <h2 className="text-xl text-white font-bold flex items-center gap-3 mb-3 xl:text-2xl">
                  <Trophy className="w-7 h-7 text-amber-200 xl:h-8 xl:w-8" />
                  {t('lobby.tournamentBlockTitle')}
                </h2>

                <div className="flex min-h-0 flex-1 flex-col gap-3">
                  <button
                    onClick={openTournamentModal}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-900/70 py-3 font-bold text-white shadow-lg shadow-black/20 transition hover:border-amber-200/40 hover:bg-amber-800/80 md:py-4"
                    aria-label={t('tournament.arena.create')}
                  >
                    <Trophy className="w-5 h-5" />
                    {t('tournament.arena.create')}
                  </button>

                  {/* Tournois en attente d'inscription */}
                  <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.tournamentWaiting')}</p>
                    {tournamentsLoading && openTournamentsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                      </p>
                    ) : tournamentsError ? (
                      <p className="text-red-400 text-center py-2 text-sm">{tournamentsError}</p>
                    ) : openTournamentsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2">{t('lobby.noTournamentsAvailable')}</p>
                    ) : (
                      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                        {openTournamentsMemo.map((tour) => (
                          <li
                            key={tour.id}
                            className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                          >
                            <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-1.5 sm:gap-x-2">
                              <p className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-white sm:text-[15px]">{tour.name}</p>
                              <button
                                onClick={() => navigate(`/tournaments/${tour.id}`)}
                                className="shrink-0 rounded-md bg-amber-700 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-600 sm:px-2 sm:text-[11px]"
                                aria-label={t('lobby.join')}
                              >
                                {t('lobby.join')}
                              </button>
                            </div>
                            <p className="text-xs text-gray-400">
                              {t('lobby.playersCount', { count: tour._count.players, max: tour.maxPlayers })}
                              {' · '}
                              {t('lobby.tournamentBlinds', { small: tour.blindSmall, big: tour.blindBig })}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Tournois en cours (spectate possible) */}
                  <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">
                    <p className="text-gray-300 text-sm font-semibold mb-2">{t('lobby.tournamentInProgress')}</p>
                    {tournamentsLoading && liveTournamentsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> {t('common.loading')}
                      </p>
                    ) : liveTournamentsMemo.length === 0 ? (
                      <p className="text-gray-500 text-center py-2">{t('lobby.noTournamentsAvailable')}</p>
                    ) : (
                      <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
                        {liveTournamentsMemo.map((tour) => {
                          const firstTable = tour.tables[0];
                          return (
                            <li
                              key={tour.tournamentId}
                              className="flex flex-col gap-1 rounded-md border border-white/10 bg-white/[0.055] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md"
                            >
                              <div className="flex w-full min-w-0 flex-nowrap items-center gap-x-1.5 sm:gap-x-2">
                                <p className="min-w-0 flex-1 truncate text-left text-sm font-medium leading-snug text-white sm:text-[15px]">{tour.name}</p>
                                <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1 sm:gap-1.5">
                                  <button
                                    onClick={() => navigate(`/tournaments/${tour.tournamentId}`)}
                                    className="shrink-0 rounded-md bg-amber-700 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-amber-600 sm:px-2 sm:text-[11px]"
                                    aria-label={t('lobby.join')}
                                  >
                                    {t('lobby.join')}
                                  </button>
                                  {firstTable ? (
                                    <button
                                      onClick={() =>
                                        navigate(
                                          `/game?gameId=${encodeURIComponent(firstTable.gameId)}&spectate=1&tournamentId=${encodeURIComponent(tour.tournamentId)}`,
                                        )
                                      }
                                      className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-700/80 px-1.5 py-1 text-[10px] font-semibold text-white transition hover:bg-slate-600/90 sm:gap-1 sm:px-2 sm:text-[11px]"
                                      aria-label={t('lobby.spectate')}
                                    >
                                      <Eye className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" />
                                      <span className="whitespace-nowrap">{t('lobby.spectate')}</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                              <p className="text-xs text-gray-400">
                                {t('lobby.tournamentTables', { count: tour.tables.length })}
                              </p>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
              )}

              </div>{/* /grid serveur (+ tournois si poker) */}
            </div>
          )}

          {lobbyMainTab === "belote" && (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <LobbyBeloteSection active />
            </div>
          )}

          {/* Onglet Mini-jeux - CONDITIONAL RENDER */}
          {lobbyMainTab === "minigames" && (
            <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto pr-0.5 scrollbar-hide sm:pr-1">
              <div ref={tourRefMinigames} className="flex w-full flex-col gap-5">
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
                <h2 className="mb-3 flex items-center gap-3 text-2xl font-bold text-white">
                  <Disc className="h-8 w-8 shrink-0 text-amber-300" strokeWidth={2.2} aria-hidden />
                  {t("minigames.rouletteTitle")}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">
                  {t("minigames.rouletteBlurb")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/minigames?game=roulette")}
                  className="w-full rounded-xl border border-amber-300/15 bg-amber-950/70 py-3 text-base font-bold text-white transition hover:border-amber-200/25 hover:bg-amber-900/80"
                  aria-label={t("minigames.play")}
                >
                  {t("minigames.play")}
                </button>
                </div>
                <div className="flex w-full flex-col rounded-2xl border border-white/10 bg-white/[0.055] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
                <h2 className="mb-3 flex items-center gap-3 text-2xl font-bold text-white">
                  <SquareStack className="h-8 w-8 shrink-0 text-orange-300" strokeWidth={2.2} aria-hidden />
                  {t("minigames.slotTitle")}
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-gray-400">
                  {t("minigames.slotBlurb")}
                </p>
                <button
                  type="button"
                  onClick={() => navigate("/minigames?game=slots")}
                  className="w-full rounded-xl border border-orange-300/15 bg-orange-950/70 py-3 text-base font-bold text-white transition hover:border-orange-200/25 hover:bg-orange-900/80"
                  aria-label={t("minigames.play")}
                >
                  {t("minigames.play")}
                </button>
                </div>
              </div>
            </div>
          )}

          {/* Onglet Blackjack - CONDITIONAL RENDER */}
          {lobbyMainTab === "blackjack" && (
            <div
              ref={tourRefBlackjack}
              className="min-h-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto pb-4 pr-0.5 scrollbar-hide sm:pr-1 lg:flex lg:flex-col lg:gap-6 lg:space-y-0"
              style={lobbyAlignmentStyle}
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_22px_60px_rgba(0,0,0,0.30)] backdrop-blur-xl">
                <h2 className="mb-4 flex items-center gap-3 text-2xl font-bold text-white">
                  <Club className="h-8 w-8 text-rose-300" aria-hidden />
                  {t("lobby.blackjackTitle")}
                </h2>
                <p className="mb-4 max-w-xl text-sm leading-relaxed text-gray-400">{t("lobby.blackjackIntro")}</p>
                <button
                  type="button"
                  onClick={() => navigate("/blackjack")}
                  className="w-full rounded-xl border border-rose-300/15 bg-rose-950/70 py-3 md:py-4 font-bold text-white transition hover:border-rose-200/25 hover:bg-rose-900/80"
                  aria-label={t("lobby.blackjackPlay")}
                >
                  {t("lobby.blackjackPlay")}
                </button>
                <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">{t("lobby.blackjackSoloHint")}</p>
              </div>
              <div>
                <LobbyBlackjackMultiSection active={lobbyMainTab === "blackjack"} />
              </div>
            </div>
          )}

          </div>

          {/* Colonne de droite - Friends (toujours visible mais conditionnel render içinde değil çünkü her tab'da gösteriliyor) */}
          <div
            className="md:col-span-2 lg:col-span-1 space-y-5 self-start max-lg:pt-6 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:self-stretch lg:space-y-0 lg:gap-4 lg:overflow-hidden lg:pt-0 lg:z-10"
          >
            <div ref={tourRefDaily} className="lg:shrink-0 lg:overflow-hidden">
              <DailyChallenges />
            </div>
            <div ref={tourRefFriends} className="lg:min-h-0 lg:flex-1">
              <FriendsList />
            </div>
          </div>

        </div>

      </div>

      {/* Tutoriel interactif — bouton fixe bas-gauche */}
      <button
        type="button"
        onClick={() => {
          if (lobbyTourOpen) handleLobbyTourClose();
          else {
            setMainTab("poker");
            setLobbyTourStep(0);
            setLobbyTourOpen(true);
          }
        }}
        className="fixed left-5 z-[260] flex h-12 w-12 items-center justify-center rounded-full border-2 border-purple-400/90 bg-purple-950/95 text-lg font-bold text-purple-100 shadow-xl backdrop-blur-sm transition hover:border-purple-300 hover:bg-purple-800/95 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))]"
        aria-label={t('lobby.help.openAria')}
        title={t('lobby.help.openAria')}
      >
        <span aria-hidden className="select-none">?</span>
      </button>

      <LobbyInteractiveTour
        open={lobbyTourOpen}
        onClose={handleLobbyTourClose}
        step={lobbyTourStep}
        onStepChange={setLobbyTourStep}
        refs={lobbyTourRefs}
        setMainTab={setMainTab}
        mainTabKey={lobbyMainTab}
        finishLabelOverride={t("lobby.help.finishToTutorial")}
        onFinish={() => navigate("/tutorial/game")}
      />

    </div>
  );
}
