export type CosmeticStudioType = "BANNER" | "AVATAR_FRAME" | "TITLE";

export type BannerEditorState = {
  colorStart: string;
  colorEnd: string;
  angle: number;
  imageUrl: string | null;
  overlayOpacity: number;
  pattern: "none" | "dots" | "lines" | "grid";
};

export type FrameEditorState = {
  borderColor: string;
  borderWidth: number;
  glowColor: string;
  glowBlur: number;
  imageUrl: string | null;
};

export type TitleEditorState = {
  color: string;
  glowBlur: number;
  fontWeight: number;
  letterSpacing: number;
};

export const DEFAULT_BANNER: BannerEditorState = {
  colorStart: "#6366f1",
  colorEnd: "#a855f7",
  angle: 135,
  imageUrl: null,
  overlayOpacity: 0.72,
  pattern: "none",
};

export const DEFAULT_FRAME: FrameEditorState = {
  borderColor: "#c9a84c",
  borderWidth: 3,
  glowColor: "rgba(201,168,76,0.7)",
  glowBlur: 16,
  imageUrl: null,
};

export const DEFAULT_TITLE: TitleEditorState = {
  color: "#fde047",
  glowBlur: 12,
  fontWeight: 700,
  letterSpacing: 0.08,
};

const PATTERN_CSS: Record<BannerEditorState["pattern"], string> = {
  none: "",
  dots: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)",
  lines: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 8px)",
  grid: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
};

export function bannerGradientCss(state: BannerEditorState): string {
  return `linear-gradient(${state.angle}deg, ${state.colorStart}, ${state.colorEnd})`;
}

export function bannerBackgroundPreview(state: BannerEditorState): string {
  const layers: string[] = [];
  if (state.pattern !== "none") layers.push(PATTERN_CSS[state.pattern]);
  layers.push(bannerGradientCss(state));
  if (state.imageUrl) layers.push(`url("${state.imageUrl}")`);
  return layers.join(", ");
}

export function frameGlowCss(state: FrameEditorState): string {
  return `0 0 ${state.glowBlur}px ${state.glowColor}`;
}

export function titleShadowCss(state: TitleEditorState): string {
  return `0 0 ${state.glowBlur}px ${state.color}`;
}

export function buildBannerPayload(state: BannerEditorState) {
  return {
    gradient: bannerGradientCss(state),
    imageUrl: state.imageUrl ?? undefined,
    overlayOpacity: state.overlayOpacity,
    pattern: state.pattern,
  };
}

export function buildFramePayload(state: FrameEditorState) {
  return {
    border: state.borderColor,
    glow: frameGlowCss(state),
    borderWidth: state.borderWidth,
    imageUrl: state.imageUrl ?? undefined,
  };
}

export function buildTitlePayload(state: TitleEditorState) {
  return {
    color: state.color,
    textShadow: titleShadowCss(state),
    fontWeight: state.fontWeight,
    letterSpacing: `${state.letterSpacing}em`,
  };
}
