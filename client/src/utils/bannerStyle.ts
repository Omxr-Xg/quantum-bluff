export type ParsedBannerStyle = {
  background: string | undefined;
  overlayOpacity: number | undefined;
  isImage: boolean;
};

export function parseBannerStyleJson(styleJson: string): ParsedBannerStyle {
  try {
    const style = JSON.parse(styleJson) as {
      gradient?: string;
      backgroundCss?: string;
      imageUrl?: string;
      overlayOpacity?: number;
    };
    const background =
      style.backgroundCss ??
      style.gradient ??
      (style.imageUrl ? `url("${style.imageUrl}")` : undefined);
    const isImage = Boolean(style.imageUrl || background?.includes("url("));
    return {
      background,
      overlayOpacity: style.overlayOpacity,
      isImage,
    };
  } catch {
    return { background: undefined, overlayOpacity: undefined, isImage: false };
  }
}

/** Voile de lisibilité : plus léger sur les illustrations photo. */
export function bannerOverlayAlpha(
  isImage: boolean,
  overlayOpacity: number | undefined,
): number {
  if (typeof overlayOpacity === "number") return overlayOpacity;
  return isImage ? 0.28 : 0.72;
}
