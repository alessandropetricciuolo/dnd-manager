/**
 * Barber & Dragons Dark Fantasy Color Palette
 * Synchronized with Web App design system tokens (Guild Stone, Brass & Crimson)
 */

export const colors = {
  // Guild Stone Dark Neutrals
  void: '#0B0D10',
  stone: '#14181F',
  stoneSurface: '#1D222B',
  stoneBorder: '#2B3340',

  // Artisan Brass Accents
  brassBase: '#C59B27',
  brassLight: '#F3D27A',
  brassDark: '#8C6C14',

  // Parchment Readability
  parchmentLight: '#F4ECE1',
  parchmentMuted: '#A0AAB8',

  // Status & Role Accents
  crimson: '#991B1B',
  crimsonBase: '#991B1B',
  crimsonLight: '#EF4444',
  emerald: '#10B981',

  // Semantic aliases for high ergonomics
  background: '#0B0D10',
  surface: '#14181F',
  card: '#1D222B',
  cardBorder: '#2B3340',
  textPrimary: '#F4ECE1',
  textMuted: '#A0AAB8',
  accent: '#C59B27',
  accentLight: '#F3D27A',
  accentDark: '#8C6C14',
  danger: '#EF4444',
  success: '#10B981',
} as const;

export type ThemeColors = typeof colors;
export type ColorKey = keyof ThemeColors;

export default colors;
