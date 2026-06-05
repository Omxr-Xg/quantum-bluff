import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Phone, PhoneOff, Ban, BellOff } from 'lucide-react'
import { useVoice } from '../contexts/VoiceContext'
import { unlockPageAudio } from '../features/voice/ringtoneAudio'
import { useIncomingCallRingtone } from '../features/voice/useIncomingCallRingtone'
import { useUser } from '../hooks/useUser'
import { getPlayerAvatar } from '../utils/avatars'
import { ImageWithFallback } from './figma/ImageWithFallback'

export function VoiceCallIncomingBanner() {
  const { t } = useTranslation()
  const { userId } = useUser()
  const { incomingCall, respondToCall } = useVoice()

  useIncomingCallRingtone(Boolean(incomingCall))

  if (!incomingCall || typeof document === 'undefined') return null

  const onAccept = () => {
    unlockPageAudio()
    respondToCall('accept')
  }

  const title =
    incomingCall.type === 'group'
      ? t('voice.incomingGroup')
      : t('voice.incomingPrivate')

  const avatarSrc = getPlayerAvatar(
    incomingCall.fromUsername,
    incomingCall.fromUserId,
    userId,
    incomingCall.fromAvatarUrl ?? undefined,
  )

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top,0px))] z-[100040] flex justify-center px-3 sm:px-4"
      role="alert"
      aria-live="assertive"
    >
      <div className="pointer-events-auto w-full max-w-lg animate-in slide-in-from-top-4 duration-300 rounded-2xl border border-emerald-400/50 bg-slate-950/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-emerald-400/50">
            <ImageWithFallback src={avatarSrc} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 animate-pulse rounded-full ring-2 ring-emerald-400/40 ring-offset-2 ring-offset-slate-950" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
              {title}
            </p>
            <p className="truncate text-lg font-bold text-white">{incomingCall.fromUsername}</p>
            <p className="mt-0.5 text-xs text-slate-400">{t('voice.incomingHint')}</p>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            type="button"
            onClick={onAccept}
            className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 sm:col-span-1"
          >
            <Phone className="h-4 w-4" />
            {t('voice.acceptCall')}
          </button>
          <button
            type="button"
            onClick={() => respondToCall('reject')}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/60 bg-red-600/90 px-3 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-red-500 sm:col-span-1"
          >
            <PhoneOff className="h-4 w-4" />
            {t('voice.rejectCall')}
          </button>
          <button
            type="button"
            onClick={() => respondToCall('ignore')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            <BellOff className="h-4 w-4" />
            {t('voice.ignoreCall')}
          </button>
          <button
            type="button"
            onClick={() => respondToCall('block')}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-500/40 px-3 py-2 text-sm text-amber-200 transition hover:bg-amber-950/40"
          >
            <Ban className="h-4 w-4" />
            {t('voice.blockCaller')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
