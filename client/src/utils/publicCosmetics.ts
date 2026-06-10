import type { ShopCosmetic, ShopLoadout } from "../services/api";

export type PublicPlayerCosmetics = {
  banner: { id: string; gradient: string; overlayOpacity?: number } | null;
  frame: { id: string; border: string; glow?: string; borderWidth?: number; imageUrl?: string } | null;
  title: {
    id: string;
    nameKey: string;
    color: string;
    textShadow?: string;
    fontWeight?: number;
    letterSpacing?: string;
  } | null;
};

const EMPTY_COSMETICS: PublicPlayerCosmetics = {
  banner: null,
  frame: null,
  title: null,
};

type BannerStyleJson = {
  gradient?: string;
  backgroundCss?: string;
  overlayOpacity?: number;
};

type FrameStyleJson = {
  border?: string;
  glow?: string;
  borderWidth?: number;
  imageUrl?: string;
};

type TitleStyleJson = {
  color?: string;
  textShadow?: string;
  fontWeight?: number;
  letterSpacing?: string;
};

function parseStyleJson<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

export function resolvePublicCosmeticsFromShop(
  items: ShopCosmetic[] | undefined,
  loadout: ShopLoadout | null | undefined,
): PublicPlayerCosmetics {
  if (!items?.length || !loadout) return EMPTY_COSMETICS;

  const byId = new Map(items.map((item) => [item.id, item]));
  const bannerItem = loadout.bannerId ? byId.get(loadout.bannerId) : undefined;
  const frameItem = loadout.frameId ? byId.get(loadout.frameId) : undefined;
  const titleItem = loadout.titleId ? byId.get(loadout.titleId) : undefined;

  let banner: PublicPlayerCosmetics["banner"] = null;
  if (bannerItem?.type === "BANNER") {
    const style = parseStyleJson<BannerStyleJson>(bannerItem.styleJson);
    const gradient = style?.backgroundCss ?? style?.gradient;
    if (gradient) {
      banner = {
        id: bannerItem.id,
        gradient,
        overlayOpacity: style?.overlayOpacity,
      };
    }
  }

  let frame: PublicPlayerCosmetics["frame"] = null;
  if (frameItem?.type === "AVATAR_FRAME") {
    const style = parseStyleJson<FrameStyleJson>(frameItem.styleJson);
    if (style?.border) {
      frame = {
        id: frameItem.id,
        border: style.border,
        glow: style.glow,
        borderWidth: style.borderWidth,
        imageUrl: style.imageUrl,
      };
    }
  }

  let title: PublicPlayerCosmetics["title"] = null;
  if (titleItem?.type === "TITLE") {
    const style = parseStyleJson<TitleStyleJson>(titleItem.styleJson);
    if (style?.color) {
      title = {
        id: titleItem.id,
        nameKey: titleItem.nameKey,
        color: style.color,
        textShadow: style.textShadow,
        fontWeight: style.fontWeight,
        letterSpacing: style.letterSpacing,
      };
    }
  }

  return { banner, frame, title };
}
