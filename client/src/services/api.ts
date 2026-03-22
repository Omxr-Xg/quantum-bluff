import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

const fetchWithRetry = async (
  input: RequestInfo | URL,
  init?: RequestInit,
  retries = 3
): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(input, init)
    if (res.status === 429 && i < retries - 1) {
      await new Promise((r) => setTimeout(r, 2000 * (i + 1)))
      continue
    }
    return res
  }
  return fetch(input, init!)
}

interface User {
  id: string
  username: string
  level: number
  stats: {
    wins: number
    totalGames: number
  }
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

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: (() => {
const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const apiUrl = (import.meta.env.VITE_API_URL ?? '').toString().replace(/\/$/, '');
      
      // En dev: proxy Vite sur /api
      if (import.meta.env.DEV) return `${origin}/api`;
      
      // Capacitor/mobile: VITE_API_URL est l'URL complète du backend (ex: http://185.155.93.105:3000)
      if (apiUrl.startsWith('http')) return `${apiUrl}/api`;
      
      return apiUrl ? `${origin}${apiUrl}/api` : `${origin}/api`;
    })(),
    fetchFn: fetchWithRetry,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User', 'Game', 'Friend', 'FriendRequest', 'FriendMessage'],
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
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useCheckEmailMutation,
  useRecoveryQuestionMutation,
  useResetPasswordMutation,
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
} = api