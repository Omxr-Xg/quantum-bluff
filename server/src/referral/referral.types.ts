export const REFERRAL_REFERRER_CHIPS = 1000
export const REFERRAL_REFERRED_CHIPS = 2000

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
  chipsEarned: number
}

export type ApplyReferralResult = {
  referralId: string
  referrerId: string
  referredUserId: string
  referredUsername: string
  referrerUsername: string
  referredChips: number
  referrerChips: number
}
