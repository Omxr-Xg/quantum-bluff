import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { GripVertical, Loader2, Mic, MicOff, Phone, PhoneOff, UserX } from 'lucide-react'
import { useVoice } from '../contexts/VoiceContext'
import { useOutgoingCallRingtone } from '../features/voice/useOutgoingCallRingtone'
import { useUser } from '../hooks/useUser'
import type { VoiceUnansweredReason } from '../features/voice/voiceTypes'
import { getPlayerAvatar } from '../utils/avatars'
import { ImageWithFallback } from './figma/ImageWithFallback'

const PANEL_W = 280
const EDGE = 12
const TOP_DEFAULT = 12

function defaultPosition(): { left: number; top: number } {
  return { left: EDGE, top: TOP_DEFAULT }
}

function formatCallDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m > 0) return `${m}:${String(s).padStart(2, '0')}`
  return `${s}`
}

function unansweredMessage(
  t: (key: string, opts?: Record<string, unknown>) => string,
  reason: VoiceUnansweredReason | undefined,
  name: string,
): string {
  switch (reason) {
    case 'rejected':
      return t('voice.outgoingRejected', { name })
    case 'ignored':
      return t('voice.outgoingIgnored', { name })
    case 'blocked':
      return t('voice.outgoingBlocked', { name })
    case 'error':
      return t('voice.outgoingError', { name })
    case 'timeout':
    default:
      return t('voice.outgoingUnavailable', { name })
  }
}

export function VoiceCallOutgoingModal() {
  const { t } = useTranslation()
  const { userId } = useUser()
  const { outgoingCall, hangUpCall, toggleMic, settings, micDenied } = useVoice()
  const isDialingCaller =
    outgoingCall?.status === 'dialing' && outgoingCall.isCallee !== true
  useOutgoingCallRingtone(Boolean(isDialingCaller))
  const panelRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(defaultPosition)
  const posRef = useRef(pos)
  const dragRef = useRef({ dx: 0, dy: 0 })
  const lastCallKeyRef = useRef<string | null>(null)
  const [elapsedSec, setElapsedSec] = useState(0)
  posRef.current = pos

  const clampPos = useCallback((left: number, top: number) => {
    if (typeof window === 'undefined') return { left, top }
    const el = panelRef.current
    const w = el?.offsetWidth ?? Math.min(PANEL_W, window.innerWidth - EDGE * 2)
    const h = el?.offsetHeight ?? 200
    return {
      left: Math.min(Math.max(EDGE, left), window.innerWidth - w - EDGE),
      top: Math.min(Math.max(EDGE, top), window.innerHeight - h - EDGE),
    }
  }, [])

  useEffect(() => {
    if (!outgoingCall) {
      lastCallKeyRef.current = null
      return
    }
    const callKey =
      outgoingCall.callId ||
      outgoingCall.targets.map((t) => t.userId).join(',')
    if (lastCallKeyRef.current !== callKey) {
      lastCallKeyRef.current = callKey
      setPos(defaultPosition())
    }
  }, [outgoingCall])

  useEffect(() => {
    if (!outgoingCall) return
    const onResize = () => setPos((p) => clampPos(p.left, p.top))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [outgoingCall, clampPos])

  useEffect(() => {
    if (!outgoingCall) return
    const id = requestAnimationFrame(() => setPos((p) => clampPos(p.left, p.top)))
    return () => cancelAnimationFrame(id)
  }, [outgoingCall?.status, outgoingCall, clampPos])

  const onHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      if ((e.target as HTMLElement).closest('button')) return
      e.preventDefault()
      dragRef.current = {
        dx: e.clientX - posRef.current.left,
        dy: e.clientY - posRef.current.top,
      }
      const onMove = (ev: PointerEvent) => {
        setPos(clampPos(ev.clientX - dragRef.current.dx, ev.clientY - dragRef.current.dy))
      }
      const onUp = () => {
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
        window.removeEventListener('pointercancel', onUp)
      }
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
      window.addEventListener('pointercancel', onUp)
    },
    [clampPos],
  )

  const isConnected = outgoingCall?.status === 'connected'
  const connectedAt = outgoingCall?.connectedAt
  const stableConnectedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (isConnected && connectedAt) {
      if (stableConnectedAtRef.current == null) {
        stableConnectedAtRef.current = connectedAt
      }
    } else if (!isConnected) {
      stableConnectedAtRef.current = null
      setElapsedSec(0)
    }
  }, [isConnected, connectedAt])

  useEffect(() => {
    const anchor = stableConnectedAtRef.current
    if (!isConnected || anchor == null) return
    const tick = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - anchor) / 1000)))
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [isConnected, connectedAt])

  if (!outgoingCall || typeof document === 'undefined') return null

  const primary = outgoingCall.targets[0]
  const primaryName =
    outgoingCall.targets.length === 1
      ? primary!.username
      : outgoingCall.targets.map((x) => x.username).join(', ')

  const avatarSrc =
    primary && userId
      ? getPlayerAvatar(primary.username, primary.userId, userId, primary.avatarUrl ?? undefined)
      : null

  const isDialing = outgoingCall.status === 'dialing'
  const isConnecting = outgoingCall.status === 'connecting'
  const isUnanswered = outgoingCall.status === 'unanswered'
  const showHangUp = !isUnanswered
  const showCallControls = isConnecting || isConnected

  return createPortal(
    <div
      ref={panelRef}
      style={{ left: pos.left, top: pos.top }}
      className="pointer-events-auto fixed z-[100050] w-[min(17.5rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-sky-400/35 bg-slate-950/96 shadow-2xl backdrop-blur-md"
      role="dialog"
      aria-label={t('voice.outgoingTitle')}
    >
      <div
        className="flex cursor-grab touch-none select-none items-center justify-between gap-2 border-b border-white/10 bg-sky-950/40 px-3 py-2 active:cursor-grabbing"
        onPointerDown={onHeaderPointerDown}
      >
        <span className="inline-flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/90 pointer-events-none">
          <GripVertical className="h-3.5 w-3.5 shrink-0 text-sky-400/70" aria-hidden />
          {outgoingCall.type === 'group' ? t('voice.outgoingGroupTitle') : t('voice.outgoingTitle')}
        </span>
        {showHangUp ? (
          <button
            type="button"
            onClick={hangUpCall}
            className="shrink-0 rounded-lg border border-red-400/40 bg-red-950/50 p-1.5 text-red-200 transition hover:bg-red-900/60"
            aria-label={
              isConnected || isConnecting
                ? t('voice.outgoingHangUp')
                : t('voice.outgoingCancel')
            }
            title={
              isConnected || isConnecting
                ? t('voice.outgoingHangUp')
                : t('voice.outgoingCancel')
            }
          >
            <PhoneOff className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>

      <div className="flex items-center gap-3 p-3">
        <div
          className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 ${
            isUnanswered
              ? 'border-amber-400/50'
              : isConnected
                ? 'border-emerald-400/50'
                : 'border-sky-400/50'
          }`}
        >
          {avatarSrc ? (
            <ImageWithFallback src={avatarSrc} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sky-950/60 text-lg font-bold text-white">
              {primaryName.charAt(0).toUpperCase()}
            </div>
          )}
          {isDialing ? (
            <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-sky-400/40 ring-offset-2 ring-offset-slate-950" />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{primaryName}</p>
          {isDialing || isConnecting ? (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-300">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-300" />
              {isConnecting ? t('voice.outgoingConnecting') : t('voice.outgoingDialing')}
            </p>
          ) : null}
          {isConnected ? (
            <p className="mt-0.5 flex items-baseline gap-2 text-emerald-300">
              <Phone className="h-3.5 w-3.5 shrink-0 self-center" />
              <span className="text-lg font-bold tabular-nums leading-none">
                {t('voice.outgoingDuration', { seconds: formatCallDuration(elapsedSec) })}
              </span>
            </p>
          ) : null}
          {isUnanswered ? (
            <p className="mt-0.5 text-xs leading-snug text-amber-200">
              {unansweredMessage(t, outgoingCall.unansweredReason, primaryName)}
            </p>
          ) : null}
        </div>
      </div>

      {showHangUp ? (
        <div className="space-y-2 border-t border-white/10 px-3 pb-3 pt-2">
          {showCallControls ? (
            <button
              type="button"
              onClick={toggleMic}
              disabled={micDenied}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                settings.micMuted
                  ? 'border-red-400/40 bg-red-950/50 text-red-200'
                  : 'border-emerald-400/50 bg-emerald-950/40 text-emerald-100'
              } disabled:opacity-50`}
            >
              {settings.micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              {settings.micMuted ? t('voice.unmuteMic') : t('voice.muteMic')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={hangUpCall}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/50 bg-red-950/60 px-3 py-2.5 text-sm font-semibold text-red-50 transition hover:bg-red-900/70"
          >
            <PhoneOff className="h-4 w-4" />
            {isConnected || isConnecting
              ? t('voice.outgoingHangUp')
              : t('voice.outgoingCancel')}
          </button>
        </div>
      ) : null}

      {isUnanswered ? (
        <div className="flex justify-center border-t border-white/10 px-3 pb-2 pt-1">
          <UserX className="h-4 w-4 text-amber-400/80" aria-hidden />
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
