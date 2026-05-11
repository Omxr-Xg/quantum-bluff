import type { Server } from 'socket.io'
import { prisma } from '../config/database.js'

export type TournamentRosterEventKind = 'join' | 'leave'

/** Room globale : clients sur le lobby arène (`/tournaments`) pour listes temps réel. */
export const TOURNAMENT_LOBBY_SOCKET_ROOM = 'tournament-lobby' as const

export function emitTournamentLobbyListUpdated(io: Server): void {
  io.to(TOURNAMENT_LOBBY_SOCKET_ROOM).emit('TOURNAMENT_LOBBY_LIST_UPDATED', {})
}

/** Lobby arène + salle du tournoi : liste spectate / tables réellement actives. */
export function emitTournamentLiveSpectateChanged(io: Server, tournamentId: string): void {
  emitTournamentLobbyListUpdated(io)
  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_LIVE_TABLES_CHANGED', { tournamentId })
}

/**
 * Notifie la room `tournament:{id}` (Socket.IO) qu’il faut rafraîchir la liste des inscrits.
 */
export async function emitTournamentRosterUpdated(
  io: Server,
  tournamentId: string,
  opts: { kind: TournamentRosterEventKind; userId: string },
): Promise<void> {
  const [playerCount, t, user] = await Promise.all([
    prisma.tournamentPlayer.count({ where: { tournamentId } }),
    prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { maxPlayers: true, visibility: true },
    }),
    prisma.user.findUnique({
      where: { id: opts.userId },
      select: { username: true },
    }),
  ])
  io.to(`tournament:${tournamentId}`).emit('TOURNAMENT_ROSTER_UPDATED', {
    tournamentId,
    kind: opts.kind,
    userId: opts.userId,
    username: user?.username ?? undefined,
    playerCount,
    maxPlayers: t?.maxPlayers ?? 0,
  })
  if (t?.visibility === 'PUBLIC') {
    emitTournamentLobbyListUpdated(io)
  }
}

/** Notifie uniquement le joueur exclu (room `user:{id}`). */
export function emitTournamentKicked(
  io: Server,
  targetUserId: string,
  tournamentId: string,
): void {
  io.to(`user:${targetUserId}`).emit('TOURNAMENT_KICKED', { tournamentId })
}
