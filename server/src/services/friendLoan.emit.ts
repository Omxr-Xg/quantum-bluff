import type { Server } from 'socket.io'

export const FRIEND_LOAN_SOCKET = {
  LOAN_REQUEST_RECEIVED: 'LOAN_REQUEST_RECEIVED',
  LOAN_REQUEST_ACCEPTED: 'LOAN_REQUEST_ACCEPTED',
  LOAN_REQUEST_REJECTED: 'LOAN_REQUEST_REJECTED',
  LOAN_CREATED: 'LOAN_CREATED',
  LOAN_REPAYMENT_PROGRESS: 'LOAN_REPAYMENT_PROGRESS',
  LOAN_COMPLETED: 'LOAN_COMPLETED',
} as const

export type FriendLoanSocketEvent = (typeof FRIEND_LOAN_SOCKET)[keyof typeof FRIEND_LOAN_SOCKET]

export function emitToUsers(io: Server | undefined, userIds: string[], event: FriendLoanSocketEvent, payload: unknown): void {
  if (!io) return
  const unique = [...new Set(userIds)]
  for (const uid of unique) {
    io.to(`user:${uid}`).emit(event, payload)
  }
}
