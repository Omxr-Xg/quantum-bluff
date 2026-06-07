import express from 'express'
import request from 'supertest'
import type { Server } from 'socket.io'

const mockGetReferralMe = jest.fn()
const mockListReferralInvites = jest.fn()
const mockApplyReferralCode = jest.fn()
const mockIsReferralError = jest.fn()

jest.mock('../../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'u1'
    next()
  },
}))

jest.mock('../referral.service.js', () => ({
  getReferralMe: (...args: unknown[]) => mockGetReferralMe(...args),
  listReferralInvites: (...args: unknown[]) => mockListReferralInvites(...args),
  applyReferralCode: (...args: unknown[]) => mockApplyReferralCode(...args),
  isReferralError: (...args: unknown[]) => mockIsReferralError(...args),
}))

import referralRoutes from '../referral.routes.js'

describe('referral.routes', () => {
  const app = express()
  const mockIo = { to: jest.fn() } as unknown as Server

  app.set('io', mockIo)
  app.use(express.json())
  app.use('/api/referral', referralRoutes)

  beforeEach(() => {
    mockGetReferralMe.mockReset()
    mockListReferralInvites.mockReset()
    mockApplyReferralCode.mockReset()
    mockIsReferralError.mockReset()
    mockIsReferralError.mockReturnValue(false)
  })

  it('GET /me retourne le profil parrainage', async () => {
    mockGetReferralMe.mockResolvedValue({
      referralCode: 'ABCD1234',
      referralLink: 'https://app/register?ref=ABCD1234',
      invitesCount: 1,
      chipsEarned: 1000,
    })

    const res = await request(app).get('/api/referral/me').set('Origin', 'https://app.example.com')
    expect(res.status).toBe(200)
    expect(res.body.referralCode).toBe('ABCD1234')
    expect(mockGetReferralMe).toHaveBeenCalledWith('u1', 'https://app.example.com')
  })

  it('GET /invites retourne la liste', async () => {
    mockListReferralInvites.mockResolvedValue([
      { userId: 'u2', username: 'bob', status: 'COMPLETED', chipsEarned: 1000 },
    ])

    const res = await request(app).get('/api/referral/invites')
    expect(res.status).toBe(200)
    expect(res.body.invites).toHaveLength(1)
    expect(mockListReferralInvites).toHaveBeenCalledWith('u1')
  })

  it('POST /apply retourne le bonus filleul', async () => {
    mockApplyReferralCode.mockResolvedValue({
      referredChips: 3000,
      referrerUsername: 'alice',
    })

    const res = await request(app).post('/api/referral/apply').send({ code: 'ABCD1234' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      ok: true,
      chips: 3000,
      referrerUsername: 'alice',
      referralBonus: 2000,
    })
    expect(mockApplyReferralCode).toHaveBeenCalledWith('u1', 'ABCD1234', mockIo)
  })

  it('POST /apply retourne l’erreur métier', async () => {
    const err = Object.assign(new Error('Code introuvable'), {
      statusCode: 404,
      code: 'CODE_NOT_FOUND',
    })
    mockApplyReferralCode.mockRejectedValue(err)
    mockIsReferralError.mockReturnValue(true)

    const res = await request(app).post('/api/referral/apply').send({ code: 'UNKNOWN' })
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('CODE_NOT_FOUND')
  })
})
