import { prisma } from '../../config/database.js'
import { BELOTE_STUCK_MAX_MS } from '../recovery/beloteRecovery.service.js'
import { formatBeloteRoomLobby, type BeloteRoomLobbyRow } from './beloteRoomFormat.js'
import { activeBeloteGames } from '../../shared/activeBeloteGames.js'
import {
  loadLobbyFriendSortContext,
  scoreLobbyFriendAffinity,
  sortLobbyByFriendAffinity,
} from '../../lobby/lobbyFriendSort.service.js'

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
  isFriendRoom?: boolean
}

function humanSeatUserIds(
  seats: Array<{ participantType: string; userId: string | null }>,
): string[] {
  return seats
    .filter((s) => s.participantType === 'HUMAN' && s.userId)
    .map((s) => s.userId as string)
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
      createdAt: true,
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

  const { myFriends, coPlayCounts } = await loadLobbyFriendSortContext(userId)
  const enriched = rooms.map((r) => {
    const formatted = formatBeloteRoomLobby(r as BeloteRoomLobbyRow)
    const affinity = scoreLobbyFriendAffinity(
      humanSeatUserIds(r.seats),
      r.hostId,
      myFriends,
      coPlayCounts,
    )
    return {
      ...formatted,
      isFriendRoom: affinity.isFriendRoom,
      friendAffinityScore: affinity.friendAffinityScore,
      _createdAt: r.createdAt?.getTime?.() ?? 0,
    }
  })

  return sortLobbyByFriendAffinity(
    enriched,
    (row) => ({
      isFriendRoom: row.isFriendRoom,
      friendAffinityScore: row.friendAffinityScore,
    }),
    (a, b) => b._createdAt - a._createdAt,
  ).map(({ _createdAt, friendAffinityScore, ...rest }) => rest)
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
  const { myFriends, coPlayCounts } = await loadLobbyFriendSortContext(userId)
  const rooms = await prisma.beloteRoom.findMany({
    where: {
      status: 'IN_GAME',
      gameId: { not: null },
      buyIn: { gt: 0 },
    },
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
  type Row = BeloteGameInProgressLobbyItem & {
    friendAffinityScore: number
    _startedAt: number
  }
  const result: Row[] = []

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

    const affinity = scoreLobbyFriendAffinity(
      seatUserIds,
      room.hostId,
      myFriends,
      coPlayCounts,
    )
    result.push({
      roomId: room.id,
      roomName: room.name,
      gameId: room.gameId,
      playerCount,
      maxPlayers: room.maxPlayers,
      phase: phaseInfo.phase,
      canJoin: userInGame,
      canSpectate: !userInGame,
      isFriendRoom: affinity.isFriendRoom,
      friendAffinityScore: affinity.friendAffinityScore,
      _startedAt: phaseInfo.startedAt,
    })
  }

  return sortLobbyByFriendAffinity(
    result,
    (r) => ({
      isFriendRoom: r.isFriendRoom ?? false,
      friendAffinityScore: r.friendAffinityScore,
    }),
    (a, b) => b._startedAt - a._startedAt,
  ).map(({ _startedAt, friendAffinityScore, ...rest }) => rest)
}

export async function getBeloteLobbyPayload(userId: string) {
  const [waitingRooms, gamesInProgress] = await Promise.all([
    listBeloteWaitingRoomsForLobby(userId),
    listBeloteGamesInProgressForLobby(userId),
  ])
  return { waitingRooms, gamesInProgress }
}
