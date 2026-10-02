/* Miroir TypeScript des tokens, pour la documentation et les usages hors CSS (rendu 3D, canvas) */

export const systemColors = {
  gray: '#8e8e93',
  orange: '#ff9500',
  yellow: '#ffcc00',
  purple: '#af52de',
  blue: '#007aff',
  teal: '#30b0c7',
  pink: '#ff2d55',
} as const;

export type SystemColor = keyof typeof systemColors;

export const grays = {
  'gray-25': '#fbfbfd',
  'gray-50': '#f5f5f7',
  'gray-100': '#e8e8ed',
  'gray-200': '#d2d2d7',
  'gray-300': '#c7c7cc',
  'gray-400': '#aeaeb2',
  'gray-500': '#86868b',
  'gray-600': '#6e6e73',
  'gray-700': '#424245',
  'gray-800': '#2c2c2e',
  'gray-900': '#1d1d1f',
} as const;

export const semanticColors = [
  'bg',
  'bg-elevated',
  'material',
  'material-thick',
  'label',
  'label-secondary',
  'label-tertiary',
  'fill',
  'fill-strong',
  'separator',
  'accent',
  'accent-soft',
  'danger',
  'danger-soft',
  'warning',
  'warning-soft',
  'success',
] as const;

export const textStyles = [
  'large-title',
  'title-1',
  'title-2',
  'title-3',
  'headline',
  'body',
  'callout',
  'subheadline',
  'footnote',
  'caption',
] as const;

export type TextStyle = (typeof textStyles)[number];

export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 } as const;
export const radius = { xs: 6, sm: 8, md: 12, lg: 18, xl: 24, full: 999 } as const;

export const motion = {
  easeOut: 'cubic-bezier(0.32, 0.72, 0, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
  fast: 140,
  base: 240,
  slow: 420,
} as const;

/** Lit la valeur courante d'une variable CSS (dépend du thème actif). */
export const cssVar = (name: string, el: Element = document.documentElement) =>
  getComputedStyle(el).getPropertyValue(name).trim();
