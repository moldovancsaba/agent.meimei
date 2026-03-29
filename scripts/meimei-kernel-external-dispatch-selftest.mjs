#!/usr/bin/env node
/**
 * Exercises kernel-external-app-dispatch without starting HTTP (MM-KERNEL-501).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { clearKernelExternalHandlerCache, tryKernelExternalAppPost } from "../dashboard/lib/kernel-external-app-dispatch.mjs";
import { registerKernelApp } from "../dashboard/lib/kernel-app-registry.mjs";

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
  const prevExt = process.env.MEIMEI_KERNEL_EXTERNAL_APPS;
  const prevReg = process.env.MEIMEI_KERNEL_APP_REGISTRY;
  process.env.MEIMEI_KERNEL_EXTERNAL_APPS = "1";

  const base = fs.mkdtempSync(path.join(os.tmpdir(), "meimei-kernel-dispatch-"));
  const regFile = path.join(base, "registry.json");
  process.env.MEIMEI_KERNEL_APP_REGISTRY = regFile;

  const appDir = path.join(base, "app");
  fs.mkdirSync(appDir, { recursive: true });

  const manifest = {
    schemaVersion: 1,
    name: "kernel-dispatch-selftest",
    displayName: "Dispatch selftest",
    description: "MM-KERNEL-501 automated test stub.",
    version: "0.0.1",
    entry: { module: "./index.mjs", export: "handleApi" },
    api: { method: "POST", pathSuffix: "kernel-dispatch-selftest" },
    capabilities: { required: ["inference"] }
  };

  fs.writeFileSync(
    path.join(appDir, "meimei.app.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  fs.writeFileSync(
    path.join(appDir, "index.mjs"),
    `export async function handleApi(req, body, repoRoot) {
  return { ok: true, kernel_external_app: true, got: body };
}
`,
    "utf8"
  );

  clearKernelExternalHandlerCache();
  await registerKernelApp(repoRoot, appDir, { registryPath: regFile, audit: false });

  const readJson = async () => ({ ping: 1 });
  const out = await tryKernelExternalAppPost(
    repoRoot,
    "/api/functions/kernel-dispatch-selftest",
    /** @type {import("node:http").IncomingMessage} */ ({}),
    readJson
  );

  if (!out || out.status !== 200 || !out.payload?.ok || !out.payload?.kernel_external_app) {
    fail(`unexpected dispatch result: ${JSON.stringify(out)}`);
  }
  if (out.payload.got?.ping !== 1) fail("body not passed to handler");

  process.env.MEIMEI_KERNEL_EXTERNAL_APPS = "";
  const skipped = await tryKernelExternalAppPost(
    repoRoot,
    "/api/functions/kernel-dispatch-selftest",
    {},
    readJson
  );
  if (skipped !== null) fail("expected null when MEIMEI_KERNEL_EXTERNAL_APPS unset");

  if (prevExt === undefined) delete process.env.MEIMEI_KERNEL_EXTERNAL_APPS;
  else process.env.MEIMEI_KERNEL_EXTERNAL_APPS = prevExt;
  if (prevReg === undefined) delete process.env.MEIMEI_KERNEL_APP_REGISTRY;
  else process.env.MEIMEI_KERNEL_APP_REGISTRY = prevReg;

  clearKernelExternalHandlerCache();
  fs.rmSync(base, { recursive: true, force: true });
  ok("kernel-external-app-dispatch selftest");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
