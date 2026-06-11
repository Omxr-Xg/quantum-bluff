import bcrypt from 'bcryptjs'
import { createWalletLedgerMovement } from '../casino/services/walletLedger.service.js'
import { prisma } from '../config/database.js'
import type { TournamentVisibility } from '../generated/prisma/index.js'
import { activeGames } from '../shared/activeGames.js'
import {
  normalizeTournamentMaxPlayers,
  validateTournamentGameParams,
} from './tournament.create.validation.js'
import { isTournamentGameId } from './tournament.constants.js'
import { tournamentBuyInForRow, tournamentEntryFeeChips } from './tournament.entryFee.js'
import type { TournamentGameType } from '../generated/prisma/index.js'
import { activeBeloteGames } from '../shared/activeBeloteGames.js'
import { isBeloteTournamentGameId } from './belote/beloteTournament.constants.js'
import {
  normalizeBeloteTournamentMaxPlayers,
  validateBeloteTournamentParams,
} from './belote/beloteTournament.create.validation.js'
import { xpForFinalRank } from './tournament.reward.service.js'

/** Table marquée « en cours » en base mais partie encore chargée en mémoire (spectate réel). */
function tournamentTableGameIsLiveInMemory(gameId: string): boolean {
  if (isBeloteTournamentGameId(gameId)) {
    return activeBeloteGames.getSync(gameId) !== undefined
  }
  if (!isTournamentGameId(gameId)) return false
  return activeGames.getSync(gameId) !== undefined
}

export type TournamentTableAssignment = {
  tournamentId: string
  gameId: string
  roundNumber: number
  isFinalTable: boolean
}

/** Table tournoi en cours où l’utilisateur est encore assis (rejoin / polling client). */
export async function findUserTournamentTableAssignment(
  userId: string,
  tournamentId?: string,
): Promise<TournamentTableAssignment | null> {
  const players = await prisma.tournamentPlayer.findMany({
    where: {
      userId,
      status: { in: ['ACTIVE', 'WAITING_NEXT_ROUND'] },
      ...(tournamentId ? { tournamentId } : {}),
    },
    select: { tournamentId: true },
  })
  if (players.length === 0) return null

  for (const player of players) {
    const tables = await prisma.tournamentTable.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'RECOVERING'] },
        round: { tournamentId: player.tournamentId },
      },
      select: {
        gameId: true,
        isFinalTable: true,
        round: { select: { roundNumber: true } },
      },
      orderBy: [{ round: { roundNumber: 'desc' } }, { createdAt: 'desc' }],
    })

    for (const table of tables) {
      if (!tournamentTableGameIsLiveInMemory(table.gameId)) continue
      if (isBeloteTournamentGameId(table.gameId)) {
        const belote = activeBeloteGames.getSync(table.gameId)
        if (!belote) continue
        const seated = belote.getState().players.some(
          (p) => p.userId === userId && !p.forfeited,
        )
        if (!seated) continue
      } else {
        const ctrl = activeGames.getSync(table.gameId)
        if (!ctrl) continue
        const snap = ctrl.getSanitizedState()
        const seated = (snap.players ?? []).some(
          (p) => p.id === userId && (p.chips ?? 0) > 0,
        )
        if (!seated) continue
      }
      return {
        tournamentId: player.tournamentId,
        gameId: table.gameId,
        roundNumber: table.round.roundNumber,
        isFinalTable: table.isFinalTable,
      }
    }
  }

  return null
}

/** Résout le tournoi lié à une table (même après suppression mémoire de la partie). */
export async function findTournamentContextByGameId(
  gameId: string,
): Promise<TournamentTableAssignment | null> {
  if (!isTournamentGameId(gameId) && !isBeloteTournamentGameId(gameId)) return null
  const table = await prisma.tournamentTable.findFirst({
    where: { gameId },
    select: {
      gameId: true,
      isFinalTable: true,
      round: { select: { tournamentId: true, roundNumber: true } },
    },
  })
  if (!table) return null
  return {
    tournamentId: table.round.tournamentId,
    gameId: table.gameId,
    roundNumber: table.round.roundNumber,
    isFinalTable: table.isFinalTable,
  }
}

const NAME_MAX = 80

function defaultTournamentName(): string {
  const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `Tournoi rapide ${stamp}`.slice(0, NAME_MAX)
}

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
  const trimmedName = input.name.trim().slice(0, NAME_MAX)
  const name = trimmedName.length > 0 ? trimmedName : defaultTournamentName()
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
      name,
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

export async function createBeloteTournament(input: {
  hostId: string
  name: string
  visibility: TournamentVisibility
  joinCode?: string | null
  maxPlayers: number
  variant: unknown
  targetScore: unknown
  buyIn: unknown
  startAt: Date
}): Promise<{ id: string }> {
  const maxPlayers = normalizeBeloteTournamentMaxPlayers(input.maxPlayers)
  const belote = validateBeloteTournamentParams({
    variant: input.variant,
    targetScore: input.targetScore,
    buyIn: input.buyIn,
    startAt: input.startAt,
  })
  const trimmedName = input.name.trim().slice(0, NAME_MAX)
  const name = trimmedName.length > 0 ? trimmedName : `Belote ${defaultTournamentName()}`
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
      name,
      hostId: input.hostId,
      gameType: 'BELOTE',
      visibility: input.visibility,
      codeHash,
      maxPlayers,
      initialStack: 0,
      startAt: input.startAt,
      blindSmall: 1,
      blindBig: 2,
      beloteVariant: belote.variant,
      beloteTargetScore: belote.targetScore,
      beloteBuyIn: belote.buyIn,
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
): Promise<{ joined: boolean; newBalance: number | null }> {
  const existing = await prisma.tournamentPlayer.findUnique({
    where: { tournamentId_userId: { tournamentId, userId } },
  })
  if (existing) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { chips: true } })
    return { joined: false, newBalance: u?.chips ?? null }
  }

  let newBalance: number | null = null
  await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({ where: { id: tournamentId } })
    if (!t) throw new Error('Tournoi introuvable')
    if (t.status !== 'REGISTRATION_OPEN') {
      throw new Error('Inscriptions fermées')
    }
    const count = await tx.tournamentPlayer.count({ where: { tournamentId } })
    if (count >= t.maxPlayers) {
      throw new Error('Tournoi complet')
    }
    if (t.visibility === 'PRIVATE') {
      if (!t.codeHash) throw new Error('Configuration tournoi invalide')
      const ok = await bcrypt.compare(String(joinCode ?? ''), t.codeHash)
      if (!ok) throw new Error('Code incorrect')
    }
    const fee = tournamentBuyInForRow(t)
    const beforeRow = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    if (!beforeRow) throw new Error('Utilisateur introuvable')
    if (fee > 0) {
      const dec = await tx.user.updateMany({
        where: { id: userId, chips: { gte: fee } },
        data: { chips: { decrement: fee } },
      })
      if (dec.count === 0) {
        throw new Error('Jetons insuffisants.')
      }
    }
    const afterRow = await tx.user.findUnique({
      where: { id: userId },
      select: { chips: true },
    })
    const balanceAfterJoin = afterRow?.chips ?? beforeRow.chips - fee
    await createWalletLedgerMovement(tx, {
      userId,
      reason: 'TOURNAMENT_BUY_IN',
      balanceBefore: beforeRow.chips,
      balanceAfter: balanceAfterJoin,
      gameType: 'tournament',
      roundId: tournamentId,
    })
    await tx.tournamentPlayer.create({
      data: { tournamentId, userId, status: 'REGISTERED' },
    })
    /* Solde post-débit pour update client immédiat sans race fetchBalanceFromServer. */
    const u = await tx.user.findUnique({ where: { id: userId }, select: { chips: true } })
    newBalance = u?.chips ?? null
  })
  return { joined: true, newBalance }
}

export async function leaveTournament(
  tournamentId: string,
  userId: string,
): Promise<{ left: boolean; newBalance: number | null }> {
  let left = false
  let newBalance: number | null = null
  await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({ where: { id: tournamentId } })
    if (!t) throw new Error('Tournoi introuvable')
    if (t.status !== 'REGISTRATION_OPEN') {
      throw new Error('Impossible de quitter après le début')
    }
    const fee = tournamentBuyInForRow(t)
    const r = await tx.tournamentPlayer.deleteMany({ where: { tournamentId, userId } })
    if (r.count > 0) {
      const beforeRow = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      })
      const balanceBeforeLeave = beforeRow?.chips ?? 0
      await tx.user.update({
        where: { id: userId },
        data: { chips: { increment: fee } },
      })
      const afterRow = await tx.user.findUnique({
        where: { id: userId },
        select: { chips: true },
      })
      const balanceAfterLeave = afterRow?.chips ?? balanceBeforeLeave + fee
      await createWalletLedgerMovement(tx, {
        userId,
        reason: 'TOURNAMENT_BUY_IN_REFUND',
        balanceBefore: balanceBeforeLeave,
        balanceAfter: balanceAfterLeave,
        gameType: 'tournament',
        roundId: tournamentId,
      })
      left = true
    }
    const u = await tx.user.findUnique({ where: { id: userId }, select: { chips: true } })
    newBalance = u?.chips ?? null
  })
  return { left, newBalance }
}

/** Retire un inscrit pendant les inscriptions (réservé à l’hôte — vérifié par la route). */
export async function kickTournamentPlayer(tournamentId: string, targetUserId: string): Promise<void> {
  const uid = String(targetUserId ?? '').trim()
  if (!uid) throw new Error('Utilisateur invalide')
  await prisma.$transaction(async (tx) => {
    const t = await tx.tournament.findUnique({ where: { id: tournamentId } })
    if (!t) throw new Error('Tournoi introuvable')
    if (t.status !== 'REGISTRATION_OPEN') {
      throw new Error('Inscriptions fermées')
    }
    if (uid === t.hostId) {
      throw new Error("Impossible d'éjecter l'hôte")
    }
    const fee = tournamentBuyInForRow(t)
    const r = await tx.tournamentPlayer.deleteMany({ where: { tournamentId, userId: uid } })
    if (r.count === 0) throw new Error('Joueur non inscrit à ce tournoi')
    const beforeRow = await tx.user.findUnique({
      where: { id: uid },
      select: { chips: true },
    })
    const balanceBeforeKick = beforeRow?.chips ?? 0
    await tx.user.update({
      where: { id: uid },
      data: { chips: { increment: fee } },
    })
    const afterRow = await tx.user.findUnique({
      where: { id: uid },
      select: { chips: true },
    })
    const balanceAfterKick = afterRow?.chips ?? balanceBeforeKick + fee
    await createWalletLedgerMovement(tx, {
      userId: uid,
      reason: 'TOURNAMENT_BUY_IN_REFUND',
      balanceBefore: balanceBeforeKick,
      balanceAfter: balanceAfterKick,
      gameType: 'tournament',
      roundId: tournamentId,
    })
  })
}

export async function listOpenTournaments(gameType: TournamentGameType = 'POKER') {
  return prisma.tournament.findMany({
    where: { status: 'REGISTRATION_OPEN', visibility: 'PUBLIC', gameType },
    orderBy: { startAt: 'asc' },
    select: {
      id: true,
      name: true,
      hostId: true,
      gameType: true,
      maxPlayers: true,
      initialStack: true,
      startAt: true,
      blindSmall: true,
      blindBig: true,
      beloteVariant: true,
      beloteTargetScore: true,
      beloteBuyIn: true,
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
export async function listPublicTournamentsWithLiveTables(
  gameType: TournamentGameType = 'POKER',
): Promise<LiveSpectateTournamentSummary[]> {
  const tables = await prisma.tournamentTable.findMany({
    where: {
      status: { in: ['IN_PROGRESS', 'RECOVERING'] },
      round: {
        tournament: {
          visibility: 'PUBLIC',
          gameType,
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
      players: {
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
        },
      },
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

  /* Quand le tournoi est terminé, on expose le prize crédité au vainqueur
   * (lu depuis le ledger pour rester aligné avec l'historique). */
  let myAssignedTable: TournamentTableAssignment | null = null
  if (
    userId &&
    me &&
    (me.status === 'ACTIVE' || me.status === 'WAITING_NEXT_ROUND') &&
    (TOURNAMENT_ACTIVE_SPECTATE_STATUSES as readonly string[]).includes(t.status)
  ) {
    myAssignedTable = await findUserTournamentTableAssignment(userId, tournamentId)
  }

  let winnerChipsAwarded: number | null = null
  if (t.status === 'COMPLETED') {
    const winnerRow = await prisma.tournamentRewardLedger.findFirst({
      where: { tournamentId, kind: 'CHIPS_WINNER' },
      select: { chipsAmount: true },
    })
    winnerChipsAwarded = winnerRow?.chipsAmount ?? null
  }

  return { ...t, me, spectateTables, myAssignedTable, winnerChipsAwarded }
}

export type TournamentResultsLeaderboardRow = {
  userId: string
  username: string | null
  avatarUrl: string | null
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
      include: { user: { select: { username: true, avatarUrl: true } } },
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
      avatarUrl: p.user?.avatarUrl ?? null,
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
