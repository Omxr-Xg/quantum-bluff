import { clientAvatarUrlFromUser } from '../../utils/userAvatarPublic.js'
import { isBeloteBotId } from '../../shared/beloteBots.js'

export type BeloteRoomSeatRow = {
  id: string
  position: number
  isReady: boolean
  team: string | null
  avatarUrl: string | null
  participantType: 'HUMAN' | 'BOT'
  botId: string | null
  displayName: string | null
  botDifficulty: string
  userId: string | null
  user: {
    id: string
    username: string
    level: number
    avatarUrl?: string | null
    avatarHasBinary?: boolean
  } | null
}

export type BeloteRoomRow = {
  id: string
  name: string
  hostId: string
  maxPlayers: number
  visibility: 'PUBLIC' | 'PRIVATE'
  status: string
  joinCode: string | null
  targetScore: number
  buyIn: number
  variant: string
  gameId: string | null
  autoFillBotsEnabled?: boolean
  autoFillBotsDelaySec?: number
  defaultBotDifficulty?: string
  seats: BeloteRoomSeatRow[]
}

export function countRoomParticipants(seats: BeloteRoomSeatRow[]) {
  const humans = seats.filter((s) => s.participantType === 'HUMAN').length
  const bots = seats.filter((s) => s.participantType === 'BOT').length
  const total = seats.length
  const empty = Math.max(0, 4 - total)
  return { humans, bots, total, empty }
}

export function formatBeloteRoom(room: BeloteRoomRow, opts?: { hostUserId?: string }) {
  const counts = countRoomParticipants(room.seats)
  const allHumansReady =
    room.seats.filter((s) => s.participantType === 'HUMAN').every((s) => s.isReady) ?? true

  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    maxPlayers: room.maxPlayers,
    visibility: room.visibility,
    status: room.status,
    joinCode: room.visibility === 'PRIVATE' ? room.joinCode : undefined,
    targetScore: room.targetScore,
    buyIn: room.buyIn,
    variant: room.variant,
    gameId: room.gameId,
    autoFillBotsEnabled: room.autoFillBotsEnabled ?? false,
    autoFillBotsDelaySec: room.autoFillBotsDelaySec ?? 30,
    defaultBotDifficulty: room.defaultBotDifficulty ?? 'NORMAL',
    counts,
    canFillTable:
      room.status === 'WAITING' &&
      counts.empty > 0 &&
      (!opts?.hostUserId || room.hostId === opts.hostUserId),
    canStart: room.status === 'WAITING' && counts.total === 4 && allHumansReady,
    players: room.seats.map((s) => {
      const isBot = s.participantType === 'BOT'
      const id = isBot ? (s.botId ?? s.id) : (s.user?.id ?? s.userId ?? s.id)
      const username = isBot
        ? (s.displayName ?? 'QB Bot')
        : (s.user?.username ?? 'Joueur')
      return {
        id,
        seatId: s.id,
        type: s.participantType,
        isBot,
        botId: s.botId ?? undefined,
        username,
        displayName: s.displayName ?? undefined,
        botDifficulty: s.botDifficulty,
        level: isBot ? 1 : (s.user?.level ?? 1),
        position: s.position,
        isReady: isBot ? true : s.isReady,
        team: s.team,
        avatarUrl: isBot
          ? null
          : (s.avatarUrl ?? (s.user ? clientAvatarUrlFromUser(s.user) : null)),
      }
    }),
  }
}

export function seatPlayerId(seat: BeloteRoomSeatRow): string {
  if (seat.participantType === 'BOT') return seat.botId ?? seat.id
  return seat.user?.id ?? seat.userId ?? seat.id
}

export function isBotSeatRow(seat: BeloteRoomSeatRow): boolean {
  return seat.participantType === 'BOT' || isBeloteBotId(seat.botId ?? '')
}
