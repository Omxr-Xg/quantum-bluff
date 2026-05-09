import type { Prisma } from '../generated/prisma/index.js';

export const TOURNAMENT_LIST_GRACE_MS_DEFAULT = 15 * 60 * 1000;
export const TOURNAMENT_LIST_TAKE_DEFAULT = 50;

/**
 * Filtre lobby : ACTIVE + PENDING pertinents (futur ou fenêtre de grâce après startTime),
 * puis visibilité (public pour anonyme ; privé si créateur, inscrit ou demande en attente).
 */
export function buildTournamentLobbyWhere(input: {
  now: Date;
  graceMs: number;
  currentUserId: string | null;
}): Prisma.TournamentWhereInput {
  const graceStart = new Date(input.now.getTime() - input.graceMs);

  const temporalFilter: Prisma.TournamentWhereInput = {
    OR: [
      { status: 'ACTIVE' },
      {
        status: 'PENDING',
        OR: [
          { startTime: { gt: input.now } },
          { startTime: { gte: graceStart, lte: input.now } },
        ],
      },
    ],
  };

  const visibilityFilter: Prisma.TournamentWhereInput = input.currentUserId
    ? {
        OR: [
          { visibility: 'PUBLIC' },
          { visibility: 'PRIVATE', createdById: input.currentUserId },
          {
            visibility: 'PRIVATE',
            players: { some: { userId: input.currentUserId } },
          },
          {
            visibility: 'PRIVATE',
            joinRequests: {
              some: { requesterId: input.currentUserId, status: 'PENDING' },
            },
          },
        ],
      }
    : { visibility: 'PUBLIC' };

  return { AND: [temporalFilter, visibilityFilter] };
}
