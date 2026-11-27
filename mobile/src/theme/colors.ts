/**
 * Barber & Dragons Dark Fantasy Color Palette
 * Synchronized with Web App design system tokens (Guild Stone, Brass & Crimson)
 */

export const colors = {
  // Guild Stone Dark Neutrals (Warm Guildhall Palette)
  void: '#0B0908',
  stone: '#141210',
  stoneSurface: '#1C1815',
  stoneHighlight: '#27221E',
  stoneBorder: '#3B322B',
  stoneBorderLight: '#54463C',

  // Artisan Brass Accents
  brassBase: '#C89D49',
  brassLight: '#F1D899',
  brassDark: '#7E5F24',

  // Parchment Readability
  parchmentLight: '#F5F2EB',
  parchmentMuted: '#CDC5B4',
  parchmentDim: '#8C8270',

  // Status & Role Accents
  crimson: '#942121',
  crimsonBase: '#942121',
  crimsonLight: '#EF4444',
  emerald: '#10B981',

  // Wiki & Content Visibility Tokens (WCAG AA/AAA on #1C1815 / #0B0908)
  visibilityPublic: '#34D399',
  visibilityPublicBg: 'rgba(16, 185, 129, 0.14)',
  visibilityPublicBorder: 'rgba(52, 211, 153, 0.45)',
  visibilitySelective: '#F1D899',
  visibilitySelectiveBg: 'rgba(200, 157, 73, 0.16)',
  visibilitySelectiveBorder: '#C89D49',
  visibilitySecret: '#FCA5A5',
  visibilitySecretBg: 'rgba(239, 68, 68, 0.15)',
  visibilitySecretBorder: '#EF4444',
  visibilityAdminOnly: '#DDD6FE',
  visibilityAdminOnlyBg: 'rgba(139, 92, 246, 0.18)',
  visibilityAdminOnlyBorder: 'rgba(167, 139, 250, 0.52)',

  // Semantic aliases for high ergonomics
  background: '#0B0908',
  surface: '#141210',
  card: '#1C1815',
  cardBorder: '#3B322B',
  textPrimary: '#F5F2EB',
  textMuted: '#CDC5B4',
  accent: '#C89D49',
  accentLight: '#F1D899',
  accentDark: '#7E5F24',
  danger: '#EF4444',
  success: '#10B981',
} as const;

export type ThemeColors = typeof colors;
export type ColorKey = keyof ThemeColors;

export default colors;
