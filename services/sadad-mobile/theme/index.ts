/**
 * Theme tokens for the Sadad mobile app.
 *
 * Two distinct surfaces:
 * - `customer` — checkout flow, clean white with Sadad brand orange
 * - `merchant` — B2B dashboard, dark mode with neon accents
 */

export const CUSTOMER_THEME = {
  mode: "light" as const,
  brand: {
    primary: "#F57C00",       // Sadad orange
    primaryDark: "#E65100",
    primaryLight: "#FFB74D",
    primarySoft: "#FFF3E0",
  },
  bg: {
    canvas: "#FFFFFF",
    surface: "#FAFAFA",
    card: "#FFFFFF",
    muted: "#F5F5F5",
  },
  text: {
    primary: "#1A1A1A",
    secondary: "#555555",
    muted: "#888888",
    onBrand: "#FFFFFF",
  },
  border: {
    default: "#E8E8E8",
    strong: "#D0D0D0",
  },
  status: {
    success: "#2E7D32",
    successBg: "#E8F5E9",
    warning: "#F57C00",
    warningBg: "#FFF3E0",
    error: "#C62828",
    errorBg: "#FFEBEE",
    info: "#1565C0",
    infoBg: "#E3F2FD",
  },
} as const;

export const MERCHANT_THEME = {
  mode: "dark" as const,
  brand: {
    primary: "#FF9100",       // Brighter Sadad orange for dark
    primaryDark: "#F57C00",
    primaryLight: "#FFB74D",
    primarySoft: "rgba(255,145,0,0.12)",
  },
  accent: {
    cyan: "#00E5FF",
    magenta: "#FF4081",
    lime: "#C6FF00",
    violet: "#B388FF",
  },
  bg: {
    canvas: "#0A0E17",        // near-black with blue tint
    surface: "#121826",
    card: "#1A2133",
    elevated: "#232B3F",
    muted: "#0D1220",
  },
  text: {
    primary: "#F5F7FA",
    secondary: "#A8B2C4",
    muted: "#6B7489",
    onBrand: "#0A0E17",
  },
  border: {
    default: "#232B3F",
    strong: "#323B54",
    glow: "rgba(0,229,255,0.35)",
  },
  status: {
    success: "#00E676",
    successBg: "rgba(0,230,118,0.12)",
    warning: "#FFC107",
    warningBg: "rgba(255,193,7,0.12)",
    error: "#FF5252",
    errorBg: "rgba(255,82,82,0.12)",
    info: "#40C4FF",
    infoBg: "rgba(64,196,255,0.12)",
  },
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const FONT = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
} as const;

export type CustomerTheme = typeof CUSTOMER_THEME;
export type MerchantTheme = typeof MERCHANT_THEME;
