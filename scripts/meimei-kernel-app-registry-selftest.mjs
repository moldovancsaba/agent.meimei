#!/usr/bin/env node
/**
 * Self-test for kernel-app-registry (temp dirs + temp registry file; no audit writes).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  listKernelApps,
  loadKernelAppRegistrySync,
  registerKernelApp,
  removeKernelApp,
  setKernelAppEnabled
} from "../dashboard/lib/kernel-app-registry.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`PASS: ${msg}`);
}

async function main() {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "meimei-kernel-reg-"));
  const regFile = path.join(base, "registry.json");
  const appA = path.join(base, "app-a");
  const appB = path.join(base, "app-b");
  fs.mkdirSync(appA, { recursive: true });
  fs.mkdirSync(appB, { recursive: true });

  const example = JSON.parse(
    fs.readFileSync(
      path.join(repoRoot, "docs", "planning", "examples", "meimei.app.example.json"),
      "utf8"
    )
  );

  const manA = {
    ...example,
    name: "selftest-app-a",
    api: { ...example.api, pathSuffix: "selftest-app-a" }
  };
  const manB = {
    ...example,
    name: "selftest-app-b",
    api: { ...example.api, pathSuffix: "selftest-app-b" }
  };

  fs.writeFileSync(path.join(appA, "meimei.app.json"), JSON.stringify(manA, null, 2), "utf8");
  fs.writeFileSync(path.join(appB, "meimei.app.json"), JSON.stringify(manB, null, 2), "utf8");

  const opts = { registryPath: regFile, audit: false };

  const r1 = await registerKernelApp(repoRoot, appA, opts);
  if (!r1.created || !r1.app_id) fail("first register should create");
  const r2 = await registerKernelApp(repoRoot, appB, opts);
  if (!r2.created) fail("second register should create");

  let apps = listKernelApps(repoRoot, regFile);
  if (apps.length !== 2) fail(`expected 2 apps, got ${apps.length}`);

  const r1b = await registerKernelApp(repoRoot, appA, opts);
  if (r1b.created || r1b.app_id !== r1.app_id) fail("re-register same path should update, same id");

  setKernelAppEnabled(repoRoot, r2.app_id, false, { registryPath: regFile });
  apps = listKernelApps(repoRoot, regFile);
  const b = apps.find((a) => a.app_id === r2.app_id);
  if (!b || b.enabled !== false) fail("disable failed");

  setKernelAppEnabled(repoRoot, r2.app_id, true, { registryPath: regFile });

  await removeKernelApp(repoRoot, r2.app_id, { ...opts, reason: "selftest" });
  apps = listKernelApps(repoRoot, regFile);
  if (apps.length !== 1) fail("after remove one app, expected 1 active");

  const state = loadKernelAppRegistrySync(repoRoot, regFile);
  if (state.tombstones.length !== 1) fail("expected one tombstone");
  if (state.tombstones[0].app_id !== r2.app_id) fail("tombstone app_id mismatch");

  fs.rmSync(base, { recursive: true, force: true });
  ok("kernel-app-registry selftest");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
