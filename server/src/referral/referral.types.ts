export const REFERRAL_REFERRER_CHIPS = 500
export const REFERRAL_REFERRED_CHIPS = 500

export type ReferralMeResponse = {
  referralCode: string
  referralLink: string
  invitesCount: number
  chipsEarned: number
}

export type ReferralInviteRow = {
  userId: string
  username: string
  status: 'PENDING' | 'COMPLETED'
  createdAt: string
  rewardedAt: string | null
}
