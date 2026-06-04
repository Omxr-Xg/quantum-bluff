import { useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import { useVoice, type VoiceContextValue } from '../../contexts/VoiceContext'
import type { VoiceAudience } from './voiceTypes'

export function pickVoicePanelState(v: VoiceContextValue): TableVoiceChatState {
  return {
    settings: v.settings,
    participants: v.participants,
    speakingUserIds: v.speakingUserIds,
    micDenied: v.micDenied,
    joined: v.joined,
    channelLabel: v.channel?.label ?? null,
    setSpeakTo: v.setSpeakTo,
    setListenTo: v.setListenTo,
    toggleMic: v.toggleMic,
    toggleSound: v.toggleSound,
    togglePeerMute: v.togglePeerMute,
  }
}

/** État vocal pour une table — délègue au canal global unique. */
export type TableVoiceChatState = {
  settings: ReturnType<typeof useVoice>['settings']
  participants: ReturnType<typeof useVoice>['participants']
  speakingUserIds: string[]
  micDenied: boolean
  joined: boolean
  channelLabel: string | null
  setSpeakTo: (v: VoiceAudience) => void
  setListenTo: (v: VoiceAudience) => void
  toggleMic: () => void
  toggleSound: () => void
  togglePeerMute: (userId: string) => void
}

export function useTableVoiceChat(
  gameId: string | null | undefined,
  _userId: string | null | undefined,
  _socket: Socket | null | undefined,
  enabled: boolean,
): TableVoiceChatState {
  const voice = useVoice()

  useEffect(() => {
    if (!enabled || !gameId) return
    voice.joinTable(gameId)
    return () => {
      if (gameId && voice.shouldSkipLeaveOnTableUnmount(gameId)) return
      voice.leaveChannel()
    }
  }, [enabled, gameId, voice])

  return {
    settings: voice.settings,
    participants: voice.participants,
    speakingUserIds: voice.speakingUserIds,
    micDenied: voice.micDenied,
    joined: voice.joined,
    channelLabel: voice.channel?.label ?? null,
    setSpeakTo: voice.setSpeakTo,
    setListenTo: voice.setListenTo,
    toggleMic: voice.toggleMic,
    toggleSound: voice.toggleSound,
    togglePeerMute: voice.togglePeerMute,
  }
}
