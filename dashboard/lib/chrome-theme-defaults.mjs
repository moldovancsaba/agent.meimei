/**
 * Canonical operator-chrome theme tokens (must match `public/styles/design-system.css` defaults).
 * @version 1.0.0
 */

/** @type {const} */
export const NAV_KEYS = ["apps", "tools", "dashboard", "knowmore", "admin"];

/** @type {const} */
export const THEME_KEYS = ["meimei", "dashboard", "admin", "apps", "tools", "knowmore"];

/** CSS `data-theme` value per nav destination (nav chip class uses the same segment). */
export const NAV_TO_DEST = {
  apps: "apps",
  tools: "tools",
  dashboard: "dashboard",
  knowmore: "knowmore",
  admin: "admin"
};

/** Default `--chip-accent` per nav key (matches `.nav-chip.nav-dest-*` in design-system.css). */
export const DEFAULT_NAV_CHIPS = {
  apps: "#bb2288",
  tools: "#664488",
  dashboard: "#ffbb00",
  knowmore: "#66cc33",
  admin: "#ff4400"
};

/**
 * Body theme bundles: accent, secondary accent, card border, radial glow (same structure as design-system).
 * @type {Record<string, { accent: string, accent2: string, cardBorder: string, bgGlow: string }>}
 */
export const DEFAULT_THEMES = {
  meimei: {
    accent: "#3366dd",
    accent2: "#5599ee",
    cardBorder: "rgba(51, 102, 221, 0.55)",
    bgGlow: "rgba(51, 102, 221, 0.16)"
  },
  dashboard: {
    accent: "#ffbb00",
    accent2: "#ff8800",
    cardBorder: "rgba(255, 187, 0, 0.58)",
    bgGlow: "rgba(255, 187, 0, 0.16)"
  },
  admin: {
    accent: "#ff4400",
    accent2: "#ff6633",
    cardBorder: "rgba(255, 68, 0, 0.58)",
    bgGlow: "rgba(255, 68, 0, 0.16)"
  },
  apps: {
    accent: "#bb2288",
    accent2: "#dd44aa",
    cardBorder: "rgba(187, 34, 136, 0.58)",
    bgGlow: "rgba(187, 34, 136, 0.16)"
  },
  tools: {
    accent: "#664488",
    accent2: "#8866aa",
    cardBorder: "rgba(102, 68, 136, 0.58)",
    bgGlow: "rgba(102, 68, 136, 0.16)"
  },
  knowmore: {
    accent: "#66cc33",
    accent2: "#88dd55",
    cardBorder: "rgba(102, 204, 51, 0.58)",
    bgGlow: "rgba(102, 204, 51, 0.16)"
  }
};
