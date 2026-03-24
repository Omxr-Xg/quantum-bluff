import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("la page d accueil charge le shell React", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#root")).toBeVisible();
  });
});
