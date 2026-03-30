import { prisma } from '../../../config/database.js'
import { isRankUsedInBestFiveOfSeven } from '../../../logic/Evaluator.js'
import { appendWalletLedgerEntry } from '../../../casino/services/walletLedger.service.js'
import { createHiddenBetLedgerContext } from '../hiddenBetLedgerContext.js'
import {
  CLASS_KEY_TO_CATEGORY,
  HIDDEN_BETS_RESOLUTION_VERSION,
  type HiddenBetResolutionPayload,
  type SelectionPayload,
} from '../types.js'
import { rootLogger } from '../../../observability/logger.js'
import type { Server } from 'socket.io'

type Tri = boolean | 'VOID'

function evalSelection(sel: SelectionPayload, payload: HiddenBetResolutionPayload): Tri {
  const reason = payload.handEndReason
  if (
    sel.marketType === 'WINNING_HAND_CLASS' ||
    sel.marketType === 'WINNING_HAND_CONTAINS_RANK' ||
    sel.marketType === 'FINAL_WINNING_HAND_CLASS'
  ) {
    if (reason === 'WIN_BY_FOLD' || reason === 'FORCED_END' || !reason) return 'VOID'
  }
  if (sel.marketType === 'PLAYER_WINS' || sel.marketType === 'PLAYER_WINS_CURRENT_HAND') {
    return payload.winnerIds.includes(sel.playerId)
  }
  if (sel.marketType === 'WINNING_HAND_CLASS' || sel.marketType === 'FINAL_WINNING_HAND_CLASS') {
    if (reason !== 'SHOWDOWN' && reason !== 'ALL_IN_RUNOUT') return 'VOID'
    return CLASS_KEY_TO_CATEGORY[sel.class] === payload.winningCategory
  }
  if (sel.marketType === 'WINNING_HAND_CONTAINS_RANK') {
    if (reason !== 'SHOWDOWN' && reason !== 'ALL_IN_RUNOUT') return 'VOID'
    const wid = payload.winnerIds[0]
    const hole = payload.playerCards[wid]
    if (!hole) return 'VOID'
    return isRankUsedInBestFiveOfSeven([...hole, ...payload.board], sel.rank)
  }
  if (sel.marketType === 'HAND_REACHES_SHOWDOWN') {
    if (reason === 'FORCED_END' || !reason) return 'VOID'
    if (reason === 'SHOWDOWN' || reason === 'ALL_IN_RUNOUT') return true
    if (reason === 'WIN_BY_FOLD') return false
    return 'VOID'
  }
  if (sel.marketType === 'HAND_ENDS_BY_FOLD') {
    if (reason === 'FORCED_END' || !reason) return 'VOID'
    if (reason === 'WIN_BY_FOLD') return true
    if (reason === 'SHOWDOWN' || reason === 'ALL_IN_RUNOUT') return false
    return 'VOID'
  }
  return false
}

function combineAnd(results: Tri[]): Tri {
  if (results.some((r) => r === 'VOID')) return 'VOID'
  return results.every((r) => r === true)
}

export async function resolveHiddenBetsForHand(
  payload: HiddenBetResolutionPayload,
  io?: Server
): Promise<{ resolved: number }> {
  const { gameId, handId } = payload
  let processed = 0
  try {
    await prisma.$transaction(async (tx) => {
      try {
        await tx.hiddenBetHandResolution.create({
          data: { gameId, handId },
        })
      } catch (e: unknown) {
        const code = typeof e === 'object' && e && 'code' in e ? (e as { code: string }).code : ''
        if (code === 'P2002') return
        throw e
      }

      const tickets = await tx.hiddenBetTicket.findMany({
        where: { gameId, handId, status: 'PENDING' },
        include: { selections: { orderBy: { sequenceOrder: 'asc' } } },
      })

      for (const ticket of tickets) {
        await tx.hiddenBetTicket.update({
          where: { id: ticket.id },
          data: { status: 'SETTLING', resolutionStartedAt: new Date() },
        })

        const sels = ticket.selections.map((row) => JSON.parse(row.paramsJson) as SelectionPayload)

        let outcome: 'WON' | 'LOST' | 'VOID'
        if (ticket.combinator === 'AND') {
          const parts = sels.map((s) => evalSelection(s, payload))
          const c = combineAnd(parts)
          if (c === 'VOID') outcome = 'VOID'
          else outcome = c ? 'WON' : 'LOST'
        } else {
          const one = evalSelection(sels[0], payload)
          if (one === 'VOID') outcome = 'VOID'
          else outcome = one ? 'WON' : 'LOST'
        }

        const summary = {
          outcome,
          handEndReason: payload.handEndReason,
          winnerIds: payload.winnerIds,
          resolutionVersion: HIDDEN_BETS_RESOLUTION_VERSION,
        }

        const user = await tx.user.findUnique({ where: { id: ticket.userId } })
        if (!user) {
          await tx.hiddenBetTicket.update({
            where: { id: ticket.id },
            data: {
              status: 'VOID',
              resolvedAt: new Date(),
              resultSummaryJson: JSON.stringify({ ...summary, note: 'user_missing' }),
            },
          })
          processed++
          continue
        }

        if (outcome === 'WON') {
          const pay = ticket.potentialPayout
          const balanceAfter = user.chips + pay
          await tx.user.update({
            where: { id: ticket.userId },
            data: { chips: balanceAfter },
          })
          await appendWalletLedgerEntry(
            {
              context: createHiddenBetLedgerContext({
                userId: ticket.userId,
                actionId: `${ticket.actionId}:payout`,
                gameId,
                handId,
              }),
              reason: 'HIDDEN_BET_PAYOUT',
              amount: pay,
              balanceBefore: user.chips,
              balanceAfter,
            },
            tx
          )
        } else if (outcome === 'VOID') {
          const refund = ticket.stake
          const balanceAfter = user.chips + refund
          await tx.user.update({
            where: { id: ticket.userId },
            data: { chips: balanceAfter },
          })
          await appendWalletLedgerEntry(
            {
              context: createHiddenBetLedgerContext({
                userId: ticket.userId,
                actionId: `${ticket.actionId}:refund_void`,
                gameId,
                handId,
              }),
              reason: 'HIDDEN_BET_REFUND_VOID',
              amount: refund,
              balanceBefore: user.chips,
              balanceAfter,
            },
            tx
          )
        }

        await tx.hiddenBetTicket.update({
          where: { id: ticket.id },
          data: {
            status: outcome === 'WON' ? 'WON' : outcome === 'VOID' ? 'VOID' : 'LOST',
            resolvedAt: new Date(),
            resultSummaryJson: JSON.stringify(summary),
          },
        })
        processed++

        if (io) {
          io.to(gameId).emit('HIDDEN_BET_TICKET_UPDATED', {
            ticketId: ticket.id,
            status: outcome,
            resolvedAt: new Date().toISOString(),
            payout: outcome === 'WON' ? ticket.potentialPayout : outcome === 'VOID' ? ticket.stake : 0,
            resultSummary: summary,
          })
        }
      }
    })
  } catch (err) {
    rootLogger.error({
      msg: 'hidden_bet_resolution_failed',
      gameId,
      handId,
      err: String(err),
    })
    throw err
  }

  return { resolved: processed }
}
