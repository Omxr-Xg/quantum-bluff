import express from 'express'
import { env } from '../config/env.js'
import { findOrCreateUserFromGoogle, type GoogleUserInfo } from '../auth/googleOAuth.service.js'

const router = express.Router()

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'

function oauthNotConfigured(_req: express.Request, res: express.Response): boolean {
  if (!env.googleOAuthEnabled) {
    res.status(503).json({ error: 'Google OAuth non configuré sur ce serveur.' })
    return true
  }
  return false
}

function redirectOAuthError(res: express.Response, code: string): void {
  const target = new URL('/oauth-success', env.clientUrl)
  target.searchParams.set('error', code)
  res.redirect(target.toString())
}

router.get('/google', (req, res) => {
  if (oauthNotConfigured(req, res)) return

  const params = new URLSearchParams({
    client_id: env.googleClientId!,
    redirect_uri: env.googleCallbackUrl!,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'select_account',
  })

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`)
})

router.get('/google/callback', async (req, res) => {
  if (oauthNotConfigured(req, res)) return

  const code = typeof req.query.code === 'string' ? req.query.code : ''
  if (!code) {
    redirectOAuthError(res, 'google_denied')
    return
  }

  try {
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.googleClientId!,
        client_secret: env.googleClientSecret!,
        redirect_uri: env.googleCallbackUrl!,
        grant_type: 'authorization_code',
      }),
    })

    const tokenJson = (await tokenRes.json().catch(() => ({}))) as {
      access_token?: string
      error?: string
    }

    if (!tokenRes.ok || !tokenJson.access_token) {
      console.error('[oauth] token exchange failed:', tokenJson.error ?? tokenRes.status)
      redirectOAuthError(res, 'google_token')
      return
    }

    const profileRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })

    const profile = (await profileRes.json().catch(() => ({}))) as GoogleUserInfo
    if (!profileRes.ok || !profile.sub) {
      console.error('[oauth] userinfo failed:', profileRes.status)
      redirectOAuthError(res, 'google_profile')
      return
    }

    const result = await findOrCreateUserFromGoogle(profile)

    if (result.bannedUntil) {
      redirectOAuthError(res, 'account_suspended')
      return
    }

    if (!result.token) {
      redirectOAuthError(res, 'google_auth_failed')
      return
    }

    const success = new URL('/oauth-success', env.clientUrl)
    success.searchParams.set('token', result.token)
    res.redirect(success.toString())
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    console.error('[oauth] callback error:', message)
    if (message === 'GOOGLE_EMAIL_REQUIRED' || message === 'GOOGLE_EMAIL_CONFLICT') {
      redirectOAuthError(res, message === 'GOOGLE_EMAIL_REQUIRED' ? 'google_email' : 'google_email_conflict')
      return
    }
    redirectOAuthError(res, 'google_auth_failed')
  }
})

export default router
