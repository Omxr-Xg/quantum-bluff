import bcrypt from 'bcryptjs'
import { prisma } from '../config/database.js'
import type { TournamentVisibility } from '../generated/prisma/index.js'
import { activeGames } from '../shared/activeGames.js'
import {
  normalizeTournamentMaxPlayers,
  validateTournamentGameParams,
} from './tournament.create.validation.js'
import { isTournamentGameId } from './tournament.constants.js'
import { xpForFinalRank } from './tournament.reward.service.js'

/** Table marquée « en cours » en base mais partie encore chargée en mémoire (spectate réel). */
function tournamentTableGameIsLiveInMemory(gameId: string): boolean {
  if (!isTournamentGameId(gameId)) return false
  return activeGames.getSync(gameId) !== undefined
}

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
  const maxPlayers = normalizeTournamentMaxPlayers(input.maxPlayers)
  if (input.name.trim().length === 0) {
    throw new Error('Nom requis')
  }
  validateTournamentGameParams({
    initialStack: input.initialStack,
    blindSmall: input.blindSmall,
    blindBig: input.blindBig,
    startAt: input.startAt,
  })
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
): Promise<{ joined: boolean }> {
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
  if (existing) return { joined: false }
  await prisma.tournamentPlayer.create({
    data: { tournamentId, userId, status: 'REGISTERED' },
  })
  return { joined: true }
}

export async function leaveTournament(tournamentId: string, userId: string): Promise<{ left: boolean }> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!t) throw new Error('Tournoi introuvable')
  if (t.status !== 'REGISTRATION_OPEN') {
    throw new Error('Impossible de quitter après le début')
  }
  const r = await prisma.tournamentPlayer.deleteMany({ where: { tournamentId, userId } })
  return { left: r.count > 0 }
}

/** Retire un inscrit pendant les inscriptions (réservé à l’hôte — vérifié par la route). */
export async function kickTournamentPlayer(tournamentId: string, targetUserId: string): Promise<void> {
  const uid = String(targetUserId ?? '').trim()
  if (!uid) throw new Error('Utilisateur invalide')
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } })
  if (!t) throw new Error('Tournoi introuvable')
  if (t.status !== 'REGISTRATION_OPEN') {
    throw new Error('Inscriptions fermées')
  }
  if (uid === t.hostId) {
    throw new Error("Impossible d'éjecter l'hôte")
  }
  const r = await prisma.tournamentPlayer.deleteMany({ where: { tournamentId, userId: uid } })
  if (r.count === 0) throw new Error('Joueur non inscrit à ce tournoi')
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

const TOURNAMENT_ACTIVE_SPECTATE_STATUSES = [
  'STARTING',
  'ROUND_IN_PROGRESS',
  'WAITING_FOR_TABLES',
] as const

export type SpectateTableInfo = {
  gameId: string
  roundNumber: number
  playerCount: number
}

export type LiveSpectateTournamentSummary = {
  tournamentId: string
  name: string
  status: string
  tables: SpectateTableInfo[]
}

/** Tournois publics avec au moins une table en cours (pour le lobby « Spectate »). */
export async function listPublicTournamentsWithLiveTables(): Promise<LiveSpectateTournamentSummary[]> {
  const tables = await prisma.tournamentTable.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'RECOVERING'] },
      round: {
        tournament: {
          visibility: 'PUBLIC',
          status: { in: [...TOURNAMENT_ACTIVE_SPECTATE_STATUSES] },
        },
      },
    },
    select: {
      gameId: true,
      playerCount: true,
      round: {
        select: {
          roundNumber: true,
          tournament: { select: { id: true, name: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  const map = new Map<string, LiveSpectateTournamentSummary>()
  for (const row of tables) {
    if (!tournamentTableGameIsLiveInMemory(row.gameId)) continue
    const tour = row.round.tournament
    let entry = map.get(tour.id)
    if (!entry) {
      entry = {
        tournamentId: tour.id,
        name: tour.name,
        status: tour.status,
        tables: [],
      }
      map.set(tour.id, entry)
    }
    entry.tables.push({
      gameId: row.gameId,
      roundNumber: row.round.roundNumber,
      playerCount: row.playerCount,
    })
  }
  return [...map.values()].filter((v) => v.tables.length > 0)
}

function userMaySeePrivateSpectate(
  t: { visibility: string; hostId: string; players: { userId: string }[] },
  userId: string | null | undefined,
): boolean {
  if (t.visibility !== 'PRIVATE') return true
  if (!userId) return false
  if (t.hostId === userId) return true
  return t.players.some((p) => p.userId === userId)
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

  let spectateTables: SpectateTableInfo[] = []
  if (
    (TOURNAMENT_ACTIVE_SPECTATE_STATUSES as readonly string[]).includes(t.status) &&
    userMaySeePrivateSpectate(t, userId)
  ) {
    const rows = await prisma.tournamentTable.findMany({
      where: {
        round: { tournamentId },
        status: { in: ['IN_PROGRESS', 'RECOVERING'] },
      },
      select: {
        gameId: true,
        playerCount: true,
        round: { select: { roundNumber: true } },
      },
      orderBy: [{ round: { roundNumber: 'asc' } }, { gameId: 'asc' }],
    })
    spectateTables = rows
      .filter((r) => tournamentTableGameIsLiveInMemory(r.gameId))
      .map((r) => ({
        gameId: r.gameId,
        roundNumber: r.round.roundNumber,
        playerCount: r.playerCount,
      }))
  }

  return { ...t, me, spectateTables }
}

export type TournamentResultsLeaderboardRow = {
  userId: string
  username: string | null
  finalRank: number | null
  eliminationOrder: number | null
  xpAwarded: number
  chipsAwarded: number | null
}

/**
 * Classement final + XP (ledger `XP_PLACEMENT`, sinon formule théorique).
 * `leaderboardAvailable` : `true` seulement si le tournoi est `COMPLETED`.
 */
export async function getTournamentResults(tournamentId: string): Promise<{
  tournamentId: string
  name: string
  status: string
  leaderboardAvailable: boolean
  rows: TournamentResultsLeaderboardRow[]
} | null> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, name: true, status: true },
  })
  if (!t) return null
  if (t.status !== 'COMPLETED') {
    return {
      tournamentId: t.id,
      name: t.name,
      status: t.status,
      leaderboardAvailable: false,
      rows: [],
    }
  }

  const [players, xpLedger, chipsLedger] = await Promise.all([
    prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      include: { user: { select: { username: true } } },
    }),
    prisma.tournamentRewardLedger.findMany({
      where: { tournamentId, kind: 'XP_PLACEMENT' },
      select: { userId: true, xpDelta: true },
    }),
    prisma.tournamentRewardLedger.findMany({
      where: { tournamentId, kind: 'CHIPS_WINNER' },
      select: { userId: true, chipsAmount: true },
    }),
  ])

  const xpMap = new Map(xpLedger.map((x) => [x.userId, x.xpDelta ?? 0]))
  const chipsMap = new Map(chipsLedger.map((x) => [x.userId, x.chipsAmount ?? null]))

  const rows: TournamentResultsLeaderboardRow[] = players.map((p) => {
    const fromLedger = xpMap.has(p.userId) ? (xpMap.get(p.userId) ?? 0) : null
    const xpAwarded = fromLedger != null ? fromLedger : xpForFinalRank(p.finalRank)
    return {
      userId: p.userId,
      username: p.user?.username ?? null,
      finalRank: p.finalRank,
      eliminationOrder: p.eliminationOrder ?? null,
      xpAwarded,
      chipsAwarded: chipsMap.get(p.userId) ?? null,
    }
  })

  rows.sort((a, b) => {
    const pa = a.finalRank
    const pb = b.finalRank
    const orderA = pa == null ? 9999 : pa >= 99 ? 1000 + (a.eliminationOrder ?? 0) : pa
    const orderB = pb == null ? 9999 : pb >= 99 ? 1000 + (b.eliminationOrder ?? 0) : pb
    if (orderA !== orderB) return orderA - orderB
    return (a.username ?? '').localeCompare(b.username ?? '', undefined, {
      sensitivity: 'base',
    })
  })

  return {
    tournamentId: t.id,
    name: t.name,
    status: t.status,
    leaderboardAvailable: true,
    rows,
  }
}
