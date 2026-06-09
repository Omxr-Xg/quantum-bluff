import { test, expect } from '@playwright/test'
import { hasE2eCredentials } from './helpers/env'
import { loginViaUi } from './helpers/auth'

test.describe('Lobby', () => {
  test.skip(!hasE2eCredentials, 'Définir E2E_EMAIL et E2E_PASSWORD pour ce test')

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page)
  })

  test('affiche les salles d attente et parties en cours', async ({ page }) => {
    await expect(page.getByText(/salles d'attente|waiting rooms/i).first()).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(/parties en cours|games in progress/i).first()).toBeVisible()
  })

  test('peut ouvrir la modale créer un serveur', async ({ page }) => {
    const createBtn = page.getByRole('button', { name: /créer un serveur|create.*server/i }).first()
    await createBtn.click()
    await expect(page.getByText(/public|privé|private/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
