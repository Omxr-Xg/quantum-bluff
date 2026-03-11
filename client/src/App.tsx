import { BrowserRouter, Routes, Route } from "react-router-dom";

import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
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

function App() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<StartScreen />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/lobby" element={<Lobby />} />
        <Route path="/bot-configuration" element={<BotConfiguration />} />
        <Route path="/waiting-room" element={<WaitingRoom />} />

        <Route path="/game" element={<Game />} />
        <Route path="/results" element={<HiddenBetsResult />} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/friends" element={<Friends />} />
        <Route path="/edit-profile" element={<EditProfile />} />

        <Route path="/tutorial-lobby" element={<TutorialLobby />} />
        <Route path="/tutorial-game" element={<TutorialGame />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;