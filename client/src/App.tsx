import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { AccessibilityMenuOpenProvider } from "./contexts/AccessibilityMenuOpenContext";
import { TableThemeProvider } from "./contexts/TableThemeContext";

import { Auth } from "./pages/Auth";
import { Lobby } from "./pages/Lobby";
import { BotConfiguration } from "./pages/BotConfiguration";
import { Game } from "./pages/Game";
import { StartScreen } from "./pages/StartScreen";
import { WaitingRoom } from "./pages/WaitingRoom";
import { HiddenBetsResult } from "./pages/HiddenBetsResult";
import { Profile } from "./pages/Profile";
import { Friends } from "./pages/Friends";
import { EditProfile } from "./pages/EditProfile";
import { TutorialLobby } from "./pages/TutorialLobby";
import { Blackjack } from "./pages/Blackjack";
import { BlackjackMultiLobby } from "./pages/BlackjackMultiLobby";
import { BlackjackMultiTable } from "./pages/BlackjackMultiTable";
import { Leaderboard } from "./pages/Leaderboard";
import { GameDeal } from "./pages/GameDeal";
import { GameExample } from "./pages/GameExample";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoaderProvider } from "./contexts/LoaderContext";

import { MiniGames } from './pages/MiniGames';
import { TournamentLobby } from './pages/TournamentLobby';
import { TournamentWaiting } from './pages/TournamentWaiting';
import { AdminTournaments } from './pages/AdminTournaments';
import { AdminAuth } from "./pages/AdminAuth";
import { AdminConsole } from "./pages/AdminConsole";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

import { InvitationAcceptProvider } from "./contexts/InvitationAcceptContext";
import { socket } from './services/socket';
import { useUser } from './hooks/useUser';
import { useToast } from './contexts/ToastContext';


const isDev = import.meta.env.DEV;

socket.on("connect_error", (err) => {
  if (isDev) {
    console.error("❌ ERREUR DE CONNEXION SOCKET :", err.message);
    if (err.message === "xhr poll error") {
      console.log("👉 Cause probable : Le serveur est éteint ou l'URL est mauvaise.");
    }
    if (err.message === "Not authorized" || err.message === "Invalid token") {
      console.warn(
        "⚠️ Le Socket a rejeté le token. Déconnexion du socket uniquement (pas de vidage localStorage).",
      );
    }
  }
  if (err.message === "Not authorized" || err.message === "Invalid token") {
    socket.disconnect();
  }
});

socket.on("connect", () => {
  if (isDev) {
    console.log("✅ SOCKET CONNECTÉ — id :", socket.id);
  }
});

if (isDev) {
  socket.onAny((eventName, ...args) => {
    console.log("🌐 [SOCKET]", eventName, args);
  });
}

function GameWithKey() {
  const location = useLocation();
  return <Game key={location.pathname + location.search} />;
}

function TournamentTeleporter() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToast } = useToast();
  const { t, i18n } = useTranslation();
  
  const [tournamentResult, setTournamentResult] = useState<{
    type: 'win' | 'lose' | 'finalist' | 'result';
    myPosition?: number | null;
    myAmount?: number;
    tournamentName?: string;
    ranking?: { userId: string; username: string; position: number; amount: number }[];
  } | null>(null);

  useEffect(() => {
    const currentToken = localStorage.getItem('token');

    if (!currentToken) {
      if (isDev) console.warn("⛔ Pas de token — socket non connecté");
      return;
    }

    if (!socket.connected) {
      socket.auth = { token: currentToken };
      if (isDev) console.log("🔐 Token socket injecté");
      socket.connect();
    }

    const handleTournamentStart = (data: { playersToTeleport?: string[]; playerToGameMap?: Record<string, string> }) => {
      const isIncluded = data.playersToTeleport?.includes(userId);
      if (isIncluded) {
        const myTableId = data.playerToGameMap?.[userId];
        if (!myTableId) return;
        addToast(t("tournament.teleporter.toastStarted"), "success");
        navigate(`/game?gameId=${myTableId}`);
      }
    };

    const handleTournamentWon = (data: { userId: string }) => {
      if (data.userId === userId) {
        setTournamentResult({ type: 'finalist' });
        setTimeout(() => {
          setTournamentResult(null);
          navigate('/tournament-waiting');
        }, 3000);
      }
    };

    const handleWaitingFinal = (_data: { survivorsCount: number; expectedTables: number }) => {
      // Handled by TournamentWaiting page directly via socket
    };

    const handleFinalTable = (data: { gameId: string; players: { userId: string; username: string; chips: number }[] }) => {
      setTournamentResult(null);
      navigate(`/game?gameId=${data.gameId}`, {
        state: { tournamentPlayers: data.players }
      });
    };

    const handleElimination = (data: { userId: string }) => {
      if (data.userId === userId) {
        setTournamentResult({ type: 'lose' });
      }
    };

    const handleSpectate = (data: { gameId: string }) => {
      setTimeout(() => {
        setTournamentResult(null);
        navigate(`/game?gameId=${data.gameId}&spectate=1`);
      }, 5000);
    };

    const handleTournamentResult = (data: {
      tournamentName: string;
      prizePool: number;
      ranking: { userId: string; username: string; position: number; amount: number }[];
      myPosition: number | null;
      myAmount: number;
    }) => {
      setTournamentResult({
        type: 'result',
        myPosition: data.myPosition,
        myAmount: data.myAmount,
        tournamentName: data.tournamentName,
        ranking: data.ranking,
      });
      setTimeout(() => {
        setTournamentResult(null);
        navigate('/tournaments');
      }, 12000);
    };

    const handleCountdown = (data: { tournamentName: string; minutesLeft: number }) => {
      const type = data.minutesLeft <= 5 ? 'warning' : 'info';
      const msg =
        data.minutesLeft === 1
          ? t('tournament.teleporter.countdownOne', { name: data.tournamentName })
          : t('tournament.teleporter.countdownMany', {
              name: data.tournamentName,
              minutes: String(data.minutesLeft),
            });
      addToast(msg, type);
    };

    const handleCancelled = (data: { tournamentName: string; reason?: string }) => {
      addToast(t('tournament.teleporter.cancelled', { name: data.tournamentName }), 'error');
    };

    const handlePlayerJoined = (data: {
      username: string;
      playerCount: number;
      maxPlayers: number;
    }) => {
      addToast(
        t('tournament.teleporter.playerJoined', {
          username: data.username,
          current: String(data.playerCount),
          max: String(data.maxPlayers),
        }),
        'info',
      );
    };

    socket.on('tournament-started', handleTournamentStart);
    socket.on('tournament-won', handleTournamentWon);
    socket.on('tournament-countdown', handleCountdown);
    socket.on('tournament-cancelled', handleCancelled);
    socket.on('tournament-player-joined', handlePlayerJoined);
    socket.on('tournament-waiting-final', handleWaitingFinal);
    socket.on('tournament-final-table', handleFinalTable);
    socket.on('tournament-eliminated', handleElimination);
    socket.on('tournament-spectate', handleSpectate);
    socket.on('tournament-result', handleTournamentResult);

    return () => {
      socket.off('tournament-started', handleTournamentStart);
      socket.off('tournament-won', handleTournamentWon);
      socket.off('tournament-countdown', handleCountdown);
      socket.off('tournament-cancelled', handleCancelled);
      socket.off('tournament-player-joined', handlePlayerJoined);
      socket.off('tournament-waiting-final', handleWaitingFinal);
      socket.off('tournament-final-table', handleFinalTable);
      socket.off('tournament-eliminated', handleElimination);
      socket.off('tournament-spectate', handleSpectate);
      socket.off('tournament-result', handleTournamentResult);
    };
  }, [userId, navigate, addToast, t, i18n.language]);

  if (tournamentResult) {
    const medals = ['🥇', '🥈', '🥉'];
    const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    if (tournamentResult.type === 'finalist') {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'sans-serif', textAlign: 'center'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '20px' }}>🏆</div>
          <h1 style={{ fontSize: '3rem', margin: 0, color: '#FFD700', textShadow: '0 0 20px #FFD700' }}>
            {t('tournament.teleporter.finalistTitle')}
          </h1>
          <p style={{ fontSize: '1.5rem', marginTop: '20px', opacity: 0.9 }}>
            {t('tournament.teleporter.finalistSubtitle')}
          </p>
          <p style={{ marginTop: '10px', fontSize: '1rem', opacity: 0.6 }}>
            {t('tournament.teleporter.redirecting')}
          </p>
        </div>
      );
    }

    if (tournamentResult.type === 'lose') {
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(30,0,0,0.9)', backdropFilter: 'blur(8px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'sans-serif', textAlign: 'center'
        }}>
          <div style={{ fontSize: '6rem', marginBottom: '20px' }}>💥</div>
          <h1 style={{ fontSize: '4rem', margin: 0, color: '#FF4444', textShadow: '0 0 20px #FF0000' }}>
            {t('tournament.teleporter.eliminatedTitle')}
          </h1>
          <p style={{ fontSize: '1.5rem', marginTop: '20px', opacity: 0.9 }}>
            {t('tournament.teleporter.eliminatedSubtitle')}
          </p>
          <p style={{ marginTop: '20px', fontSize: '1rem', opacity: 0.5 }}>
            {t('tournament.teleporter.spectateHint')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/lobby')}
            style={{
              marginTop: '24px', padding: '12px 32px',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '12px',
              background: 'transparent', color: 'white',
              fontSize: '1rem', cursor: 'pointer', fontFamily: 'sans-serif',
            }}
          >
            {t('tournament.teleporter.backButton')}
          </button>
        </div>
      );
    }

    if (tournamentResult.type === 'result' || tournamentResult.type === 'win') {
      const myPos = tournamentResult.myPosition;
      return (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
          zIndex: 99999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center',
          color: 'white', fontFamily: 'sans-serif', textAlign: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{ fontSize: '5rem', marginBottom: '10px' }}>
            {myPos && myPos <= 3 ? medals[myPos - 1] : '🎮'}
          </div>
          <h1 style={{
            fontSize: '3rem', margin: 0,
            color: myPos && myPos <= 3 ? medalColors[myPos - 1] : '#ffffff',
            textShadow: myPos && myPos <= 3 ? `0 0 20px ${medalColors[myPos - 1]}` : 'none'
          }}>
            {myPos === 1
              ? t('tournament.teleporter.place1')
              : myPos === 2
                ? t('tournament.teleporter.place2')
                : myPos === 3
                  ? t('tournament.teleporter.place3')
                  : myPos
                    ? t('tournament.teleporter.placeN', { n: String(myPos) })
                    : ''}
          </h1>
          {tournamentResult.myAmount && tournamentResult.myAmount > 0 && (
            <p style={{ fontSize: '1.5rem', marginTop: '10px', color: '#4ade80' }}>
              {t('tournament.teleporter.prizeChips', {
                amount: tournamentResult.myAmount.toLocaleString(i18n.language),
              })}
            </p>
          )}
          {tournamentResult.ranking && tournamentResult.ranking.length > 0 && (
            <div style={{
              marginTop: '24px', background: 'rgba(255,255,255,0.08)',
              borderRadius: '12px', padding: '16px',
              minWidth: '300px', maxWidth: '400px', width: '100%'
            }}>
              <p style={{ fontSize: '0.9rem', opacity: 0.6, marginBottom: '12px' }}>
                {tournamentResult.tournamentName}
              </p>
              {tournamentResult.ranking.map((r) => (
                <div key={r.userId} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
                  color: r.position <= 3 ? medalColors[r.position - 1] : 'rgba(255,255,255,0.6)'
                }}>
                  <span>
                    {r.position <= 3 ? medals[r.position - 1] : `#${r.position}`} {r.username}
                  </span>
                  {r.amount > 0 && (
                    <span style={{ color: '#4ade80', fontSize: '0.9rem' }}>
                      {t('tournament.teleporter.prizeChips', {
                        amount: r.amount.toLocaleString(i18n.language),
                      })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <p style={{ marginTop: '24px', fontSize: '0.9rem', opacity: 0.4 }}>
            {t('tournament.teleporter.backTournamentsSoon')}
          </p>
        </div>
      );
    }

    return null;
  }

  return null;
}

const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const isCapacitor = typeof window !== 'undefined' && !!(window as Window & { Capacitor?: unknown }).Capacitor;
const basename = base && !isCapacitor ? base : undefined;

function App() {
  return (
    <BrowserRouter basename={basename}>
      <AccessibilityProvider>
        <AccessibilityMenuOpenProvider>
        <TableThemeProvider>
        <ErrorBoundary>
        <LoaderProvider>
        <InvitationAcceptProvider>
        <Layout>
          
          <TournamentTeleporter />
          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/admin" element={<AdminAuth />} />

            <Route path="/admin/console" element={<AdminProtectedRoute><AdminConsole /></AdminProtectedRoute>} />

            <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
            <Route path="/bot-configuration" element={<ProtectedRoute><BotConfiguration /></ProtectedRoute>} />
            
            <Route path="/minigames" element={<ProtectedRoute><MiniGames /></ProtectedRoute>} />
            <Route path="/blackjack" element={<ProtectedRoute><Blackjack /></ProtectedRoute>} />
            <Route path="/blackjack/lobby" element={<ProtectedRoute><BlackjackMultiLobby /></ProtectedRoute>} />
            <Route path="/blackjack/lobby/:roomId" element={<ProtectedRoute><BlackjackMultiLobby /></ProtectedRoute>} />
            <Route path="/blackjack/table/:gameId" element={<ProtectedRoute><BlackjackMultiTable /></ProtectedRoute>} />
            <Route path="/waiting-room" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />

            <Route path="/game" element={<ProtectedRoute><GameWithKey /></ProtectedRoute>} />
            <Route path="/game-deal" element={<ProtectedRoute><GameDeal /></ProtectedRoute>} />
            <Route path="/game-example" element={<ProtectedRoute><GameExample /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />
            <Route path="/hidden-bets-result" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />

            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

            <Route path="/tutorial-lobby" element={<ProtectedRoute><TutorialLobby /></ProtectedRoute>} />

            <Route path="/tournaments" element={<ProtectedRoute><TournamentLobby /></ProtectedRoute>} />
            <Route path="/tournament-waiting" element={<ProtectedRoute><TournamentWaiting /></ProtectedRoute>} />
            <Route path="/admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />

          </Routes>
        </Layout>
        </InvitationAcceptProvider>
        </LoaderProvider>
        </ErrorBoundary>
        </TableThemeProvider>
        </AccessibilityMenuOpenProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}

export default App;
