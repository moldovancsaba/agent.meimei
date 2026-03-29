#!/usr/bin/env node
/**
 * MM-KERNEL-604 — align functions/registry.v1.json with each apps/<pkg>/meimei.app.json on disk.
 * See config/kernel-registry-drift-allowlists.v1.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const registryPath = path.join(repoRoot, "functions", "registry.v1.json");
const appsRoot = path.join(repoRoot, "apps");
const allowPath = path.join(repoRoot, "config", "kernel-registry-drift-allowlists.v1.json");

function fail(msg) {
  console.error("FAIL: " + msg);
  process.exit(1);
}

function ok(msg) {
  console.log("PASS: " + msg);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

const allowRaw = readJson(allowPath);
if (allowRaw.version !== 1) {
  fail(path.relative(repoRoot, allowPath) + ": version must be 1");
}

const registryAppsNoDisk = new Set(allowRaw.registryAppsWithoutDiskManifest || []);
const toolsKernel = new Set(allowRaw.registryToolsImplementedInKernel || []);
const diskDeferred = new Set(allowRaw.diskMiniappsDeferredFromRegistry || []);

const registry = readJson(registryPath);
const functions = Array.isArray(registry.functions)
  ? registry.functions
  : fail("registry.functions must be an array");
const registryIds = new Set(functions.map((f) => f.id));

const diskPkgs = [];
for (const name of fs.readdirSync(appsRoot, { withFileTypes: true })) {
  if (!name.isDirectory()) continue;
  const mf = path.join(appsRoot, name.name, "meimei.app.json");
  if (!fs.existsSync(mf)) continue;
  diskPkgs.push(name.name);
}

for (const pkg of diskPkgs) {
  const mf = path.join(appsRoot, pkg, "meimei.app.json");
  let manifest;
  try {
    manifest = readJson(mf);
  } catch (e) {
    fail("apps/" + pkg + "/meimei.app.json: " + (e instanceof Error ? e.message : String(e)));
  }
  const mname = manifest?.name;
  if (typeof mname !== "string" || mname !== pkg) {
    fail(
      "apps/" +
        pkg +
        '/meimei.app.json: manifest.name "' +
        mname +
        '" must equal directory name "' +
        pkg +
        '"'
    );
  }
  if (diskDeferred.has(pkg)) {
    fail("apps/" + pkg + " is listed in diskMiniappsDeferredFromRegistry but exists - remove from allowlist");
  }
  if (!registryIds.has(pkg)) {
    fail(
      "apps/" +
        pkg +
        ' has meimei.app.json but no functions/registry.v1.json entry with id "' +
        pkg +
        '" - add contract row or defer in allowlist'
    );
  }
}

for (const fn of functions) {
  const id = fn.id;
  const cat = fn.category || "apps";

  if (cat === "apps") {
    if (registryAppsNoDisk.has(id)) {
      const mfPath = path.join(appsRoot, id, "meimei.app.json");
      if (fs.existsSync(mfPath)) {
        fail(
          'registry app "' + id + '" is allowlisted as without disk but apps/' + id + "/meimei.app.json exists"
        );
      }
      continue;
    }
    const mfPath = path.join(appsRoot, id, "meimei.app.json");
    if (!fs.existsSync(mfPath)) {
      fail(
        'registry apps entry "' +
          id +
          '" requires apps/' +
          id +
          "/meimei.app.json (or add to registryAppsWithoutDiskManifest)"
      );
    }
  } else if (cat === "tools") {
    if (toolsKernel.has(id)) {
      continue;
    }
    const mfPath = path.join(appsRoot, id, "meimei.app.json");
    if (!fs.existsSync(mfPath)) {
      fail(
        'registry tools entry "' +
          id +
          '" requires apps/' +
          id +
          "/meimei.app.json or registryToolsImplementedInKernel allowlist"
      );
    }
  }

  const mfPath = path.join(appsRoot, id, "meimei.app.json");
  if (!fs.existsSync(mfPath)) continue;

  let manifest;
  try {
    manifest = readJson(mfPath);
  } catch {
    continue;
  }
  const suffix = manifest?.api?.pathSuffix;
  if (typeof suffix !== "string" || suffix !== id) {
    fail(
      "apps/" +
        id +
        '/meimei.app.json: api.pathSuffix must equal registry id "' +
        id +
        '" (got "' +
        suffix +
        '")'
    );
  }
}

ok("kernel registry drift check - registry.v1.json vs apps/*/meimei.app.json");
