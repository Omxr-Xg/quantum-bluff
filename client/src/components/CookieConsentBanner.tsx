import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  grantGtagConsent,
  hasAnalyticsConsent,
  restoreGtagConsentIfAccepted,
} from '../utils/analyticsConsent'

export function CookieConsentBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    restoreGtagConsentIfAccepted()
    setVisible(!hasAnalyticsConsent())
  }, [])

  const accept = () => {
    grantGtagConsent()
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookieConsent.title')}
      className="fixed bottom-0 left-0 right-0 z-[200] border-t border-white/10 bg-[#020716]/95 px-4 py-4 shadow-[0_-12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-slate-300">
          {t('cookieConsent.message')}{' '}
          <Link to="/privacy-policy" className="text-cyan-300 underline-offset-2 hover:underline">
            {t('cookieConsent.learnMore')}
          </Link>
        </p>
        <button
          type="button"
          onClick={accept}
          className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/15 px-5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/25"
        >
          {t('cookieConsent.accept')}
        </button>
      </div>
    </div>
  )
}
