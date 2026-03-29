/**
 * POST dispatch for apps registered in the kernel external-app registry (MM-KERNEL-501).
 * Opt-in: set MEIMEI_KERNEL_EXTERNAL_APPS=1. Static server routes always win if matched earlier.
 *
 * @see docs/planning/kernel-app-separation-and-https-program.v1.md
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import { listKernelApps } from "./kernel-app-registry.mjs";
import { serverApiPath } from "./miniapp-registry.mjs";

const FUNCTIONS_PREFIX = "/api/functions/";

/** @type {Map<string, { hash: string, fn: Function }>} */
const handlerCache = new Map();

function registryPathOverride() {
  const env = String(process.env.MEIMEI_KERNEL_APP_REGISTRY || "").trim();
  return env || undefined;
}

function externalAppsEnabled() {
  return String(process.env.MEIMEI_KERNEL_EXTERNAL_APPS || "").trim() === "1";
}

/**
 * @param {object} manifest
 * @returns {string|null} normalized server path e.g. /api/functions/my-app
 */
export function normalizedPostPathForExternalManifest(manifest) {
  const suffix = manifest?.api?.pathSuffix;
  if (!suffix || typeof suffix !== "string") return null;
  const full = `/dashboard/api/functions/${suffix}`;
  return serverApiPath(full);
}

/**
 * @param {{ app_id: string, manifest_sha256: string, install_path: string, manifest: object }} match
 */
async function getOrLoadHandler(match) {
  const hash = match.manifest_sha256 || "";
  const cached = handlerCache.get(match.app_id);
  if (cached && cached.hash === hash) return cached.fn;

  const entry = match.manifest?.entry;
  if (!entry || typeof entry.module !== "string") {
    throw new Error("manifest.entry.module missing");
  }
  const modRel = entry.module.replace(/^\.\//, "");
  const modAbs = path.resolve(match.install_path, modRel);
  const url = pathToFileURL(modAbs).href;
  const mod = await import(url);
  const exportName = typeof entry.export === "string" && entry.export ? entry.export : "handleApi";
  const fn = mod[exportName];
  if (typeof fn !== "function") {
    throw new Error(`module does not export function "${exportName}"`);
  }
  handlerCache.set(match.app_id, { hash, fn });
  return fn;
}

/** For self-tests only — clears dynamic import cache. */
export function clearKernelExternalHandlerCache() {
  handlerCache.clear();
}

/**
 * @param {string} repoRoot
 * @param {string} normalizedPath
 * @param {import("node:http").IncomingMessage} req
 * @param {(r: import("node:http").IncomingMessage) => Promise<unknown>} readJson
 * @returns {Promise<{ status: number, payload: object } | null>}
 */
export async function tryKernelExternalAppPost(repoRoot, normalizedPath, req, readJson) {
  if (!externalAppsEnabled()) return null;
  if (!normalizedPath.startsWith(FUNCTIONS_PREFIX)) return null;

  const suffix = normalizedPath.slice(FUNCTIONS_PREFIX.length);
  if (!suffix || suffix.includes("/")) return null;

  const regPath = registryPathOverride();
  const apps = listKernelApps(repoRoot, regPath);
  const match = apps.find((a) => a.enabled && a.manifest?.api?.pathSuffix === suffix);
  if (!match) return null;

  const handler = await getOrLoadHandler(match);
  const body = (await readJson(req)) || {};
  try {
    const result = await handler(req, body, repoRoot);
    const ok = result && typeof result === "object" && result.ok !== false;
    return { status: ok ? 200 : 400, payload: result };
  } catch (e) {
    return {
      status: 500,
      payload: { ok: false, error: e instanceof Error ? e.message : String(e) }
    };
  }
}
