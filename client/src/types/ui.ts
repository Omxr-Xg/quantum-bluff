// Types pour le chat
export interface ChatMessage {
  id: number;
  player: string;
  content: string;
  type: "emoji" | "text";
  timestamp: number;
  isLeaving?: boolean;
}

// Types pour les paris cachés
export interface HiddenBet {
  playerId: number;
  amount: number;
  action: "call" | "raise" | "fold";
}

// Types pour l'UI
export interface UIState {
  isPanelOpen: boolean;
  isQuantumOpen: boolean;
  isChatOpen: boolean;
  showMenu: boolean;
  showAccessibilityMenu: boolean;
  showQuitConfirm: boolean;
  showGameHelp: boolean;
}

// Types pour l'accessibilité
export interface AccessibilitySettings {
  highContrast: boolean;
  visualAlerts: boolean;
  colorblindMode: boolean;
}
