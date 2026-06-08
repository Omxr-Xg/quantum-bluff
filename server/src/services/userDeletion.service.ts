import { prisma } from '../config/database.js'
import { env } from '../config/env.js'
import { activeGames } from '../shared/activeGames.js'
import { activeBlackjackGames } from '../shared/activeBlackjackGames.js'
import { forceCloseBeloteGame } from '../sockets/belote.gateway.handlers.js'
import { getGameIo } from '../sockets/gameIo.registry.js'

export class UserDeletionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message)
    this.name = 'UserDeletionError'
  }
}

/** Supprime définitivement un compte joueur et toutes ses données liées. */
export async function deleteUserAccount(userId: string): Promise<void> {
  if (!userId || userId === env.adminConsoleJwtUserId) {
    throw new UserDeletionError('Cible invalide', 400)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  })
  if (!user) {
    throw new UserDeletionError('Utilisateur introuvable', 404)
  }

  const hostedWaitingRooms = await prisma.waitingRoom.findMany({
    where: { hostId: userId },
    select: { id: true, gameId: true },
  })
  for (const room of hostedWaitingRooms) {
    if (room.gameId) {
      try {
        await activeGames.delete(room.gameId)
      } catch {
        /* partie déjà terminée */
      }
    }
  }

  const blackjackRooms = await prisma.blackjackRoom.findMany({
    where: { hostId: userId },
    select: { gameId: true },
  })
  for (const room of blackjackRooms) {
    if (room.gameId) activeBlackjackGames.delete(room.gameId)
  }

  const beloteRooms = await prisma.beloteRoom.findMany({
    where: { hostId: userId },
    select: { gameId: true },
  })
  for (const room of beloteRooms) {
    if (room.gameId) {
      try {
        await forceCloseBeloteGame(room.gameId, getGameIo())
      } catch {
        /* runtime absent */
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.userStats.deleteMany({ where: { userId } })
    await tx.playerStats.deleteMany({ where: { playerId: userId } })
    await tx.playerTendencyHandSummary.deleteMany({ where: { playerId: userId } })
    await tx.playerTendencyAction.deleteMany({ where: { playerId: userId } })
    await tx.playerTendencyProfile.deleteMany({ where: { playerId: userId } })
    await tx.gameAction.deleteMany({ where: { playerId: userId } })
    await tx.gameResult.deleteMany({ where: { winnerId: userId } })
    await tx.gameHistory.updateMany({ where: { winnerId: userId }, data: { winnerId: null } })

    await tx.friendRequest.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    })
    await tx.friendship.deleteMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    })
    await tx.gameInvitation.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    })
    await tx.blackjackRoomInvitation.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    })
    await tx.beloteRoomInvitation.deleteMany({
      where: { OR: [{ senderId: userId }, { receiverId: userId }] },
    })

    await tx.blackjackRoom.deleteMany({ where: { hostId: userId } })
    await tx.beloteRoom.deleteMany({ where: { hostId: userId } })
    await tx.waitingRoom.deleteMany({ where: { hostId: userId } })

    await tx.user.delete({ where: { id: userId } })
  })
}
