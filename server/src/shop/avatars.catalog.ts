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

export const PAID_AVATAR_PRICE_CHIPS = 2_500

const PRESET_SET = new Set<string>(AVATAR_PRESET_IDS)

export function isAvatarPresetId(id: string): id is AvatarPresetId {
  return PRESET_SET.has(id)
}

export function isFreeAvatarPreset(id: string): boolean {
  return isAvatarPresetId(id) && FREE_AVATAR_IDS.has(id)
}

export function avatarPresetPriceChips(id: string): number {
  if (!isAvatarPresetId(id) || isFreeAvatarPreset(id)) return 0
  return PAID_AVATAR_PRICE_CHIPS
}
