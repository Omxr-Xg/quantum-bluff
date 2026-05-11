import { grantLedgerRow } from '../tournament/tournament.reward.service.js'

describe('grantLedgerRow idempotence', () => {
  it('deuxième insert avec même clé unique → already', async () => {
    const keys = new Set<string>()
    const prismaMock = {
      tournamentRewardLedger: {
        create: async (args: {
          data: { tournamentId: string; userId: string; kind: string };
        }) => {
          const k = `${args.data.tournamentId}:${args.data.userId}:${args.data.kind}`
          if (keys.has(k)) {
            const err = new Error('Unique constraint')
            ;(err as { code?: string }).code = 'P2002'
            throw err
          }
          keys.add(k)
        },
      },
    }
    const row = {
      tournamentId: 't1',
      userId: 'u1',
      kind: 'CHIPS_WINNER' as const,
      chipsAmount: 100,
    }
    await expect(grantLedgerRow(prismaMock as never, row)).resolves.toBe('granted')
    await expect(grantLedgerRow(prismaMock as never, row)).resolves.toBe('already')
  })
})
