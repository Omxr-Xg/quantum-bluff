import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { grantTournamentRewardsIfMissing } from './tournament.reward.service.js'
import { emitTournamentLiveSpectateChanged } from './tournament.roster.events.js'
import { tryAdvanceRoundAfterTableComplete } from './tournament.runtime.service.js'
import {
  autoReadyAndProceed,
  computeReadyState,
  type TournamentRoundReadyOpenedPayload,
} from './tournament.roundReady.service.js'

/**
 * Réconciliation légère : récompenses manquantes sur tournois COMPLETED ;
 * rounds bloqués si toutes les tables sont COMPLETED (crash avant avancement) ;
 * fenêtres ready-check ouvertes (auto-ready si expirées, re-émission sinon).
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

  const readyWindows = await prisma.tournament.findMany({
    where: { status: 'WAITING_READY_CHECK', nextRoundReadyOpen: true },
    select: {
      id: true,
      nextRoundReadyDeadline: true,
      nextRoundReadyNumber: true,
    },
    take: 100,
  })
  const now = Date.now()
  for (const t of readyWindows) {
    const deadlineMs = t.nextRoundReadyDeadline?.getTime() ?? 0
    try {
      if (deadlineMs <= now) {
        await autoReadyAndProceed(io, t.id)
      } else {
        /* Fenêtre encore valide : re-émettre l'état pour les clients reconnectés. */
        const state = await computeReadyState(t.id)
        if (state.open && state.roundNumber != null && state.deadline) {
          const payload: TournamentRoundReadyOpenedPayload = {
            tournamentId: t.id,
            roundNumber: state.roundNumber,
            deadline: state.deadline,
            surviving: state.surviving,
            isFinal: state.isFinal,
          }
          io.to(`tournament:${t.id}`).emit('TOURNAMENT_ROUND_READY_OPENED', payload)
          for (const uid of state.surviving) {
            io.to(`user:${uid}`).emit('TOURNAMENT_ROUND_READY_OPENED', payload)
          }
          io.to(`tournament:${t.id}`).emit('TOURNAMENT_ROUND_READY_UPDATED', {
            tournamentId: t.id,
            roundNumber: state.roundNumber,
            readyUserIds: state.readyUserIds,
            requiredCount: state.requiredCount,
            allReady: state.allReady,
          })
        }
      }
    } catch (e) {
      rootLogger.warn({
        msg: 'tournament_recovery_ready_check_failed',
        tournamentId: t.id,
        detail: e instanceof Error ? e.message : String(e),
      })
    }
  }
}
