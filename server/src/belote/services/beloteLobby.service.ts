import { prisma } from '../../config/database.js'
import { BELOTE_STUCK_MAX_MS } from '../recovery/beloteRecovery.service.js'
import { formatBeloteRoomLobby, type BeloteRoomLobbyRow } from './beloteRoomFormat.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'

const BELOTE_GAME_MAX_DURATION_MS = BELOTE_STUCK_MAX_MS
const LOBBY_WAITING_MAX_AGE_MS = 60 * 60 * 1000

export type BeloteGameInProgressLobbyItem = {
  roomId: string
  roomName: string
  gameId: string
  playerCount: number
  maxPlayers: number
  phase: string
  canJoin: boolean
  canSpectate: boolean
}

async function getBeloteFriendIds(userId: string): Promise<Set<string>> {
  const friendships = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
    select: { user1Id: true, user2Id: true },
  })
  const set = new Set<string>()
  for (const f of friendships) {
    set.add(f.user1Id === userId ? f.user2Id : f.user1Id)
  }
  return set
}

export async function listBeloteWaitingRoomsForLobby(userId: string) {
  const oneHourAgo = new Date(Date.now() - LOBBY_WAITING_MAX_AGE_MS)
  const rooms = await prisma.beloteRoom.findMany({
    where: {
      status: 'WAITING',
      createdAt: { gte: oneHourAgo },
      OR: [
        { visibility: 'PUBLIC' },
        { hostId: userId },
        { seats: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      hostId: true,
      maxPlayers: true,
      visibility: true,
      status: true,
      targetScore: true,
      buyIn: true,
      variant: true,
      gameId: true,
      passwordHash: true,
      seats: {
        select: {
          participantType: true,
          userId: true,
          botId: true,
          user: { select: { id: true } },
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  })

  return rooms.map((r) => formatBeloteRoomLobby(r as BeloteRoomLobbyRow))
}

type SnapshotPhase = { phase?: string; startedAt?: string }

function readGamePhase(
  gameId: string,
  snapshotJson: unknown,
  roomUpdatedAt: Date,
): { phase: string; startedAt: number } | null {
  const cached = activeBeloteGames.getSync(gameId)
  if (cached) {
    const st = cached.getState()
    if (st.phase === 'GAME_END') return null
    const startedAt = st.startedAt ? Date.parse(st.startedAt) : roomUpdatedAt.getTime()
    return { phase: st.phase, startedAt }
  }

  if (!snapshotJson || typeof snapshotJson !== 'object') return null
  const snap = snapshotJson as SnapshotPhase
  const phase = snap.phase ?? 'PLAYING'
  if (phase === 'GAME_END') return null
  const startedAt = snap.startedAt
    ? Date.parse(snap.startedAt)
    : roomUpdatedAt.getTime()
  return { phase, startedAt }
}

export async function listBeloteGamesInProgressForLobby(
  userId: string,
): Promise<BeloteGameInProgressLobbyItem[]> {
  const myFriends = await getBeloteFriendIds(userId)
  const rooms = await prisma.beloteRoom.findMany({
    where: { status: 'IN_GAME', gameId: { not: null } },
    select: {
      id: true,
      name: true,
      gameId: true,
      hostId: true,
      maxPlayers: true,
      visibility: true,
      updatedAt: true,
      seats: { select: { userId: true } },
      snapshot: { select: { snapshot: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  })

  const now = Date.now()
  const result: BeloteGameInProgressLobbyItem[] = []

  for (const room of rooms) {
    if (!room.gameId) continue

    const seatUserIds = room.seats
      .map((s) => s.userId)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    const userInGame = seatUserIds.includes(userId)
    const hasFriendInGame = seatUserIds.some((id) => myFriends.has(id))

    if (room.visibility === 'PRIVATE') {
      const canSeePrivate =
        userInGame ||
        room.hostId === userId ||
        myFriends.has(room.hostId) ||
        hasFriendInGame
      if (!canSeePrivate) continue
    }

    const phaseInfo = readGamePhase(
      room.gameId,
      room.snapshot?.snapshot,
      room.updatedAt,
    )
    if (!phaseInfo) continue

    if (
      Number.isFinite(phaseInfo.startedAt) &&
      now - phaseInfo.startedAt > BELOTE_GAME_MAX_DURATION_MS
    ) {
      continue
    }

    const playerCount = room.seats.length
    if (playerCount === 0) continue

    result.push({
      roomId: room.id,
      roomName: room.name,
      gameId: room.gameId,
      playerCount,
      maxPlayers: room.maxPlayers,
      phase: phaseInfo.phase,
      canJoin: userInGame,
      canSpectate: !userInGame,
    })
  }

  return result
}

export async function getBeloteLobbyPayload(userId: string) {
  const [waitingRooms, gamesInProgress] = await Promise.all([
    listBeloteWaitingRoomsForLobby(userId),
    listBeloteGamesInProgressForLobby(userId),
  ])
  return { waitingRooms, gamesInProgress }
}
