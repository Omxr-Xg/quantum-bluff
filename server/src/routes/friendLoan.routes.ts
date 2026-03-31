import express from 'express'
import type { Server } from 'socket.io'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { prisma } from '../config/database.js'
import {
  acceptLoanRequest,
  cancelLoanRequest,
  createLoanRequest,
  getLoanDetail,
  listLoansForUser,
  rejectLoanRequest,
} from '../services/friendLoan.service.js'
import { ALLOWED_REPAYMENT_RATES } from '../logic/friendLoan.interest.js'
import { emitToUsers, FRIEND_LOAN_SOCKET } from '../services/friendLoan.emit.js'

const router = express.Router()

const loanWriteLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop d’actions sur les prêts. Réessaie plus tard.' },
})

const loanReadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
})

const repaymentRateSchema = z
  .number()
  .refine((n): n is (typeof ALLOWED_REPAYMENT_RATES)[number] =>
    (ALLOWED_REPAYMENT_RATES as readonly number[]).includes(n)
  )

const createRequestSchema = z
  .object({
    lenderId: z.string().uuid().optional(),
    /** Alias documenté : même sens que lenderId (ami qui prête). */
    friendId: z.string().uuid().optional(),
    amount: z.number().int(),
    repaymentRate: repaymentRateSchema,
  })
  .refine((d) => d.lenderId != null || d.friendId != null, {
    message: 'lenderId ou friendId requis',
    path: ['lenderId'],
  })
  .transform((d) => ({
    lenderId: (d.lenderId ?? d.friendId)!,
    amount: d.amount,
    repaymentRate: d.repaymentRate,
  }))

router.use(authMiddleware)

router.post('/loans/requests', loanWriteLimiter, async (req, res) => {
  const userId = req.userId!
  const parsed = createRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Données invalides', details: parsed.error.flatten() })
  }
  const io = req.app.get('io') as Server | undefined
  try {
    const { loanRequest } = await createLoanRequest({
      borrowerId: userId,
      lenderId: parsed.data.lenderId,
      amount: parsed.data.amount,
      repaymentRate: parsed.data.repaymentRate,
    })
    emitToUsers(io, [parsed.data.lenderId], FRIEND_LOAN_SOCKET.LOAN_REQUEST_RECEIVED, {
      loanRequest,
    })
    return res.status(201).json({ loanRequest })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'INVALID_LOAN_PARTIES') return res.status(400).json({ error: 'Emprunteur et prêteur invalides', code })
    if (code === 'INVALID_LOAN_AMOUNT' || code === 'LOAN_AMOUNT_OUT_OF_RANGE') {
      return res.status(400).json({ error: 'Montant invalide', code })
    }
    if (code === 'INVALID_REPAYMENT_RATE') return res.status(400).json({ error: 'Taux de remboursement invalide', code })
    if (code === 'NOT_FRIENDS') return res.status(403).json({ error: 'Vous devez être amis', code })
    if (code === 'BORROWER_HAS_ACTIVE_LOAN') return res.status(409).json({ error: 'Prêt actif en cours', code })
    if (code === 'LOAN_REQUEST_PENDING_EXISTS') return res.status(409).json({ error: 'Demande déjà en attente avec cet ami', code })
    if (code === 'LENDER_NOT_FOUND') return res.status(404).json({ error: 'Prêteur introuvable', code })
    if (code === 'LENDER_INSUFFICIENT_CHIPS') return res.status(400).json({ error: 'Le prêteur n’a pas assez de jetons', code })
    console.error('[friendLoan] create request:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/loans', loanReadLimiter, async (req, res) => {
  const userId = req.userId!
  try {
    const data = await listLoansForUser(userId)
    return res.json(data)
  } catch (e) {
    console.error('[friendLoan] list:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.get('/loans/:loanId', loanReadLimiter, async (req, res) => {
  const userId = req.userId!
  const { loanId } = req.params
  try {
    const loan = await getLoanDetail(loanId, userId)
    if (!loan) return res.status(404).json({ error: 'Prêt introuvable ou accès refusé', code: 'NOT_FOUND' })
    return res.json({ loan })
  } catch (e) {
    console.error('[friendLoan] detail:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/loans/requests/:loanRequestId/accept', loanWriteLimiter, async (req, res) => {
  const userId = req.userId!
  const { loanRequestId } = req.params
  const io = req.app.get('io') as Server | undefined
  try {
    const { loan } = await acceptLoanRequest({ requestId: loanRequestId, lenderId: userId })
    emitToUsers(io, [loan.borrowerId], FRIEND_LOAN_SOCKET.LOAN_REQUEST_ACCEPTED, {
      loanRequestId,
      loan,
    })
    emitToUsers(io, [loan.borrowerId, userId], FRIEND_LOAN_SOCKET.LOAN_CREATED, { loan })
    return res.json({ loan })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'LOAN_REQUEST_NOT_FOUND') return res.status(404).json({ error: 'Demande introuvable', code })
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Accès refusé', code })
    if (code === 'LOAN_REQUEST_NOT_PENDING') return res.status(400).json({ error: 'Demande déjà traitée', code })
    if (code === 'LOAN_REQUEST_EXPIRED') return res.status(400).json({ error: 'Demande expirée', code })
    if (code === 'BORROWER_HAS_ACTIVE_LOAN') return res.status(409).json({ error: 'Emprunteur a déjà un prêt actif', code })
    if (code === 'LENDER_INSUFFICIENT_CHIPS') return res.status(400).json({ error: 'Solde insuffisant pour prêter', code })
    if (code === 'USER_NOT_FOUND') return res.status(404).json({ error: 'Utilisateur introuvable', code })
    console.error('[friendLoan] accept:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/loans/requests/:loanRequestId/reject', loanWriteLimiter, async (req, res) => {
  const userId = req.userId!
  const { loanRequestId } = req.params
  const io = req.app.get('io') as Server | undefined
  try {
    const row = await prisma.loanRequest.findUnique({
      where: { id: loanRequestId },
      select: { borrowerId: true, lenderId: true },
    })
    await rejectLoanRequest({ requestId: loanRequestId, lenderId: userId })
    if (row?.borrowerId) {
      emitToUsers(io, [row.borrowerId], FRIEND_LOAN_SOCKET.LOAN_REQUEST_REJECTED, { loanRequestId })
    }
    return res.json({ ok: true })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'LOAN_REQUEST_NOT_FOUND') return res.status(404).json({ error: 'Demande introuvable', code })
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Accès refusé', code })
    if (code === 'LOAN_REQUEST_NOT_PENDING') return res.status(400).json({ error: 'Demande déjà traitée', code })
    console.error('[friendLoan] reject:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

router.post('/loans/requests/:loanRequestId/cancel', loanWriteLimiter, async (req, res) => {
  const userId = req.userId!
  const { loanRequestId } = req.params
  const io = req.app.get('io') as Server | undefined
  try {
    const row = await prisma.loanRequest.findUnique({
      where: { id: loanRequestId },
      select: { lenderId: true },
    })
    await cancelLoanRequest({ requestId: loanRequestId, borrowerId: userId })
    if (row?.lenderId) {
      emitToUsers(io, [row.lenderId], FRIEND_LOAN_SOCKET.LOAN_REQUEST_REJECTED, {
        loanRequestId,
        cancelledByBorrower: true,
      })
    }
    return res.json({ ok: true })
  } catch (e) {
    const code = (e as { code?: string }).code
    if (code === 'LOAN_REQUEST_NOT_FOUND') return res.status(404).json({ error: 'Demande introuvable', code })
    if (code === 'FORBIDDEN') return res.status(403).json({ error: 'Accès refusé', code })
    if (code === 'LOAN_REQUEST_NOT_PENDING') return res.status(400).json({ error: 'Demande déjà traitée', code })
    console.error('[friendLoan] cancel:', e)
    return res.status(500).json({ error: 'Erreur serveur' })
  }
})

export default router
