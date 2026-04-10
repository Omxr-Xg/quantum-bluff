import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

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
import { NetworkOverlay } from "./components/NetworkOverlay";

import { MiniGames } from './pages/MiniGames';
import { TournamentLobby } from './pages/TournamentLobby';
import { AdminTournaments } from './pages/AdminTournaments';

import { socket } from './services/socket';
import { useUser } from './hooks/useUser';
import { useToast } from './contexts/ToastContext';

socket.on("connect_error", (err) => {
  console.error("❌ ERREUR DE CONNEXION SOCKET :", err.message);
  
  if (err.message === "xhr poll error") {
    console.log("👉 Cause probable : Le serveur est éteint ou l'URL est mauvaise.");
  }
  
  if (err.message === "Not authorized" || err.message === "Invalid token") {
    console.warn("⚠️ Le Socket a rejeté le token. On tente de forcer la déconnexion du socket uniquement.");
    // On ne vide PLUS le localStorage ici pour éviter les boucles infinies.
    // On se contente de couper le socket pour qu'il arrête de spammer les erreurs.
    // La vérification de la validité du token sera gérée par les appels API (401).
    socket.disconnect();
  }
});

socket.on("connect", () => {
  console.log("✅ SOCKET ENFIN CONNECTÉ ! ID :", socket.id);
});

socket.onAny((eventName, ...args) => {
  console.log(`🌐 [SOCKET GLOBAL] Événement reçu : ${eventName}`, args);
});

function GameWithKey() {
  const location = useLocation();
  return <Game key={location.pathname + location.search} />;
}

function TournamentTeleporter() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToast } = useToast();
  
  const [tournamentResult, setTournamentResult] = useState<'win' | 'lose' | null>(null);

  useEffect(() => {
    const currentToken = localStorage.getItem('token');

    if (!currentToken) {
      console.warn('⛔ No token → skip socket');
      return;
    }

    // 🔥 important : éviter état cassé
    if (!socket.connected) {
      socket.auth = { token: `Bearer ${currentToken}` };
      console.log('🔐 Inject token in socket');
      socket.connect();
    }

    const handleTournamentStart = (data: { playersToTeleport?: string[]; playerToGameMap?: Record<string, string> }) => {
      const isIncluded = data.playersToTeleport?.includes(userId);
      if (isIncluded) {
        const myTableId = data.playerToGameMap?.[userId];
        if (!myTableId) return;
        addToast(`Le tournoi commence !`, "success");
        navigate(`/game?gameId=${myTableId}`);
      }
    };

    const handleElimination = (data: { userId: string }) => {
      if (data.userId === userId) {
        console.log("💀 [SOCKET] Signal d'élimination reçu !");
        setTournamentResult('lose'); 
        
        setTimeout(() => { 
          setTournamentResult(null); 
          navigate('/tournaments'); 
        }, 7000); 
      }
    };

    const handleVictory = (data: { userId: string }) => {
      if (data.userId === userId) {
        console.log("🏆 [SOCKET] Signal de victoire reçu !");
        setTournamentResult('win'); 
        
        setTimeout(() => { 
          setTournamentResult(null); 
          navigate('/tournaments'); 
        }, 7000); 
      }
    };

    socket.on('tournament-started', handleTournamentStart);
    socket.on('tournament-eliminated', handleElimination);
    socket.on('tournament-won', handleVictory);

    return () => {
      socket.off('tournament-started', handleTournamentStart);
      socket.off('tournament-eliminated', handleElimination);
      socket.off('tournament-won', handleVictory);
    };
  }, [userId, navigate, addToast]);

  if (tournamentResult) {
    const isWin = tournamentResult === 'win';
    
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: isWin ? 'rgba(0, 0, 0, 0.85)' : 'rgba(30, 0, 0, 0.9)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        color: 'white', fontFamily: 'sans-serif', textAlign: 'center',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {isWin ? (
          <>
            <div style={{ fontSize: '6rem', marginBottom: '20px' }}>🏆</div>
            <h1 style={{ fontSize: '4rem', margin: 0, color: '#FFD700', textShadow: '0 0 20px #FFD700' }}>
              VICTOIRE !
            </h1>
            <p style={{ fontSize: '1.5rem', marginTop: '20px', opacity: 0.9 }}>
              Félicitations, tu es le grand gagnant du tournoi !
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '6rem', marginBottom: '20px' }}>💥</div>
            <h1 style={{ fontSize: '4rem', margin: 0, color: '#FF4444', textShadow: '0 0 20px #FF0000' }}>
              ÉLIMINÉ
            </h1>
            <p style={{ fontSize: '1.5rem', marginTop: '20px', opacity: 0.9 }}>
              Tu n'as plus de jetons. Fin de la partie...
            </p>
          </>
        )}
        
        <p style={{ marginTop: '50px', fontSize: '1rem', opacity: 0.5 }}>
          Retour au lobby dans quelques secondes...
        </p>
      </div>
    );
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
        <Layout>
          
          <TournamentTeleporter />

          <NetworkOverlay />

          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route path="/auth" element={<Auth />} />

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
            <Route path="/admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />

          </Routes>
        </Layout>
        </LoaderProvider>
        </ErrorBoundary>
        </TableThemeProvider>
        </AccessibilityMenuOpenProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}

export default App;