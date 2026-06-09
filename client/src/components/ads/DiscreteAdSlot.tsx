import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import {
  ADSENSE_CLIENT,
  type DiscreteAdPlacement,
  getAdSlotId,
  isAdAllowedOnPath,
} from './discreteAd.config'
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  COOKIE_CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
} from '../../utils/analyticsConsent'

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>
  }
}

type DiscreteAdSlotProps = {
  placement: DiscreteAdPlacement
  className?: string
}

const PLACEMENT_STYLES: Record<DiscreteAdPlacement, { minHeight: string; format: string }> = {
  'lobby-sidebar': { minHeight: '10rem', format: 'rectangle' },
  'profile-inline': { minHeight: '5.5rem', format: 'horizontal' },
  'games-hub': { minHeight: '4.5rem', format: 'horizontal' },
}

export function DiscreteAdSlot({ placement, className = '' }: DiscreteAdSlotProps) {
  const { t } = useTranslation()
  const { pathname, search } = useLocation()
  const insRef = useRef<HTMLElement>(null)
  const pushedRef = useRef(false)
  const [consent, setConsent] = useState(hasAnalyticsConsent)

  const slotId = getAdSlotId(placement)
  const allowed = isAdAllowedOnPath(pathname, search)
  const styles = PLACEMENT_STYLES[placement]

  useEffect(() => {
    const sync = () => setConsent(hasAnalyticsConsent())
    const onStorage = (e: StorageEvent) => {
      if (e.key === COOKIE_CONSENT_STORAGE_KEY) sync()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', sync)
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', sync)
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    if (!allowed || !consent || !slotId || pushedRef.current) return
    const el = insRef.current
    if (!el) return

    pushedRef.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch {
      pushedRef.current = false
    }
  }, [allowed, consent, slotId])

  if (!allowed) return null

  const shellClass =
    'overflow-hidden rounded-xl border border-white/[0.08] bg-slate-950/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm'

  if (!consent) return null

  if (!slotId) {
    if (!import.meta.env.DEV) return null
    return (
      <aside
        className={`${shellClass} ${className}`}
        aria-hidden
        data-ad-placement={placement}
        style={{ minHeight: styles.minHeight }}
      >
        <div className="flex h-full min-h-[inherit] flex-col items-center justify-center gap-1 px-3 py-2 text-center">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">
            {t('ads.placeholder')}
          </span>
          <span className="text-[10px] text-slate-600">{placement}</span>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className={`${shellClass} ${className}`}
      data-ad-placement={placement}
      aria-label={t('ads.sponsored')}
    >
      <p className="px-2 pt-1.5 text-[9px] font-medium uppercase tracking-[0.18em] text-slate-500/90">
        {t('ads.sponsored')}
      </p>
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        style={{ display: 'block', minHeight: styles.minHeight }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
