import { useTranslation } from 'react-i18next'
import { Loader2, Phone, PhoneOff, UserX } from 'lucide-react'
import { useVoice } from '../contexts/VoiceContext'
import type { VoiceUnansweredReason } from '../features/voice/voiceTypes'

function unansweredMessage(
  t: (key: string) => string,
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
  const { outgoingCall, cancelOutgoingCall, leaveChannel } = useVoice()

  if (!outgoingCall) return null

  const primaryName =
    outgoingCall.targets.length === 1
      ? outgoingCall.targets[0]!.username
      : outgoingCall.targets.map((x) => x.username).join(', ')

  const isDialing = outgoingCall.status === 'dialing'
  const isConnected = outgoingCall.status === 'connected'
  const isUnanswered = outgoingCall.status === 'unanswered'

  const handleHangUp = () => {
    if (isConnected) {
      leaveChannel()
    } else {
      cancelOutgoingCall()
    }
  }

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-sky-400/40 bg-slate-950 p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div
            className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full border ${
              isUnanswered
                ? 'border-amber-400/50 bg-amber-950/50'
                : isConnected
                  ? 'border-emerald-400/50 bg-emerald-950/50'
                  : 'border-sky-400/50 bg-sky-950/50'
            }`}
          >
            {isUnanswered ? (
              <UserX className="h-9 w-9 text-amber-300" />
            ) : isConnected ? (
              <Phone className="h-9 w-9 text-emerald-300" />
            ) : (
              <Phone className="h-9 w-9 animate-pulse text-sky-300" />
            )}
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/90">
            {outgoingCall.type === 'group' ? t('voice.outgoingGroupTitle') : t('voice.outgoingTitle')}
          </p>
          <p className="mt-2 truncate text-xl font-bold text-white">{primaryName}</p>

          {isDialing ? (
            <>
              <p className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin text-sky-300" />
                {t('voice.outgoingDialing')}
              </p>
              <button
                type="button"
                onClick={handleHangUp}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/60"
              >
                <PhoneOff className="h-4 w-4" />
                {t('voice.outgoingCancel')}
              </button>
            </>
          ) : null}

          {isConnected ? (
            <>
              <p className="mt-2 text-sm text-emerald-300">{t('voice.outgoingConnected')}</p>
              <button
                type="button"
                onClick={handleHangUp}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-400/50 bg-red-950/50 px-4 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-900/60"
              >
                <PhoneOff className="h-4 w-4" />
                {t('voice.outgoingHangUp')}
              </button>
            </>
          ) : null}

          {isUnanswered ? (
            <p className="mt-3 text-sm text-amber-200">
              {unansweredMessage(t, outgoingCall.unansweredReason, primaryName)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
