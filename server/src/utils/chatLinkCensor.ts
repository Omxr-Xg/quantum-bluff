/** Texte affiché à la place d’une URL ou d’un domaine détecté. */
export const CHAT_LINK_CENSOR_PLACEHOLDER = '[lien supprimé]'

/**
 * TLD / hôtes souvent utilisés pour partager des liens (liste conservative pour limiter les faux positifs type fichier.txt).
 */
const BARE_WEB_HOST = new RegExp(
  [
    '\\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+',
    '(?:xn--[a-z0-9-]+|',
    [
      'com',
      'net',
      'org',
      'fr',
      'co',
      'io',
      'uk',
      'de',
      'eu',
      'app',
      'dev',
      'info',
      'biz',
      'online',
      'site',
      'link',
      'gg',
      'ly',
      'tv',
      'me',
      'ru',
      'nl',
      'be',
      'ch',
      'at',
      'ca',
      'au',
      'br',
      'es',
      'it',
      'pl',
      'se',
      'no',
      'fi',
      'dk',
      'nz',
      'mx',
      'jp',
      'in',
      'cn',
      'kr',
      'tw',
      'hk',
      'sg',
      'pt',
      'cz',
      'ee',
      'icu',
      'xyz',
      'club',
      'live',
      'shop',
      'news',
      'wiki',
      'page',
      'tech',
      'ai',
      'cloud',
      'fun',
      'games',
      'pro',
      'work',
      'email',
      'group',
      'store',
      'world',
      'today',
      'life',
      'vip',
      'top',
      'zone',
      'arpa',
    ].join('|'),
    ')\\b(?:\\/[^\\s<>"\']*)?',
  ].join(''),
  'gi',
)

const IPV4 = new RegExp(
  [
    '\\b(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}',
    '(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)',
    '(?::\\d{1,5})?(?:\\/[^\\s<>"\']*)?\\b',
  ].join(''),
  'g',
)

/**
 * Remplace les motifs ressemblant à des liens par {@link CHAT_LINK_CENSOR_PLACEHOLDER}.
 */
export function censorChatLinks(raw: string): string {
  let s = raw
  s = s.replace(/(?:https?|ftp):\/\/[^\s<>"']+/gi, CHAT_LINK_CENSOR_PLACEHOLDER)
  s = s.replace(/mailto:\s*[^\s<>"']+/gi, CHAT_LINK_CENSOR_PLACEHOLDER)
  s = s.replace(/\bwww\.[^\s<>"']+/gi, CHAT_LINK_CENSOR_PLACEHOLDER)
  s = s.replace(
    /\b(?:discord(?:app)?\.com\/invite\/|discord\.gg\/)[^\s<>"']+/gi,
    CHAT_LINK_CENSOR_PLACEHOLDER,
  )
  s = s.replace(/\bt\.me\/[^\s<>"']+/gi, CHAT_LINK_CENSOR_PLACEHOLDER)
  s = s.replace(BARE_WEB_HOST, CHAT_LINK_CENSOR_PLACEHOLDER)
  s = s.replace(IPV4, CHAT_LINK_CENSOR_PLACEHOLDER)
  const ph = CHAT_LINK_CENSOR_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  s = s.replace(new RegExp(`(?:\\s*${ph}\\s*)+`, 'g'), ` ${CHAT_LINK_CENSOR_PLACEHOLDER} `)
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s
}

/** Après censure : il ne reste aucun caractère « utile » (message uniquement composé de liens). */
export function isChatContentEffectivelyEmpty(censored: string): boolean {
  const stripped = censored
    .replace(new RegExp(CHAT_LINK_CENSOR_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '')
    .replace(/\s+/g, '')
    .trim()
  return stripped.length === 0
}
