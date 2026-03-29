import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { AccessibilityMenuOpenProvider } from "./contexts/AccessibilityMenuOpenContext";

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

import { MiniGames } from './pages/MiniGames';
import { TournamentLobby } from './pages/TournamentLobby';
import { AdminTournaments } from './pages/AdminTournaments';

// NOUVEAUX IMPORTS POUR LA TÉLÉPORTATION DU TOURNOI
import { socket } from './services/socket'; // Vérifie que ce chemin pointe bien vers ton fichier socket.ts
import { useUser } from './hooks/useUser';
import { useToast } from './contexts/ToastContext';

socket.on("connect_error", (err) => {
  console.error("❌ ERREUR DE CONNEXION SOCKET :", err.message);
  if (err.message === "xhr poll error") {
    console.log("👉 Cause probable : Le serveur est éteint ou l'URL est mauvaise.");
  }
  if (err.message === "Not authorized") {
    console.log("👉 Cause probable : Ton token JWT est absent ou invalide.");
  }
});

socket.on("connect", () => {
  console.log("✅ SOCKET ENFIN CONNECTÉ ! ID :", socket.id);
});


socket.onAny((eventName, ...args) => {
  console.log(`🌐 [SOCKET GLOBAL] Événement reçu : ${eventName}`, args);
});

/** Force un remount propre lors de la navigation (ex: config bot → jeu) pour éviter les blocages */
function GameWithKey() {
  const location = useLocation();
  return <Game key={location.pathname + location.search} />;
}

/** * 🚀 LE TÉLÉPORTEUR SECRET : Il écoute les signaux Socket en tâche de fond 
 * et téléporte le joueur quand son tournoi commence.
 */
function TournamentTeleporter() {
  const navigate = useNavigate();
  const { userId } = useUser();
  const { addToast } = useToast();

  useEffect(() => {
    console.log("🔌 [DEBUG] Téléporteur actif pour l'utilisateur :", userId);

    if (!socket.connected) {
      console.log("🔌 Tentative de connexion manuelle...");
      socket.connect();
    }

    console.log("🔌 Statut Socket:", socket.connected ? "CONNECTÉ ✅" : "DÉCONNECTÉ ❌");
    console.log("🆔 Mon ID Socket:", socket.id);

    const handleTournamentStart = (data: any) => {
      // 🚩 LOG N°1 : Est-ce que le message arrive au navigateur ?
      console.log("📩 [SOCKET] Signal 'tournament-started' reçu !", data);
      
      if (!userId) {
        console.warn("⚠️ [DEBUG] Signal reçu mais userId est indéfini dans le store.");
        return;
      }

      // 🚩 LOG N°2 : Vérification de la présence dans la liste
      const isIncluded = data.playersToTeleport?.includes(userId);
      console.log(`🧐 [DEBUG] Mon ID (${userId}) est-il dans la liste ?`, isIncluded);

      if (isIncluded) {
        const myTableId = data.playerToGameMap[userId];
        console.log("🚀 [DEBUG] Téléportation vers la table :", myTableId);
        
        addToast(`Le tournoi commence !`, "success");
        navigate(`/game?gameId=${myTableId}`);
      }
    };

    socket.on('tournament-started', handleTournamentStart);

    return () => {
      socket.off('tournament-started', handleTournamentStart);
    };
  }, [userId, navigate, addToast]);

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
        <ErrorBoundary>
        <Layout>
          
          {/* On place le téléporteur ici pour qu'il soit actif sur TOUTES les pages */}
          <TournamentTeleporter />

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

            {/* Note : J'ai mis ProtectedRoute pour le lobby des tournois, c'est mieux si ça coûte des jetons ! */}
            <Route path="/tournaments" element={<ProtectedRoute><TournamentLobby /></ProtectedRoute>} />
            <Route path="/admin/tournaments" element={<ProtectedRoute><AdminTournaments /></ProtectedRoute>} />

          </Routes>
        </Layout>
        </ErrorBoundary>
        </AccessibilityMenuOpenProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}

export default App;