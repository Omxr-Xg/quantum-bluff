export const COOKIE_CONSENT_STORAGE_KEY = 'quantum_bluff_cookie_consent'
export const COOKIE_CONSENT_CHANGED_EVENT = 'quantum-bluff-cookie-consent-changed'

type GtagConsent = 'granted' | 'denied'

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === 'accepted'
  } catch {
    return false
  }
}

/** À appeler quand l'utilisateur accepte les cookies (RGPD / Consent Mode v2). */
export function grantGtagConsent(): void {
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, 'accepted')
  } catch {
    /* quota / mode privé */
  }
  window.gtag?.('consent', 'update', {
    analytics_storage: 'granted' as GtagConsent,
    ad_storage: 'granted' as GtagConsent,
    ad_user_data: 'granted' as GtagConsent,
    ad_personalization: 'granted' as GtagConsent,
  })
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT))
  }
}

/** Restaure le consentement accordé lors d'une visite précédente. */
export function restoreGtagConsentIfAccepted(): void {
  if (hasAnalyticsConsent()) {
    grantGtagConsent()
  }
}
