jest.mock('../../config/database.js', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    referral: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  }
  return { prisma }
})

jest.mock('../../casino/services/walletLedger.service.js', () => ({
  createWalletLedgerMovement: jest.fn(),
}))

jest.mock('../../notifications/notification.service.js', () => ({
  createNotification: jest.fn(),
}))

jest.mock('../../rewards/userRewards.socket.js', () => ({
  emitUserRewardsUpdated: jest.fn(),
}))

import { prisma } from '../../config/database.js'
import {
  ensureUserReferralCode,
  getReferralMe,
  isReferralError,
} from '../referral.service.js'
import { normalizeReferralCode } from '../referralCode.js'

describe('referralCode', () => {
  it('normalise le code (trim, uppercase, alphanum)', () => {
    expect(normalizeReferralCode(' ab12-cd ')).toBe('AB12CD')
    expect(normalizeReferralCode('')).toBe('')
  })
})

describe('referral.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('ensureUserReferralCode', () => {
    it('retourne le code existant', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ referralCode: 'ABCD1234' })
      const code = await ensureUserReferralCode('user-1')
      expect(code).toBe('ABCD1234')
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it('génère un code si absent', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ referralCode: null })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({ referralCode: 'NEWCODE1' })
      const code = await ensureUserReferralCode('user-1')
      expect(code).toBe('NEWCODE1')
      expect(prisma.user.update).toHaveBeenCalled()
    })
  })

  describe('getReferralMe', () => {
    it('agrège invites et jetons gagnés', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ referralCode: 'REFCODE1' })
      ;(prisma.referral.findMany as jest.Mock).mockResolvedValue([
        { status: 'COMPLETED' },
        { status: 'PENDING' },
      ])
      const payload = await getReferralMe('user-1')
      expect(payload.referralCode).toBe('REFCODE1')
      expect(payload.invitesCount).toBe(2)
      expect(payload.chipsEarned).toBe(500)
      expect(payload.referralLink).toContain('ref=REFCODE1')
    })
  })

  describe('isReferralError', () => {
    it('identifie les erreurs métier', () => {
      expect(isReferralError(new Error('x'))).toBe(false)
    })
  })
})
