import { COSMETIC_BY_ID } from './cosmetics.catalog.js'

export type PublicPlayerCosmetics = {
  banner: { id: string; gradient: string } | null
  frame: { id: string; border: string; glow?: string } | null
  title: { id: string; nameKey: string; color: string } | null
}

type EquippedIds = {
  equippedBannerId?: string | null
  equippedFrameId?: string | null
  equippedTitleId?: string | null
}

export function resolvePublicCosmetics(user: EquippedIds): PublicPlayerCosmetics {
  const bannerId = user.equippedBannerId ?? null
  const frameId = user.equippedFrameId ?? null
  const titleId = user.equippedTitleId ?? null

  let banner: PublicPlayerCosmetics['banner'] = null
  if (bannerId) {
    const item = COSMETIC_BY_ID.get(bannerId)
    if (item?.type === 'BANNER') {
      try {
        const style = JSON.parse(item.styleJson) as { gradient?: string }
        if (style.gradient) banner = { id: bannerId, gradient: style.gradient }
      } catch {
        /* ignore */
      }
    }
  }

  let frame: PublicPlayerCosmetics['frame'] = null
  if (frameId) {
    const item = COSMETIC_BY_ID.get(frameId)
    if (item?.type === 'AVATAR_FRAME') {
      try {
        const style = JSON.parse(item.styleJson) as { border?: string; glow?: string }
        if (style.border) frame = { id: frameId, border: style.border, glow: style.glow }
      } catch {
        /* ignore */
      }
    }
  }

  let title: PublicPlayerCosmetics['title'] = null
  if (titleId) {
    const item = COSMETIC_BY_ID.get(titleId)
    if (item?.type === 'TITLE') {
      try {
        const style = JSON.parse(item.styleJson) as { color?: string }
        if (style.color) title = { id: titleId, nameKey: item.nameKey, color: style.color }
      } catch {
        /* ignore */
      }
    }
  }

  return { banner, frame, title }
}
