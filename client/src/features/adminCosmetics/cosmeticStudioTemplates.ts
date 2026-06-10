import type {
  BannerEditorState,
  CosmeticStudioType,
  FrameEditorState,
  TitleEditorState,
} from "./cosmeticStyleUtils";
import { DEFAULT_BANNER, DEFAULT_FRAME, DEFAULT_TITLE } from "./cosmeticStyleUtils";

export type CosmeticTemplate = {
  id: string;
  labelKey: string;
  type: CosmeticStudioType;
  banner?: Partial<BannerEditorState>;
  frame?: Partial<FrameEditorState>;
  title?: Partial<TitleEditorState>;
};

export const COSMETIC_STUDIO_TEMPLATES: CosmeticTemplate[] = [
  {
    id: "banner_royal",
    labelKey: "adminConsole.cosmeticTplBannerRoyal",
    type: "BANNER",
    banner: { colorStart: "#fbbf24", colorEnd: "#78350f", angle: 135, pattern: "dots" },
  },
  {
    id: "banner_neon",
    labelKey: "adminConsole.cosmeticTplBannerNeon",
    type: "BANNER",
    banner: { colorStart: "#f472b6", colorEnd: "#06b6d4", angle: 120, pattern: "lines" },
  },
  {
    id: "banner_void",
    labelKey: "adminConsole.cosmeticTplBannerVoid",
    type: "BANNER",
    banner: { colorStart: "#0f172a", colorEnd: "#334155", angle: 165, pattern: "grid", overlayOpacity: 0.55 },
  },
  {
    id: "banner_crimson",
    labelKey: "adminConsole.cosmeticTplBannerCrimson",
    type: "BANNER",
    banner: { colorStart: "#991b1b", colorEnd: "#450a0a", angle: 145, pattern: "none" },
  },
  {
    id: "frame_gold",
    labelKey: "adminConsole.cosmeticTplFrameGold",
    type: "AVATAR_FRAME",
    frame: { borderColor: "#ffd700", glowColor: "rgba(255,215,0,0.75)", glowBlur: 18, borderWidth: 4 },
  },
  {
    id: "frame_diamond",
    labelKey: "adminConsole.cosmeticTplFrameDiamond",
    type: "AVATAR_FRAME",
    frame: { borderColor: "#67e8f9", glowColor: "rgba(103,232,249,0.85)", glowBlur: 22, borderWidth: 3 },
  },
  {
    id: "frame_quantum",
    labelKey: "adminConsole.cosmeticTplFrameQuantum",
    type: "AVATAR_FRAME",
    frame: { borderColor: "#a855f7", glowColor: "rgba(99,102,241,0.9)", glowBlur: 24, borderWidth: 3 },
  },
  {
    id: "frame_bronze",
    labelKey: "adminConsole.cosmeticTplFrameBronze",
    type: "AVATAR_FRAME",
    frame: { borderColor: "#cd7f32", glowColor: "rgba(205,127,50,0.6)", glowBlur: 12, borderWidth: 3 },
  },
  {
    id: "title_legend",
    labelKey: "adminConsole.cosmeticTplTitleLegend",
    type: "TITLE",
    title: { color: "#fbbf24", glowBlur: 16, fontWeight: 800, letterSpacing: 0.12 },
  },
  {
    id: "title_neon",
    labelKey: "adminConsole.cosmeticTplTitleNeon",
    type: "TITLE",
    title: { color: "#22d3ee", glowBlur: 20, fontWeight: 700, letterSpacing: 0.1 },
  },
  {
    id: "title_blood",
    labelKey: "adminConsole.cosmeticTplTitleBlood",
    type: "TITLE",
    title: { color: "#f87171", glowBlur: 14, fontWeight: 700, letterSpacing: 0.06 },
  },
  {
    id: "title_ghost",
    labelKey: "adminConsole.cosmeticTplTitleGhost",
    type: "TITLE",
    title: { color: "#e2e8f0", glowBlur: 8, fontWeight: 600, letterSpacing: 0.15 },
  },
];

export function applyTemplate(
  template: CosmeticTemplate,
): { type: CosmeticStudioType; banner: BannerEditorState; frame: FrameEditorState; title: TitleEditorState } {
  return {
    type: template.type,
    banner: { ...DEFAULT_BANNER, ...template.banner },
    frame: { ...DEFAULT_FRAME, ...template.frame },
    title: { ...DEFAULT_TITLE, ...template.title },
  };
}
