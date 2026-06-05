export const NEGOTIATION_TIMEOUT_MS = 10_000

export enum CallState {
  IDLE = 'IDLE',
  OUTGOING = 'OUTGOING',
  INCOMING = 'INCOMING',
  ACCEPTED = 'ACCEPTED',
  NEGOTIATING = 'NEGOTIATING',
  CONNECTED = 'CONNECTED',
  ENDED = 'ENDED',
}

/** Transitions autorisées depuis chaque état. */
export const CALL_STATE_TRANSITIONS: Record<CallState, CallState[]> = {
  [CallState.IDLE]: [CallState.OUTGOING, CallState.INCOMING],
  [CallState.OUTGOING]: [CallState.ACCEPTED, CallState.ENDED],
  [CallState.INCOMING]: [CallState.ACCEPTED, CallState.ENDED],
  [CallState.ACCEPTED]: [CallState.NEGOTIATING, CallState.ENDED],
  [CallState.NEGOTIATING]: [CallState.CONNECTED, CallState.ENDED],
  [CallState.CONNECTED]: [CallState.ENDED],
  [CallState.ENDED]: [CallState.IDLE],
}

export function canTransitionCallState(from: CallState, to: CallState): boolean {
  return CALL_STATE_TRANSITIONS[from]?.includes(to) ?? false
}

export type CallConnectedPayload = {
  callId: string
  channelId: string
  callerId: string
  negotiationId: string
}

export type CallSignalType = 'offer' | 'answer' | 'ice'

export type CallSignalPayload = {
  callId: string
  channelId: string
  negotiationId: string
  fromUserId: string
  toUserId: string
  signal: {
    type: CallSignalType
    sdp?: RTCSessionDescriptionInit
    candidate?: RTCIceCandidateInit
  }
}

export type VoiceCallManagerCallbacks = {
  onStateChange?: (state: CallState) => void
  onConnected?: () => void
  onFailed?: (reason: 'negotiation_timeout' | 'ice_failed' | 'mic_denied') => void
  onMicDenied?: () => void
  onRemoteSpeakingChange?: (speaking: boolean) => void
}
