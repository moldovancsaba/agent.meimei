#!/usr/bin/env node
/**
 * MM-KERNEL-604 — emit a JSON snapshot of kernel registry rows + embedded manifest copies (operator / audit).
 * Usage: node scripts/meimei-registry-manifest-snapshot.mjs [registry.json path]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadKernelAppRegistrySync, defaultKernelAppRegistryPath } from "../dashboard/lib/kernel-app-registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const regArg = process.argv[2];
const regPath = regArg ? path.resolve(regArg) : defaultKernelAppRegistryPath(repoRoot);

if (!fs.existsSync(regPath)) {
  console.error(`Registry not found: ${regPath}`);
  process.exit(1);
}

const state = loadKernelAppRegistrySync(repoRoot, regPath);
const snapshot = {
  snapshot_at: new Date().toISOString(),
  registry_path: regPath,
  apps: state.apps.map((a) => ({
    app_id: a.app_id,
    enabled: a.enabled,
    install_path: a.install_path,
    manifest_sha256: a.manifest_sha256,
    registered_at_ms: a.registered_at_ms,
    updated_at_ms: a.updated_at_ms,
    has_auth_secret: Boolean(a.auth_secret_sha256),
    policy: a.policy && typeof a.policy === "object" ? a.policy : undefined,
    manifest: a.manifest
  })),
  tombstones: state.tombstones || []
};

process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
