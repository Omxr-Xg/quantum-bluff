import express from 'express'
import request from 'supertest'

const mockGetMyDailyChallenges = jest.fn()
const mockClaimDailyChallenge = jest.fn()
const mockIsDailyChallengeError = jest.fn()

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'u1'
    next()
  },
}))

jest.mock('../dailyChallenges/dailyChallenge.service.js', () => ({
  getMyDailyChallenges: (...args: unknown[]) => mockGetMyDailyChallenges(...args),
  claimDailyChallenge: (...args: unknown[]) => mockClaimDailyChallenge(...args),
  isDailyChallengeError: (...args: unknown[]) => mockIsDailyChallengeError(...args),
}))

import dailyChallengeRoutes from '../dailyChallenges/dailyChallenge.routes.js'

describe('dailyChallenge.routes', () => {
  const app = express()
  app.use(express.json())
  app.use('/api/daily-challenges', dailyChallengeRoutes)

  beforeEach(() => {
    mockGetMyDailyChallenges.mockReset()
    mockClaimDailyChallenge.mockReset()
    mockIsDailyChallengeError.mockReset()
    mockIsDailyChallengeError.mockReturnValue(false)
  })

  it('GET /me retourne le payload serveur', async () => {
    mockGetMyDailyChallenges.mockResolvedValue({
      dayKey: '2026-03-31',
      challenges: [{ code: 'PLAY_5_TIMES', progress: 2, goal: 5, completed: false, claimed: false }],
    })
    const res = await request(app).get('/api/daily-challenges/me')
    expect(res.status).toBe(200)
    expect(res.body.dayKey).toBe('2026-03-31')
    expect(mockGetMyDailyChallenges).toHaveBeenCalledWith('u1')
  })

  it('POST /:challengeCode/claim retourne 409 stable si déjà claim', async () => {
    const err = Object.assign(new Error('Challenge déjà réclamé'), {
      statusCode: 409,
      code: 'CHALLENGE_ALREADY_CLAIMED',
    })
    mockClaimDailyChallenge.mockRejectedValue(err)
    mockIsDailyChallengeError.mockReturnValue(true)

    const res = await request(app).post('/api/daily-challenges/PLAY_5_TIMES/claim').send({})
    expect(res.status).toBe(409)
    expect(res.body.code).toBe('CHALLENGE_ALREADY_CLAIMED')
    expect(mockClaimDailyChallenge).toHaveBeenCalledWith('u1', 'PLAY_5_TIMES')
  })
})
