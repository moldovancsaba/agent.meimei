/**
 * MM-KERNEL-601 — merge `functions/registry.v1.json` catalog with kernel-only apps
 * (builtins / registry file) not present in the legacy registry.
 */
import { buildDashboardCatalog } from "./miniapp-registry.mjs";
import { listBuiltinKernelApps } from "./kernel-builtin-apps.mjs";
import { listKernelApps, defaultKernelAppRegistryPath } from "./kernel-app-registry.mjs";

function regPath() {
  const env = String(process.env.MEIMEI_KERNEL_APP_REGISTRY || "").trim();
  return env || undefined;
}

function kernelCardFromManifest(app, source) {
  const id = app.manifest?.name;
  const r = app.manifest.routes || {};
  const issueId = typeof r.dashboardIssueId === "number" ? r.dashboardIssueId : 0;
  const slug = typeof r.slug === "string" && r.slug ? r.slug : "App";
  const internalPath = issueId ? `/${issueId}/${slug}` : `/kernel/${String(app.app_id).slice(0, 8)}`;
  return {
    issueId,
    name: app.manifest.displayName || id,
    route: internalPath,
    description: app.manifest.description || "",
    catalogOrder: source === "builtin" ? 996 : 995,
    internalPath,
    id,
    category: "apps",
    kernelCatalogSource: source
  };
}

/**
 * @param {string} repoRoot
 * @param {object} registry parsed registry.v1.json
 * @returns {object[]} catalog cards (same shape as buildDashboardCatalog)
 */
export function mergeCatalogWithKernelApps(repoRoot, registry) {
  const base = buildDashboardCatalog(registry);
  const byId = new Map(base.map((c) => [c.id, c]));

  for (const app of listBuiltinKernelApps(repoRoot)) {
    const id = app.manifest?.name;
    if (!id || byId.has(id)) continue;
    byId.set(id, kernelCardFromManifest(app, "builtin"));
  }

  const regFile = regPath() || defaultKernelAppRegistryPath(repoRoot);
  try {
    for (const app of listKernelApps(repoRoot, regFile)) {
      const id = app.manifest?.name;
      if (!id || !app.enabled || byId.has(id)) continue;
      byId.set(id, kernelCardFromManifest(app, "registry"));
    }
  } catch {
    /* missing or invalid registry file */
  }

  const out = [...byId.values()];
  out.sort((a, b) => {
    if (a.catalogOrder !== b.catalogOrder) return a.catalogOrder - b.catalogOrder;
    return a.issueId - b.issueId;
  });
  return out;
}
