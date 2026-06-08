import type { ShopCosmetic, ShopLoadout } from "../services/api";

export type PublicPlayerCosmetics = {
  banner: { id: string; gradient: string } | null;
  frame: { id: string; border: string; glow?: string } | null;
  title: { id: string; nameKey: string; color: string } | null;
};

const EMPTY_COSMETICS: PublicPlayerCosmetics = {
  banner: null,
  frame: null,
  title: null,
};

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
    try {
      const style = JSON.parse(bannerItem.styleJson) as { gradient?: string };
      if (style.gradient) banner = { id: bannerItem.id, gradient: style.gradient };
    } catch {
      /* ignore */
    }
  }

  let frame: PublicPlayerCosmetics["frame"] = null;
  if (frameItem?.type === "AVATAR_FRAME") {
    try {
      const style = JSON.parse(frameItem.styleJson) as { border?: string; glow?: string };
      if (style.border) frame = { id: frameItem.id, border: style.border, glow: style.glow };
    } catch {
      /* ignore */
    }
  }

  let title: PublicPlayerCosmetics["title"] = null;
  if (titleItem?.type === "TITLE") {
    try {
      const style = JSON.parse(titleItem.styleJson) as { color?: string };
      if (style.color) title = { id: titleItem.id, nameKey: titleItem.nameKey, color: style.color };
    } catch {
      /* ignore */
    }
  }

  return { banner, frame, title };
}
