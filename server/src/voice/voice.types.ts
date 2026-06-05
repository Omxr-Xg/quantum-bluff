export type VoiceAudience = 'NOBODY' | 'FRIENDS' | 'CHANNEL' | 'TABLE'

export type VoiceChannelKind = 'waiting' | 'table' | 'call'

export type VoiceParticipant = {
  userId: string
  username: string
  speakTo: VoiceAudience
  listenTo: VoiceAudience
  micMuted: boolean
  soundMuted: boolean
  peerMutes: Set<string>
  speaking: boolean
  socketIds: Set<string>
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

export type VoiceChannelMeta = {
  channelId: string
  kind: VoiceChannelKind
  label: string
}

export type VoiceRosterPayload = {
  channelId: string
  /** @deprecated Utiliser channelId — conservé pour tables existantes. */
  gameId?: string
  channel: VoiceChannelMeta
  participants: VoiceParticipantPublic[]
  friendIds: string[]
  blockedUserIds: string[]
}

export type VoiceActivePayload = {
  channelId: string | null
  channel: VoiceChannelMeta | null
}

export type VoiceCallType = 'private' | 'group'

export type VoiceIncomingCallPayload = {
  callId: string
  channelId: string
  type: VoiceCallType
  fromUserId: string
  fromUsername: string
  fromAvatarUrl?: string | null
  memberIds: string[]
}

export type VoiceSignalPayload = {
  channelId: string
  gameId?: string
  fromUserId: string
  toUserId: string
  signal: {
    type: 'offer' | 'answer' | 'ice'
    sdp?: RTCSessionDescriptionInit
    candidate?: RTCIceCandidateInit
  }
}

export type VoiceMigrateHint = {
  fromChannelId: string
  toChannelId: string
  mode: 'continue' | 'replace'
}
