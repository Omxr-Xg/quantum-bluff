import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// 1️⃣ AJOUTE CET IMPORT (⚠️ Vérifie bien que le chemin correspond à ton dossier !)
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
import { TutorialGame } from "./pages/TutorialGame";
import { GameDeal } from "./pages/GameDeal";
import { GameExample } from "./pages/GameExample";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";

/** Force un remount propre lors de la navigation (ex: config bot → jeu) pour éviter les blocages */
function GameWithKey() {
  const location = useLocation();
  return <Game key={location.pathname + location.search} />;
}

const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');
const isCapacitor = typeof window !== 'undefined' && !!(window as Window & { Capacitor?: unknown }).Capacitor;
const basename = base && !isCapacitor ? base : undefined;

function App() {
  return (
    <BrowserRouter basename={basename}>
      {/* 2️⃣ AJOUTE LE PROVIDER ICI (Il enveloppe toute ton application) */}
      <AccessibilityProvider>
        <AccessibilityMenuOpenProvider>
        <Layout>
          <Routes>

            <Route path="/" element={<StartScreen />} />

            <Route path="/auth" element={<Auth />} />

            <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
            <Route path="/bot-configuration" element={<ProtectedRoute><BotConfiguration /></ProtectedRoute>} />
            <Route path="/waiting-room" element={<ProtectedRoute><WaitingRoom /></ProtectedRoute>} />

            <Route path="/game" element={<ProtectedRoute><GameWithKey /></ProtectedRoute>} />
            <Route path="/game-deal" element={<ProtectedRoute><GameDeal /></ProtectedRoute>} />
            <Route path="/game-example" element={<ProtectedRoute><GameExample /></ProtectedRoute>} />
            <Route path="/results" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />
            <Route path="/hidden-bets-result" element={<ProtectedRoute><HiddenBetsResult /></ProtectedRoute>} />

            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
            <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />

            <Route path="/tutorial-lobby" element={<ProtectedRoute><TutorialLobby /></ProtectedRoute>} />
            <Route path="/tutorial-game" element={<ProtectedRoute><TutorialGame /></ProtectedRoute>} />

          </Routes>
        </Layout>
        </AccessibilityMenuOpenProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  );
}

export default App;