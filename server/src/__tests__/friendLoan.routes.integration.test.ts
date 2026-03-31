import express from 'express'
import request from 'supertest'

jest.mock('../middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    ;(req as express.Request & { userId?: string }).userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    next()
  },
}))

const mockCreate = jest.fn()
const mockList = jest.fn()
const mockGetDetail = jest.fn()

jest.mock('../services/friendLoan.service.js', () => ({
  createLoanRequest: (...args: unknown[]) => mockCreate(...args),
  listLoansForUser: (...args: unknown[]) => mockList(...args),
  getLoanDetail: (...args: unknown[]) => mockGetDetail(...args),
  acceptLoanRequest: jest.fn(),
  rejectLoanRequest: jest.fn(),
  cancelLoanRequest: jest.fn(),
}))

jest.mock('../config/database.js', () => ({
  prisma: {
    loanRequest: {
      findUnique: jest.fn(),
    },
  },
}))

import friendLoanRoutes from '../routes/friendLoan.routes.js'

describe('friendLoan HTTP routes', () => {
  const app = express()
  app.use(express.json())
  app.use('/api/friends', friendLoanRoutes)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET /api/friends/loans agrège la liste pour l’utilisateur authentifié', async () => {
    mockList.mockResolvedValue({
      requestsSent: [],
      requestsReceived: [],
      activeLoans: [],
      completedLoans: [],
    })
    const res = await request(app).get('/api/friends/loans')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      requestsSent: [],
      activeLoans: [],
    })
    expect(mockList).toHaveBeenCalledWith('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')
  })

  it('POST /api/friends/loans/requests accepte friendId comme alias de lenderId', async () => {
    const lenderId = '11111111-1111-4111-8111-111111111111'
    mockCreate.mockResolvedValue({
      loanRequest: { id: 'req-1', lenderId, amount: 100, repaymentRate: 10 },
    })
    const res = await request(app)
      .post('/api/friends/loans/requests')
      .send({
        friendId: lenderId,
        amount: 100,
        repaymentRate: 10,
      })
    expect(res.status).toBe(201)
    expect(mockCreate).toHaveBeenCalledWith({
      borrowerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      lenderId,
      amount: 100,
      repaymentRate: 10,
    })
  })

  it('GET /api/friends/loans/:loanId renvoie 404 si le prêt est absent ou interdit', async () => {
    mockGetDetail.mockResolvedValue(null)
    const res = await request(app).get('/api/friends/loans/22222222-2222-4222-8222-222222222222')
    expect(res.status).toBe(404)
    expect(res.body.code).toBe('NOT_FOUND')
  })
})
