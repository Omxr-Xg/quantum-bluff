import { getCosmeticById } from './cosmeticRegistry.js'
import { bannerBackgroundCss, parseBannerStyle, parseFrameStyle, parseTitleStyle } from './cosmeticStyle.js'

export type PublicPlayerCosmetics = {
  banner: { id: string; gradient: string; overlayOpacity?: number } | null
  frame: { id: string; border: string; glow?: string; borderWidth?: number; imageUrl?: string } | null
  title: { id: string; nameKey: string; color: string; textShadow?: string; fontWeight?: number; letterSpacing?: string } | null
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
    const item = getCosmeticById(bannerId)
    if (item?.type === 'BANNER') {
      try {
        const style = parseBannerStyle(item.styleJson)
        const gradient = style.backgroundCss ?? style.gradient
        if (gradient) {
          banner = {
            id: bannerId,
            gradient,
            overlayOpacity: style.overlayOpacity,
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  let frame: PublicPlayerCosmetics['frame'] = null
  if (frameId) {
    const item = getCosmeticById(frameId)
    if (item?.type === 'AVATAR_FRAME') {
      try {
        const style = parseFrameStyle(item.styleJson)
        if (style.border) {
          frame = {
            id: frameId,
            border: style.border,
            glow: style.glow,
            borderWidth: style.borderWidth,
            imageUrl: style.imageUrl,
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  let title: PublicPlayerCosmetics['title'] = null
  if (titleId) {
    const item = getCosmeticById(titleId)
    if (item?.type === 'TITLE') {
      try {
        const style = parseTitleStyle(item.styleJson)
        if (style.color) {
          title = {
            id: titleId,
            nameKey: item.nameKey,
            color: style.color,
            textShadow: style.textShadow,
            fontWeight: style.fontWeight,
            letterSpacing: style.letterSpacing,
          }
        }
      } catch {
        /* ignore */
      }
    }
  }

  return { banner, frame, title }
}
