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
    baseUrl: `${(import.meta.env.VITE_API_URL || 'http://localhost:3000').toString().replace(/\/$/, '')}/api`,
    fetchFn: fetchWithRetry,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['User', 'Game', 'Friend', 'FriendRequest'],
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
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetGamesQuery,
  useCreateGameMutation,
  useJoinGameMutation,
  useSearchUsersQuery,
  useSendFriendRequestMutation,
  useGetFriendRequestsQuery,
  useRespondToFriendRequestMutation,
  useGetFriendsQuery,
} = api