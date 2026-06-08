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

/** Jetons par preset payant (1 500 – 15 000). */
export const AVATAR_PRESET_PRICES: Record<AvatarPresetId, number> = {
  FA1: 0,
  FA2: 1_500,
  FJ1: 0,
  FJ2: 2_000,
  FJ3: 2_500,
  FJ4: 3_000,
  FJ5: 3_500,
  FJ6: 4_500,
  FJ7: 5_500,
  FJ8: 6_500,
  HA1: 0,
  HA2: 4_000,
  HA3: 7_000,
  HJ1: 0,
  HJ2: 2_200,
  HJ3: 3_200,
  HJ4: 4_800,
  HJ5: 5_800,
  HJ6: 7_500,
  HJ7: 8_500,
  HJ8: 10_000,
  HJ9: 12_000,
  HJ10: 14_000,
  TJ1: 15_000,
}

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
