import type { VoiceAudience, VoiceParticipantPublic } from './voiceTypes'

export function isChannelWide(mode: VoiceAudience): boolean {
  return mode === 'CHANNEL' || mode === 'TABLE'
}

export function canHearParticipant(
  myUserId: string,
  remote: VoiceParticipantPublic,
  myListenTo: VoiceAudience,
  mySoundMuted: boolean,
  myPeerMutes: Set<string>,
  myFriendIds: Set<string>,
  blockedIds: Set<string>,
): boolean {
  if (remote.userId === myUserId) return false
  if (blockedIds.has(remote.userId)) return false
  if (mySoundMuted) return false
  if (myPeerMutes.has(remote.userId)) return false
  if (remote.micMuted) return false

  const remoteSpeaksToMe =
    isChannelWide(remote.speakTo) ||
    (remote.speakTo === 'FRIENDS' && myFriendIds.has(remote.userId))

  const iWantToHear =
    isChannelWide(myListenTo) ||
    (myListenTo === 'FRIENDS' && myFriendIds.has(remote.userId))

  return remoteSpeaksToMe && iWantToHear
}

export function shouldSendToRemote(
  myUserId: string,
  remoteUserId: string,
  mySpeakTo: VoiceAudience,
  myMicMuted: boolean,
  myFriendIds: Set<string>,
  blockedIds: Set<string>,
): boolean {
  if (remoteUserId === myUserId) return false
  if (blockedIds.has(remoteUserId)) return false
  if (myMicMuted) return false
  if (isChannelWide(mySpeakTo)) return true
  return myFriendIds.has(remoteUserId)
}
