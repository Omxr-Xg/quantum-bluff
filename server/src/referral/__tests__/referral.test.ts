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
      update: jest.fn(),
    },
    friendship: {
      findFirst: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
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
  emitFriendsUpdated: jest.fn(),
}))

jest.mock('../../achievements/achievement.service.js', () => ({
  checkAchievements: jest.fn().mockResolvedValue(undefined),
}))

import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import { createWalletLedgerMovement } from '../../casino/services/walletLedger.service.js'
import { createNotification } from '../../notifications/notification.service.js'
import { emitFriendsUpdated, emitUserRewardsUpdated } from '../../rewards/userRewards.socket.js'
import {
  applyReferralCode,
  applyReferralOnRegister,
  ensureUserReferralCode,
  getReferralMe,
  isReferralError,
  listReferralInvites,
} from '../referral.service.js'
import {
  REFERRAL_REFERRED_CHIPS,
  REFERRAL_REFERRER_CHIPS,
} from '../referral.types.js'
import { normalizeReferralCode } from '../referralCode.js'

function makePendingReferral(overrides: Partial<{
  id: string
  referrerId: string
  referredUserId: string
  referrerChips: number
  referredChips: number
  referrerUsername: string
  referredUsername: string
  status: 'PENDING' | 'COMPLETED'
}> = {}) {
  return {
    id: overrides.id ?? 'ref-1',
    status: overrides.status ?? 'PENDING',
    referrerId: overrides.referrerId ?? 'referrer-1',
    referredUserId: overrides.referredUserId ?? 'user-b',
    referrer: {
      id: overrides.referrerId ?? 'referrer-1',
      chips: overrides.referrerChips ?? 5000,
      username: overrides.referrerUsername ?? 'Alice',
    },
    referred: {
      id: overrides.referredUserId ?? 'user-b',
      chips: overrides.referredChips ?? 1000,
      username: overrides.referredUsername ?? 'Bob',
    },
  }
}

function mockTransactionForReferral(referral: ReturnType<typeof makePendingReferral>) {
  const tx = {
    referral: {
      findUnique: jest.fn().mockResolvedValue(referral),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      update: jest.fn().mockResolvedValue({}),
    },
    friendship: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'friendship-1' }),
    },
  }
  ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn: (t: typeof tx) => unknown) =>
    fn(tx),
  )
  return tx
}

function mockIo(): Server {
  return {
    to: jest.fn().mockReturnValue({ emit: jest.fn() }),
  } as unknown as Server
}

describe('referralCode', () => {
  it('normalise le code (trim, uppercase, alphanum)', () => {
    expect(normalizeReferralCode(' ab12-cd ')).toBe('AB12CD')
    expect(normalizeReferralCode('')).toBe('')
  })
})

describe('referral.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createWalletLedgerMovement as jest.Mock).mockResolvedValue(undefined)
    ;(createNotification as jest.Mock).mockResolvedValue(undefined)
    ;(prisma.friendship.count as jest.Mock).mockResolvedValue(1)
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

    it('réessaie en cas de collision puis échoue après 8 tentatives', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ referralCode: null })
      ;(prisma.user.update as jest.Mock).mockRejectedValue(new Error('unique violation'))

      await expect(ensureUserReferralCode('user-1')).rejects.toMatchObject({
        statusCode: 500,
        code: 'REFERRAL_CODE_FAILED',
      })
      expect(prisma.user.update).toHaveBeenCalledTimes(8)
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
      expect(payload.chipsEarned).toBe(REFERRAL_REFERRER_CHIPS)
      expect(payload.referralLink).toContain('ref=REFCODE1')
    })

    it('utilise publicBaseUrl pour le lien', async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ referralCode: 'REFCODE1' })
      ;(prisma.referral.findMany as jest.Mock).mockResolvedValue([])
      const payload = await getReferralMe('user-1', 'https://app.example.com/')
      expect(payload.referralLink).toBe('https://app.example.com/register?ref=REFCODE1')
    })
  })

  describe('listReferralInvites', () => {
    it('mappe les invitations avec gains', async () => {
      ;(prisma.referral.findMany as jest.Mock).mockResolvedValue([
        {
          referred: { id: 'u2', username: 'bob' },
          status: 'COMPLETED',
          createdAt: new Date('2026-01-01T10:00:00.000Z'),
          referrerRewardedAt: new Date('2026-01-02T10:00:00.000Z'),
        },
        {
          referred: { id: 'u3', username: 'carol' },
          status: 'PENDING',
          createdAt: new Date('2026-01-03T10:00:00.000Z'),
          referrerRewardedAt: null,
        },
      ])

      const invites = await listReferralInvites('user-1')
      expect(invites).toHaveLength(2)
      expect(invites[0]).toMatchObject({
        userId: 'u2',
        username: 'bob',
        status: 'COMPLETED',
        chipsEarned: REFERRAL_REFERRER_CHIPS,
        rewardedAt: '2026-01-02T10:00:00.000Z',
      })
      expect(invites[1]).toMatchObject({
        userId: 'u3',
        status: 'PENDING',
        chipsEarned: 0,
        rewardedAt: null,
      })
    })
  })

  describe('applyReferralCode', () => {
    it('rejette un code invalide', async () => {
      await expect(applyReferralCode('user-b', 'ab')).rejects.toMatchObject({
        statusCode: 400,
        code: 'INVALID_CODE',
      })
      expect(isReferralError).toBeDefined()
    })

    it('rejette si déjà parrainé', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
        status: 'COMPLETED',
      })
      await expect(applyReferralCode('user-b', 'VALID123')).rejects.toMatchObject({
        statusCode: 409,
        code: 'ALREADY_REFERRED',
      })
    })

    it('reprend un parrainage bloqué en PENDING', async () => {
      const referral = makePendingReferral()
      mockTransactionForReferral(referral)

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: referral.id,
        status: 'PENDING',
      })
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })

      const result = await applyReferralCode('user-b', 'VALID123')
      expect(result.referralId).toBe('ref-1')
      expect(prisma.referral.create).not.toHaveBeenCalled()
    })

    it('rejette un code introuvable', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(applyReferralCode('user-b', 'VALID123')).rejects.toMatchObject({
        statusCode: 404,
        code: 'CODE_NOT_FOUND',
      })
    })

    it('rejette l’auto-parrainage', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-b' })
      await expect(applyReferralCode('user-b', 'VALID123')).rejects.toMatchObject({
        statusCode: 400,
        code: 'SELF_REFERRAL',
      })
    })

    it('trouve le parrain via recherche insensible à la casse', async () => {
      const referral = makePendingReferral()
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })
      mockTransactionForReferral(referral)

      const result = await applyReferralCode('user-b', 'valid123')
      expect(result.referrerId).toBe('referrer-1')
      expect(prisma.user.findFirst).toHaveBeenCalledTimes(2)
    })

    it('crédite les jetons, crée l’amitié et notifie', async () => {
      const referral = makePendingReferral()
      const tx = mockTransactionForReferral(referral)
      const io = mockIo()

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })

      const result = await applyReferralCode('user-b', 'VALID123', io)

      expect(result.referrerChips).toBe(5000 + REFERRAL_REFERRER_CHIPS)
      expect(result.referredChips).toBe(1000 + REFERRAL_REFERRED_CHIPS)
      expect(tx.user.update).toHaveBeenCalledTimes(2)
      expect(tx.friendship.create).toHaveBeenCalled()
      expect(createWalletLedgerMovement).toHaveBeenCalledTimes(2)
      expect(emitUserRewardsUpdated).toHaveBeenCalledTimes(2)
      expect(emitFriendsUpdated).toHaveBeenCalledTimes(2)
      expect(createNotification).toHaveBeenCalledTimes(2)
    })

    it('ne recrée pas l’amitié si elle existe déjà', async () => {
      const referral = makePendingReferral()
      const tx = mockTransactionForReferral(referral)
      tx.friendship.findFirst.mockResolvedValue({ id: 'existing-friendship' })

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })

      await applyReferralCode('user-b', 'VALID123')
      expect(tx.friendship.create).not.toHaveBeenCalled()
    })

    it('continue si l’écriture ledger échoue', async () => {
      const referral = makePendingReferral()
      mockTransactionForReferral(referral)
      ;(createWalletLedgerMovement as jest.Mock).mockRejectedValue(new Error('ledger down'))

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })

      await expect(applyReferralCode('user-b', 'VALID123')).resolves.toMatchObject({
        referralId: 'ref-1',
      })
    })

    it('échoue si la récompense ne peut pas être finalisée', async () => {
      const referral = makePendingReferral({ status: 'COMPLETED' })
      mockTransactionForReferral(referral)

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })

      await expect(applyReferralCode('user-b', 'VALID123')).rejects.toMatchObject({
        statusCode: 500,
        code: 'REFERRAL_REWARD_FAILED',
      })
    })
  })

  describe('applyReferralOnRegister', () => {
    it('ignore un code vide', async () => {
      await expect(applyReferralOnRegister('user-b', '   ')).resolves.toBeNull()
    })

    it('ignore silencieusement un code introuvable', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(applyReferralOnRegister('user-b', 'UNKNOWN1')).resolves.toBeNull()
    })

    it('ignore silencieusement l’auto-parrainage', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'user-b' })
      await expect(applyReferralOnRegister('user-b', 'MYCODE12')).resolves.toBeNull()
    })

    it('propage les erreurs bloquantes', async () => {
      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing',
        status: 'COMPLETED',
      })
      await expect(applyReferralOnRegister('user-b', 'VALID123')).rejects.toMatchObject({
        code: 'ALREADY_REFERRED',
      })
    })

    it('applique le parrainage à l’inscription', async () => {
      const referral = makePendingReferral()
      mockTransactionForReferral(referral)

      ;(prisma.referral.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'referrer-1' })
      ;(prisma.referral.create as jest.Mock).mockResolvedValue({ id: referral.id })

      const result = await applyReferralOnRegister('user-b', 'VALID123')
      expect(result?.referredChips).toBe(1000 + REFERRAL_REFERRED_CHIPS)
    })
  })

  describe('isReferralError', () => {
    it('identifie les erreurs métier', async () => {
      expect(isReferralError(new Error('x'))).toBe(false)
      try {
        await applyReferralCode('user-b', 'ab')
      } catch (err) {
        expect(isReferralError(err)).toBe(true)
      }
    })
  })
})
