import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mic, MicOff, Volume2, VolumeX, Users, UserCheck } from 'lucide-react'
import type { TableVoiceChatState } from './useTableVoiceChat'
import type { VoiceAudience } from './voiceTypes'

const DEFAULT_ROOM_PANEL_HIDE_MS = 2000

type Props = {
  voice: TableVoiceChatState
  myUserId: string
  tablePlayers?: { userId: string; username: string }[]
  channelLabel?: string | null
  className?: string
  /** Salon d’attente / table : FAB micro + panneau au survol. */
  layout?: 'panel' | 'room'
  /** Délai avant fermeture du panneau après sortie souris (layout room). */
  panelHideMs?: number
  /** Alignement du dock micro (gauche salon, droite table poker). */
  roomAlign?: 'start' | 'end'
}

function audienceLabel(t: (k: string) => string, mode: VoiceAudience): string {
  if (mode === 'FRIENDS') return t('voice.audienceFriends')
  if (mode === 'CHANNEL' || mode === 'TABLE') return t('voice.audienceChannel')
  return t('voice.audienceNobody')
}

export function TableVoicePanel({
  voice,
  myUserId,
  tablePlayers = [],
  channelLabel = null,
  className = '',
  layout = 'panel',
  panelHideMs = DEFAULT_ROOM_PANEL_HIDE_MS,
  roomAlign = 'start',
}: Props) {
  const { t } = useTranslation()
  const [roomPanelVisible, setRoomPanelVisible] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { settings, participants, speakingUserIds, micDenied, toggleMic, toggleSound, setSpeakTo, setListenTo, togglePeerMute } =
    voice

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current)
      hideTimerRef.current = null
    }
  }, [])

  const showRoomPanel = useCallback(() => {
    clearHideTimer()
    setRoomPanelVisible(true)
  }, [clearHideTimer])

  const scheduleHideRoomPanel = useCallback(() => {
    clearHideTimer()
    hideTimerRef.current = setTimeout(() => {
      setRoomPanelVisible(false)
      hideTimerRef.current = null
    }, panelHideMs)
  }, [clearHideTimer, panelHideMs])

  useEffect(() => () => clearHideTimer(), [clearHideTimer])

  const playerRows =
    tablePlayers.length > 0
      ? tablePlayers.filter((p) => p.userId !== myUserId)
      : participants.filter((p) => p.userId !== myUserId).map((p) => ({
          userId: p.userId,
          username: p.username,
        }))

  const micButton = (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        toggleMic()
      }}
      className={
        layout === 'room'
          ? `relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 bg-slate-950/90 shadow-[0_0_14px_rgba(52,211,153,0.45),0_14px_34px_rgba(0,0,0,0.45)] backdrop-blur-md transition hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              settings.micMuted
                ? 'border-red-400/80 text-red-200 hover:bg-red-950/90'
                : 'border-emerald-400 text-emerald-100 hover:bg-emerald-500 hover:text-slate-950'
            }`
          : `inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 font-medium transition ${
              settings.micMuted
                ? 'border-red-400/40 bg-red-950/50 text-red-200'
                : 'border-emerald-400/50 bg-emerald-950/40 text-emerald-100'
            }`
      }
      title={settings.micMuted ? t('voice.unmuteMic') : t('voice.muteMic')}
      aria-label={settings.micMuted ? t('voice.unmuteMic') : t('voice.muteMic')}
      aria-pressed={settings.micMuted}
    >
      {settings.micMuted ? (
        <MicOff className={layout === 'room' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
      ) : (
        <Mic className={layout === 'room' ? 'h-5 w-5' : 'h-3.5 w-3.5'} />
      )}
      {layout === 'panel' ? (settings.micMuted ? t('voice.micOff') : t('voice.micOn')) : null}
    </button>
  )

  const soundButton = (
    <button
      type="button"
      onClick={toggleSound}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 font-medium transition ${
        settings.soundMuted
          ? 'border-red-400/40 bg-red-950/50 text-red-200'
          : 'border-sky-400/40 bg-sky-950/40 text-sky-100'
      }`}
      title={settings.soundMuted ? t('voice.unmuteSound') : t('voice.muteSound')}
      aria-label={settings.soundMuted ? t('voice.unmuteSound') : t('voice.muteSound')}
    >
      {settings.soundMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
      {settings.soundMuted ? t('voice.soundOff') : t('voice.soundOn')}
    </button>
  )

  const controlsRow = (
    <div className="flex flex-wrap items-center gap-1.5">
      {layout === 'panel' ? micButton : null}
      {soundButton}
    </div>
  )

  const detailsBlock = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
        {channelLabel
          ? t('voice.connectedTo', { channel: channelLabel })
          : t('voice.panelTitle')}
      </p>

      {micDenied ? (
        <p className="text-[10px] text-amber-300/90">{t('voice.micDenied')}</p>
      ) : null}

      {controlsRow}

      <div className="space-y-1 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5">
        <label className="flex items-center gap-1.5 text-[11px]">
          <Mic className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden />
          <span className="shrink-0">{t('voice.speakTo')}</span>
          <select
            className="min-w-0 flex-1 rounded border border-white/15 bg-slate-900 px-1 py-0.5 text-[11px]"
            value={settings.speakTo}
            onChange={(e) => setSpeakTo(e.target.value as VoiceAudience)}
          >
            <option value="CHANNEL">{t('voice.audienceChannel')}</option>
            <option value="FRIENDS">{t('voice.audienceFriends')}</option>
            <option value="NOBODY">{t('voice.audienceNobody')}</option>
          </select>
        </label>
        <p className="pl-4 text-[10px] text-slate-400">
          🎙️ {t('voice.speakTo')}: {audienceLabel(t, settings.speakTo)}
        </p>

        <label className="flex items-center gap-1.5 text-[11px]">
          <Volume2 className="h-3 w-3 shrink-0 text-sky-400" aria-hidden />
          <span className="shrink-0">{t('voice.listenTo')}</span>
          <select
            className="min-w-0 flex-1 rounded border border-white/15 bg-slate-900 px-1 py-0.5 text-[11px]"
            value={settings.listenTo}
            onChange={(e) => setListenTo(e.target.value as VoiceAudience)}
          >
            <option value="CHANNEL">{t('voice.audienceChannel')}</option>
            <option value="FRIENDS">{t('voice.audienceFriends')}</option>
            <option value="NOBODY">{t('voice.audienceNobody')}</option>
          </select>
        </label>
        <p className="pl-4 text-[10px] text-slate-400">
          🔊 {t('voice.listenTo')}: {audienceLabel(t, settings.listenTo)}
        </p>
      </div>

      {playerRows.length > 0 ? (
        <ul className="max-h-28 space-y-1 overflow-y-auto">
          {playerRows.map((p) => {
            const peer = participants.find((x) => x.userId === p.userId)
            const isSpeaking = speakingUserIds.includes(p.userId) || peer?.speaking
            const locallyMuted = settings.peerMutes.has(p.userId)
            return (
              <li
                key={p.userId}
                className={`flex items-center justify-between gap-2 rounded-md px-1.5 py-1 ${
                  isSpeaking ? 'ring-2 ring-emerald-400/70 ring-offset-1 ring-offset-slate-950' : ''
                }`}
              >
                <span className="truncate font-medium">
                  {isSpeaking ? (
                    <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  ) : null}
                  {p.username}
                </span>
                <button
                  type="button"
                  onClick={() => togglePeerMute(p.userId)}
                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                    locallyMuted
                      ? 'bg-amber-900/60 text-amber-200'
                      : 'bg-white/10 text-slate-300 hover:bg-white/15'
                  }`}
                >
                  {locallyMuted ? t('voice.unmutePlayer') : t('voice.mutePlayer')}
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="flex items-center gap-1 text-[10px] text-slate-500">
          <Users className="h-3 w-3" />
          {t('voice.waitingPlayers')}
        </p>
      )}

      <p className="flex items-center gap-1 text-[9px] text-slate-500">
        <UserCheck className="h-3 w-3" />
        {t('voice.tableOnlyHint')}
      </p>
    </>
  )

  if (layout === 'room') {
    return (
      <div
        className={`pointer-events-auto flex flex-col ${roomAlign === 'end' ? 'items-end' : 'items-start'} ${className}`}
        onMouseEnter={showRoomPanel}
        onMouseLeave={scheduleHideRoomPanel}
        onFocusCapture={showRoomPanel}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
            scheduleHideRoomPanel()
          }
        }}
        role="region"
        aria-label={t('voice.panelTitle')}
      >
        {roomPanelVisible ? (
          <div className="pointer-events-auto mb-2 flex w-[min(100%,14rem)] flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/90 p-2.5 text-xs text-slate-200 shadow-lg backdrop-blur-md">
            {detailsBlock}
          </div>
        ) : null}

        <div className="relative">
          {micButton}
          {micDenied ? (
            <span
              className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-amber-400"
              title={t('voice.micDenied')}
              aria-hidden
            />
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`flex flex-col gap-2 rounded-xl border border-white/15 bg-slate-950/90 p-2.5 text-xs text-slate-200 shadow-lg backdrop-blur-md ${className}`}
      role="region"
      aria-label={t('voice.panelTitle')}
    >
      {detailsBlock}
    </div>
  )
}
