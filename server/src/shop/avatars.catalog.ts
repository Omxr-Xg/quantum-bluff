/** Presets d'avatar profil (noms de fichiers sans extension). */
export const AVATAR_PRESET_IDS = [
  'FA1',
  'FA2',
  'FJ1',
  'FJ2',
  'FJ3',
  'FJ4',
  'FJ5',
  'FJ6',
  'FJ7',
  'FJ8',
  'HA1',
  'HA2',
  'HA3',
  'HJ1',
  'HJ2',
  'HJ3',
  'HJ4',
  'HJ5',
  'HJ6',
  'HJ7',
  'HJ8',
  'HJ9',
  'HJ10',
  'TJ1',
] as const

export type AvatarPresetId = (typeof AVATAR_PRESET_IDS)[number]

export const FREE_AVATAR_IDS = new Set<AvatarPresetId>(['FA1', 'FJ1', 'HA1', 'HJ1'])

const PAID_AVATAR_MIN_CHIPS = 1_500
const PAID_AVATAR_MAX_CHIPS = 15_000

function buildAvatarPresetPrices(): Record<AvatarPresetId, number> {
  const prices = Object.fromEntries(AVATAR_PRESET_IDS.map((id) => [id, 0])) as Record<
    AvatarPresetId,
    number
  >
  const paid = AVATAR_PRESET_IDS.filter((id) => !FREE_AVATAR_IDS.has(id))
  paid.forEach((id, index) => {
    const t = paid.length <= 1 ? 0 : index / (paid.length - 1)
    const raw = PAID_AVATAR_MIN_CHIPS + t * (PAID_AVATAR_MAX_CHIPS - PAID_AVATAR_MIN_CHIPS)
    prices[id] = Math.round(raw / 50) * 50
  })
  return prices
}

/** Jetons par preset (gratuits = 0, payants répartis de 1 500 à 15 000). */
export const AVATAR_PRESET_PRICES = buildAvatarPresetPrices()

const PRESET_SET = new Set<string>(AVATAR_PRESET_IDS)

export function isAvatarPresetId(id: string): id is AvatarPresetId {
  return PRESET_SET.has(id)
}

export function isFreeAvatarPreset(id: string): boolean {
  return isAvatarPresetId(id) && FREE_AVATAR_IDS.has(id)
}

export function avatarPresetPriceChips(id: string): number {
  if (!isAvatarPresetId(id)) return 0
  return AVATAR_PRESET_PRICES[id]
}
