import { randomUUID } from 'crypto'
import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import {
  markBeloteMatchCompleted,
  markBeloteMatchWon,
  markBeloteTeamScore,
  markWeeklyNetChipsWon,
} from '../../dailyChallenges/dailyChallenge.service.js'
import {
  awardXpInTransaction,
  XP_BELOTE_PLAY,
  XP_BELOTE_WIN,
} from '../../logic/gamification.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteTeam } from '../../logic/belote/types.js'
import { activeBeloteGames, persistBeloteSnapshot } from '../../shared/activeBeloteGames.js'
import { getBeloteGamePresentUserIds } from './belotePresence.service.js'
import {
  scheduleBeloteTurnTimer,
  stopBeloteTimersForGame,
} from './beloteTurnTimer.service.js'
import { appendWalletLedgerEntry } from '../../casino/services/walletLedger.service.js'
import { createCasinoRoundContext } from '../../casino/services/roundContext.service.js'
import { beloteWinnerPayout } from '../../logic/belote/beloteBuyIn.js'
import { intChips } from '../../utils/chips.js'
import { isBeloteBotId } from '../../shared/beloteBots.js'
import {
  recordBeloteDealOutcome,
  recordBeloteGameOutcome,
} from './beloteAnalytics.service.js'
import { journalBeloteActionLog } from './beloteActionLog.service.js'

/** Retire runtime, snapshot et remet la salle en attente (partie déjà réglée ou abandonnée). */
export async function closeBelotePlaySession(
  roomId: string,
  gameId: string,
): Promise<void> {
  activeBeloteGames.delete(gameId)
  stopBeloteTimersForGame(gameId)
  void import('./beloteBotTurns.service.js').then(({ clearBeloteBotSession }) =>
    clearBeloteBotSession(gameId),
  )
  await prisma.beloteRoomSeat.updateMany({
    where: { roomId },
    data: { isReady: false },
  })
  await prisma.beloteRoom.updateMany({
    where: { id: roomId },
    data: { status: 'WAITING', gameId: null, updatedAt: new Date() },
  })
  await prisma.beloteGameSnapshot.deleteMany({ where: { roomId } }).catch(() => {})
}

export async function settleBeloteGame(
  table: BeloteTableController,
  io?: Server,
): Promise<void> {
  const state = table.getState()
  const gameId = table.gameId
  const roomId = table.roomId

  const { isBeloteTournamentGameId } = await import(
    '../../tournament/belote/beloteTournament.constants.js'
  )
  if (isBeloteTournamentGameId(gameId)) {
    const winningTeam = table.winningTeam()
    if (!winningTeam) return
    stopBeloteTimersForGame(gameId)
    if (io) {
      const { notifyBeloteTournamentTableFinished } = await import(
        '../../tournament/belote/beloteTournament.runtime.service.js'
      )
      await notifyBeloteTournamentTableFinished(io, table, winningTeam)
    } else {
      activeBeloteGames.delete(gameId)
    }
    return
  }

  const already = await prisma.beloteGameResult.findUnique({
    where: { gameId },
    select: { id: true },
  })
  if (already) {
    await closeBelotePlaySession(roomId, gameId)
    return
  }

  const winningTeam = table.winningTeam()
  if (!winningTeam) return

  void recordBeloteGameOutcome(table, winningTeam)

  const endedAt = new Date()

  const settlements: Array<{
    userId: string
    username: string
    won: boolean
    chipsAwarded: number
    xpAwarded: number
  }> = []

  const potTotal = state.potTotal
  const payoutPerWinner = beloteWinnerPayout(potTotal, 2)

  const humanPlayers = state.players.filter(
    (p) => !p.isBot && !isBeloteBotId(p.userId),
  )

  await prisma.$transaction(async (tx) => {
    for (const p of humanPlayers) {
      const won = p.team === winningTeam
      const chipsAwarded = won ? payoutPerWinner : 0
      const xpAwarded = won ? XP_BELOTE_PLAY + XP_BELOTE_WIN : XP_BELOTE_PLAY

      if (won && chipsAwarded > 0) {
        const before = await tx.user.findUnique({
          where: { id: p.userId },
          select: { chips: true },
        })
        if (!before) continue
        const balBefore = intChips(before.chips)

        const updated = await tx.user.update({
          where: { id: p.userId },
          data: { chips: { increment: chipsAwarded } },
          select: { chips: true, experience: true, level: true },
        })

        await appendWalletLedgerEntry(
          {
            context: createCasinoRoundContext({
              userId: p.userId,
              gameType: 'belote',
              roundId: gameId,
              actionId: randomUUID(),
            }),
            reason: 'BELOTE_POT_WIN',
            amount: chipsAwarded,
            balanceBefore: balBefore,
            balanceAfter: intChips(updated.chips),
          },
          tx,
        )
      }

      await awardXpInTransaction(tx, p.userId, xpAwarded)

      const teamScore = p.team === 'A' ? state.teamScoreA : state.teamScoreB
      await markBeloteTeamScore(p.userId, teamScore, tx)
      await markBeloteMatchCompleted(p.userId, tx)
      if (won) {
        await markBeloteMatchWon(p.userId, tx)
        if (chipsAwarded > 0) {
          await markWeeklyNetChipsWon(p.userId, chipsAwarded, tx)
        }
      }

      await tx.belotePlayerStats.upsert({
        where: { userId: p.userId },
        create: {
          userId: p.userId,
          gamesPlayed: 1,
          wins: won ? 1 : 0,
          losses: won ? 0 : 1,
        },
        update: {
          gamesPlayed: { increment: 1 },
          ...(won ? { wins: { increment: 1 } } : { losses: { increment: 1 } }),
        },
      })

      settlements.push({
        userId: p.userId,
        username: p.username,
        won,
        chipsAwarded,
        xpAwarded,
      })
    }

    const result = await tx.beloteGameResult.create({
      data: {
        gameId,
        roomId,
        teamAScore: state.teamScoreA,
        teamBScore: state.teamScoreB,
        winningTeam,
        targetScore: state.targetScore,
        startedAt: new Date(state.startedAt),
        endedAt,
        summary: {
          settlements,
          buyIn: state.buyIn,
          potTotal,
          payoutPerWinner,
        } as object,
        players: {
          create: humanPlayers.map((p) => ({
            userId: p.userId,
            username: p.username,
            team: p.team,
            won: p.team === winningTeam,
          })),
        },
      },
    })

    await tx.beloteRoom.update({
      where: { id: roomId },
      data: { status: 'WAITING', gameId: null },
    })

    void result
  })

  await closeBelotePlaySession(roomId, gameId)

  for (const s of settlements) {
    if (s.won) {
      void import('../../achievements/achievement.service.js').then(async ({ checkAchievements }) => {
        const stats = await prisma.belotePlayerStats.findUnique({
          where: { userId: s.userId },
          select: { wins: true },
        })
        await checkAchievements(s.userId, { type: 'BELOTE_WIN', wins: stats?.wins ?? 0 })
      })
      void import('../../season/season.service.js').then(({ incrementSeasonScore }) =>
        incrementSeasonScore(s.userId, { beloteWins: 1 }),
      )
    }
  }

  if (io) {
    io.to(`belote-game:${gameId}`).emit('BELOTE_GAME_END', {
      gameId,
      winningTeam,
      teamScoreA: state.teamScoreA,
      teamScoreB: state.teamScoreB,
      buyIn: state.buyIn,
      potTotal,
      payoutPerWinner,
      settlements,
    })
    io.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', { roomId, status: 'WAITING' })
  }
}

export async function broadcastBeloteGame(
  io: Server | undefined,
  gameId: string,
): Promise<void> {
  if (!io) return
  const table = activeBeloteGames.getSync(gameId)
  if (!table) return
  const presentUserIds = await getBeloteGamePresentUserIds(io, gameId)
  for (const [, socket] of io.sockets.sockets) {
    const uid = (socket as { userId?: string }).userId
    if (!uid) continue
    if (!socket.rooms.has(`belote-game:${gameId}`)) continue
    const ids = new Set(presentUserIds)
    ids.add(uid)
    const isPlayer = table.getState().players.some((p) => p.userId === uid)
    socket.emit('BELOTE_GAME_UPDATE', {
      gameId,
      state: table.getSanitizedState(uid, !isPlayer),
      presentUserIds: [...ids],
    })
  }
}

export async function syncBeloteAfterAction(
  table: BeloteTableController,
  io?: Server,
): Promise<void> {
  if (table.getState().phase === 'DEAL_END') {
    void recordBeloteDealOutcome(table)
    table.startNextDeal()
  }

  const state = table.getState()
  await journalBeloteActionLog(table.gameId, state.dealLogId, state.lastBeloteAction)
  await persistBeloteSnapshot(table.roomId, table.gameId, state)

  if (state.phase === 'GAME_END') {
    stopBeloteTimersForGame(table.gameId)
    await settleBeloteGame(table, io)
    return
  }

  await broadcastBeloteGame(io, table.gameId)
  scheduleBeloteTurnTimer(io, table.gameId, table)
  const { scheduleBeloteBotTurns } = await import('./beloteBotTurns.service.js')
  scheduleBeloteBotTurns(io, table.gameId)
}
