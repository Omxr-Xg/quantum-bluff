import { socket } from "../services/socket";
import { removeAuthItem, setAuthItem } from "./authStorage";
import { persistGamificationFromAuthUser } from "./gamificationStorage";

export type AuthUserPayload = Record<string, unknown> & {
  id: number | string;
  username: string;
  email: string;
  chips?: number;
  avatarUrl?: string | null;
};

export function applyAuthSession(token: string, user: AuthUserPayload): void {
  removeAuthItem("userid");
  removeAuthItem("role");
  setAuthItem("token", token);
  setAuthItem("userId", String(user.id));
  setAuthItem("username", user.username);
  setAuthItem("quantum_bluff_username", user.username);
  setAuthItem("quantum_bluff_email", user.email);

  if (typeof user.chips === "number") {
    setAuthItem("quantum_bluff_balance", String(user.chips));
  }

  const avatarUrl = user.avatarUrl;
  if (typeof avatarUrl === "string" && avatarUrl.trim() !== "") {
    setAuthItem("quantum_bluff_avatar", avatarUrl.trim());
  } else {
    removeAuthItem("quantum_bluff_avatar");
  }

  persistGamificationFromAuthUser(user);

  socket.disconnect();
  socket.auth = { token };
  socket.connect();

  window.dispatchEvent(new Event("auth-changed"));
}
