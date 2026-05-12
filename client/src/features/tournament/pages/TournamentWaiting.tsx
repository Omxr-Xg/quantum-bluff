import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { useTournamentSocket } from "../hooks/useTournamentSocket";
import { ZipRushMiniGame } from "../components/ZipRushMiniGame";
import {
  fetchTournament,
  fetchTournamentRoundReady,
  setTournamentRoundReady,
  type TournamentRoundReadyState,
} from "../services/tournamentApi";
import { getAuthItem } from "../../../utils/authStorage";

/** Délai Zip uniquement pour le passage vers la table finale (`finalZip=1` depuis Game). */
const TOURNAMENT_FINAL_ZIP_MS = 5000;

type UsernameMap = Record<string, string>;

const emptyState: TournamentRoundReadyState = {
  open: false,
  roundNumber: null,
  deadline: null,
  surviving: [],
  readyUserIds: [],
  requiredCount: 0,
  allReady: false,
  isFinal: false,
};

export function TournamentWaiting() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextGameId = searchParams.get("nextGameId");
  const finalZip = searchParams.get("finalZip") === "1";

  const authUserId = getAuthItem("userId");

  const enteredAtRef = useRef(Date.now());
  const pendingAssignedNavRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [readyState, setReadyState] = useState<TournamentRoundReadyState>(emptyState);
  const [usernames, setUsernames] = useState<UsernameMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useLayoutEffect(() => {
    enteredAtRef.current = Date.now();
  }, [id, nextGameId, finalZip]);

  useEffect(() => {
    return () => {
      if (pendingAssignedNavRef.current) {
        clearTimeout(pendingAssignedNavRef.current);
        pendingAssignedNavRef.current = null;
      }
    };
  }, []);

  /* Fenêtre ready-check : on désactive la redirection automatique `finalZip`
   * tant que la fenêtre est ouverte (sinon on shortcut la décision du joueur). */
  useEffect(() => {
    if (!id || !nextGameId) return;
    if (readyState.open) return;
    if (finalZip) {
      const h = window.setTimeout(() => {
        const q = new URLSearchParams();
        q.set("gameId", nextGameId);
        q.set("tournamentId", id);
        navigate(`/game?${q.toString()}`, { replace: true });
      }, TOURNAMENT_FINAL_ZIP_MS);
      return () => window.clearTimeout(h);
    }
    const q = new URLSearchParams();
    q.set("gameId", nextGameId);
    q.set("tournamentId", id);
    navigate(`/game?${q.toString()}`, { replace: true });
  }, [id, nextGameId, finalZip, navigate, readyState.open]);

  const refreshReadyState = useCallback(async () => {
    if (!id) return;
    try {
      const s = await fetchTournamentRoundReady(id);
      setReadyState(s);
    } catch {
      /* ignore */
    }
  }, [id]);

  useEffect(() => {
    void refreshReadyState();
  }, [refreshReadyState]);

  /* Map userId -> username (pour la liste « Survivants ») : récupéré une fois,
   * puis fusionné au fil des mises à jour. */
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const detail = (await fetchTournament(id)) as {
          players?: Array<{
            userId?: string;
            user?: { id?: string; username?: string };
          }>;
        };
        if (cancelled) return;
        const map: UsernameMap = {};
        for (const p of detail.players ?? []) {
          const uid = p.userId ?? p.user?.id;
          if (uid && p.user?.username) map[uid] = p.user.username;
        }
        setUsernames((prev) => ({ ...map, ...prev }));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!readyState.open || !readyState.deadline) return;
    const handle = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, [readyState.open, readyState.deadline]);

  const onTableAssigned = useCallback(
    (p: { tournamentId: string; gameId: string; roundNumber: number }) => {
      if (!id) return;
      if (nextGameId) return;
      if (pendingAssignedNavRef.current) {
        clearTimeout(pendingAssignedNavRef.current);
        pendingAssignedNavRef.current = null;
      }
      const elapsed = Date.now() - enteredAtRef.current;
      const wait = finalZip ? Math.max(0, TOURNAMENT_FINAL_ZIP_MS - elapsed) : 0;
      pendingAssignedNavRef.current = window.setTimeout(() => {
        pendingAssignedNavRef.current = null;
        navigate(
          `/game?gameId=${encodeURIComponent(p.gameId)}&tournamentId=${encodeURIComponent(id)}`,
          { replace: true },
        );
      }, wait);
    },
    [id, navigate, nextGameId, finalZip],
  );

  const onRoundReadyOpened = useCallback(
    (p: {
      tournamentId: string;
      roundNumber: number;
      deadline: string;
      surviving: string[];
      isFinal: boolean;
    }) => {
      setReadyState((prev) => ({
        ...prev,
        open: true,
        roundNumber: p.roundNumber,
        deadline: p.deadline,
        surviving: p.surviving,
        readyUserIds: prev.roundNumber === p.roundNumber ? prev.readyUserIds : [],
        requiredCount: p.surviving.length,
        allReady: false,
        isFinal: p.isFinal,
      }));
      setSubmitError(null);
    },
    [],
  );

  const onRoundReadyUpdated = useCallback(
    (p: {
      tournamentId: string;
      roundNumber: number;
      readyUserIds: string[];
      requiredCount: number;
      allReady: boolean;
    }) => {
      setReadyState((prev) => {
        if (prev.roundNumber != null && prev.roundNumber !== p.roundNumber) {
          return prev;
        }
        return {
          ...prev,
          open: true,
          roundNumber: p.roundNumber,
          readyUserIds: p.readyUserIds,
          requiredCount: p.requiredCount,
          allReady: p.allReady,
        };
      });
    },
    [],
  );

  const onRoundReadyClosed = useCallback(
    (p: { tournamentId: string; roundNumber: number }) => {
      setReadyState((prev) => {
        if (prev.roundNumber != null && prev.roundNumber !== p.roundNumber) {
          return prev;
        }
        return { ...prev, open: false, allReady: true };
      });
    },
    [],
  );

  useTournamentSocket(id, {
    onTableAssigned,
    onRoundReadyOpened,
    onRoundReadyUpdated,
    onRoundReadyClosed,
  });

  const isMeSurvivor = useMemo(() => {
    if (!authUserId) return false;
    return readyState.surviving.includes(authUserId);
  }, [authUserId, readyState.surviving]);

  const isMeReady = useMemo(() => {
    if (!authUserId) return false;
    return readyState.readyUserIds.includes(authUserId);
  }, [authUserId, readyState.readyUserIds]);

  const secondsLeft = useMemo(() => {
    if (!readyState.deadline) return null;
    const ms = new Date(readyState.deadline).getTime() - now;
    if (!Number.isFinite(ms)) return null;
    return Math.max(0, Math.ceil(ms / 1000));
  }, [readyState.deadline, now]);

  const onClickReady = useCallback(async () => {
    if (!id || submitting || isMeReady) return;
    setSubmitting(true);
    setSubmitError(null);
    /* Optimiste : on marque le joueur prêt côté UI avant la réponse, pour un retour
     * instantané et symétrique à la salle d'attente multijoueur. */
    setReadyState((prev) =>
      authUserId && !prev.readyUserIds.includes(authUserId)
        ? { ...prev, readyUserIds: [...prev.readyUserIds, authUserId] }
        : prev,
    );
    try {
      const resp = await setTournamentRoundReady(id, true);
      setReadyState(resp.state);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
      void refreshReadyState();
    } finally {
      setSubmitting(false);
    }
  }, [id, submitting, isMeReady, authUserId, refreshReadyState]);

  if (!id) return null;

  const showReadyPanel = readyState.open;

  return (
    <div className="min-h-full bg-gradient-to-b from-slate-950 via-violet-950/15 to-slate-950 pb-16 pt-8 text-white">
      <div className="mx-auto max-w-lg px-4 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            to={`/tournaments/${id}`}
            className="inline-flex items-center gap-1.5 text-violet-300/90 transition hover:text-violet-200"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {t("tournament.waitingBetween.linkTournament")}
          </Link>
          <span className="text-white/25">·</span>
          <Link
            to="/lobby"
            className="text-white/45 transition hover:text-violet-200"
          >
            {t("tournament.waitingBetween.linkLobby")}
          </Link>
        </div>

        {showReadyPanel ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-violet-950/20 ring-1 ring-violet-500/10 backdrop-blur-sm">
            <div className="border-b border-white/5 bg-gradient-to-r from-emerald-600/20 to-violet-600/10 px-5 py-3">
              <h1 className="text-base font-semibold tracking-tight">
                {t("tournament.waitingBetween.readyTitle", {
                  round: readyState.roundNumber ?? "?",
                })}
              </h1>
              <p className="mt-0.5 text-xs text-white/55">
                {t("tournament.waitingBetween.readySubtitle")}
              </p>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-white/70">
                  {t("tournament.waitingBetween.readyProgress", {
                    ready: readyState.readyUserIds.length,
                    total: readyState.requiredCount,
                  })}
                </span>
                <span className="text-xs text-white/45">
                  {secondsLeft != null && secondsLeft > 0
                    ? t("tournament.waitingBetween.readyTimeout", {
                        seconds: secondsLeft,
                      })
                    : t("tournament.waitingBetween.readyTimeoutExpired")}
                </span>
              </div>

              <ul className="space-y-1.5">
                <li className="text-[11px] uppercase tracking-wider text-white/40">
                  {t("tournament.waitingBetween.readySurvivorsTitle")}
                </li>
                {readyState.surviving.map((uid) => {
                  const ready = readyState.readyUserIds.includes(uid);
                  const name = usernames[uid] ?? uid.slice(0, 8);
                  return (
                    <li
                      key={uid}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-block h-2 w-2 rounded-full ${ready ? "bg-emerald-400" : "bg-amber-400/80"}`}
                          aria-hidden
                        />
                        <span className="text-white/85">{name}</span>
                        {uid === authUserId && (
                          <span className="text-[10px] uppercase tracking-wider text-violet-300/80">
                            you
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-xs ${ready ? "text-emerald-300/90" : "text-amber-300/80"}`}
                      >
                        {ready
                          ? t("tournament.waitingBetween.readyStatusReady")
                          : t("tournament.waitingBetween.readyStatusWaiting")}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {isMeSurvivor && (
                <div className="pt-1">
                  <button
                    type="button"
                    disabled={submitting || isMeReady}
                    onClick={() => {
                      void onClickReady();
                    }}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
                      isMeReady
                        ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/40"
                        : "bg-violet-500 text-white hover:bg-violet-400 disabled:opacity-60"
                    }`}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        {t("tournament.waitingBetween.readyButtonLoading")}
                      </>
                    ) : isMeReady ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {t("tournament.waitingBetween.readyButtonDone")}
                      </>
                    ) : (
                      t("tournament.waitingBetween.readyButton")
                    )}
                  </button>
                  {submitError && (
                    <p className="mt-2 text-xs text-red-300/80">{submitError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-xl shadow-violet-950/20 ring-1 ring-violet-500/10 backdrop-blur-sm">
          <div className="border-b border-white/5 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/10 px-5 py-3">
            <h1 className="text-base font-semibold tracking-tight">
              {t("tournament.waitingBetween.title")}
            </h1>
            <p className="mt-0.5 text-xs text-white/50">
              {t("tournament.waitingBetween.subtitle")}
            </p>
          </div>
          <div className="p-5">
            <ZipRushMiniGame />
          </div>
        </div>
      </div>
    </div>
  );
}
