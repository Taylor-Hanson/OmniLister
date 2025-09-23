// Design system color tokens
export const colors = {
  // Primary colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554'
  },

  // Secondary colors
  secondary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
  },

  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16'
  },

  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
    950: '#451a03'
  },

  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
    950: '#450a0a'
  },

  // Info colors
  info: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49'
  },

  // Neutral colors
  neutral: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0a0a0a'
  },

  // Marketplace-specific colors
  marketplace: {
    ebay: '#0064d2',
    poshmark: '#e74c3c',
    mercari: '#ff6b35',
    depop: '#ff0050',
    grailed: '#000000',
    shopify: '#96bf48',
    amazon: '#ff9900',
    etsy: '#f16521',
    facebook: '#1877f2',
    instagram: '#e4405f',
    twitter: '#1da1f2',
    pinterest: '#bd081c'
  },

  // Semantic colors
  semantic: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      inverse: '#0f172a'
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
      disabled: '#94a3b8'
    },
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      focus: '#3b82f6',
      error: '#ef4444',
      success: '#22c55e'
    },
    surface: {
      elevated: '#ffffff',
      overlay: 'rgba(15, 23, 42, 0.8)',
      backdrop: 'rgba(15, 23, 42, 0.4)'
    }
  }
} as const;

// Color utility functions
export const colorUtils = {
  /**
   * Get color value by path (e.g., 'primary.500')
   */
  getColor: (path: string): string => {
    const keys = path.split('.');
    let value: any = colors;
    
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) {
        return path; // Return original path if not found
      }
    }
    
    return value;
  },

  /**
   * Convert hex to RGB
   */
  hexToRgb: (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },

  /**
   * Convert RGB to hex
   */
  rgbToHex: (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  },

  /**
   * Get contrast color (black or white) for background
   */
  getContrastColor: (backgroundColor: string): string => {
    const rgb = colorUtils.hexToRgb(backgroundColor);
    if (!rgb) return '#000000';

    // Calculate relative luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  },

  /**
   * Add alpha channel to hex color
   */
  addAlpha: (hex: string, alpha: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;
    
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  },

  /**
   * Darken color by percentage
   */
  darken: (hex: string, percentage: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - (percentage / 100);
    return colorUtils.rgbToHex(
      Math.round(rgb.r * factor),
      Math.round(rgb.g * factor),
      Math.round(rgb.b * factor)
    );
  },

  /**
   * Lighten color by percentage
   */
  lighten: (hex: string, percentage: number): string => {
    const rgb = colorUtils.hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percentage / 100;
    return colorUtils.rgbToHex(
      Math.round(rgb.r + (255 - rgb.r) * factor),
      Math.round(rgb.g + (255 - rgb.g) * factor),
      Math.round(rgb.b + (255 - rgb.b) * factor)
    );
  }
};

// Color type definitions
export type ColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type ColorToken = keyof typeof colors;
export type ColorShade = keyof ColorScale;
