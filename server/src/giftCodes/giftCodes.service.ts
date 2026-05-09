import { prisma } from '../config/database.js'
import type { Prisma } from '../generated/prisma/index.js'

export async function createGiftCode(data: {
  code: string
  amount: number
  type: string
  description?: string | null
  expiresAt?: string | null
  maxUses?: number
}) {
  // Vérifier que le code n'existe pas déjà
  const existing = await prisma.giftCode.findUnique({
    where: { code: data.code.toUpperCase() }
  })

  if (existing) {
    throw new Error(`Le code "${data.code}" existe déjà`)
  }

  // Créer le code
  const giftCode = await prisma.giftCode.create({
    data: {
      code: data.code.toUpperCase(),
      amount: data.amount,
      type: data.type,
      description: data.description || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      maxUses: data.maxUses ?? -1,
      usedCount: 0
    }
  })

  return giftCode
}

export async function getAllGiftCodes(limit = 50, offset = 0) {
  const [codes, total] = await Promise.all([
    prisma.giftCode.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        code: true,
        amount: true,
        type: true,
        description: true,
        expiresAt: true,
        maxUses: true,
        usedCount: true,
        createdAt: true
      }
    }),
    prisma.giftCode.count()
  ])

  return { codes, total }
}

export async function getAvailableCodesForUser(userId: string) {
  // Récupère les codes qui ne sont pas expirés et que l'utilisateur n'a pas encore utilisés
  const codes = await prisma.giftCode.findMany({
    where: {
      OR: [
        { expiresAt: null }, // Pas d'expiration
        { expiresAt: { gt: new Date() } } // Expiration dans le futur
      ],
      usedByUsers: {
        none: {
          userId: userId
        }
      }
    },
    select: {
      id: true,
      code: true,
      amount: true,
      type: true,
      description: true,
      expiresAt: true,
      usedCount: true,
      maxUses: true
    }
  })

  return codes
}

export async function validateAndUseCode(userId: string, code: string) {
  const giftCode = await prisma.giftCode.findUnique({
    where: { code }
  })

  if (!giftCode) {
    throw new Error('Code inexistant')
  }

  // Vérifier l'expiration
  if (giftCode.expiresAt && new Date() > giftCode.expiresAt) {
    throw new Error('Ce code a expiré')
  }

  // Vérifier les utilisations restantes
  if (giftCode.maxUses !== -1 && giftCode.usedCount >= giftCode.maxUses) {
    throw new Error('Ce code a atteint le nombre d\'utilisations maximum')
  }

  // Vérifier que l'utilisateur n'a pas déjà utilisé ce code
  const existing = await prisma.giftCodeUsage.findUnique({
    where: {
      codeId_userId: {
        codeId: giftCode.id,
        userId: userId
      }
    }
  })

  if (existing) {
    throw new Error('Vous avez déjà utilisé ce code')
  }

  // Utiliser le code dans une transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // Enregistrer l'utilisation
    await tx.giftCodeUsage.create({
      data: {
        codeId: giftCode.id,
        userId: userId
      }
    })

    // Incrémenter usedCount
    await tx.giftCode.update({
      where: { id: giftCode.id },
      data: { usedCount: { increment: 1 } }
    })

    // Ajouter les jetons à l'utilisateur
    const user = await tx.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('Utilisateur introuvable')

    const newBalance = user.chips + giftCode.amount

    await tx.user.update({
      where: { id: userId },
      data: { chips: newBalance }
    })

    // Enregistrer la transaction dans WalletLedgerEntry
    await tx.walletLedgerEntry.create({
      data: {
        userId: userId,
        amount: giftCode.amount,
        reason: `GIFT_CODE_${giftCode.type}`,
        balanceBefore: user.chips,
        balanceAfter: newBalance
      }
    })

    return {
      success: true,
      message: `+${giftCode.amount} jetons ajoutés!`,
      newBalance: newBalance,
      addedAmount: giftCode.amount
    }
  })

  return result
}
