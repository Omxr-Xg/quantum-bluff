/**
 * i18next ≥ 25.8 affiche parfois un message sponsor (Locize) en console.
 * Désactivation avant le chargement du module i18n.
 */
const g = globalThis as unknown as {
  __I18NEXT_SHOW_SUPPORT_NOTICE?: boolean
  __i18next_supportNoticeShown?: boolean
}
g.__I18NEXT_SHOW_SUPPORT_NOTICE = false
g.__i18next_supportNoticeShown = true
