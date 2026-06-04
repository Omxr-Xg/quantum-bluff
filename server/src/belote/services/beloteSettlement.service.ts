import { randomUUID } from 'crypto'
import type { Server } from 'socket.io'
import { prisma } from '../../config/database.js'
import {
  awardXpInTransaction,
  XP_BELOTE_PLAY,
  XP_BELOTE_WIN,
} from '../../logic/gamification.js'
import type { BeloteTableController } from '../../logic/belote/BeloteTableController.js'
import type { BeloteTeam } from '../../logic/belote/types.js'
import { activeBeloteGames, persistBeloteSnapshot } from '../../shared/activeBeloteGames.js'
import { appendWalletLedgerEntry } from '../../casino/services/walletLedger.service.js'
import { createCasinoRoundContext } from '../../casino/services/roundContext.service.js'
import { intChips } from '../../utils/chips.js'

export const BELOTE_WIN_CHIPS = 40
export const BELOTE_PLAY_CHIPS = 8

export async function settleBeloteGame(
  table: BeloteTableController,
  io?: Server,
): Promise<void> {
  const winningTeam = table.winningTeam()
  if (!winningTeam) return

  const state = table.getState()
  const gameId = table.gameId
  const roomId = table.roomId
  const endedAt = new Date()

  const settlements: Array<{
    userId: string
    username: string
    won: boolean
    chipsAwarded: number
    xpAwarded: number
  }> = []

  await prisma.$transaction(async (tx) => {
    for (const p of state.players) {
      const won = p.team === winningTeam
      const chipsAwarded = won ? BELOTE_WIN_CHIPS : BELOTE_PLAY_CHIPS
      const xpAwarded = won ? XP_BELOTE_PLAY + XP_BELOTE_WIN : XP_BELOTE_PLAY

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
          reason: won ? 'BELOTE_WIN' : 'BELOTE_PLAY',
          amount: chipsAwarded,
          balanceBefore: balBefore,
          balanceAfter: intChips(updated.chips),
        },
        tx,
      )

      await awardXpInTransaction(tx, p.userId, xpAwarded)

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
        summary: { settlements } as object,
        players: {
          create: state.players.map((p) => ({
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

  activeBeloteGames.delete(gameId)
  await prisma.beloteGameSnapshot.deleteMany({ where: { roomId } }).catch(() => {})

  if (io) {
    io.to(`belote-game:${gameId}`).emit('BELOTE_GAME_END', {
      gameId,
      winningTeam,
      teamScoreA: state.teamScoreA,
      teamScoreB: state.teamScoreB,
      settlements,
    })
    io.to(`belote-room:${roomId}`).emit('BELOTE_ROOM_UPDATED', { roomId, status: 'WAITING' })
  }
}

export function broadcastBeloteGame(io: Server | undefined, gameId: string): void {
  if (!io) return
  const table = activeBeloteGames.getSync(gameId)
  if (!table) return
  const sockets = io.sockets.sockets
  for (const [, socket] of sockets) {
    const uid = (socket as { userId?: string }).userId
    if (!uid) continue
    if (!socket.rooms.has(`belote-game:${gameId}`)) continue
    socket.emit('BELOTE_GAME_UPDATE', {
      gameId,
      state: table.getSanitizedState(uid),
    })
  }
}

export async function syncBeloteAfterAction(
  table: BeloteTableController,
  io?: Server,
): Promise<void> {
  if (table.getState().phase === 'DEAL_END') {
    table.startNextDeal()
  }

  const state = table.getState()
  await persistBeloteSnapshot(table.roomId, table.gameId, state)

  if (state.phase === 'GAME_END') {
    await settleBeloteGame(table, io)
    return
  }

  broadcastBeloteGame(io, table.gameId)
}
