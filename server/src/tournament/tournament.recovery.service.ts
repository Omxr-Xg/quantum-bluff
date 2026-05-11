import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { grantTournamentRewardsIfMissing } from './tournament.reward.service.js'
import { emitTournamentLiveSpectateChanged } from './tournament.roster.events.js'
import { tryAdvanceRoundAfterTableComplete } from './tournament.runtime.service.js'

/**
 * Réconciliation légère : récompenses manquantes sur tournois COMPLETED ;
 * rounds bloqués si toutes les tables sont COMPLETED (crash avant avancement).
 */
export async function recoverTournamentsAtBoot(io: Server): Promise<void> {
  const completed = await prisma.tournament.findMany({
    where: { status: 'COMPLETED' },
    select: { id: true },
    take: 100,
  })
  for (const c of completed) {
    try {
      await grantTournamentRewardsIfMissing(prisma, c.id)
    } catch (e) {
      rootLogger.warn({
        msg: 'tournament_recovery_rewards_failed',
        tournamentId: c.id,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }

  const rounds = await prisma.tournamentRound.findMany({
    where: { status: 'IN_PROGRESS' },
    select: { id: true },
    take: 50,
  })
  for (const r of rounds) {
    const pending = await prisma.tournamentTable.count({
      where: {
        roundId: r.id,
        status: { in: ['PENDING', 'IN_PROGRESS', 'RECOVERING'] },
      },
    })
    if (pending > 0) continue
    try {
      await tryAdvanceRoundAfterTableComplete(io, r.id)
      const roundMeta = await prisma.tournamentRound.findUnique({
        where: { id: r.id },
        select: { tournamentId: true },
      })
      if (roundMeta) emitTournamentLiveSpectateChanged(io, roundMeta.tournamentId)
    } catch (e) {
      rootLogger.warn({
        msg: 'tournament_recovery_advance_failed',
        roundId: r.id,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }
}
