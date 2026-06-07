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
import { FriendProfile } from "./pages/FriendProfile";
import { EditProfile } from "./pages/EditProfile";
import { TutorialGame } from "./pages/TutorialGame";
import { Roulette } from "./pages/Roulette";
import { Blackjack } from "./pages/Blackjack";
import { BlackjackMultiLobby } from "./pages/BlackjackMultiLobby";
import { BlackjackMultiTable } from "./pages/BlackjackMultiTable";
import { BeloteWaitingRoom } from "./pages/BeloteWaitingRoom";
import { BeloteGame } from "./pages/BeloteGame";
import { Leaderboard } from "./pages/Leaderboard";
import { Achievements } from "./pages/Achievements";
import { Shop } from "./pages/Shop";
import { PlayerHistory } from "./pages/PlayerHistory";
import { Notifications } from "./pages/Notifications";
import { Register } from "./pages/Register";
import { GameDeal } from "./pages/GameDeal";
import { GameExample } from "./pages/GameExample";
import { Layout } from "./components/Layout";
import { CookieConsentBanner } from "./components/CookieConsentBanner";
import { VoiceCallIncomingBanner } from "./components/VoiceCallIncomingBanner";
import { VoiceCallOutgoingModal } from "./components/VoiceCallOutgoingModal";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LoaderProvider } from "./contexts/LoaderContext";

import { MiniGames } from './pages/MiniGames';
import { QuickSoloGames } from "./pages/QuickSoloGames";
import { Crash } from "./pages/Crash";
import { Mines } from "./pages/Mines";
import { Wheel } from "./pages/Wheel";
import { RetroCasinoGames } from "./pages/RetroCasinoGames";
import { LuckyNumber } from "./pages/LuckyNumber";
import { TournamentRoom } from "./features/tournament/pages/TournamentRoom";
import { TournamentWaiting } from "./features/tournament/pages/TournamentWaiting";
import { TournamentResults } from "./features/tournament/pages/TournamentResults";
import { AdminAuth } from "./pages/AdminAuth";
import { AdminConsole } from "./pages/AdminConsole";
import { AdminProtectedRoute } from "./components/AdminProtectedRoute";
import { DiscoverPage } from "./pages/marketing/DiscoverPage";
import { AboutPage } from "./pages/marketing/AboutPage";
import { ContactPage } from "./pages/marketing/ContactPage";
import { PrivacyPolicyPage } from "./pages/marketing/PrivacyPolicyPage";
import { TermsOfServicePage } from "./pages/marketing/TermsOfServicePage";
import { NewsIndexPage } from "./pages/marketing/NewsIndexPage";
import { NewsArticlePage } from "./pages/marketing/NewsArticlePage";
import { SeoGameLandingPage } from "./pages/marketing/SeoGameLandingPage";

import { InvitationAcceptProvider } from "./contexts/InvitationAcceptContext";
import { VoiceProvider } from "./contexts/VoiceContext";
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
        <VoiceProvider>
        <Layout>
          
          <Routes>
            <Route path="/" element={<StartScreen />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms-of-service" element={<TermsOfServicePage />} />
            <Route path="/news" element={<NewsIndexPage />} />
            <Route path="/news/:slug" element={<NewsArticlePage />} />
            <Route path="/play-poker-online" element={<SeoGameLandingPage game="poker" />} />
            <Route path="/online-belote" element={<SeoGameLandingPage game="belote" />} />
            <Route path="/online-blackjack" element={<SeoGameLandingPage game="blackjack" />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/admin" element={<AdminAuth />} />

            <Route path="/admin/console" element={<AdminProtectedRoute><AdminConsole /></AdminProtectedRoute>} />

            <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
            <Route path="/bot-configuration" element={<ProtectedRoute><BotConfiguration /></ProtectedRoute>} />
            
            <Route path="/minigames" element={<ProtectedRoute><MiniGames /></ProtectedRoute>} />
            <Route path="/minigames/quick-solo" element={<ProtectedRoute><QuickSoloGames /></ProtectedRoute>} />
            <Route path="/minigames/retro-casino" element={<ProtectedRoute><RetroCasinoGames /></ProtectedRoute>} />
            <Route path="/minigames/crash" element={<ProtectedRoute><Crash /></ProtectedRoute>} />
            <Route path="/minigames/mines" element={<ProtectedRoute><Mines /></ProtectedRoute>} />
            <Route path="/minigames/wheel" element={<ProtectedRoute><Wheel /></ProtectedRoute>} />
            <Route path="/minigames/lucky-number" element={<ProtectedRoute><LuckyNumber /></ProtectedRoute>} />
            <Route path="/blackjack" element={<ProtectedRoute><Blackjack /></ProtectedRoute>} />
            <Route path="/blackjack/lobby" element={<ProtectedRoute><BlackjackMultiLobby /></ProtectedRoute>} />
            <Route path="/blackjack/lobby/:roomId" element={<ProtectedRoute><BlackjackMultiLobby /></ProtectedRoute>} />
            <Route path="/blackjack/table/:gameId" element={<ProtectedRoute><BlackjackMultiTable /></ProtectedRoute>} />
            <Route path="/waiting-room" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />
            <Route path="/belote/waiting-room" element={<ProtectedRoute><BeloteWaitingRoom /></ProtectedRoute>} />
            <Route path="/belote/game" element={<ProtectedRoute><BeloteGame /></ProtectedRoute>} />

            <Route path="/tournaments/:id/results" element={<ProtectedRoute><TournamentResults /></ProtectedRoute>} />
            <Route path="/tournaments/:id" element={<ProtectedRoute><TournamentRoom /></ProtectedRoute>} />
            <Route path="/tournaments/:id/waiting" element={<ProtectedRoute><TournamentWaiting /></ProtectedRoute>} />

            <Route path="/game" element={<ProtectedRoute><GameWithKey /></ProtectedRoute>} />
            <Route path="/game-deal" element={<ProtectedRoute><GameDeal /></ProtectedRoute>} />
            <Route path="/game-example" element={<ProtectedRoute><GameExample /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />
            <Route path="/hidden-bets-result" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />

            <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
            <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
            <Route path="/history" element={<ProtectedRoute><PlayerHistory /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/friends/:friendId" element={<ProtectedRoute><FriendProfile /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

            <Route path="/tutorial/game" element={<ProtectedRoute><TutorialGame /></ProtectedRoute>} />
            <Route path="/tutorial/roulette" element={<ProtectedRoute><Roulette tutorialMode /></ProtectedRoute>} />

          </Routes>
        </Layout>
        <CookieConsentBanner />
        <VoiceCallIncomingBanner />
        <VoiceCallOutgoingModal />
        </VoiceProvider>
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
