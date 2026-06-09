import { test, expect } from '@playwright/test'
import { hasE2eCredentials } from './helpers/env'
import { loginViaUi } from './helpers/auth'

test.describe('Auth', () => {
  test.skip(!hasE2eCredentials, 'Définir E2E_EMAIL et E2E_PASSWORD pour ce test')

  test('login redirige vers le lobby', async ({ page }) => {
    await loginViaUi(page)
    await expect(page).toHaveURL(/\/lobby/)
    await expect(page.locator('body')).toContainText(/lobby|salon|poker|serveur/i)
  })
})
