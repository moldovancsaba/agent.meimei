/**
 * Operator chrome overrides: nav icons, chip accents, `data-theme` token bundles.
 * Persisted under `data/operator-chrome.v1.json` (gitignored). Served as `/styles/operator-chrome.css`.
 * @version 1.0.0
 */

import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_NAV_CHIPS,
  DEFAULT_THEMES,
  NAV_KEYS,
  NAV_TO_DEST,
  THEME_KEYS
} from "./chrome-theme-defaults.mjs";

const OPERATOR_CHROME_VERSION = "v1";
const ICON_PATH_RE = /^\/images\/[a-zA-Z0-9_\-./]+\.(png|jpe?g|svg|webp)$/i;

/** @param {string} s */
export function normalizeHexColor(s) {
  const t = String(s || "").trim();
  const m = t.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return "";
  const h = m[1];
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`.toLowerCase();
  }
  return `#${h.toLowerCase()}`;
}

/**
 * Loose CSS color for card border / glow (hex, rgb, rgba).
 * @param {string} s
 */
export function isSafeCssColorToken(s) {
  const t = String(s || "").trim();
  if (t.length > 120) return false;
  if (/[<>"'`;{}\\]/.test(t)) return false;
  if (/^rgba?\(/i.test(t)) return true;
  return !!normalizeHexColor(t);
}

/** @param {string} p */
export function isAllowedIconPath(p) {
  const t = String(p || "").trim();
  if (!ICON_PATH_RE.test(t)) return false;
  if (t.includes("..")) return false;
  return true;
}

/** @param {string} repoRoot */
export function operatorChromeFile(repoRoot) {
  return path.join(repoRoot, "data", "operator-chrome.v1.json");
}

/** @param {string} repoRoot */
export function ensureDataDir(repoRoot) {
  fs.mkdirSync(path.join(repoRoot, "data"), { recursive: true });
}

/**
 * @param {string} repoRoot
 * @returns {Record<string, unknown>}
 */
export function readOperatorChromeOverrides(repoRoot) {
  try {
    const raw = fs.readFileSync(operatorChromeFile(repoRoot), "utf8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object" && data.version === OPERATOR_CHROME_VERSION) {
      return data;
    }
  } catch {
    /* missing or invalid */
  }
  return {};
}

/**
 * @param {unknown} surface
 * @param {Record<string, unknown>} overrides
 */
export function mergeEffectiveChrome(surface, overrides) {
  const navIcons = surface?.navIcons && typeof surface.navIcons === "object" ? surface.navIcons : {};
  const logos = surface?.logos && typeof surface.logos === "object" ? surface.logos : {};
  const overNav = overrides.nav && typeof overrides.nav === "object" ? overrides.nav : {};
  const overThemes = overrides.themes && typeof overrides.themes === "object" ? overrides.themes : {};

  /** @type {Record<string, { icon: string, chipAccent: string }>} */
  const nav = {};
  for (const key of NAV_KEYS) {
    const o = overNav[key] && typeof overNav[key] === "object" ? overNav[key] : {};
    const iconRaw = typeof o.icon === "string" ? o.icon.trim() : "";
    const fallbackIcon =
      (typeof navIcons[key] === "string" && navIcons[key]) ||
      (key === "knowmore" ? logos.knowmore : key === "admin" ? logos.admin : logos.dashboard) ||
      "/images/logo_sovereign.png";
    const icon = iconRaw && isAllowedIconPath(iconRaw) ? iconRaw : String(fallbackIcon);
    const chipRaw = typeof o.chipAccent === "string" ? o.chipAccent : typeof o.chip === "string" ? o.chip : "";
    const chipNorm = normalizeHexColor(chipRaw);
    const chipAccent = chipNorm || DEFAULT_NAV_CHIPS[key];
    nav[key] = { icon, chipAccent };
  }

  /** @type {Record<string, { accent: string, accent2: string, cardBorder: string, bgGlow: string }>} */
  const themes = {};
  for (const key of THEME_KEYS) {
    const base = DEFAULT_THEMES[key];
    const o = overThemes[key] && typeof overThemes[key] === "object" ? overThemes[key] : {};
    const accent = normalizeHexColor(typeof o.accent === "string" ? o.accent : "") || base.accent;
    const accent2 = normalizeHexColor(typeof o.accent2 === "string" ? o.accent2 : "") || base.accent2;
    const cardBorder =
      typeof o.cardBorder === "string" && o.cardBorder.trim() && isSafeCssColorToken(o.cardBorder)
        ? o.cardBorder.trim()
        : base.cardBorder;
    const bgGlow =
      typeof o.bgGlow === "string" && o.bgGlow.trim() && isSafeCssColorToken(o.bgGlow)
        ? o.bgGlow.trim()
        : base.bgGlow;
    themes[key] = { accent, accent2, cardBorder, bgGlow };
  }

  return { nav, themes };
}

/**
 * @param {unknown} surface
 * @param {string} repoRoot
 */
export function getEffectiveChrome(surface, repoRoot) {
  return mergeEffectiveChrome(surface, readOperatorChromeOverrides(repoRoot));
}

/**
 * @param {{ nav: Record<string, { icon: string, chipAccent: string }>, themes: Record<string, object> }} effective
 * @param {unknown} surface
 */
export function minimizeOverrides(effective, surface) {
  const base = mergeEffectiveChrome(surface, {});
  /** @type {Record<string, Record<string, string>>} */
  const nav = {};
  for (const key of NAV_KEYS) {
    const row = {};
    if (effective.nav[key].icon !== base.nav[key].icon) row.icon = effective.nav[key].icon;
    if (effective.nav[key].chipAccent !== base.nav[key].chipAccent) row.chipAccent = effective.nav[key].chipAccent;
    if (Object.keys(row).length) nav[key] = row;
  }

  /** @type {Record<string, Record<string, string>>} */
  const themes = {};
  for (const key of THEME_KEYS) {
    const e = effective.themes[key];
    const b = base.themes[key];
    const row = {};
    if (e.accent !== b.accent) row.accent = e.accent;
    if (e.accent2 !== b.accent2) row.accent2 = e.accent2;
    if (e.cardBorder !== b.cardBorder) row.cardBorder = e.cardBorder;
    if (e.bgGlow !== b.bgGlow) row.bgGlow = e.bgGlow;
    if (Object.keys(row).length) themes[key] = row;
  }

  const out = { version: OPERATOR_CHROME_VERSION };
  if (Object.keys(nav).length) out.nav = nav;
  if (Object.keys(themes).length) out.themes = themes;
  return out;
}

/**
 * Full admin POST payload → validated effective chrome (same shape as `mergeEffectiveChrome`).
 * @param {Record<string, unknown>} body
 * @param {unknown} surface
 */
export function buildEffectiveFromAdminPost(body) {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid body");
  }
  const rawNav = body.nav && typeof body.nav === "object" ? body.nav : {};
  const rawThemes = body.themes && typeof body.themes === "object" ? body.themes : {};

  /** @type {Record<string, { icon: string, chipAccent: string }>} */
  const nav = {};
  for (const key of NAV_KEYS) {
    const o = rawNav[key] && typeof rawNav[key] === "object" ? rawNav[key] : {};
    const icon = String(o.icon || "").trim();
    const chipAccent = normalizeHexColor(String(o.chipAccent || ""));
    if (!icon || !isAllowedIconPath(icon)) {
      throw new Error(`Invalid or missing icon path for “${key}” (use /images/…png|svg|jpg|webp)`);
    }
    if (!chipAccent) {
      throw new Error(`Invalid nav chip colour for “${key}” (use #rgb or #rrggbb)`);
    }
    nav[key] = { icon, chipAccent };
  }

  /** @type {Record<string, { accent: string, accent2: string, cardBorder: string, bgGlow: string }>} */
  const themes = {};
  for (const key of THEME_KEYS) {
    const o = rawThemes[key] && typeof rawThemes[key] === "object" ? rawThemes[key] : {};
    const accent = normalizeHexColor(String(o.accent || ""));
    const accent2 = normalizeHexColor(String(o.accent2 || ""));
    const cardBorder = String(o.cardBorder || "").trim();
    const bgGlow = String(o.bgGlow || "").trim();
    if (!accent) {
      throw new Error(`Invalid primary accent for theme “${key}”`);
    }
    if (!accent2) {
      throw new Error(`Invalid secondary accent for theme “${key}”`);
    }
    if (!isSafeCssColorToken(cardBorder)) {
      throw new Error(`Invalid card border for theme “${key}”`);
    }
    if (!isSafeCssColorToken(bgGlow)) {
      throw new Error(`Invalid background glow for theme “${key}”`);
    }
    themes[key] = { accent, accent2, cardBorder, bgGlow };
  }

  return { nav, themes };
}

/** @param {string} repoRoot */
export function resetOperatorChrome(repoRoot) {
  try {
    fs.unlinkSync(operatorChromeFile(repoRoot));
  } catch {
    /* absent */
  }
}

/**
 * @param {string} repoRoot
 * @param {{ nav: object, themes: object }} merged
 */
export function persistMinimizedChrome(repoRoot, merged, surface) {
  const minimal = minimizeOverrides(merged, surface);
  ensureDataDir(repoRoot);
  const p = operatorChromeFile(repoRoot);
  if (Object.keys(minimal).length <= 1) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* absent */
    }
    return;
  }
  fs.writeFileSync(p, `${JSON.stringify(minimal, null, 2)}\n`, "utf8");
}

/**
 * @param {{ nav: Record<string, { icon: string, chipAccent: string }>, themes: Record<string, { accent: string, accent2: string, cardBorder: string, bgGlow: string }> }} effective
 */
export function buildOperatorChromeStylesheet(effective) {
  const lines = [
    "/* operator-chrome.v1 — merged tokens; load after design-system.css */",
    ""
  ];
  for (const key of THEME_KEYS) {
    const t = effective.themes[key];
    lines.push(`body[data-theme="${key}"] {`);
    lines.push(`  --accent: ${t.accent};`);
    lines.push(`  --accent-2: ${t.accent2};`);
    lines.push(`  --card-border: ${t.cardBorder};`);
    lines.push(
      `  background: radial-gradient(circle at top right, ${t.bgGlow}, transparent 34%), linear-gradient(180deg, #04070d 0%, #070b14 55%, #03060b 100%);`
    );
    lines.push("}");
    lines.push("");
  }
  for (const key of NAV_KEYS) {
    const dest = NAV_TO_DEST[key];
    lines.push(`.nav-chip.nav-dest-${dest} { --chip-accent: ${effective.nav[key].chipAccent}; }`);
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * @param {(p: string) => string} browserPathForNormalized
 * @param {{ nav: Record<string, { icon: string }> }} effective
 */
export function navPathsForBrowser(effective, browserPathForNormalized) {
  return {
    navIconAppsPath: browserPathForNormalized(effective.nav.apps.icon),
    navIconToolsPath: browserPathForNormalized(effective.nav.tools.icon),
    navIconDashboardPath: browserPathForNormalized(effective.nav.dashboard.icon),
    navIconKnowmorePath: browserPathForNormalized(effective.nav.knowmore.icon),
    navIconAdminPath: browserPathForNormalized(effective.nav.admin.icon)
  };
}
