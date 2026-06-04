import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Socket } from 'socket.io-client'
import { WebRTCVoiceMesh } from '../features/voice/WebRTCVoiceMesh'
import {
  buildTableChannelId,
  buildWaitingChannelId,
  DEFAULT_VOICE_SETTINGS,
  type VoiceChannelMeta,
  type VoiceIncomingCall,
  type VoiceMigrateHint,
  type VoiceParticipantPublic,
  type VoiceRosterPayload,
  type VoiceSettings,
  type VoiceAudience,
} from '../features/voice/voiceTypes'
import { useSocket } from '../hooks/useSocket'
import { useUser } from '../hooks/useUser'

export type VoiceContextValue = {
  channelId: string | null
  channel: VoiceChannelMeta | null
  settings: VoiceSettings
  participants: VoiceParticipantPublic[]
  speakingUserIds: string[]
  micDenied: boolean
  joined: boolean
  incomingCall: VoiceIncomingCall | null
  joinChannel: (channelId: string, opts?: { replace?: boolean }) => void
  switchChannel: (
    toChannelId: string,
    opts?: { mode?: 'continue' | 'replace'; fromChannelId?: string },
  ) => void
  leaveChannel: () => void
  joinWaitingRoom: (roomId: string) => void
  joinTable: (gameId: string) => void
  startPrivateCall: (targetUserId: string) => void
  startGroupCall: (targetUserIds: string[]) => void
  respondToCall: (action: 'accept' | 'reject' | 'ignore' | 'block') => void
  applyMigrateHint: (hint: VoiceMigrateHint, memberIds: string[]) => void
  returnFromTableToWaiting: (hint: VoiceMigrateHint, memberIds: string[]) => void
  shouldSkipLeaveOnTableUnmount: (gameId: string) => boolean
  setSpeakTo: (v: VoiceAudience) => void
  setListenTo: (v: VoiceAudience) => void
  toggleMic: () => void
  toggleSound: () => void
  togglePeerMute: (userId: string) => void
}

const VoiceContext = createContext<VoiceContextValue | null>(null)

function emitSettings(socket: Socket, channelId: string, s: VoiceSettings): void {
  socket.emit('VOICE_SETTINGS', {
    channelId,
    speakTo: s.speakTo,
    listenTo: s.listenTo,
    micMuted: s.micMuted,
    soundMuted: s.soundMuted,
  })
}

export function VoiceProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket()
  const { userId } = useUser()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [channel, setChannel] = useState<VoiceChannelMeta | null>(null)
  const [settings, setSettings] = useState<VoiceSettings>({
    ...DEFAULT_VOICE_SETTINGS,
    peerMutes: new Set(),
  })
  const [participants, setParticipants] = useState<VoiceParticipantPublic[]>([])
  const [speakingUserIds, setSpeakingUserIds] = useState<string[]>([])
  const [micDenied, setMicDenied] = useState(false)
  const [joined, setJoined] = useState(false)
  const [incomingCall, setIncomingCall] = useState<VoiceIncomingCall | null>(null)

  const meshRef = useRef<WebRTCVoiceMesh | null>(null)
  const settingsRef = useRef(settings)
  const channelIdRef = useRef<string | null>(null)
  const pendingCallRef = useRef<string[] | null>(null)
  const preserveTableUnmountRef = useRef<string | null>(null)
  settingsRef.current = settings
  channelIdRef.current = channelId

  const teardownMesh = useCallback(() => {
    meshRef.current?.destroy()
    meshRef.current = null
    setJoined(false)
    setParticipants([])
    setSpeakingUserIds([])
  }, [])

  const pushSettings = useCallback(
    (next: VoiceSettings) => {
      setSettings(next)
      const cid = channelIdRef.current
      if (socket && cid) emitSettings(socket, cid, next)
      meshRef.current?.updateSettings(next)
    },
    [socket],
  )

  const bindMesh = useCallback(
    (cid: string) => {
      if (!socket || !userId) return
      teardownMesh()
      const mesh = new WebRTCVoiceMesh(cid, userId, socket, settingsRef.current, {
        onSpeakingChange: setSpeakingUserIds,
        onMicError: () => setMicDenied(true),
      })
      meshRef.current = mesh
      setJoined(true)
    },
    [socket, userId, teardownMesh],
  )

  const joinChannel = useCallback(
    (cid: string, opts?: { replace?: boolean }) => {
      if (!socket || !userId) return
      socket.emit('VOICE_JOIN', { channelId: cid, replace: opts?.replace ?? true })
    },
    [socket, userId],
  )

  const switchChannel = useCallback(
    (
      toChannelId: string,
      opts?: { mode?: 'continue' | 'replace'; fromChannelId?: string },
    ) => {
      if (!socket || !userId) return
      socket.emit('VOICE_SWITCH', {
        channelId: toChannelId,
        mode: opts?.mode ?? 'replace',
        fromChannelId: opts?.fromChannelId ?? channelIdRef.current ?? undefined,
      })
    },
    [socket, userId],
  )

  const leaveChannel = useCallback(() => {
    if (!socket) return
    const cid = channelIdRef.current
    if (cid) socket.emit('VOICE_LEAVE', { channelId: cid })
    teardownMesh()
    setChannelId(null)
    setChannel(null)
  }, [socket, teardownMesh])

  const joinWaitingRoom = useCallback(
    (roomId: string) => {
      const cid = buildWaitingChannelId(roomId)
      if (channelIdRef.current === cid) return
      joinChannel(cid)
    },
    [joinChannel],
  )

  const joinTable = useCallback(
    (gameId: string) => joinChannel(buildTableChannelId(gameId)),
    [joinChannel],
  )

  const startPrivateCall = useCallback(
    (targetUserId: string) => {
      if (!socket) return
      socket.emit('VOICE_CALL_START', {
        type: 'private',
        targetUserIds: [targetUserId],
      })
    },
    [socket],
  )

  const startGroupCall = useCallback(
    (targetUserIds: string[]) => {
      if (!socket) return
      socket.emit('VOICE_CALL_START', {
        type: 'group',
        targetUserIds,
      })
    },
    [socket],
  )

  const respondToCall = useCallback(
    (action: 'accept' | 'reject' | 'ignore' | 'block') => {
      if (!socket || !incomingCall) return
      socket.emit('VOICE_CALL_RESPOND', { callId: incomingCall.callId, action })
      setIncomingCall(null)
    },
    [socket, incomingCall],
  )

  const applyMigrateHint = useCallback(
    (hint: VoiceMigrateHint, memberIds: string[]) => {
      if (!userId || !socket) return
      const onSourceChannel = channelIdRef.current === hint.fromChannelId
      const overlap =
        memberIds.includes(userId) &&
        (participants.length === 0 ||
          participants.every((p) => memberIds.includes(p.userId)))
      if (onSourceChannel && overlap && hint.mode === 'continue') {
        switchChannel(hint.toChannelId, {
          mode: 'continue',
          fromChannelId: hint.fromChannelId,
        })
      } else if (onSourceChannel) {
        switchChannel(hint.toChannelId, {
          mode: 'replace',
          fromChannelId: hint.fromChannelId,
        })
      } else if (hint.mode === 'continue') {
        joinChannel(hint.toChannelId)
      }
    },
    [userId, socket, participants, switchChannel, joinChannel],
  )

  const returnFromTableToWaiting = useCallback(
    (hint: VoiceMigrateHint, memberIds: string[]) => {
      const parsed = hint.fromChannelId.replace(/^table:/, '')
      if (parsed) preserveTableUnmountRef.current = parsed
      applyMigrateHint(hint, memberIds)
    },
    [applyMigrateHint],
  )

  const shouldSkipLeaveOnTableUnmount = useCallback((gameId: string) => {
    if (preserveTableUnmountRef.current === gameId) {
      preserveTableUnmountRef.current = null
      return true
    }
    return false
  }, [])

  useEffect(() => {
    if (!socket || !userId) return

    const onRoster = (payload: VoiceRosterPayload) => {
      if (!payload.channelId) return
      if (channelIdRef.current && payload.channelId !== channelIdRef.current) {
        bindMesh(payload.channelId)
      }
      setChannelId(payload.channelId)
      setChannel(payload.channel)
      channelIdRef.current = payload.channelId
      if (!meshRef.current) bindMesh(payload.channelId)
      else meshRef.current.setChannelId(payload.channelId)
      setParticipants(payload.participants)
      meshRef.current?.applyRoster(payload)
      setSpeakingUserIds(payload.participants.filter((p) => p.speaking).map((p) => p.userId))
    }

    const onActive = (payload: { channelId: string | null; channel: VoiceChannelMeta | null }) => {
      setChannelId(payload.channelId)
      setChannel(payload.channel)
      channelIdRef.current = payload.channelId
      if (!payload.channelId) teardownMesh()
    }

    const onSignal = (payload: {
      channelId?: string
      gameId?: string
      fromUserId: string
      toUserId: string
      signal: { type: string; sdp?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }
    }) => {
      meshRef.current?.handleSignal(payload)
    }

    const onPeerLeft = (payload: { channelId?: string; userId: string }) => {
      if (payload.channelId && payload.channelId !== channelIdRef.current) return
      meshRef.current?.handlePeerLeft(payload.userId)
      setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId))
    }

    const onIncoming = (payload: VoiceIncomingCall) => {
      setIncomingCall(payload)
    }

    const onConfirmLeave = (payload: {
      pendingAction?: { type: string; targetUserIds?: string[] }
    }) => {
      if (payload.pendingAction?.type === 'call' && payload.pendingAction.targetUserIds) {
        pendingCallRef.current = payload.pendingAction.targetUserIds
        leaveChannel()
      }
    }

    socket.on('VOICE_ROSTER', onRoster)
    socket.on('VOICE_ACTIVE', onActive)
    socket.on('VOICE_SIGNAL', onSignal)
    socket.on('VOICE_PEER_LEFT', onPeerLeft)
    socket.on('VOICE_CALL_INCOMING', onIncoming)
    socket.on('VOICE_CONFIRM_LEAVE', onConfirmLeave)

    return () => {
      socket.off('VOICE_ROSTER', onRoster)
      socket.off('VOICE_ACTIVE', onActive)
      socket.off('VOICE_SIGNAL', onSignal)
      socket.off('VOICE_PEER_LEFT', onPeerLeft)
      socket.off('VOICE_CALL_INCOMING', onIncoming)
      socket.off('VOICE_CONFIRM_LEAVE', onConfirmLeave)
      if (channelIdRef.current) socket.emit('VOICE_LEAVE', { channelId: channelIdRef.current })
      teardownMesh()
    }
  }, [socket, userId, bindMesh, teardownMesh, leaveChannel])

  useEffect(() => {
    if (!socket || !pendingCallRef.current) return
    if (!channelId) {
      socket.emit('VOICE_CALL_START', {
        type: pendingCallRef.current.length === 1 ? 'private' : 'group',
        targetUserIds: pendingCallRef.current,
      })
      pendingCallRef.current = null
    }
  }, [socket, channelId])

  const value = useMemo<VoiceContextValue>(
    () => ({
      channelId,
      channel,
      settings,
      participants,
      speakingUserIds,
      micDenied,
      joined,
      incomingCall,
      joinChannel,
      switchChannel,
      leaveChannel,
      joinWaitingRoom,
      joinTable,
      startPrivateCall,
      startGroupCall,
      respondToCall,
      applyMigrateHint,
      returnFromTableToWaiting,
      shouldSkipLeaveOnTableUnmount,
      setSpeakTo: (v) => pushSettings({ ...settingsRef.current, speakTo: v }),
      setListenTo: (v) => pushSettings({ ...settingsRef.current, listenTo: v }),
      toggleMic: () => {
        const nextMuted = !settingsRef.current.micMuted
        pushSettings({ ...settingsRef.current, micMuted: nextMuted })
        void meshRef.current?.ensureMic(!nextMuted)
        if (!nextMuted) setMicDenied(false)
      },
      toggleSound: () => {
        pushSettings({
          ...settingsRef.current,
          soundMuted: !settingsRef.current.soundMuted,
        })
      },
      togglePeerMute: (targetUserId) => {
        const m = new Set(settingsRef.current.peerMutes)
        const muted = !m.has(targetUserId)
        if (muted) m.add(targetUserId)
        else m.delete(targetUserId)
        pushSettings({ ...settingsRef.current, peerMutes: m })
        const cid = channelIdRef.current
        if (socket && cid) {
          socket.emit('VOICE_PEER_MUTE', { channelId: cid, targetUserId, muted })
        }
      },
    }),
    [
      channelId,
      channel,
      settings,
      participants,
      speakingUserIds,
      micDenied,
      joined,
      incomingCall,
      joinChannel,
      switchChannel,
      leaveChannel,
      joinWaitingRoom,
      joinTable,
      startPrivateCall,
      startGroupCall,
      respondToCall,
      applyMigrateHint,
      returnFromTableToWaiting,
      shouldSkipLeaveOnTableUnmount,
      pushSettings,
      socket,
    ],
  )

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>
}

export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext)
  if (!ctx) throw new Error('useVoice requires VoiceProvider')
  return ctx
}

export function useVoiceOptional(): VoiceContextValue | null {
  return useContext(VoiceContext)
}
