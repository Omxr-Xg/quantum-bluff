import { Prisma } from '../generated/prisma/index.js'
import { prisma } from '../config/database.js'

export type LobbyFriendAffinity = {
  isFriendRoom: boolean
  friendAffinityScore: number
}

export async function getFriendIdsForUser(userId: string): Promise<Set<string>> {
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

/** Nombre de parties jouées ensemble (poker + belote) par ami. */
export async function getCoPlayCountsWithFriends(
  userId: string,
  friendIds: Iterable<string>,
): Promise<Map<string, number>> {
  const friends = [...new Set(friendIds)].filter((id) => id && id !== userId)
  const counts = new Map<string, number>()
  if (friends.length === 0) return counts

  const [pokerRows, beloteRows] = await Promise.all([
    prisma.$queryRaw<{ friendId: string; games: bigint }[]>(Prisma.sql`
      SELECT ga2."playerId" AS "friendId", COUNT(DISTINCT ga1."gameId")::bigint AS games
      FROM "GameAction" ga1
      INNER JOIN "GameAction" ga2 ON ga1."gameId" = ga2."gameId"
      WHERE ga1."playerId" = ${userId}
        AND ga2."playerId" IN (${Prisma.join(friends)})
      GROUP BY ga2."playerId"
    `),
    prisma.$queryRaw<{ friendId: string; games: bigint }[]>(Prisma.sql`
      SELECT bp2."userId" AS "friendId", COUNT(DISTINCT bp1."resultId")::bigint AS games
      FROM "belote_game_result_players" bp1
      INNER JOIN "belote_game_result_players" bp2 ON bp1."resultId" = bp2."resultId"
      WHERE bp1."userId" = ${userId}
        AND bp2."userId" IN (${Prisma.join(friends)})
      GROUP BY bp2."userId"
    `),
  ])

  for (const row of pokerRows) {
    counts.set(row.friendId, (counts.get(row.friendId) ?? 0) + Number(row.games))
  }
  for (const row of beloteRows) {
    counts.set(row.friendId, (counts.get(row.friendId) ?? 0) + Number(row.games))
  }
  return counts
}

export function scoreLobbyFriendAffinity(
  participantIds: string[],
  hostId: string,
  myFriends: Set<string>,
  coPlayCounts: Map<string, number>,
): LobbyFriendAffinity {
  let friendAffinityScore = 0
  let isFriendRoom = false
  const ids = new Set(participantIds.filter(Boolean))
  ids.add(hostId)
  for (const id of ids) {
    if (!myFriends.has(id)) continue
    isFriendRoom = true
    friendAffinityScore += coPlayCounts.get(id) ?? 0
    if (id === hostId) friendAffinityScore += 2
  }
  return { isFriendRoom, friendAffinityScore }
}

export function sortLobbyByFriendAffinity<T>(
  items: T[],
  scoreOf: (item: T) => LobbyFriendAffinity,
  tieBreaker: (a: T, b: T) => number,
): T[] {
  return [...items].sort((a, b) => {
    const sa = scoreOf(a)
    const sb = scoreOf(b)
    if (sa.isFriendRoom !== sb.isFriendRoom) return sa.isFriendRoom ? -1 : 1
    if (sb.friendAffinityScore !== sa.friendAffinityScore) {
      return sb.friendAffinityScore - sa.friendAffinityScore
    }
    return tieBreaker(a, b)
  })
}

export async function loadLobbyFriendSortContext(userId: string | undefined): Promise<{
  myFriends: Set<string>
  coPlayCounts: Map<string, number>
}> {
  if (!userId) {
    return { myFriends: new Set(), coPlayCounts: new Map() }
  }
  const myFriends = await getFriendIdsForUser(userId)
  const coPlayCounts = await getCoPlayCountsWithFriends(userId, myFriends)
  return { myFriends, coPlayCounts }
}
