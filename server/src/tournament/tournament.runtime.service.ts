import type { Server } from 'socket.io'
import type { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'
import { rootLogger } from '../observability/logger.js'
import { buildOpeningRound, buildRoundFromSurvivors } from './bracket/TournamentBracketBuilder.js'
import { createAndRegisterTournamentTable, makeTournamentGameId } from './tournamentTableFactory.js'
import { tournamentEntryFeeChips } from './tournament.entryFee.js'
import { grantTournamentRewardsIfMissing } from './tournament.reward.service.js'
import { seedFromTournamentId } from './tournament.seed.js'
import { TOURNAMENT_MIN_PLAYERS } from './tournament.create.validation.js'
import { emitTournamentLiveSpectateChanged } from './tournament.roster.events.js'

/** `scheduled` : heure de départ atteinte — pas assez de monde → annulation. `host` : clic hôte — pas assez → erreur API, tournoi inchangé. */
export type TournamentStartSource = 'host' | 'scheduled'

/**
 * Après une table terminée : pour le client (GAME_ENDED).
 * - pending_other_tables : d'autres tables du même tour sont encore en cours → salle d'attente / Zip.
 * - next_round_spawned : le tour est bouclé, les tables suivantes sont créées (TOURNAMENT_TABLE_ASSIGNED).
 * - tournament_complete : vainqueur final du tournoi.
 */
export type TournamentTableFinishAdvance =
  | 'pending_other_tables'
  | 'next_round_spawned'
  | 'tournament_complete'

export async function recordTournamentEliminationsIfAny(
  gameId: string,
  bustedUserIds: string[],
): Promise<void> {
  const uniq = [...new Set(bustedUserIds)].filter(Boolean)
  if (uniq.length === 0) return

  const table = await prisma.tournamentTable.findFirst({
    where: { gameId },
    include: { round: { select: { tournamentId: true } } },
  })
  if (!table) return
  const tournamentId = table.round.tournamentId

  const agg = await prisma.tournamentPlayer.aggregate({
    where: { tournamentId },
    _max: { eliminationOrder: true },
  })
  let order = (agg._max.eliminationOrder ?? 0) + 1
  const now = new Date()

  for (const userId of uniq) {
    await prisma.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        userId,
        status: { in: ['ACTIVE', 'REGISTERED', 'WAITING_NEXT_ROUND'] },
      },
      data: {
        status: 'ELIMINATED',
        eliminatedAt: now,
        eliminationOrder: order,
        eliminatedFromTableId: table.id,
      },
    })
    order += 1
  }
}

async function emitTableAssigned(
  io: Server,
  tournamentId: string,
  userIds: string[],
  gameId: string,
  roundNumber: number,
  isFinalTable: boolean,
): Promise<void> {
  for (const uid of userIds) {
    io.to(`user:${uid}`).emit('TOURNAMENT_TABLE_ASSIGNED', {
      tournamentId,
      gameId,
      roundNumber,
      isFinalTable,
    })
  }
}

async function ensureFinalSnapshotFromLastRound(
  tournamentId: string,
  winnerUserId: string,
  completedRoundTables: { id: string; playerCount: number }[],
): Promise<void> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { finalTableInitialStackSum: true, initialStack: true },
  })
  if (!t || t.finalTableInitialStackSum != null) return

  const tableIds = completedRoundTables.map((x) => x.id)
  const parts = await prisma.tournamentPlayer.findMany({
    where: {
      tournamentId,
      OR: [{ userId: winnerUserId }, { eliminatedFromTableId: { in: tableIds } }],
    },
    select: { userId: true },
  })
  const uniq = [...new Set(parts.map((p) => p.userId))]
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      finalTablePlayerIds: uniq,
      finalTableInitialStackSum: uniq.length * t.initialStack,
    },
  })
}

async function assignFinalRanksAndWinnerStatus(
  tournamentId: string,
  winnerUserId: string,
): Promise<void> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      finalTablePlayerIds: true,
    },
  })
  const raw = t?.finalTablePlayerIds as unknown
  const finalIds = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && x.length > 0) : null

  if (!finalIds || finalIds.length < 2) {
    rootLogger.warn({
      msg: 'tournament_finalize_missing_final_snapshot',
      tournamentId,
      detail: 'fallback_minimal_winner_rank',
    })
    await prisma.tournamentPlayer.update({
      where: { tournamentId_userId: { tournamentId, userId: winnerUserId } },
      data: { finalRank: 1, status: 'WINNER' },
    })
    await prisma.tournamentPlayer.updateMany({
      where: {
        tournamentId,
        userId: { not: winnerUserId },
        finalRank: null,
        status: 'ELIMINATED',
      },
      data: { finalRank: 99 },
    })
    return
  }

  await prisma.tournamentPlayer.update({
    where: { tournamentId_userId: { tournamentId, userId: winnerUserId } },
    data: { finalRank: 1, status: 'WINNER' },
  })

  if (finalIds.length === 3) {
    const rows = await prisma.tournamentPlayer.findMany({
      where: { tournamentId, userId: { in: finalIds } },
    })
    const eliminated = rows
      .filter((r) => r.userId !== winnerUserId && r.status === 'ELIMINATED')
      .sort((a, b) => (a.eliminationOrder ?? 0) - (b.eliminationOrder ?? 0))
    const third = eliminated[0]
    const second = eliminated[1]
    if (third) {
      await prisma.tournamentPlayer.update({
        where: { tournamentId_userId: { tournamentId, userId: third.userId } },
        data: { finalRank: 3 },
      })
    }
    if (second) {
      await prisma.tournamentPlayer.update({
        where: { tournamentId_userId: { tournamentId, userId: second.userId } },
        data: { finalRank: 2 },
      })
    }
  } else if (finalIds.length === 2) {
    const loserId = finalIds.find((id) => id !== winnerUserId)
    if (loserId) {
      await prisma.tournamentPlayer.update({
        where: { tournamentId_userId: { tournamentId, userId: loserId } },
        data: { finalRank: 2 },
      })
    }
    const others = await prisma.tournamentPlayer.findMany({
      where: {
        tournamentId,
        userId: { notIn: finalIds },
        status: 'ELIMINATED',
      },
      select: { userId: true, eliminationOrder: true },
    })
    let thirdUser: string | null = null
    let bestOrder = -1
    for (const o of others) {
      const ord = o.eliminationOrder ?? 0
      if (ord > bestOrder) {
        bestOrder = ord
        thirdUser = o.userId
      }
    }
    if (thirdUser) {
      await prisma.tournamentPlayer.update({
        where: { tournamentId_userId: { tournamentId, userId: thirdUser } },
        data: { finalRank: 3 },
      })
    }
  }

  await prisma.tournamentPlayer.updateMany({
    where: {
      tournamentId,
      finalRank: null,
      status: 'ELIMINATED',
    },
    data: { finalRank: 99 },
  })
}

async function finalizeTournament(
  io: Server,
  tournamentId: string,
  winnerUserId: string,
  completedRoundTables: { id: string; playerCount: number }[],
): Promise<void> {
  await ensureFinalSnapshotFromLastRound(tournamentId, winnerUserId, completedRoundTables)
  await assignFinalRanksAndWinnerStatus(tournamentId, winnerUserId)
  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: 'COMPLETED' },
  })
  const completedPayload = { tournamentId, winnerUserId }
  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_COMPLETED', completedPayload)
  io.to(`user:${winnerUserId}`).emit('TOURNAMENT_COMPLETED', completedPayload)
  try {
    await grantTournamentRewardsIfMissing(prisma, tournamentId)
  } catch (e) {
    rootLogger.error({
      msg: 'tournament_grant_rewards_failed',
      tournamentId,
      detail: e instanceof Error ? e.message : String(e),
    })
  }
}

async function spawnRoundTables(
  io: Server,
  tournamentId: string,
  roundNumber: number,
  opening: { tables: { tableIndex: number; playerIds: string[] }[] },
  isFinal: boolean,
  blindSmall: number,
  blindBig: number,
): Promise<void> {
  const round = await prisma.tournamentRound.create({
    data: {
      tournamentId,
      roundNumber,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  })

  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { initialStack: true },
  })
  const stack = t?.initialStack ?? 1000

  for (const tab of opening.tables) {
    const gameId = makeTournamentGameId()
    const users = await prisma.user.findMany({
      where: { id: { in: tab.playerIds } },
      select: { id: true, username: true, avatarUrl: true },
    })
    const byId = new Map(users.map((u) => [u.id, u]))
    const seats = tab.playerIds.map((uid) => {
      const u = byId.get(uid)
      return {
        userId: uid,
        username: u?.username ?? 'Joueur',
        initialStack: stack,
        avatarUrl: u?.avatarUrl ?? null,
      }
    })

    await prisma.tournamentTable.create({
      data: {
        roundId: round.id,
        gameId,
        status: 'IN_PROGRESS',
        playerCount: seats.length,
        isFinalTable: isFinal,
      },
    })

    if (isFinal) {
      await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          finalTablePlayerIds: tab.playerIds,
          finalTableInitialStackSum: tab.playerIds.length * stack,
        },
      })
    }

    await createAndRegisterTournamentTable({
      gameId,
      tournamentId,
      seats,
      smallBlind: blindSmall,
      bigBlind: blindBig,
    })

    await emitTableAssigned(io, tournamentId, tab.playerIds, gameId, roundNumber, isFinal)
  }
}

export async function tryAdvanceRoundAfterTableComplete(
  io: Server,
  roundId: string,
): Promise<TournamentTableFinishAdvance> {
  const pending = await prisma.tournamentTable.count({
    where: {
      roundId,
      status: { in: ['PENDING', 'IN_PROGRESS', 'RECOVERING'] },
    },
  })
  if (pending > 0) return 'pending_other_tables'

  const round = await prisma.tournamentRound.findUnique({
    where: { id: roundId },
    include: { tournament: true },
  })
  if (!round) return 'pending_other_tables'

  await prisma.tournamentRound.update({
    where: { id: roundId },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })

  const tables = await prisma.tournamentTable.findMany({
    where: { roundId },
    orderBy: { createdAt: 'asc' },
  })
  const winners = tables.map((x) => x.winnerUserId).filter((x): x is string => Boolean(x))
  const { tournament } = round

  if (winners.length === 1) {
    await finalizeTournament(io, tournament.id, winners[0]!, tables)
    return 'tournament_complete'
  }

  /* Round non-final terminé : on spawn directement les tables du round suivant.
   * Le délai de 5s avant la finale est géré côté client via `finalZip=1` +
   * `TOURNAMENT_FINAL_ZIP_MS` (TournamentWaiting.tsx). Pas de fenêtre "Prêt"
   * inter-rounds (volontairement retiré pour restaurer la transition auto). */
  if (winners.length < 2) {
    rootLogger.warn({
      msg: 'tournament_advance_round_no_winners',
      tournamentId: tournament.id,
      roundId,
      winners: winners.length,
    })
    return 'pending_other_tables'
  }

  const nextRoundNumber = round.roundNumber + 1
  const seed = seedFromTournamentId(`${tournament.id}:${nextRoundNumber}`)
  const next = buildRoundFromSurvivors(winners, seed)
  const isFinal = winners.length <= 3 && winners.length >= 2

  await prisma.tournamentPlayer.updateMany({
    where: { tournamentId: tournament.id, userId: { in: winners } },
    data: { status: 'ACTIVE' },
  })

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: {
      status: 'ROUND_IN_PROGRESS',
      currentRoundNumber: nextRoundNumber,
    },
  })

  io.to(`tournament:${tournament.id}`).emit('TOURNAMENT_NEXT_ROUND', {
    tournamentId: tournament.id,
    roundNumber: nextRoundNumber,
  })

  await spawnRoundTables(
    io,
    tournament.id,
    nextRoundNumber,
    next,
    isFinal,
    tournament.blindSmall,
    tournament.blindBig,
  )
  return 'next_round_spawned'
}

export async function notifyTournamentTableFinished(
  io: Server,
  gameId: string,
  winnerUserId: string,
): Promise<TournamentTableFinishAdvance> {
  const table = await prisma.tournamentTable.findFirst({
    where: { gameId },
    include: { round: true },
  })
  if (!table) return 'pending_other_tables'

  await prisma.tournamentTable.update({
    where: { id: table.id },
    data: { status: 'COMPLETED', winnerUserId },
  })

  await prisma.tournamentPlayer.updateMany({
    where: { userId: winnerUserId, tournamentId: table.round.tournamentId },
    data: { status: 'WAITING_NEXT_ROUND' },
  })

  const advance = await tryAdvanceRoundAfterTableComplete(io, table.roundId)
  emitTournamentLiveSpectateChanged(io, table.round.tournamentId)
  return advance
}

export async function startTournamentFromDb(
  tournamentId: string,
  io: Server,
  options: { source?: TournamentStartSource } = {},
): Promise<void> {
  const source = options.source ?? 'scheduled'
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: { where: { status: { in: ['REGISTERED', 'ACTIVE'] } } },
    },
  })
  if (!tournament) return
  if (tournament.status !== 'REGISTRATION_OPEN' && tournament.status !== 'STARTING') {
    return
  }

  const playerIds = tournament.players.map((p) => p.userId)
  if (playerIds.length < TOURNAMENT_MIN_PLAYERS) {
    if (source === 'host') {
      throw new Error(
        `Au moins ${TOURNAMENT_MIN_PLAYERS} joueurs inscrits sont requis pour démarrer (${playerIds.length}/${TOURNAMENT_MIN_PLAYERS})`,
      )
    }
    const fee = tournamentEntryFeeChips(tournament.initialStack)
    await prisma.$transaction(async (tx) => {
      for (const p of tournament.players) {
        await tx.user.update({
          where: { id: p.userId },
          data: { chips: { increment: fee } },
        })
      }
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { status: 'CANCELLED' },
      })
    })
    io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_CANCELLED', {
      tournamentId,
      reason: 'INSUFFICIENT_PLAYERS',
    })
    emitTournamentLiveSpectateChanged(io, tournamentId)
    return
  }

  const seed = seedFromTournamentId(tournament.id)
  const opening = buildOpeningRound(playerIds, seed)

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      status: 'ROUND_IN_PROGRESS',
      currentRoundNumber: 1,
      bracketJson: opening as unknown as Prisma.InputJsonValue,
    },
  })

  await prisma.tournamentPlayer.updateMany({
    where: { tournamentId, userId: { in: playerIds } },
    data: { status: 'ACTIVE' },
  })

  const isFinalOpening = opening.tables.length === 1

  await spawnRoundTables(
    io,
    tournamentId,
    1,
    opening,
    isFinalOpening,
    tournament.blindSmall,
    tournament.blindBig,
  )

  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_STARTED', { tournamentId })
  emitTournamentLiveSpectateChanged(io, tournamentId)
}
