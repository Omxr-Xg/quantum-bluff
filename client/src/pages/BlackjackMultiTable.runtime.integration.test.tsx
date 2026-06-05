import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlackjackMultiTable } from "./BlackjackMultiTable";

const addToast = vi.fn();
const emit = vi.fn();
const off = vi.fn();
const on = vi.fn((event: string, cb: (payload: unknown) => void) => {
  return cb;
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("../hooks/useSocket", () => ({
  useSocket: () => ({
    socket: { emit, on, off },
  }),
}));

vi.mock("../hooks/useUser", () => ({
  useUser: () => ({ userId: "user-1" }),
}));

vi.mock("../contexts/VoiceContext", () => ({
  useVoice: () => ({
    joinTable: vi.fn(),
    leaveChannel: vi.fn(),
    shouldSkipLeaveOnTableUnmount: vi.fn(() => false),
    channelId: null,
    settings: { micMuted: true, soundMuted: false, speakTo: "CHANNEL", listenTo: "CHANNEL", peerMutes: new Set() },
    participants: [],
    speakingUserIds: [],
    toggleMic: vi.fn(),
    toggleSound: vi.fn(),
    togglePeerMute: vi.fn(),
  }),
}));

vi.mock("../contexts/ToastContext", () => ({
  useToast: () => ({ addToast }),
}));

vi.mock("../utils/apiBase", () => ({
  apiUrl: (p: string) => p,
  isCapacitorWebViewShell: () => false,
}));

vi.mock("../utils/userProfile", () => ({
  updateUserBalance: vi.fn(),
  fetchBalanceFromServer: vi.fn().mockResolvedValue(undefined),
  getUserBalance: vi.fn(() => 1000),
  BALANCE_CHANGED_EVENT: "quantum-bluff-balance-changed",
}));

vi.mock("../utils/gamificationStorage", () => ({
  mergeGamificationFromServerResponse: vi.fn(),
  getDisplayedBlackjackMaxBet: vi.fn(() => 500),
  refreshGamificationFromServer: vi.fn().mockResolvedValue(undefined),
  GAMIFICATION_CHANGED_EVENT: "quantum-bluff-gamification-changed",
}));

vi.mock("../components/blackjack/BlackjackLobbyBackdrop", () => ({
  BlackjackLobbyBackdrop: () => <div data-testid="backdrop" />,
}));

vi.mock("../components/blackjack/BlackjackRoundReveal", () => ({
  BlackjackRoundReveal: () => <div data-testid="round-reveal" />,
  bjOutcomeKind: (reason: string) => {
    if (reason === "push") return "push";
    if (
      reason === "player_win" ||
      reason === "player_blackjack" ||
      reason === "dealer_bust"
    )
      return "win";
    return "lose";
  },
}));

vi.mock("../components/blackjack/BlackjackMultiCasinoTable", () => ({
  BlackjackMultiCasinoTable: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="casino-table">{children}</div>,
}));

describe("BlackjackMultiTable runtime integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows recovering banner and disables actions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 409,
        ok: false,
        json: async () => ({
          code: "TABLE_RECOVERING",
          error: "TABLE_RECOVERING",
        }),
      })
    );

    const router = createMemoryRouter(
      [{ path: "/blackjack/table/:gameId", element: <BlackjackMultiTable /> }],
      { initialEntries: ["/blackjack/table/game-1"] }
    );

    render(<RouterProvider router={router} />);

    expect(await screen.findByText("bjMulti.runtime.tableRecovering")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "bjMulti.placeBet" })).toBeNull();

    const retryBtn = screen.getByRole("button", { name: "Reessayer" });
    fireEvent.click(retryBtn);
    expect(fetch).toHaveBeenCalled();
  });
});

