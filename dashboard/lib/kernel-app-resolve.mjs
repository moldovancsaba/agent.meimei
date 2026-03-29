/**
 * Resolve a kernel app row by immutable app_id (registry file + builtins).
 */
import { listKernelApps } from "./kernel-app-registry.mjs";
import { listBuiltinKernelApps } from "./kernel-builtin-apps.mjs";

function registryPathOverride() {
  const env = String(process.env.MEIMEI_KERNEL_APP_REGISTRY || "").trim();
  return env || undefined;
}

/**
 * @param {string} repoRoot
 * @param {string} appId
 * @returns {object | null}
 */
export function findKernelAppMatchByAppId(repoRoot, appId) {
  const want = String(appId || "").trim().toLowerCase();
  if (!want) return null;
  const regPath = registryPathOverride();
  for (const a of listKernelApps(repoRoot, regPath)) {
    if (String(a.app_id).toLowerCase() === want) return a;
  }
  for (const a of listBuiltinKernelApps(repoRoot)) {
    if (String(a.app_id).toLowerCase() === want) return a;
  }
  return null;
}
