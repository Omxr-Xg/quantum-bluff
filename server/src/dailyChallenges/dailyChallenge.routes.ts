import express from 'express'
import type { Server } from 'socket.io'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { emitUserRewardsUpdated } from '../rewards/userRewards.socket.js'
import {
  claimDailyChallenge,
  completeSocialFollowVisit,
  getMyDailyChallenges,
  isDailyChallengeError,
  markSocialFollowVisitStarted,
  recordOnlinePresenceMinute,
} from './dailyChallenge.service.js'
import { isWeeklyChallengeCode } from './dailyChallengeRotation.js'
import { isSocialFollowChallengeCode } from './socialFollowChallenges.js'

const router = express.Router()

router.use(authMiddleware)

router.get('/me', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const payload = await getMyDailyChallenges(userId)
    return res.json(payload)
  } catch (error) {
    console.error('[dailyChallenges] GET /me error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/presence-minute', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    await recordOnlinePresenceMinute(userId)
    return res.json({ ok: true })
  } catch (error) {
    console.error('[dailyChallenges] POST /presence-minute error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/:challengeCode/social-visit-start', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { challengeCode } = req.params
    if (!isSocialFollowChallengeCode(challengeCode)) {
      return res.status(400).json({ error: 'Code challenge invalide', code: 'INVALID_CHALLENGE_CODE' })
    }
    markSocialFollowVisitStarted(userId, challengeCode)
    return res.json({ ok: true })
  } catch (error) {
    if (isDailyChallengeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyChallenges] POST social-visit-start error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/:challengeCode/social-visit-complete', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { challengeCode } = req.params
    const payload = await completeSocialFollowVisit(userId, challengeCode)
    const io = req.app.get('io') as Server | undefined
    if (io) {
      emitUserRewardsUpdated(io, userId, {
        chips: payload.chips,
        source: 'weekly_challenge',
        challengeCode: payload.challengeCode,
        newBadges: payload.newBadges,
      })
    }
    return res.json({ success: true, ...payload })
  } catch (error) {
    if (isDailyChallengeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyChallenges] POST social-visit-complete error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/:challengeCode/claim', async (req, res) => {
  try {
    const userId = req.userId
    if (!userId) return res.status(401).json({ error: 'Non authentifié' })
    const { challengeCode } = req.params
    const payload = await claimDailyChallenge(userId, challengeCode)
    const io = req.app.get('io') as Server | undefined
    if (io) {
      emitUserRewardsUpdated(io, userId, {
        chips: payload.chips,
        source: isWeeklyChallengeCode(challengeCode) ? 'weekly_challenge' : 'daily_challenge',
        challengeCode: payload.challengeCode,
        newBadges: payload.newBadges,
      })
    }
    return res.json({ success: true, ...payload })
  } catch (error) {
    if (isDailyChallengeError(error)) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code })
    }
    console.error('[dailyChallenges] POST /:challengeCode/claim error:', error)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
