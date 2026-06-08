jest.mock('../../config/database.js', () => {
  const prisma = {
    userTableUnlock: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    walletLedgerEntry: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  }
  return { prisma }
})

jest.mock('../../casino/services/walletLedger.service.js', () => ({
  createWalletLedgerMovement: jest.fn(),
}))

import { prisma } from '../../config/database.js'
import { listTableThemeShop } from '../tableTheme.service.js'

describe('tableTheme.service permanent unlocks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.userTableUnlock.upsert as jest.Mock).mockResolvedValue({})
  })

  it('considère la couleur custom possédée via le ledger même sans ligne unlock', async () => {
    ;(prisma.userTableUnlock.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      tableFeltThemeId: 'default',
      tableFeltBackgroundId: 'ba1',
      tableFeltBackgroundHasBinary: false,
    })
    ;(prisma.walletLedgerEntry.findMany as jest.Mock).mockResolvedValue([
      { roundId: 'custom_felt_color' },
    ])

    const shop = await listTableThemeShop('user-1')
    const extra = shop.extras.find((e) => e.id === 'custom_felt_color')

    expect(extra?.owned).toBe(true)
    expect(prisma.userTableUnlock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_unlockId: { userId: 'user-1', unlockId: 'custom_felt_color' } },
      }),
    )
  })

  it('considère la couleur custom possédée si le tapis est déjà en mode custom', async () => {
    ;(prisma.userTableUnlock.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      tableFeltThemeId: 'custom',
      tableFeltBackgroundId: 'ba1',
      tableFeltBackgroundHasBinary: false,
    })
    ;(prisma.walletLedgerEntry.findMany as jest.Mock).mockResolvedValue([])

    const shop = await listTableThemeShop('user-2')
    const extra = shop.extras.find((e) => e.id === 'custom_felt_color')

    expect(extra?.owned).toBe(true)
    expect(prisma.userTableUnlock.upsert).toHaveBeenCalled()
  })
})
