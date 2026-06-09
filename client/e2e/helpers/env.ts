export const e2eEmail = process.env.E2E_EMAIL?.trim() ?? ''
export const e2ePassword = process.env.E2E_PASSWORD?.trim() ?? ''

export const hasE2eCredentials = e2eEmail.length > 0 && e2ePassword.length > 0

export const apiBase =
  process.env.PLAYWRIGHT_API_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:3000'
