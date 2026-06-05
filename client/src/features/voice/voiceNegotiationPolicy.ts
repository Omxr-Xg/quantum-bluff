import type { VoiceChannelKind } from './voiceTypes'

export type InitiateOfferInput = {
  channelKind: VoiceChannelKind
  myUserId: string
  remoteUserId: string
  callCreatorId?: string | null
  hasLiveMic: boolean
  canSend: boolean
}

/** Détermine si ce client doit envoyer l'offer WebRTC initial. */
export function shouldInitiateOffer(input: InitiateOfferInput): boolean {
  const { channelKind, myUserId, remoteUserId, callCreatorId, hasLiveMic, canSend } = input
  if (!hasLiveMic || !canSend) return false
  if (channelKind === 'call') {
    return Boolean(callCreatorId && callCreatorId === myUserId)
  }
  return myUserId < remoteUserId
}

export type PolitePeerInput = {
  channelKind: VoiceChannelKind
  myUserId: string
  remoteUserId: string
}

/** Peer « polite » : accepte les offers en collision (re-négociation). */
export function isPolitePeer(input: PolitePeerInput): boolean {
  if (input.channelKind === 'call') return true
  return input.myUserId > input.remoteUserId
}

/** Garder la piste attachée (mute via enabled) plutôt que retirer le sender. */
export function shouldKeepAttachedAudioTrack(
  channelKind: VoiceChannelKind,
  hasLiveMic: boolean,
): boolean {
  if (!hasLiveMic) return false
  return channelKind === 'call' || channelKind === 'waiting' || channelKind === 'table'
}
