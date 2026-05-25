// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TutorialGame } from "../pages/TutorialGame";

/* jsdom n'implemente ni scrollIntoView ni matchMedia ; les composants
 * (spotlight, use-mobile) en dependent -> polyfills no-op. */
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function scrollIntoView() {
      /* no-op pour les tests jsdom */
    } as Element["scrollIntoView"];
  }
  if (typeof window !== "undefined" && typeof window.matchMedia !== "function") {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });
  }
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && Object.keys(opts).length > 0
        ? `${key}|${JSON.stringify(opts)}`
        : key,
    i18n: { language: "fr" },
  }),
}));

vi.mock("../utils/apiBase", () => ({
  apiFetch: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  apiUrl: (p: string) => p,
}));

vi.mock("../utils/authStorage", () => ({
  getAuthItem: (k: string) => (k === "token" ? "fake-token" : null),
}));

vi.mock("../components/PokerCard", () => ({
  PokerCard: ({ value }: { value: string }) => <div data-testid="poker-card">{value}</div>,
  PokerCardSlot: () => <div data-testid="poker-card-slot" />,
}));

vi.mock("../components/ChipIcon", () => ({
  ChipIcon: () => <span data-testid="chip" />,
}));

/* PokerTable depend de TableThemeProvider / use-mobile / avatars ; on stub
 * pour rester sur un smoke test rapide et isole. */
vi.mock("../components/PokerTable", () => ({
  PokerTable: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="poker-table">{children}</div>
  ),
}));

describe("TutorialGame", () => {
  it("se rend a l'etape 0 (intro) sans crasher", () => {
    expect(() =>
      render(
        <MemoryRouter>
          <TutorialGame />
        </MemoryRouter>,
      ),
    ).not.toThrow();
    expect(screen.getByText("tutorial.game.title")).toBeDefined();
    expect(screen.getByText("tutorial.game.steps.intro.title")).toBeDefined();
  });

  it("avance d'une etape quand on clique sur Suivant a l'etape intro", () => {
    render(
      <MemoryRouter>
        <TutorialGame />
      </MemoryRouter>,
    );
    const nextBtn = screen.getAllByText("tutorial.game.next")[0]!;
    fireEvent.click(nextBtn);
    /* L'etape 1 = `seats` ; le tooltip change de titre. */
    expect(screen.getByText("tutorial.game.steps.seats.title")).toBeDefined();
  });
});
