/**
 * Shared drawer design styles
 *
 * Editorial-inspired design system with warm, sophisticated colors.
 * Inspired by print magazines and conscious design aesthetics.
 */

// Editorial color palette
export const EDITORIAL_COLORS = {
  // Warm terracotta/rust - primary accent
  terracotta: {
    50: '#fdf8f6',
    100: '#f9ede8',
    200: '#f2d9cf',
    300: '#e8bfaf',
    400: '#d99c82',
    500: '#c4604b', // Primary terracotta
    600: '#b54d3a',
    700: '#973f30',
    800: '#7c352a',
    900: '#662e26',
  },
  // Warm cream/ivory - backgrounds
  cream: {
    50: '#fefdfb',
    100: '#faf8f5',
    200: '#f5f3ef', // Primary cream background
    300: '#ebe7e1',
    400: '#ddd7cf',
    500: '#c9c1b6',
  },
  // Warm charcoal - text
  charcoal: {
    50: '#f7f7f6',
    100: '#e3e3e1',
    200: '#c8c7c4',
    300: '#a9a8a4',
    400: '#8b8a85',
    500: '#706f6a',
    600: '#5a5955',
    700: '#484744',
    800: '#3a3937', // Primary text
    900: '#2d2c2a',
  },
} as const;

export const DRAWER_STYLES = {
  // Editorial background - warm cream instead of cold white
  background: 'bg-[#f5f3ef] dark:bg-[#1c1a17]',
  backgroundSolid: '#f5f3ef',
  backgroundSolidDark: '#1c1a17',

  // Terracotta accent background (for hero sections)
  accentBackground: 'bg-[#c4604b]',
  accentBackgroundHover: 'hover:bg-[#b54d3a]',

  // Subtle backdrop blur for overlays
  backdropBlur: 'backdrop-blur-sm',

  // Border styles - warm tones
  borderTop: 'border-t border-[#ebe7e1] dark:border-[#2d2c2a]',
  borderLeft: 'border-l border-[#ebe7e1] dark:border-[#2d2c2a]',
  borderBottom: 'border-b border-[#ebe7e1] dark:border-[#2d2c2a]',
  borderRight: 'border-r border-[#ebe7e1] dark:border-[#2d2c2a]',

  // Header/Footer backgrounds - editorial cream
  headerBackground: 'bg-[#f5f3ef] dark:bg-[#1c1a17]',
  footerBackground: 'bg-[#f5f3ef] dark:bg-[#1c1a17]',

  // Combined classes for common use cases
  editorialBackground: 'bg-[#f5f3ef] dark:bg-[#1c1a17]',
  editorialBorderTop: 'border-t border-[#ebe7e1] dark:border-[#2d2c2a]',
  editorialBorderLeft: 'border-l border-[#ebe7e1] dark:border-[#2d2c2a]',
  editorialBorderRight: 'border-r border-[#ebe7e1] dark:border-[#2d2c2a]',

  // Text colors - warm charcoal
  textPrimary: 'text-[#3a3937] dark:text-[#f5f3ef]',
  textSecondary: 'text-[#706f6a] dark:text-[#a9a8a4]',
  textTertiary: 'text-[#a9a8a4] dark:text-[#706f6a]',

  // Accent colors
  accentText: 'text-[#c4604b]',
  accentTextHover: 'hover:text-[#b54d3a]',

  // Legacy support - map to new editorial styles
  glassyBackground: 'bg-[#f5f3ef] dark:bg-[#1c1a17]',
  glassyBorderTop: 'border-t border-[#ebe7e1] dark:border-[#2d2c2a]',
  glassyBorderLeft: 'border-l border-[#ebe7e1] dark:border-[#2d2c2a]',
  glassyBorderRight: 'border-r border-[#ebe7e1] dark:border-[#2d2c2a]',
} as const;

/**
 * Editorial typography classes
 */
export const EDITORIAL_TYPOGRAPHY = {
  // Headings - tighter tracking, warmer colors
  h1: 'text-2xl font-semibold tracking-tight text-[#3a3937] dark:text-[#f5f3ef] leading-tight',
  h2: 'text-xl font-semibold tracking-tight text-[#3a3937] dark:text-[#f5f3ef] leading-tight',
  h3: 'text-base font-medium text-[#3a3937] dark:text-[#f5f3ef]',

  // Body text
  body: 'text-base text-[#5a5955] dark:text-[#c8c7c4] leading-relaxed',
  bodySmall: 'text-xs text-[#706f6a] dark:text-[#a9a8a4]',

  // Labels - uppercase, editorial style
  label: 'text-xs uppercase tracking-[0.12em] font-medium text-[#a9a8a4] dark:text-[#706f6a]',

  // Links
  link: 'text-[#c4604b] hover:text-[#b54d3a] transition-colors',
} as const;

/**
 * Get the full editorial background classes for a drawer container
 */
export function getDrawerBackgroundClasses(hasBorderTop = false, hasBorderLeft = false): string {
  const classes: string[] = [
    DRAWER_STYLES.editorialBackground,
  ];

  if (hasBorderTop) {
    classes.push(DRAWER_STYLES.editorialBorderTop);
  }

  if (hasBorderLeft) {
    classes.push(DRAWER_STYLES.editorialBorderLeft);
  }

  return classes.join(' ');
}

/**
 * Get accent section classes (terracotta background)
 */
export function getAccentSectionClasses(): string {
  return `${DRAWER_STYLES.accentBackground} text-white`;
}
