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
  type VoiceOutgoingCall,
  type VoiceUnansweredReason,
  type VoiceMigrateHint,
  type VoiceParticipantPublic,
  type VoiceRosterPayload,
  type VoiceSettings,
  type VoiceAudience,
} from '../features/voice/voiceTypes'
import { unlockPageAudio } from '../features/voice/ringtoneAudio'
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
  outgoingCall: VoiceOutgoingCall | null
  cancelOutgoingCall: () => void
  hangUpCall: () => void
  joinChannel: (channelId: string, opts?: { replace?: boolean }) => void
  switchChannel: (
    toChannelId: string,
    opts?: { mode?: 'continue' | 'replace'; fromChannelId?: string },
  ) => void
  leaveChannel: () => void
  joinWaitingRoom: (roomId: string) => void
  joinTable: (gameId: string) => void
  startPrivateCall: (
    targetUserId: string,
    targetUsername: string,
    targetAvatarUrl?: string | null,
  ) => void
  startGroupCall: (targets: { userId: string; username: string }[]) => void
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
  const [outgoingCall, setOutgoingCall] = useState<VoiceOutgoingCall | null>(null)

  const meshRef = useRef<WebRTCVoiceMesh | null>(null)
  const settingsRef = useRef(settings)
  const channelIdRef = useRef<string | null>(null)
  const pendingCallRef = useRef<string[] | null>(null)
  const preserveTableUnmountRef = useRef<string | null>(null)
  const outgoingCallRef = useRef(outgoingCall)
  const incomingCallRef = useRef(incomingCall)
  const micPrefetchRef = useRef<MediaStream | null>(null)
  /** Appels récemment terminés — évite de recréer l’UI si un VOICE_ROSTER arrive en retard. */
  const endedCallIdsRef = useRef<Set<string>>(new Set())
  settingsRef.current = settings
  channelIdRef.current = channelId
  outgoingCallRef.current = outgoingCall
  incomingCallRef.current = incomingCall

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

  const prefetchCallMicrophone = useCallback(async () => {
    unlockPageAudio()
    const attachToCallMesh =
      meshRef.current != null && channelIdRef.current?.startsWith('call:')
    if (micPrefetchRef.current?.getAudioTracks().some((t) => t.readyState === 'live')) {
      if (attachToCallMesh) {
        meshRef.current?.prefetchLocalStream(micPrefetchRef.current)
      }
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      micPrefetchRef.current?.getTracks().forEach((t) => t.stop())
      micPrefetchRef.current = stream
      if (attachToCallMesh) {
        meshRef.current?.prefetchLocalStream(stream)
      }
      setMicDenied(false)
    } catch {
      setMicDenied(true)
    }
  }, [])

  const bindMesh = useCallback(
    (cid: string) => {
      if (!socket || !userId) return
      const oldMesh = meshRef.current
      const prefetched = micPrefetchRef.current
      if (
        oldMesh &&
        prefetched &&
        prefetched.getAudioTracks().some((t) => t.readyState === 'live')
      ) {
        oldMesh.detachSharedLocalStream(prefetched)
      }
      teardownMesh()
      const mesh = new WebRTCVoiceMesh(cid, userId, socket, settingsRef.current, {
        onSpeakingChange: setSpeakingUserIds,
        onMicError: () => setMicDenied(true),
      })
      if (micPrefetchRef.current) {
        mesh.prefetchLocalStream(micPrefetchRef.current)
      }
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

  const clearCallUi = useCallback(() => {
    setIncomingCall(null)
    incomingCallRef.current = null
    setOutgoingCall(null)
    outgoingCallRef.current = null
  }, [])

  const markCallEnded = useCallback((callId: string | undefined) => {
    const id = callId?.trim()
    if (!id) return
    endedCallIdsRef.current.add(id)
    window.setTimeout(() => endedCallIdsRef.current.delete(id), 60_000)
  }, [])

  const finishCallSession = useCallback(
    (opts?: { emitEnd?: boolean; localOnly?: boolean }) => {
      if (!socket) return
      const oc = outgoingCallRef.current
      const inc = incomingCallRef.current
      const cid = channelIdRef.current
      const callId =
        oc?.callId?.trim() ||
        inc?.callId?.trim() ||
        cid?.replace(/^call:/, '').trim()
      const wasCall = Boolean(cid?.startsWith('call:') || callId)
      if (callId) markCallEnded(callId)
      clearCallUi()
      teardownMesh()
      channelIdRef.current = null
      setChannelId(null)
      setChannel(null)
      setParticipants([])
      if (!wasCall) return
      if (opts?.localOnly) {
        if (cid) socket.emit('VOICE_LEAVE', { channelId: cid })
        return
      }
      if (opts?.emitEnd !== false && callId) {
        socket.emit('VOICE_CALL_END', { callId })
      } else if (cid) {
        socket.emit('VOICE_LEAVE', { channelId: cid })
      }
    },
    [socket, clearCallUi, teardownMesh, markCallEnded],
  )

  const leaveChannel = useCallback(() => {
    if (!socket) return
    const cid = channelIdRef.current
    if (cid) socket.emit('VOICE_LEAVE', { channelId: cid })
    teardownMesh()
    channelIdRef.current = null
    setChannelId(null)
    setChannel(null)
    if (cid?.startsWith('call:')) {
      clearCallUi()
    } else {
      setOutgoingCall((prev) => {
        if (prev?.status === 'connected' && cid && prev.channelId === cid) return null
        return prev
      })
    }
  }, [socket, teardownMesh, clearCallUi])

  const isInCallChannel = useCallback((cid: string | null | undefined) => {
    return typeof cid === 'string' && cid.startsWith('call:')
  }, [])

  const prepareActiveVoice = useCallback(() => {
    pushSettings({
      ...settingsRef.current,
      speakTo: 'CHANNEL',
      listenTo: 'CHANNEL',
      micMuted: false,
      soundMuted: false,
      peerMutes: new Set(settingsRef.current.peerMutes),
    })
    setMicDenied(false)
    void meshRef.current?.ensureMic(true)
  }, [pushSettings])

  const prepareCallAudio = useCallback(async () => {
    unlockPageAudio()
    pushSettings({
      ...settingsRef.current,
      speakTo: 'CHANNEL',
      listenTo: 'CHANNEL',
      micMuted: false,
      soundMuted: false,
      peerMutes: new Set(settingsRef.current.peerMutes),
    })
    setMicDenied(false)
    if (micPrefetchRef.current) {
      meshRef.current?.prefetchLocalStream(micPrefetchRef.current)
    }
    await meshRef.current?.bootstrapCallAudio()
  }, [pushSettings])

  const joinWaitingRoom = useCallback(
    (roomId: string) => {
      const cid = buildWaitingChannelId(roomId)
      if (channelIdRef.current === cid) return
      if (isInCallChannel(channelIdRef.current)) return
      joinChannel(cid)
      // join-room socket peut arriver après VOICE_JOIN : second essai court.
      window.setTimeout(() => {
        if (channelIdRef.current !== cid) joinChannel(cid)
      }, 400)
    },
    [joinChannel, isInCallChannel],
  )

  const joinTable = useCallback(
    (gameId: string) => {
      if (isInCallChannel(channelIdRef.current)) return
      joinChannel(buildTableChannelId(gameId))
    },
    [joinChannel, isInCallChannel],
  )

  const clearOutgoing = useCallback(() => {
    setOutgoingCall(null)
  }, [])

  const cancelOutgoingCall = useCallback(() => {
    if (!socket) return
    const cid = outgoingCall?.callId
    if (cid) socket.emit('VOICE_CALL_CANCEL', { callId: cid })
    clearOutgoing()
  }, [socket, outgoingCall?.callId, clearOutgoing])

  const hangUpCall = useCallback(() => {
    if (!socket) return
    const oc = outgoingCallRef.current
    if (!oc) return
    if (oc.status === 'dialing' && !oc.isCallee) {
      cancelOutgoingCall()
      return
    }
    if (oc.callId && (oc.status === 'connecting' || oc.status === 'connected')) {
      if (oc.status === 'connecting' && oc.isCallee) {
        socket.emit('VOICE_CALL_RESPOND', { callId: oc.callId, action: 'reject' })
        finishCallSession({ localOnly: true })
      } else {
        finishCallSession({ emitEnd: true })
      }
      return
    }
    finishCallSession({ emitEnd: false })
  }, [socket, cancelOutgoingCall, finishCallSession])

  const startPrivateCall = useCallback(
    (targetUserId: string, targetUsername: string, targetAvatarUrl?: string | null) => {
      if (!socket) return
      void prefetchCallMicrophone()
      setIncomingCall(null)
      setOutgoingCall({
        callId: '',
        channelId: '',
        type: 'private',
        targets: [{ userId: targetUserId, username: targetUsername, avatarUrl: targetAvatarUrl }],
        status: 'dialing',
      })
      socket.emit('VOICE_CALL_START', {
        type: 'private',
        targetUserIds: [targetUserId],
      })
    },
    [socket, prefetchCallMicrophone],
  )

  const startGroupCall = useCallback(
    (targets: { userId: string; username: string }[]) => {
      if (!socket || targets.length < 2) return
      void prefetchCallMicrophone()
      setIncomingCall(null)
      setOutgoingCall({
        callId: '',
        channelId: '',
        type: 'group',
        targets,
        status: 'dialing',
      })
      socket.emit('VOICE_CALL_START', {
        type: 'group',
        targetUserIds: targets.map((t) => t.userId),
      })
    },
    [socket, prefetchCallMicrophone],
  )

  const respondToCall = useCallback(
    (action: 'accept' | 'reject' | 'ignore' | 'block') => {
      if (!socket || !incomingCall) return
      incomingCallRef.current = incomingCall
      if (action === 'accept') {
        unlockPageAudio()
        void prefetchCallMicrophone()
        const panel: VoiceOutgoingCall = {
          callId: incomingCall.callId,
          channelId: incomingCall.channelId,
          type: incomingCall.type,
          targets: [
            {
              userId: incomingCall.fromUserId,
              username: incomingCall.fromUsername,
              avatarUrl: incomingCall.fromAvatarUrl ?? null,
            },
          ],
          status: 'connecting',
          isCallee: true,
        }
        outgoingCallRef.current = panel
        setOutgoingCall(panel)
      }
      socket.emit('VOICE_CALL_RESPOND', { callId: incomingCall.callId, action })
      setIncomingCall(null)
    },
    [socket, incomingCall, prefetchCallMicrophone],
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

  const bindMeshRef = useRef(bindMesh)
  const teardownMeshRef = useRef(teardownMesh)
  const joinChannelRef = useRef(joinChannel)
  const leaveChannelRef = useRef(leaveChannel)
  const prepareCallAudioRef = useRef(prepareCallAudio)
  const prepareActiveVoiceRef = useRef(prepareActiveVoice)
  const finishCallSessionRef = useRef(finishCallSession)
  bindMeshRef.current = bindMesh
  teardownMeshRef.current = teardownMesh
  joinChannelRef.current = joinChannel
  leaveChannelRef.current = leaveChannel
  prepareCallAudioRef.current = prepareCallAudio
  prepareActiveVoiceRef.current = prepareActiveVoice
  finishCallSessionRef.current = finishCallSession

  useEffect(() => {
    if (!socket || !userId) return

    const onRoster = (payload: VoiceRosterPayload) => {
      if (!payload.channelId) return
      const kind = payload.channel?.kind
      const rosterCallId = payload.channelId.replace(/^call:/, '')
      if (kind === 'call' && endedCallIdsRef.current.has(rosterCallId)) {
        return
      }
      const oc = outgoingCallRef.current
      const hasActiveCallUi =
        Boolean(incomingCallRef.current) ||
        (oc != null &&
          (oc.status === 'dialing' ||
            oc.status === 'connecting' ||
            oc.status === 'connected'))
      if (kind === 'call' && !hasActiveCallUi) {
        return
      }
      if (channelIdRef.current && payload.channelId !== channelIdRef.current) {
        bindMeshRef.current(payload.channelId)
      }
      setChannelId(payload.channelId)
      setChannel(payload.channel)
      channelIdRef.current = payload.channelId
      if (!meshRef.current) bindMeshRef.current(payload.channelId)
      else meshRef.current.setChannelId(payload.channelId)
      setParticipants(payload.participants)
      meshRef.current?.applyRoster(payload)
      setSpeakingUserIds(payload.participants.filter((p) => p.speaking).map((p) => p.userId))
      if (kind === 'waiting' || kind === 'table') {
        prepareActiveVoiceRef.current()
      } else if (kind === 'call' && hasActiveCallUi) {
        void prepareCallAudioRef.current()
      }
    }

    const onActive = (payload: { channelId: string | null; channel: VoiceChannelMeta | null }) => {
      setChannelId(payload.channelId)
      setChannel(payload.channel)
      channelIdRef.current = payload.channelId
      if (!payload.channelId) teardownMeshRef.current()
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
      const oc = outgoingCallRef.current
      const cid = channelIdRef.current
      const isCallPeer =
        cid?.startsWith('call:') &&
        oc &&
        (oc.status === 'connecting' || oc.status === 'connected') &&
        oc.targets.some((t) => t.userId === payload.userId)
      if (isCallPeer) {
        finishCallSessionRef.current({ localOnly: true })
      }
    }

    const onCallEnded = (payload: {
      callId?: string
      channelId?: string
      endedByUserId?: string
    }) => {
      const oc = outgoingCallRef.current
      if (payload.callId && oc?.callId && payload.callId !== oc.callId) return
      if (
        payload.channelId &&
        channelIdRef.current &&
        payload.channelId !== channelIdRef.current
      ) {
        return
      }
      finishCallSessionRef.current({ localOnly: true })
    }

    const onIncoming = (payload: VoiceIncomingCall) => {
      if (endedCallIdsRef.current.has(payload.callId)) return
      incomingCallRef.current = payload
      setIncomingCall(payload)
    }

    const onOutgoing = (payload: {
      callId: string
      channelId: string
      type: 'private' | 'group'
      targets: { userId: string; username: string; avatarUrl?: string | null }[]
    }) => {
      setOutgoingCall((prev) => {
        const targets = payload.targets.map((t) => {
          const prior = prev?.targets.find((p) => p.userId === t.userId)
          return {
            userId: t.userId,
            username: t.username,
            avatarUrl: t.avatarUrl ?? prior?.avatarUrl ?? null,
          }
        })
        return {
          callId: payload.callId,
          channelId: payload.channelId,
          type: payload.type,
          targets,
          status: 'dialing',
          isCallee: false,
        }
      })
    }

    const onConnected = (payload: { callId: string; channelId: string }) => {
      setIncomingCall(null)
      const inc = incomingCallRef.current
      incomingCallRef.current = null
      const connectedAt = Date.now()
      setOutgoingCall((prev) => {
        const prevId = prev?.callId?.trim()
        const nextId = payload.callId?.trim()
        if (prevId && nextId && prevId !== nextId) return prev
        if (prev) {
          const next: VoiceOutgoingCall = {
            ...prev,
            callId: nextId || prev.callId,
            status: 'connected',
            channelId: payload.channelId || prev.channelId,
            connectedAt: prev.connectedAt ?? connectedAt,
            isCallee: prev.isCallee,
          }
          outgoingCallRef.current = next
          return next
        }
        if (inc && (!payload.callId || !inc.callId || inc.callId === payload.callId)) {
          const next: VoiceOutgoingCall = {
            callId: payload.callId || inc.callId,
            channelId: payload.channelId || inc.channelId,
            type: inc.type,
            targets: [
              {
                userId: inc.fromUserId,
                username: inc.fromUsername,
                avatarUrl: inc.fromAvatarUrl ?? null,
              },
            ],
            status: 'connected',
            connectedAt,
            isCallee: true,
          }
          outgoingCallRef.current = next
          return next
        }
        return prev
      })
      if (channelIdRef.current !== payload.channelId) {
        joinChannelRef.current(payload.channelId, { replace: true })
      } else if (!meshRef.current) {
        bindMeshRef.current(payload.channelId)
      }
      void prepareCallAudioRef.current()
    }

    const onUnanswered = (payload: {
      callId?: string
      reason?: VoiceUnansweredReason
    }) => {
      setOutgoingCall((prev) => {
        if (!prev) return null
        if (payload.callId && prev.callId && payload.callId !== prev.callId) return prev
        if (prev.status === 'connecting' || prev.status === 'connected') {
          return prev
        }
        return {
          ...prev,
          status: 'unanswered',
          unansweredReason: payload.reason ?? 'timeout',
        }
      })
    }

    const onVoiceError = (payload: { code?: string }) => {
      const code = payload?.code
      if (code === 'BLOCKED' || code === 'NOT_FRIENDS') {
        setOutgoingCall((prev) =>
          prev?.status === 'dialing'
            ? { ...prev, status: 'unanswered', unansweredReason: 'error' }
            : prev,
        )
        return
      }
      const oc = outgoingCallRef.current
      if (code === 'NOT_IN_CALL' && oc?.status === 'connected' && oc.channelId) {
        joinChannelRef.current(oc.channelId, { replace: true })
      }
    }

    const onConfirmLeave = (payload: {
      pendingAction?: { type: string; targetUserIds?: string[] }
    }) => {
      if (payload.pendingAction?.type === 'call' && payload.pendingAction.targetUserIds) {
        pendingCallRef.current = payload.pendingAction.targetUserIds
        leaveChannelRef.current()
      }
    }

    socket.on('VOICE_ROSTER', onRoster)
    socket.on('VOICE_ACTIVE', onActive)
    socket.on('VOICE_SIGNAL', onSignal)
    socket.on('VOICE_PEER_LEFT', onPeerLeft)
    socket.on('VOICE_CALL_INCOMING', onIncoming)
    socket.on('VOICE_CALL_OUTGOING', onOutgoing)
    socket.on('VOICE_CALL_CONNECTED', onConnected)
    socket.on('VOICE_CALL_UNANSWERED', onUnanswered)
    socket.on('VOICE_CALL_ENDED', onCallEnded)
    socket.on('VOICE_ERROR', onVoiceError)
    socket.on('VOICE_CONFIRM_LEAVE', onConfirmLeave)

    const onIncomingBackup = (e: Event) => {
      const payload = (e as CustomEvent<VoiceIncomingCall>).detail
      if (payload?.callId) onIncoming(payload)
    }
    window.addEventListener('voice-call-incoming', onIncomingBackup)

    return () => {
      window.removeEventListener('voice-call-incoming', onIncomingBackup)
      socket.off('VOICE_ROSTER', onRoster)
      socket.off('VOICE_ACTIVE', onActive)
      socket.off('VOICE_SIGNAL', onSignal)
      socket.off('VOICE_PEER_LEFT', onPeerLeft)
      socket.off('VOICE_CALL_INCOMING', onIncoming)
      socket.off('VOICE_CALL_OUTGOING', onOutgoing)
      socket.off('VOICE_CALL_CONNECTED', onConnected)
      socket.off('VOICE_CALL_UNANSWERED', onUnanswered)
      socket.off('VOICE_CALL_ENDED', onCallEnded)
      socket.off('VOICE_ERROR', onVoiceError)
      socket.off('VOICE_CONFIRM_LEAVE', onConfirmLeave)
    }
  }, [socket, userId])

  useEffect(() => {
    if (!socket || !userId) return
    return () => {
      const cid = channelIdRef.current
      if (cid) socket.emit('VOICE_LEAVE', { channelId: cid })
      teardownMeshRef.current()
    }
  }, [socket, userId])

  useEffect(() => {
    if (!socket || !pendingCallRef.current) return
    if (!channelId) {
      const ids = pendingCallRef.current
      socket.emit('VOICE_CALL_START', {
        type: ids.length === 1 ? 'private' : 'group',
        targetUserIds: ids,
      })
      pendingCallRef.current = null
    }
  }, [socket, channelId])

  useEffect(() => {
    if (outgoingCall?.status !== 'unanswered') return
    const t = window.setTimeout(() => setOutgoingCall(null), 3500)
    return () => window.clearTimeout(t)
  }, [outgoingCall?.status, outgoingCall?.callId])

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
      outgoingCall,
      cancelOutgoingCall,
      hangUpCall,
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
      outgoingCall,
      cancelOutgoingCall,
      hangUpCall,
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
