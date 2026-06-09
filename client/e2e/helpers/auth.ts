import type { Page } from '@playwright/test'
import { e2eEmail, e2ePassword } from './env'

export async function loginViaUi(page: Page): Promise<void> {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(e2eEmail)
  await page.locator('input[type="password"]').first().fill(e2ePassword)
  await page.getByRole('button', { name: /connexion|login|se connecter/i }).click()
  await page.waitForURL(/\/(lobby|waiting-room|game)/, { timeout: 30_000 })
}
