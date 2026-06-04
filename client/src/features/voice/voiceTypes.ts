export type VoiceAudience = 'NOBODY' | 'FRIENDS' | 'CHANNEL' | 'TABLE'

export type VoiceChannelKind = 'waiting' | 'table' | 'call'

export type VoiceChannelMeta = {
  channelId: string
  kind: VoiceChannelKind
  label: string
}

export type VoiceParticipantPublic = {
  userId: string
  username: string
  speakTo: VoiceAudience
  listenTo: VoiceAudience
  micMuted: boolean
  soundMuted: boolean
  peerMutes: string[]
  speaking: boolean
}

export type VoiceRosterPayload = {
  channelId: string
  gameId?: string
  channel: VoiceChannelMeta
  participants: VoiceParticipantPublic[]
  friendIds: string[]
  blockedUserIds: string[]
}

export type VoiceSettings = {
  speakTo: VoiceAudience
  listenTo: VoiceAudience
  micMuted: boolean
  soundMuted: boolean
  peerMutes: Set<string>
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  speakTo: 'CHANNEL',
  listenTo: 'CHANNEL',
  micMuted: true,
  soundMuted: false,
  peerMutes: new Set(),
}

export type VoiceIncomingCall = {
  callId: string
  channelId: string
  type: 'private' | 'group'
  fromUserId: string
  fromUsername: string
  fromAvatarUrl?: string | null
  memberIds: string[]
}

export type VoiceOutgoingCallTarget = {
  userId: string
  username: string
  avatarUrl?: string | null
}

export type VoiceOutgoingCallStatus =
  | 'dialing'
  | 'connecting'
  | 'connected'
  | 'unanswered'

export type VoiceUnansweredReason =
  | 'timeout'
  | 'rejected'
  | 'ignored'
  | 'blocked'
  | 'error'

export type VoiceOutgoingCall = {
  callId: string
  channelId: string
  type: 'private' | 'group'
  targets: VoiceOutgoingCallTarget[]
  status: VoiceOutgoingCallStatus
  unansweredReason?: VoiceUnansweredReason
  /** Horodatage (ms) au passage en `connected` — pour le compteur d’appel. */
  connectedAt?: number
  /** True si cet utilisateur a accepté un appel entrant (panneau callee). */
  isCallee?: boolean
}

export type VoiceMigrateHint = {
  fromChannelId: string
  toChannelId: string
  mode: 'continue' | 'replace'
}

export function buildWaitingChannelId(roomId: string): string {
  return `waiting:${roomId}`
}

export function buildTableChannelId(gameId: string): string {
  return `table:${gameId}`
}
