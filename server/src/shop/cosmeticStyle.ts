export type BannerStyle = {
  gradient?: string
  imageUrl?: string
  overlayOpacity?: number
  pattern?: 'none' | 'dots' | 'lines' | 'grid'
  className?: string
}

export type FrameStyle = {
  border?: string
  glow?: string
  borderWidth?: number
  imageUrl?: string
  className?: string
}

export type TitleStyle = {
  color?: string
  textShadow?: string
  fontWeight?: number
  letterSpacing?: string
  className?: string
}

const PATTERN_CSS: Record<NonNullable<BannerStyle['pattern']>, string> = {
  none: '',
  dots: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.12) 1px, transparent 0)',
  lines: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 8px)',
  grid: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
}

/** Valeur CSS `background-image` pour bannières (gradient, image, motif). */
export function bannerBackgroundCss(style: BannerStyle): string | null {
  const layers: string[] = []
  if (style.pattern && style.pattern !== 'none') {
    const p = PATTERN_CSS[style.pattern]
    if (p) layers.push(p)
  }
  if (style.gradient?.trim()) layers.push(style.gradient.trim())
  if (style.imageUrl?.trim()) layers.push(`url("${style.imageUrl.trim()}")`)
  return layers.length > 0 ? layers.join(', ') : null
}

export function parseBannerStyle(json: string): BannerStyle & { backgroundCss: string | null } {
  try {
    const raw = JSON.parse(json) as BannerStyle & { backgroundCss?: string }
    const backgroundCss = raw.backgroundCss ?? bannerBackgroundCss(raw)
    return { ...raw, backgroundCss }
  } catch {
    return { backgroundCss: null }
  }
}

export function parseFrameStyle(json: string): FrameStyle {
  try {
    return JSON.parse(json) as FrameStyle
  } catch {
    return {}
  }
}

export function parseTitleStyle(json: string): TitleStyle {
  try {
    return JSON.parse(json) as TitleStyle
  } catch {
    return {}
  }
}

export function buildBannerStyleJson(
  id: string,
  style: Omit<BannerStyle, 'className'>,
): string {
  const backgroundCss = bannerBackgroundCss(style)
  return JSON.stringify({
    ...style,
    className: `cosmetic-banner-${id}`,
    backgroundCss,
    gradient: backgroundCss ?? style.gradient,
  })
}

export function buildFrameStyleJson(id: string, style: Omit<FrameStyle, 'className'>): string {
  return JSON.stringify({
    ...style,
    className: `cosmetic-frame-${id}`,
  })
}

export function buildTitleStyleJson(id: string, style: Omit<TitleStyle, 'className'>): string {
  return JSON.stringify({
    ...style,
    className: `cosmetic-title-${id}`,
  })
}
