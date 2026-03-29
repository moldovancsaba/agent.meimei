/**
 * External app launchers for the Apps catalog (not kernel dispatch / not meimei.app.json).
 * @see functions/external-launchers.v1.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "../..");

const LOOPBACK_HOSTS = new Set(["127.0.0.1", "localhost", "::1"]);

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isLoopbackLauncherHost(host) {
  const h = String(host || "").toLowerCase().trim();
  return LOOPBACK_HOSTS.has(h);
}

/**
 * @param {string} urlStr
 * @returns {{ ok: boolean, reason?: string }}
 */
export function validateLauncherLaunchUrl(urlStr) {
  let u;
  try {
    u = new URL(String(urlStr).trim());
  } catch {
    return { ok: false, reason: "invalid URL" };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return { ok: false, reason: "only http and https are allowed" };
  }
  if (!isLoopbackLauncherHost(u.hostname)) {
    return { ok: false, reason: "launchUrl host must be 127.0.0.1, localhost, or ::1" };
  }
  return { ok: true };
}

/**
 * @param {unknown} raw
 * @param {string} repoRoot
 * @returns {{ launchers: object[] }}
 */
export function normalizeExternalLaunchers(raw, repoRoot) {
  if (!raw || typeof raw !== "object") {
    return { launchers: [] };
  }
  const launchersIn = Array.isArray(raw.launchers) ? raw.launchers : [];
  /** @type {object[]} */
  const launchers = [];
  for (const row of launchersIn) {
    if (!row || typeof row !== "object") continue;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    const displayName = typeof row.displayName === "string" ? row.displayName.trim() : "";
    const launchUrl = typeof row.launchUrl === "string" ? row.launchUrl.trim() : "";
    if (!id || !displayName || !launchUrl) continue;
    const v = validateLauncherLaunchUrl(launchUrl);
    if (!v.ok) {
      console.warn(
        `[external-launchers] skip "${id}": launchUrl ${v.reason || "rejected"} (${launchUrl})`
      );
      continue;
    }
    const description = typeof row.description === "string" ? row.description : "";
    const catalogOrder =
      typeof row.catalogOrder === "number" && Number.isFinite(row.catalogOrder)
        ? row.catalogOrder
        : 999;
    let healthUrl = typeof row.healthUrl === "string" ? row.healthUrl.trim() : "";
    if (healthUrl) {
      const hv = validateLauncherLaunchUrl(healthUrl);
      if (!hv.ok) {
        console.warn(`[external-launchers] skip healthUrl for "${id}": ${hv.reason || "rejected"}`);
        healthUrl = "";
      }
    }
    launchers.push({
      id,
      displayName,
      description,
      catalogOrder,
      launchUrl,
      healthUrl
    });
  }
  launchers.sort((a, b) => {
    if (a.catalogOrder !== b.catalogOrder) return a.catalogOrder - b.catalogOrder;
    return String(a.displayName).localeCompare(String(b.displayName));
  });
  void repoRoot;
  return { launchers };
}

/**
 * @param {string} [repoRoot]
 * @returns {{ launchers: object[] }}
 */
export function loadExternalLaunchersSync(repoRoot = DEFAULT_REPO_ROOT) {
  const p = path.join(repoRoot, "functions", "external-launchers.v1.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    return normalizeExternalLaunchers(JSON.parse(raw), repoRoot);
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") {
      return { launchers: [] };
    }
    console.warn("[external-launchers] failed to load:", e instanceof Error ? e.message : e);
    return { launchers: [] };
  }
}
