import type { Prisma } from '../generated/prisma/index.js';

export const TOURNAMENT_LIST_GRACE_MS_DEFAULT = 15 * 60 * 1000;
export const TOURNAMENT_LIST_TAKE_DEFAULT = 50;

/** Ne pas lister en lobby les tournois ACTIVE dont le départ remonte à plus de cette durée (orphelins jamais passés en COMPLETED). */
export const TOURNAMENT_ACTIVE_LOBBY_MAX_AGE_MS_DEFAULT = 7 * 24 * 60 * 60 * 1000;

/**
 * Filtre lobby : ACTIVE récents + PENDING pertinents (futur ou fenêtre de grâce après startTime),
 * puis visibilité (public pour anonyme ; privé si créateur, inscrit ou demande en attente).
 */
export function buildTournamentLobbyWhere(input: {
  now: Date;
  graceMs: number;
  currentUserId: string | null;
  /** Défaut : {@link TOURNAMENT_ACTIVE_LOBBY_MAX_AGE_MS_DEFAULT} */
  activeMaxAgeMs?: number;
}): Prisma.TournamentWhereInput {
  const graceStart = new Date(input.now.getTime() - input.graceMs);
  const activeMaxAgeMs = input.activeMaxAgeMs ?? TOURNAMENT_ACTIVE_LOBBY_MAX_AGE_MS_DEFAULT;
  const activeStartNotBefore = new Date(input.now.getTime() - activeMaxAgeMs);

  const temporalFilter: Prisma.TournamentWhereInput = {
    OR: [
      {
        status: 'ACTIVE',
        startTime: { gte: activeStartNotBefore },
      },
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
