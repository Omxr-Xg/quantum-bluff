import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import type { TournamentVisibility } from '../generated/prisma/index.js'

const NAME_MAX = 80

export async function createTournament(input: {
  hostId: string
  name: string
  visibility: TournamentVisibility
  joinCode?: string | null
  maxPlayers: number
  initialStack: number
  startAt: Date
  blindSmall: number
  blindBig: number
}): Promise<{ id: string }> {
  const maxPlayers = Math.min(20, Math.max(4, Math.floor(input.maxPlayers)))
  if (input.name.trim().length === 0) {
    throw new Error('Nom requis')
  }
  let codeHash: string | null = null
  if (input.visibility === 'PRIVATE') {
    const code = String(input.joinCode ?? '').trim()
    if (code.length < 4) {
      throw new Error('Code privé requis (min 4 caractères)')
    }
    codeHash = await bcrypt.hash(code, 10)
  }
  const row = await prisma.tournament.create({
    data: {
      name: input.name.trim().slice(0, NAME_MAX),
      hostId: input.hostId,
      visibility: input.visibility,
      codeHash,
      maxPlayers,
      initialStack: input.initialStack,
      startAt: input.startAt,
      blindSmall: input.blindSmall,
      blindBig: input.blindBig,
      status: 'REGISTRATION_OPEN',
    },
    select: { id: true },
  })
  return { id: row.id }
}

export async function joinTournament(
  tournamentId: string,
  userId: string,
  joinCode?: string | null,
): Promise<void> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!t) throw new Error('Tournoi introuvable')
  if (t.status !== 'REGISTRATION_OPEN') {
    throw new Error('Inscriptions fermées')
  }
  const count = await prisma.tournamentPlayer.count({ where: { tournamentId } })
  if (count >= t.maxPlayers) {
    throw new Error('Tournoi complet')
  }
  if (t.visibility === 'PRIVATE') {
    if (!t.codeHash) throw new Error('Configuration tournoi invalide')
    const ok = await bcrypt.compare(String(joinCode ?? ''), t.codeHash)
    if (!ok) throw new Error('Code incorrect')
  }
  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  if (existing) return
  await prisma.tournamentPlayer.create({
    data: { tournamentId, userId, status: 'REGISTERED' },
  })
}

export async function leaveTournament(tournamentId: string, userId: string): Promise<void> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!t) throw new Error('Tournoi introuvable')
  if (t.status !== 'REGISTRATION_OPEN') {
    throw new Error('Impossible de quitter après le début')
  }
  await prisma.tournamentPlayer.deleteMany({ where: { tournamentId, userId } })
}

export async function listOpenTournaments() {
  return prisma.tournament.findMany({
    where: { status: 'REGISTRATION_OPEN', visibility: 'PUBLIC' },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      name: true,
      hostId: true,
      maxPlayers: true,
      initialStack: true,
      startAt: true,
      blindSmall: true,
      blindBig: true,
      _count: { select: { players: true } },
    },
  })
}

export async function getTournamentDetail(tournamentId: string, userId?: string | null) {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: { include: { user: { select: { id: true, username: true } } } },
      _count: { select: { players: true } },
    },
  })
  if (!t) return null
  const me = userId
    ? t.players.find((p) => p.userId === userId)
    : undefined
  return { ...t, me }
}
