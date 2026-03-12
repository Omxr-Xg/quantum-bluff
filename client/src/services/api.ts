import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:3000/api',
  }),
  tagTypes: ['User', 'Game'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
    }),
    // Game endpoints
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
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetGamesQuery,
  useCreateGameMutation,
  useJoinGameMutation,
} = api
