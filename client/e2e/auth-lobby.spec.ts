import { test, expect } from '@playwright/test';

test.describe('Auth → Lobby flow', () => {
  test('StartScreen affiche le bouton de connexion', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /connexion|connect|login/i })).toBeVisible({ timeout: 5000 });
  });

  test('navigation vers auth affiche formulaire login', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /connexion|connect|jouer|play/i }).first().click();
    await page.waitForURL(/\/auth/);
    await expect(page.getByPlaceholder(/email|e-mail/i)).toBeVisible({ timeout: 5000 });
  });

  test('login avec credentials valides redirige vers lobby', async ({ page }) => {
    await page.goto('/auth');
    await page.getByPlaceholder(/email|e-mail/i).fill('e2e@test.com');
    await page.getByPlaceholder(/mot de passe|password/i).fill('Test1234!');
    await page.getByRole('button', { name: /connexion|connect|login|se connecter/i }).click();

    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });
  }).skip(true); // Skip si pas de user e2e@test.com en DB - à activer en CI avec seed

  test('lobby protégé redirige non-auth vers auth', async ({ page }) => {
    await page.goto('/lobby');
    await expect(page).toHaveURL(/\/auth/, { timeout: 5000 });
  });
});
