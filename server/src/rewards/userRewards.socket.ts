import type { Server } from 'socket.io'

export type UserRewardsUpdatedPayload = {
  chips: number
  source: 'daily_login' | 'daily_challenge' | 'referral' | 'achievement'
  challengeCode?: string
}

/** Notifie le client connecté (`user:{id}`) que le solde / récompenses ont changé. */
export function emitUserRewardsUpdated(
  io: Server,
  userId: string,
  payload: UserRewardsUpdatedPayload,
): void {
  io.to(`user:${userId}`).emit('USER_REWARDS_UPDATED', payload)
}
