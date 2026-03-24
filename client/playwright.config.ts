import { defineConfig, devices } from "@playwright/test";

/**
 * E2E smoke — lancer le client avant : `npm run dev` (port 5175 par défaut du projet).
 * `PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e` si ton Vite est sur 5173.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5175",
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
