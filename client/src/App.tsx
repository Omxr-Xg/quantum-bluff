import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

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
import { TutorialGame } from "./pages/TutorialGame";
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
import { TournamentLobby } from "./features/tournament/pages/TournamentLobby";
import { TournamentRoom } from "./features/tournament/pages/TournamentRoom";
import { TournamentWaiting } from "./features/tournament/pages/TournamentWaiting";
import { TournamentResults } from "./features/tournament/pages/TournamentResults";
import { AdminAuth } from "./pages/AdminAuth";
import { AdminConsole } from "./pages/AdminConsole";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";

import { InvitationAcceptProvider } from "./contexts/InvitationAcceptContext";
import { socket } from './services/socket';

const isDev = import.meta.env.DEV;

socket.on("connect_error", (err) => {
  if (isDev) {
    console.error("[socket] ERREUR DE CONNEXION :", err.message);
    if (err.message === "xhr poll error") {
      console.log("Cause probable : serveur éteint ou URL incorrecte.");
    }
    if (err.message === "Not authorized" || err.message === "Invalid token") {
      console.warn(
        "[socket] Token rejeté — déconnexion du socket uniquement (localStorage inchangé).",
      );
    }
  }
  if (err.message === "Not authorized" || err.message === "Invalid token") {
    socket.disconnect();
  }
});

socket.on("connect", () => {
  if (isDev) {
    console.log("[socket] Connecté — id :", socket.id);
  }
});

if (isDev) {
  socket.onAny((eventName, ...args) => {
    console.log("[socket]", eventName, args);
  });
}

function GameWithKey() {
  const location = useLocation();
  return <Game key={location.pathname + location.search} />;
}

const rawBase = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
/** Vite `base: './'` → `./` : pas de basename pour le routeur. */
const base =
  rawBase === '.' || rawBase === './' || rawBase === '' ? '' : rawBase;
const isCapacitor = typeof window !== 'undefined' && !!(window as Window & { Capacitor?: unknown }).Capacitor;
const basename = base && !isCapacitor ? base : undefined;

/** Electron packagé : `loadFile` → protocole file: ; BrowserRouter casserait les routes. */
const Router =
  typeof window !== 'undefined' && window.location.protocol === 'file:'
    ? HashRouter
    : BrowserRouter;

function App() {
  return (
    <Router basename={basename}>
      <AccessibilityProvider>
        <AccessibilityMenuOpenProvider>
        <TableThemeProvider>
        <ErrorBoundary>
        <LoaderProvider>
        <InvitationAcceptProvider>
        <Layout>
          
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

            <Route path="/tournaments" element={<ProtectedRoute><TournamentLobby /></ProtectedRoute>} />
            <Route path="/tournaments/:id/results" element={<ProtectedRoute><TournamentResults /></ProtectedRoute>} />
            <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentRoom /></ProtectedRoute>} />
            <Route path="/tournaments/:id/waiting" element={<ProtectedRoute><TournamentWaiting /></ProtectedRoute>} />

            <Route path="/game" element={<ProtectedRoute><GameWithKey /></ProtectedRoute>} />
            <Route path="/game-deal" element={<ProtectedRoute><GameDeal /></ProtectedRoute>} />
            <Route path="/game-example" element={<ProtectedRoute><GameExample /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />
            <Route path="/hidden-bets-result" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />

            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

            <Route path="/tutorial/game" element={<ProtectedRoute><TutorialGame /></ProtectedRoute>} />

          </Routes>
        </Layout>
        </InvitationAcceptProvider>
        </LoaderProvider>
        </ErrorBoundary>
        </TableThemeProvider>
        </AccessibilityMenuOpenProvider>
      </AccessibilityProvider>
    </Router>
  );
}

export default App;
