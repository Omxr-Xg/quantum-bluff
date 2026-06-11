import type { Server } from 'socket.io'
import type { Prisma } from '../../generated/prisma/index.js'
import type { BeloteGameVariant } from '../../generated/prisma/index.js'
import { prisma } from '../../config/database.js'
import { seedFromTournamentId } from '../tournament.seed.js'
import type { TournamentTableFinishAdvance } from '../tournament.runtime.service.js'
import { finalizeTournament } from '../tournament.runtime.service.js'
import { emitTournamentLiveSpectateChanged } from '../tournament.roster.events.js'
import {
  buildBeloteOpeningRound,
  buildBeloteRoundFromSurvivors,
} from './BeloteTournamentBracketBuilder.js'
import {
  createAndRegisterBeloteTournamentTable,
  makeBeloteTournamentGameId,
} from './beloteTournamentTableFactory.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteTeam } from '../../logic/belote/types.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'

async function emitBeloteTableAssigned(
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
      gameKind: 'BELOTE',
    })
  }
}

async function spawnBeloteRoundTables(
  io: Server,
  tournamentId: string,
  roundNumber: number,
  opening: { tables: { tableIndex: number; playerIds: string[] }[] },
  isFinal: boolean,
  variant: BeloteGameVariant,
  targetScore: number,
): Promise<void> {
  const round = await prisma.tournamentRound.create({
    data: {
      tournamentId,
      roundNumber,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
    },
  })

  for (const tab of opening.tables) {
    const gameId = makeBeloteTournamentGameId()
    const users = await prisma.user.findMany({
      where: { id: { in: tab.playerIds } },
      select: { id: true, username: true, avatarUrl: true },
    })
    const byId = new Map(users.map((u) => [u.id, u]))
    const seats = tab.playerIds.map((uid, position) => {
      const u = byId.get(uid)
      return {
        userId: uid,
        username: u?.username ?? 'Joueur',
        position,
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
          finalTableInitialStackSum: tab.playerIds.length,
        },
      })
    }

    await createAndRegisterBeloteTournamentTable({
      gameId,
      tournamentId,
      variant,
      targetScore,
      seats,
    })

    await emitBeloteTableAssigned(
      io,
      tournamentId,
      tab.playerIds,
      gameId,
      roundNumber,
      isFinal,
    )
  }
}

export async function startBeloteTournamentFromDb(
  tournamentId: string,
  io: Server,
): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: { where: { status: { in: ['REGISTERED', 'ACTIVE'] } } },
    },
  })
  if (!tournament || tournament.gameType !== 'BELOTE') return
  if (!tournament.beloteVariant || !tournament.beloteTargetScore) {
    throw new Error('Paramètres Belote manquants')
  }

  const playerIds = tournament.players.map((p) => p.userId)
  const seed = seedFromTournamentId(tournament.id)
  const opening = buildBeloteOpeningRound(playerIds, seed)

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

  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_STARTED', { tournamentId })

  await spawnBeloteRoundTables(
    io,
    tournamentId,
    1,
    opening,
    playerIds.length === 4,
    tournament.beloteVariant,
    tournament.beloteTargetScore,
  )
  emitTournamentLiveSpectateChanged(io, tournamentId)
}

export async function notifyBeloteTournamentTableFinished(
  io: Server,
  table: BeloteTableController,
  winningTeam: BeloteTeam,
): Promise<TournamentTableFinishAdvance> {
  const gameId = table.gameId
  const state = table.getState()
  const advancing = state.players
    .filter((p) => p.team === winningTeam && !p.isBot)
    .map((p) => p.userId)
  const eliminated = state.players
    .filter((p) => p.team !== winningTeam && !p.isBot)
    .map((p) => p.userId)

  const row = await prisma.tournamentTable.findFirst({
    where: { gameId },
    include: { round: { include: { tournament: true } } },
  })
  if (!row) return 'pending_other_tables'

  const tournamentId = row.round.tournamentId

  await prisma.tournamentTable.update({
    where: { id: row.id },
    data: {
      status: 'COMPLETED',
      winnerUserId: advancing[0] ?? null,
      advancingUserIds: advancing,
    },
  })

  if (eliminated.length > 0) {
    const agg = await prisma.tournamentPlayer.aggregate({
      where: { tournamentId },
      _max: { eliminationOrder: true },
    })
    let order = (agg._max.eliminationOrder ?? 0) + 1
    const now = new Date()
    for (const userId of eliminated) {
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
          eliminatedFromTableId: row.id,
        },
      })
      order += 1
    }
  }

  if (advancing.length > 0) {
    await prisma.tournamentPlayer.updateMany({
      where: { tournamentId, userId: { in: advancing } },
      data: { status: 'WAITING_NEXT_ROUND' },
    })
  }

  activeBeloteGames.delete(gameId)

  const advance = await tryAdvanceBeloteRoundAfterTableComplete(io, row.roundId)
  emitTournamentLiveSpectateChanged(io, tournamentId)

  io.to(`belote-game:${gameId}`).emit('BELOTE_GAME_END', {
    gameId,
    winningTeam,
    teamScoreA: state.teamScoreA,
    teamScoreB: state.teamScoreB,
  })

  io.to(`belote-game:${gameId}`).emit('BELOTE_TOURNAMENT_TABLE_COMPLETE', {
    gameId,
    tournamentId,
    winningTeam,
    tournamentAdvance: advance,
    advancingUserIds: advancing,
  })

  return advance
}

export async function tryAdvanceBeloteRoundAfterTableComplete(
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
  if (!round || round.tournament.gameType !== 'BELOTE') {
    return 'pending_other_tables'
  }

  const claimed = await prisma.tournamentRound.updateMany({
    where: { id: roundId, status: 'IN_PROGRESS' },
    data: { status: 'COMPLETED', completedAt: new Date() },
  })
  if (claimed.count === 0) {
    if (round.tournament.status === 'COMPLETED') return 'tournament_complete'
    if (round.tournament.currentRoundNumber > round.roundNumber) {
      return 'next_round_spawned'
    }
    return 'pending_other_tables'
  }

  const tables = await prisma.tournamentTable.findMany({
    where: { roundId },
    orderBy: { createdAt: 'asc' },
  })

  const survivors: string[] = []
  for (const tab of tables) {
    const raw = tab.advancingUserIds as unknown
    if (Array.isArray(raw)) {
      for (const id of raw) {
        if (typeof id === 'string' && id.length > 0) survivors.push(id)
      }
    } else if (tab.winnerUserId) {
      survivors.push(tab.winnerUserId)
    }
  }

  const { tournament } = round
  const variant = tournament.beloteVariant
  const targetScore = tournament.beloteTargetScore
  if (!variant || !targetScore) return 'pending_other_tables'

  if (survivors.length === 2 && tables.some((t) => t.isFinalTable)) {
    await finalizeTournament(io, tournament.id, survivors[0]!, tables)
    if (survivors[1]) {
      await prisma.tournamentPlayer.update({
        where: {
          tournamentId_userId: { tournamentId: tournament.id, userId: survivors[1] },
        },
        data: { finalRank: 1, status: 'WINNER' },
      })
    }
    return 'tournament_complete'
  }

  if (survivors.length < 4) {
    return 'pending_other_tables'
  }

  const nextRoundNumber = round.roundNumber + 1
  const seed = seedFromTournamentId(`${tournament.id}:${nextRoundNumber}`)
  const next = buildBeloteRoundFromSurvivors(survivors, seed)
  const isFinal = survivors.length === 4

  await prisma.tournamentPlayer.updateMany({
    where: { tournamentId: tournament.id, userId: { in: survivors } },
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

  await spawnBeloteRoundTables(
    io,
    tournament.id,
    nextRoundNumber,
    next,
    isFinal,
    variant,
    targetScore,
  )
  return 'next_round_spawned'
}
