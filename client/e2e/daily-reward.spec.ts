import { test, expect } from '@playwright/test'
import { hasE2eCredentials } from './helpers/env'
import { loginViaUi } from './helpers/auth'

test.describe('Daily reward', () => {
  test.skip(!hasE2eCredentials, 'Définir E2E_EMAIL et E2E_PASSWORD pour ce test')

  test.beforeEach(async ({ page }) => {
    await loginViaUi(page)
  })

  test('ouvre la modale et réclame ou affiche déjà réclamé', async ({ page }) => {
    const modalTitle = page.getByText(/daily reward|récompense.*quotidien|connexion quotidienne/i).first()
    const calendarBtn = page.getByRole('button', { name: /daily reward|récompense.*quotidien|connexion quotidienne/i })

    if (!(await modalTitle.isVisible({ timeout: 8_000 }).catch(() => false))) {
      await calendarBtn.click()
    }

    await expect(modalTitle).toBeVisible({ timeout: 15_000 })

    const claimBtn = page.getByRole('button', { name: /claim|récupérer|collect/i })
    const alreadyClaimed = page.getByText(/already claimed|déjà réclamé|déjà récupéré/i)

    if (await claimBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await claimBtn.click()
      await expect(
        page.getByText(/reward claimed|récompense.*récupérée|jetons/i).first(),
      ).toBeVisible({ timeout: 15_000 })
    } else {
      await expect(alreadyClaimed).toBeVisible({ timeout: 10_000 })
    }
  })
})
