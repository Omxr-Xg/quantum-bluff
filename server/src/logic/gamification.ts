/**
 * XP, niveaux, plafonds de mise effectifs, catalogue de badges (déblocage par niveau).
 */
import type { PrismaClient } from '../generated/prisma/index.js'
import { SLOT_MAX_BET_CAP, SLOT_MIN_BET } from './slotMachine.js'
import { ROULETTE_MAX_TOTAL_STAKE } from './roulette.js'

/** XP total requis pour atteindre le niveau L (L >= 1). T(1)=0, T(2)=100, T(3)=300, … formule 50*L*(L-1). */
export function xpThresholdForLevel(level: number): number {
  if (level < 1) return 0
  return 50 * level * (level - 1)
}

const MAX_LEVEL = 99

/** Niveau dérivé de l’XP totale (1 … MAX_LEVEL). Seuil du niveau L : 50×L×(L−1) XP cumulés. */
export function levelFromExperience(xp: number): number {
  const x = Math.max(0, Math.floor(xp))
  let level = 1
  while (level < MAX_LEVEL && xpThresholdForLevel(level + 1) <= x) {
    level++
  }
  return level
}

/** XP encore nécessaire pour passer au niveau suivant (0 si niveau max). */
export function xpToNextLevel(currentXp: number, currentLevel: number): number {
  if (currentLevel >= MAX_LEVEL) return 0
  const nextThreshold = xpThresholdForLevel(currentLevel + 1)
  return Math.max(0, nextThreshold - currentXp)
}

/** Mise max slot / ligne roulette : de ~250 au niveau 1 au plafond absolu vers le niveau 25. */
export function getEffectiveSlotMaxBet(level: number): number {
  const L = Math.max(1, Math.min(level, MAX_LEVEL))
  const baseCap = 250
  const span = SLOT_MAX_BET_CAP - baseCap
  const t = Math.min(1, (L - 1) / 24)
  return Math.min(SLOT_MAX_BET_CAP, Math.max(SLOT_MIN_BET, Math.floor(baseCap + t * span)))
}

export function getEffectiveRouletteMaxPerLine(level: number): number {
  return getEffectiveSlotMaxBet(level)
}

export function getEffectiveRouletteMaxTotalStake(level: number): number {
  const L = Math.max(1, Math.min(level, MAX_LEVEL))
  const minTotal = 1500
  const span = ROULETTE_MAX_TOTAL_STAKE - minTotal
  const t = Math.min(1, (L - 1) / 24)
  return Math.min(ROULETTE_MAX_TOTAL_STAKE, Math.floor(minTotal + t * span))
}

export type BadgeDefinition = {
  id: string
  minLevel: number
}

/** Catalogue MVP : badges débloqués uniquement par niveau. */
export const BADGE_CATALOG: BadgeDefinition[] = [
  { id: 'novice', minLevel: 2 },
  { id: 'regular', minLevel: 3 },
  { id: 'rising', minLevel: 5 },
  { id: 'skilled', minLevel: 7 },
  { id: 'veteran', minLevel: 10 },
  { id: 'expert', minLevel: 12 },
  { id: 'elite', minLevel: 15 },
  { id: 'master', minLevel: 18 },
  { id: 'champion', minLevel: 22 },
  { id: 'legend', minLevel: 25 },
]

export const XP_POKER_HAND_BOT = 12
export const XP_POKER_HAND_BOT_WIN_BONUS = 20
export const XP_POKER_SHOWDOWN_WIN = 35
export const XP_POKER_SHOWDOWN_LOSS = 10
export const XP_SLOT_SPIN = 4
export const XP_SLOT_WIN_BONUS = 8
export const XP_ROULETTE_SPIN = 4
export const XP_ROULETTE_WIN_BONUS = 10

type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>

export async function unlockBadgesForLevel(
  tx: Tx,
  userId: string,
  newLevel: number
): Promise<string[]> {
  const existing = await tx.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
  })
  const have = new Set(existing.map((e) => e.badgeId))
  const toAdd = BADGE_CATALOG.filter((b) => b.minLevel <= newLevel && !have.has(b.id)).map((b) => b.id)
  if (toAdd.length === 0) return []
  await tx.userBadge.createMany({
    data: toAdd.map((badgeId) => ({ userId, badgeId })),
    skipDuplicates: true,
  })
  return toAdd
}

export type AwardXpResult = {
  experience: number
  level: number
  xpToNext: number
  newBadges: string[]
}

/**
 * Incrémente l’XP, recalcule le niveau, débloque les badges. À appeler dans une transaction Prisma.
 */
export async function awardXpInTransaction(
  tx: Tx,
  userId: string,
  amount: number
): Promise<AwardXpResult> {
  const delta = Math.max(0, Math.floor(amount))
  if (delta === 0) {
    const u = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { experience: true, level: true },
    })
    return {
      experience: u.experience,
      level: u.level,
      xpToNext: xpToNextLevel(u.experience, levelFromExperience(u.experience)),
      newBadges: [],
    }
  }

  await tx.user.update({
    where: { id: userId },
    data: { experience: { increment: delta } },
  })

  const u = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { experience: true, level: true },
  })

  const newLevel = levelFromExperience(u.experience)
  await tx.user.update({
    where: { id: userId },
    data: { level: newLevel },
  })

  const newBadges = await unlockBadgesForLevel(tx, userId, newLevel)

  return {
    experience: u.experience,
    level: newLevel,
    xpToNext: xpToNextLevel(u.experience, newLevel),
    newBadges,
  }
}

/** Utilise une transaction dédiée si tu n’es pas déjà dans une tx. */
export async function awardXp(prisma: PrismaClient, userId: string, amount: number): Promise<AwardXpResult> {
  return prisma.$transaction((tx) => awardXpInTransaction(tx, userId, amount))
}

export function gamificationPayloadForUser(row: {
  experience: number
  level: number
}): { experience: number; level: number; xpToNext: number; maxBetSlot: number; maxBetRouletteLine: number; maxRouletteTotalStake: number } {
  const lvl = levelFromExperience(row.experience)
  return {
    experience: row.experience,
    level: lvl,
    xpToNext: xpToNextLevel(row.experience, lvl),
    maxBetSlot: getEffectiveSlotMaxBet(lvl),
    maxBetRouletteLine: getEffectiveRouletteMaxPerLine(lvl),
    maxRouletteTotalStake: getEffectiveRouletteMaxTotalStake(lvl),
  }
}

export type GamificationBundle = {
  experience: number
  level: number
  xpToNext: number
  maxBetSlot: number
  maxBetRouletteLine: number
  maxRouletteTotalStake: number
  badges: string[]
}

/** Aligne `User.level` sur l’XP et renvoie caps + badges (auth / endpoint dédié). */
export async function getGamificationBundle(
  prisma: PrismaClient,
  userId: string
): Promise<GamificationBundle | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { experience: true, level: true },
  })
  if (!u) return null
  const L = levelFromExperience(u.experience)
  if (u.level !== L) {
    await prisma.user.update({
      where: { id: userId },
      data: { level: L },
    })
  }
  const badgeRows = await prisma.userBadge.findMany({
    where: { userId },
    select: { badgeId: true },
    orderBy: { unlockedAt: 'asc' },
  })
  const g = gamificationPayloadForUser({ experience: u.experience, level: L })
  return {
    experience: u.experience,
    level: L,
    xpToNext: g.xpToNext,
    maxBetSlot: g.maxBetSlot,
    maxBetRouletteLine: g.maxBetRouletteLine,
    maxRouletteTotalStake: g.maxRouletteTotalStake,
    badges: badgeRows.map((b) => b.badgeId),
  }
}
