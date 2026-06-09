import { test, expect } from '@playwright/test'
import { hasE2eCredentials } from './helpers/env'
import { loginViaUi } from './helpers/auth'

test.describe('Waiting room', () => {
  test.skip(!hasE2eCredentials, 'Définir E2E_EMAIL et E2E_PASSWORD pour ce test')

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page)
  })

  test('crée une salle publique et arrive sur waiting-room', async ({ page }) => {
    await page.getByRole('button', { name: /create.*server|créer un serveur/i }).first().click()
    await page.getByRole('button', { name: /^public$/i }).click()
    await page.getByRole('button', { name: /^5\b/ }).click()
    await page.getByRole('button', { name: /create room|créer.*salle|valider/i }).click()

    await page.waitForURL(/\/waiting-room\?roomId=/, { timeout: 30_000 })
    await expect(page).toHaveURL(/roomId=/)
  })
})
