import { prisma } from '../config/database.js'

function friendIdsFromRows(
  userId: string,
  rows: Array<{ user1Id: string; user2Id: string }>
): Set<string> {
  const out = new Set<string>()
  for (const row of rows) {
    if (row.user1Id === userId) out.add(row.user2Id)
    else if (row.user2Id === userId) out.add(row.user1Id)
  }
  return out
}

/** Nombre d'amis en commun entre le demandeur et chaque cible (batch). */
export async function getMutualFriendsCounts(
  requesterId: string,
  targetUserIds: string[]
): Promise<Map<string, number>> {
  const uniqueTargets = [...new Set(targetUserIds.filter((id) => id && id !== requesterId))]
  const out = new Map<string, number>()
  if (uniqueTargets.length === 0) return out

  const requesterFriendships = await prisma.friendship.findMany({
    where: { OR: [{ user1Id: requesterId }, { user2Id: requesterId }] },
    select: { user1Id: true, user2Id: true },
  })
  const myFriends = friendIdsFromRows(requesterId, requesterFriendships)

  const theirFriendships = await prisma.friendship.findMany({
    where: {
      OR: [
        { user1Id: { in: uniqueTargets } },
        { user2Id: { in: uniqueTargets } },
      ],
    },
    select: { user1Id: true, user2Id: true },
  })

  const theirFriendsByUser = new Map<string, Set<string>>()
  for (const id of uniqueTargets) {
    theirFriendsByUser.set(id, new Set())
  }
  for (const row of theirFriendships) {
    if (uniqueTargets.includes(row.user1Id)) {
      theirFriendsByUser.get(row.user1Id)!.add(row.user2Id)
    }
    if (uniqueTargets.includes(row.user2Id)) {
      theirFriendsByUser.get(row.user2Id)!.add(row.user1Id)
    }
  }

  for (const targetId of uniqueTargets) {
    const theirs = theirFriendsByUser.get(targetId) ?? new Set()
    let count = 0
    for (const fid of myFriends) {
      if (fid !== targetId && theirs.has(fid)) count++
    }
    out.set(targetId, count)
  }

  return out
}
