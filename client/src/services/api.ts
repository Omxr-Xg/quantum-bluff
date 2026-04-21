import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import { getApiBaseUrl } from '../utils/apiBase'



interface User {
  id: string
  username: string
  level: number
  /** @deprecated API renvoie playerStats ; conservé pour compat. */
  stats?: {
    wins: number
    totalGames: number
  }
  avatarUrl?: string | null
  playerStats?: {
    totalWins: number
    totalGames: number
  } | null
}

export interface PlayerStats {
  id: string
  playerId: string
  totalGames: number
  totalWins: number
  totalLosses: number
  totalHands: number
  totalRaises: number
  totalCalls: number
  totalFolds: number
  totalChecks: number
  biggestPot: number
  biggestWin: number
  totalChipsWon: number
  totalChipsLost: number
  updatedAt: string
  winRate: number
}

interface FriendRequest {
  id: string
  senderId: string
  receiverId: string
  status: string
  createdAt: string
  updatedAt: string
  sender: User
}

// On configure l'URL et les Headers de base
const baseQuery = fetchBaseQuery({
  baseUrl: (() => {
    const base = getApiBaseUrl()
    if (base) return `${base}/api`
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/api`
  })(),
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    headers.set('x-idempotency-key', crypto.randomUUID())
    
    return headers
  },
});

//  LE BOUCLIER RETRY EST LÀ : On enveloppe notre baseQuery
const staggeredBaseQuery = retry(baseQuery, {
  maxRetries: 3, // On retente 3 fois maximum
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery: staggeredBaseQuery,
  tagTypes: ['User', 'Game', 'Friend', 'FriendRequest', 'FriendMessage', 'FriendLoan'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),

    checkEmail: builder.mutation<{ exists: boolean }, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/check-email',
        method: 'POST',
        body: { email },
      }),
    }),

    recoveryQuestion: builder.mutation<{ questionId: number }, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/recovery-question',
        method: 'POST',
        body: { email },
      }),
    }),

    resetPassword: builder.mutation<
      { ok: boolean },
      { email: string; secretAnswer: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    updateProfileAvatar: builder.mutation<{ avatarUrl: string | null }, { avatarUrl: string | null }>({
      query: (body) => ({
        url: '/auth/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User', 'Friend', 'FriendRequest'],
    }),

    getGames: builder.query({
      query: () => '/games',
      providesTags: ['Game'],
    }),

    createGame: builder.mutation({
      query: (playerName) => ({
        url: '/games',
        method: 'POST',
        body: { playerName },
      }),
      invalidatesTags: ['Game'],
    }),

    joinGame: builder.mutation({
      query: ({ gameId, playerName }) => ({
        url: `/games/${gameId}/join`,
        method: 'POST',
        body: { playerName },
      }),
      invalidatesTags: ['Game'],
    }),

    searchUsers: builder.query<User[], string>({
      query: (query) => `/friends/search?query=${encodeURIComponent(query)}`,
      providesTags: (result) =>
        result ? result.map(({ id }) => ({ type: 'Friend', id } as const)) : ['Friend'],
    }),

    sendFriendRequest: builder.mutation<FriendRequest, { senderId: string; receiverUsername: string }>({
      query: ({ senderId, receiverUsername }) => ({
        url: '/friends/request',
        method: 'POST',
        body: { senderId, receiverUsername },
      }),
      invalidatesTags: ['FriendRequest'],
    }),

    getFriendRequests: builder.query<FriendRequest[], string>({
      query: (userId) => `/friends/requests/${userId}`,
      providesTags: ['FriendRequest'],
    }),

    respondToFriendRequest: builder.mutation<void, { requestId: string; status: 'ACCEPTED' | 'REJECTED' }>({
      query: ({ requestId, status }) => ({
        url: `/friends/request/${requestId}`,
        method: 'PUT',
        body: { status },
      }),
      invalidatesTags: ['FriendRequest', 'Friend'],
    }),

    getFriends: builder.query<User[], string>({
      query: (userId) => `/friends/${userId}`,
      providesTags: (result) =>
        result ? result.map(({ id }) => ({ type: 'Friend', id } as const)) : ['Friend'],
    }),

    getFriendMessages: builder.query<
      { id: string; senderId: string; receiverId: string; content: string; createdAt: string; sender: { id: string; username: string }; receiver: { id: string; username: string } }[],
      { userId: string; friendId: string }
    >({
      query: ({ userId, friendId }) =>
        `/friends/messages?userId=${encodeURIComponent(userId)}&friendId=${encodeURIComponent(friendId)}`,
      providesTags: (_, __, { friendId }) => [{ type: 'FriendMessage', id: friendId }],
    }),

    sendFriendMessage: builder.mutation<
      { id: string; senderId: string; receiverId: string; content: string; createdAt: string },
      { receiverId: string; content: string }
    >({
      query: (body) => ({
        url: '/friends/messages',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { receiverId }) => [{ type: 'FriendMessage', id: receiverId }],
    }),

    getPlayerStats: builder.query<PlayerStats, string>({
      query: (playerId) => `/game/stats/${playerId}`,
    }),

    getFriendLoans: builder.query<
      {
        requestsSent: Record<string, unknown>[]
        requestsReceived: Record<string, unknown>[]
        activeLoans: Record<string, unknown>[]
        completedLoans: Record<string, unknown>[]
      },
      void
    >({
      query: () => '/friends/loans',
      providesTags: ['FriendLoan'],
      refetchOnMountOrArgChange: true,
    }),

    getFriendLoan: builder.query<{ loan: Record<string, unknown> }, string>({
      query: (loanId) => `/friends/loans/${loanId}`,
      providesTags: (_r, _e, loanId) => [{ type: 'FriendLoan', id: loanId }],
    }),

    createFriendLoanRequest: builder.mutation<
      { loanRequest: Record<string, unknown> },
      { lenderId: string; amount: number; repaymentRate: number }
    >({
      query: (body) => ({
        url: '/friends/loans/requests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FriendLoan'],
    }),

    acceptFriendLoanRequest: builder.mutation<{ loan: Record<string, unknown> }, { loanRequestId: string }>({
      query: ({ loanRequestId }) => ({
        url: `/friends/loans/requests/${loanRequestId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendLoan'],
    }),

    rejectFriendLoanRequest: builder.mutation<{ ok: boolean }, { loanRequestId: string }>({
      query: ({ loanRequestId }) => ({
        url: `/friends/loans/requests/${loanRequestId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendLoan'],
    }),

    cancelFriendLoanRequest: builder.mutation<{ ok: boolean }, { loanRequestId: string }>({
      query: ({ loanRequestId }) => ({
        url: `/friends/loans/requests/${loanRequestId}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['FriendLoan'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useCheckEmailMutation,
  useRecoveryQuestionMutation,
  useResetPasswordMutation,
  useUpdateProfileAvatarMutation,
  useGetGamesQuery,
  useCreateGameMutation,
  useJoinGameMutation,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useGetFriendRequestsQuery,
  useRespondToFriendRequestMutation,
  useGetFriendsQuery,
  useGetFriendMessagesQuery,
  useSendFriendMessageMutation,
  useGetPlayerStatsQuery,
  useGetFriendLoansQuery,
  useGetFriendLoanQuery,
  useLazyGetFriendLoanQuery,
  useCreateFriendLoanRequestMutation,
  useAcceptFriendLoanRequestMutation,
  useRejectFriendLoanRequestMutation,
  useCancelFriendLoanRequestMutation,
} = api