import { createApi, fetchBaseQuery, retry } from '@reduxjs/toolkit/query/react'
import { getApiBaseUrl } from '../utils/apiBase'
import { getAuthItem } from '../utils/authStorage'
import type { PublicPlayerCosmetics } from '../utils/publicCosmetics'

export type { PublicPlayerCosmetics }

export interface FriendProfile {
  id: string
  username: string
  level: number
  avatarUrl?: string | null
  isOnline: boolean
  friendshipCreatedAt: string
  cosmetics?: PublicPlayerCosmetics
  playerStats?: {
    totalWins: number
    totalGames: number
  } | null
  stats?: {
    totalWins: number
    totalGames: number
    winRatePercent: number
    wins?: number
  }
}

export interface User {
  id: string
  username: string
  level: number
  stats?: {
    totalWins: number
    totalGames: number
    winRatePercent: number
    /** @deprecated ancien format */
    wins?: number
  }
  avatarUrl?: string | null
  isOnline?: boolean
  /** ISO — dernière déconnexion (null si en ligne ou inconnu). */
  lastSeenAt?: string | null
  friendshipCreatedAt?: string
  currentActivity?: string
  playerStats?: {
    totalWins: number
    totalGames: number
  } | null
  cosmetics?: PublicPlayerCosmetics
  mutualFriendsCount?: number
}

export type FriendMessageKind = 'TEXT' | 'VOICE_CALL'

export type FriendCallOutcome = 'completed' | 'missed' | 'cancelled' | 'rejected'

export interface FriendMessage {
  id: string
  senderId: string
  receiverId: string
  content: string
  kind?: FriendMessageKind
  callDurationSec?: number | null
  callOutcome?: FriendCallOutcome | null
  createdAt: string
  sender?: { id: string; username: string }
  receiver?: { id: string; username: string }
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

interface BlockedUser {
  id: string
  blockedAt: string
  user: User
}

type PlayerReportReason = 'INAPPROPRIATE_LANGUAGE' | 'CHEATING' | 'HARASSMENT' | 'SPAM' | 'OTHER'

type UpdateProfilePayload = {
  avatarUrl?: string | null
  avatarPresetId?: string
  username?: string
  email?: string
  currentPassword?: string
  newPassword?: string
}

type UpdateProfileResponse = {
  avatarUrl: string | null
  username: string
  email: string
  chips?: number
  usernameChangeCost?: number
}

export type RegisterPayload = {
  username: string
  email: string
  password: string
  dateOfBirth: string
  secretQuestionId: number
  secretAnswer: string
  referralCode?: string
}

export type ReferralMe = {
  referralCode: string
  referralLink: string
  invitesCount: number
  chipsEarned: number
}

export type ReferralInvite = {
  userId: string
  username: string
  status: 'PENDING' | 'COMPLETED'
  createdAt: string
  rewardedAt: string | null
  chipsEarned: number
}

export type AchievementCategory =
  | 'LOGIN'
  | 'SOCIAL'
  | 'CASINO'
  | 'BELOTE'
  | 'POKER'
  | 'RECORDS'

export type AchievementCatalogItem = {
  id: string
  category: AchievementCategory
  threshold?: number
  rewardChips?: number
  rewardCosmeticId?: string
  unlocked: boolean
  unlockedAt: string | null
}

export type CosmeticType = 'BANNER' | 'AVATAR_FRAME' | 'TITLE'

export type ShopCosmetic = {
  id: string
  type: CosmeticType
  nameKey: string
  priceChips: number
  purchasable: boolean
  rarity: string
  styleJson: string
  owned: boolean
  acquiredAt: string | null
}

export type ShopAvatarPreset = {
  id: string
  priceChips: number
  free: boolean
  owned: boolean
  acquiredAt: string | null
}

export type TableThemeShopItem = {
  id: string
  kind: 'felt_theme' | 'felt_background' | 'custom_felt_color' | 'custom_background'
  priceChips: number
  free: boolean
  owned: boolean
}

export type TableThemePreferences = {
  visuals: {
    feltThemeId: string
    feltCustomColor: string | null
    feltBackgroundId: string
    feltBackgroundUrl: string | null
  }
  feltThemeId: string
  feltCustomColor: string | null
  feltBackgroundId: string
  ownedUnlockIds: string[]
}

export type TableThemeShopResponse = {
  feltThemes: TableThemeShopItem[]
  feltBackgrounds: TableThemeShopItem[]
  extras: TableThemeShopItem[]
  preferences: TableThemePreferences
}

export type ShopLoadout = {
  bannerId: string | null
  frameId: string | null
  titleId: string | null
}

export type PlayerHistoryMode = 'all' | 'poker' | 'belote' | 'casino' | 'tournament'

export type PlayerHistoryItem = {
  id: string
  gameType: string
  summary: string
  amount: number | null
  endedAt: string
  meta?: Record<string, unknown>
}

export type AnalyticsPeriod = '7d' | '30d' | '90d' | 'all'

export type PlayerAnalytics = {
  period: AnalyticsPeriod
  chipsTimeline: { date: string; balance: number }[]
  xpTimeline: { date: string; xp: number; level: number }[]
  gainsByGame: Record<string, number>
  gainsByGamePct: Record<string, number>
  records: Record<string, number>
}

export type PlayerGrowthStats = {
  chips: number
  level: number
  experience: number
  loginStreakCount: number
  achievementsUnlocked: number
  poker: Record<string, number>
  belote: Record<string, number>
  casino: Record<string, number>
}

export type SeasonInfo = {
  id: string
  number: number
  name: string
  startsAt: string
  endsAt: string
  status: string
  daysRemaining?: number | null
}

export type SeasonLeaderboardEntry = {
  rank: number
  userId: string
  username: string
  avatarUrl?: string | null
  xpEarned: number
  pokerWins: number
  beloteWins: number
}

export type NotificationType =
  | 'FRIEND_ONLINE'
  | 'INVITATION'
  | 'DAILY_REWARD'
  | 'ACHIEVEMENT'
  | 'SEASON_ENDED'
  | 'REFERRAL'
  | 'ADMIN_MESSAGE'
  | 'COSMETIC_GIFT'

export type AppNotification = {
  id: string
  type: NotificationType
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
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
    const token = getAuthItem('token')
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
    headers.set('x-idempotency-key', crypto.randomUUID())
    
    return headers
  },
});

//  LE BOUCLIER RETRY EST LÀ : On enveloppe notre baseQuery
const staggeredBaseQuery = retry(baseQuery, {
  maxRetries: 2,
  backoff: async (attempt) => {
    await new Promise((resolve) => setTimeout(resolve, Math.min(6000, 500 * 2 ** attempt)));
  },
});

export const api = createApi({
  reducerPath: 'api',
  baseQuery: staggeredBaseQuery,
  tagTypes: [
    'User',
    'Game',
    'Friend',
    'FriendRequest',
    'FriendMessage',
    'FriendLoan',
    'BlockedUser',
    'Referral',
    'Achievement',
    'Shop',
    'PlayerHistory',
    'Season',
    'Notification',
  ],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['User'],
    }),

    register: builder.mutation<
      {
        token: string
        referral?: {
          applied: true
          bonusChips: number
          referrerUsername: string
          friendAdded: boolean
        } | null
        user: { id: string; username: string; email: string; chips?: number; avatarUrl?: string | null }
      },
      RegisterPayload
    >({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User', 'Friend', 'Referral'],
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
      { email: string; secretAnswer: string; newPassword: string; totpCode?: string }
    >({
      query: (body) => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
    }),

    updateProfileAvatar: builder.mutation<UpdateProfileResponse, UpdateProfilePayload>({
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

    getFriendProfile: builder.query<FriendProfile, string>({
      query: (friendId) => `/friends/profile/${encodeURIComponent(friendId)}`,
      providesTags: (_r, _e, friendId) => [{ type: 'Friend', id: friendId }],
    }),

    removeFriend: builder.mutation<{ ok: boolean }, string>({
      query: (friendId) => ({
        url: `/friends/${encodeURIComponent(friendId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Friend', 'FriendRequest'],
    }),

    blockUser: builder.mutation<{ ok: boolean }, string>({
      query: (blockedUserId) => ({
        url: '/friends/block',
        method: 'POST',
        body: { blockedUserId },
      }),
      invalidatesTags: ['Friend', 'FriendRequest', 'FriendMessage', 'BlockedUser'],
    }),

    unblockUser: builder.mutation<{ ok: boolean }, string>({
      query: (blockedUserId) => ({
        url: `/friends/block/${encodeURIComponent(blockedUserId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['BlockedUser'],
    }),

    getBlockedUsers: builder.query<BlockedUser[], void>({
      query: () => '/friends/blocked',
      providesTags: (result) =>
        result
          ? result.map(({ user }) => ({ type: 'BlockedUser', id: user.id } as const))
          : ['BlockedUser'],
    }),

    reportPlayer: builder.mutation<
      { ok: boolean },
      { reportedUserId: string; reason: PlayerReportReason; detail?: string; gameId?: string | null }
    >({
      query: (body) => ({
        url: '/reports/player',
        method: 'POST',
        body,
      }),
    }),

    getFriendMessages: builder.query<FriendMessage[], { userId: string; friendId: string }>({
      query: ({ userId, friendId }) =>
        `/friends/messages?userId=${encodeURIComponent(userId)}&friendId=${encodeURIComponent(friendId)}`,
      providesTags: (_, __, { friendId }) => [{ type: 'FriendMessage', id: friendId }],
    }),

    sendFriendMessage: builder.mutation<
      {
        id: string;
        senderId: string;
        receiverId: string;
        content: string;
        createdAt: string;
        sender?: { id: string; username: string };
        receiver?: { id: string; username: string };
      },
      { receiverId: string; content: string }
    >({
      query: (body) => ({
        url: '/friends/messages',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_, __, { receiverId }) => [{ type: 'FriendMessage', id: receiverId }],
      async onQueryStarted({ receiverId, content }, { dispatch, queryFulfilled }) {
        const me = (getAuthItem('userId') ?? getAuthItem('userid') ?? '').trim()
        if (!me) return

        const displayName =
          (getAuthItem('username') ?? getAuthItem('quantum_bluff_username') ?? '').trim() || '…'
        const tmpId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

        const patchResult = dispatch(
          api.util.updateQueryData(
            'getFriendMessages',
            { userId: me, friendId: receiverId },
            (draft) => {
              draft.push({
                id: tmpId,
                senderId: me,
                receiverId,
                content,
                createdAt: new Date().toISOString(),
                sender: { id: me, username: displayName },
                receiver: { id: receiverId, username: '…' },
              })
            },
          ),
        )

        try {
          const { data: row } = await queryFulfilled
          dispatch(
            api.util.updateQueryData(
              'getFriendMessages',
              { userId: me, friendId: receiverId },
              (draft) => {
                const i = draft.findIndex((m) => m.id === tmpId)
                if (i === -1) return
                const prev = draft[i]
                draft[i] = {
                  id: row.id,
                  senderId: row.senderId,
                  receiverId: row.receiverId,
                  content: row.content,
                  createdAt: row.createdAt,
                  sender: row.sender ?? prev.sender,
                  receiver: row.receiver ?? prev.receiver,
                }
              },
            ),
          )
        } catch {
          patchResult.undo()
        }
      },
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

    getReferralMe: builder.query<ReferralMe, void>({
      query: () => '/referral/me',
      providesTags: ['Referral'],
    }),

    getReferralInvites: builder.query<{ invites: ReferralInvite[] }, void>({
      query: () => '/referral/invites',
      providesTags: ['Referral'],
    }),

    applyReferralCode: builder.mutation<{ ok: boolean }, { code: string }>({
      query: (body) => ({
        url: '/referral/apply',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Referral', 'User'],
    }),

    getMyAchievements: builder.query<
      { unlocked: { achievementId: string; unlockedAt: string }[]; catalog: AchievementCatalogItem[] },
      void
    >({
      query: () => '/achievements/me',
      providesTags: ['Achievement'],
    }),

    getShopAvatars: builder.query<{ items: ShopAvatarPreset[] }, void>({
      query: () => '/shop/avatars',
      providesTags: ['Shop'],
    }),

    purchaseAvatarPreset: builder.mutation<{ ok: boolean; presetId: string; chips: number }, string>({
      query: (id) => ({
        url: `/shop/avatars/${encodeURIComponent(id)}/purchase`,
        method: 'POST',
      }),
      invalidatesTags: ['Shop', 'User'],
    }),

    getTableThemeShop: builder.query<TableThemeShopResponse, void>({
      query: () => '/shop/table-themes',
      providesTags: ['Shop'],
    }),

    purchaseTableUnlock: builder.mutation<{ ok: boolean; unlockId: string; chips: number }, string>({
      query: (id) => ({
        url: `/shop/table-themes/${encodeURIComponent(id)}/purchase`,
        method: 'POST',
      }),
      invalidatesTags: ['Shop', 'User'],
    }),

    updateTablePreferences: builder.mutation<
      { preferences: TableThemePreferences['visuals'] },
      { feltThemeId?: string; feltCustomColor?: string | null; feltBackgroundId?: string }
    >({
      query: (body) => ({
        url: '/shop/table-preferences',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),

    uploadTableBackground: builder.mutation<
      { preferences: TableThemePreferences['visuals'] },
      { imageData: string }
    >({
      query: (body) => ({
        url: '/shop/table-background',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),

    getShopCosmetics: builder.query<{ items: ShopCosmetic[] }, void>({
      query: () => '/shop/cosmetics',
      providesTags: ['Shop'],
    }),

    purchaseCosmetic: builder.mutation<{ ok: boolean; cosmeticId: string; chips: number }, string>({
      query: (id) => ({
        url: `/shop/cosmetics/${encodeURIComponent(id)}/purchase`,
        method: 'POST',
      }),
      invalidatesTags: ['Shop', 'User'],
    }),

    getShopLoadout: builder.query<ShopLoadout, void>({
      query: () => '/shop/loadout',
      providesTags: ['Shop'],
    }),

    updateShopLoadout: builder.mutation<ShopLoadout, Partial<ShopLoadout>>({
      query: (body) => ({
        url: '/shop/loadout',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['Shop'],
    }),

    getPlayerHistory: builder.query<
      { items: PlayerHistoryItem[]; page: number; limit: number; mode: PlayerHistoryMode },
      { mode?: PlayerHistoryMode; page?: number; limit?: number }
    >({
      query: ({ mode = 'all', page = 1, limit = 20 }) =>
        `/player/history?mode=${encodeURIComponent(mode)}&page=${page}&limit=${limit}`,
      providesTags: ['PlayerHistory'],
    }),

    getPlayerAnalytics: builder.query<PlayerAnalytics, AnalyticsPeriod | void>({
      query: (period = '30d') => `/player/analytics?period=${encodeURIComponent(period)}`,
      providesTags: ['PlayerHistory'],
    }),

    getPlayerGrowthStats: builder.query<PlayerGrowthStats, void>({
      query: () => '/player/stats',
      providesTags: ['PlayerHistory'],
    }),

    getActiveSeason: builder.query<{ season: SeasonInfo | null }, void>({
      query: () => '/seasons/active',
      providesTags: ['Season'],
    }),

    getSeasonLeaderboard: builder.query<{ entries: SeasonLeaderboardEntry[] }, string>({
      query: (seasonId) => `/seasons/${encodeURIComponent(seasonId)}/leaderboard`,
      providesTags: (_r, _e, seasonId) => [{ type: 'Season', id: seasonId }],
    }),

    getNotifications: builder.query<{ items: AppNotification[]; unreadCount: number }, { unreadOnly?: boolean } | void>({
      query: (arg) => {
        const unreadOnly = arg && typeof arg === 'object' && arg.unreadOnly
        return unreadOnly ? '/notifications?unread=1' : '/notifications'
      },
      providesTags: ['Notification'],
    }),

    markNotificationRead: builder.mutation<{ ok: boolean }, string>({
      query: (id) => ({
        url: `/notifications/${encodeURIComponent(id)}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Notification'],
    }),

    markAllNotificationsRead: builder.mutation<{ ok: boolean; count: number }, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'POST',
      }),
      invalidatesTags: ['Notification'],
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
  useLazySearchUsersQuery,
  useSendFriendRequestMutation,
  useGetFriendRequestsQuery,
  useRespondToFriendRequestMutation,
  useGetFriendsQuery,
  useGetFriendProfileQuery,
  useRemoveFriendMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetBlockedUsersQuery,
  useReportPlayerMutation,
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
  useGetReferralMeQuery,
  useGetReferralInvitesQuery,
  useApplyReferralCodeMutation,
  useGetMyAchievementsQuery,
  useGetShopAvatarsQuery,
  usePurchaseAvatarPresetMutation,
  useGetTableThemeShopQuery,
  usePurchaseTableUnlockMutation,
  useUpdateTablePreferencesMutation,
  useUploadTableBackgroundMutation,
  useGetShopCosmeticsQuery,
  usePurchaseCosmeticMutation,
  useGetShopLoadoutQuery,
  useUpdateShopLoadoutMutation,
  useGetPlayerHistoryQuery,
  useGetPlayerAnalyticsQuery,
  useGetPlayerGrowthStatsQuery,
  useGetActiveSeasonQuery,
  useGetSeasonLeaderboardQuery,
  useGetNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = api
