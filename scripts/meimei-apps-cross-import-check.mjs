#!/usr/bin/env node
/**
 * Phase 0 guard: no `apps/<id>` module may import another app's package (only `dashboard/lib` or same app).
 * @see docs/architecture/meimei-repo-boundaries.v1.md §1–2
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const appsRoot = path.join(repoRoot, "apps");

function walkDir(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, name.name);
    if (name.isDirectory()) walkDir(p, out);
    else if (name.isFile() && p.endsWith(".mjs")) out.push(p);
  }
  return out;
}

const importRe = /\bfrom\s+["']([^"']+)["']/g;

const violations = [];
for (const file of walkDir(appsRoot)) {
  const currentApp = path.relative(appsRoot, file).split(path.sep)[0];
  if (!currentApp) continue;
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = importRe.exec(text)) !== null) {
    const spec = m[1];
    if (spec.startsWith("node:")) continue;
    if (spec.startsWith("/")) continue;
    const resolved = path.resolve(path.dirname(file), spec);
    const relToApps = path.relative(appsRoot, resolved);
    if (relToApps.startsWith("..")) continue;
    if (!relToApps) continue;
    const targetApp = relToApps.split(path.sep)[0];
    if (targetApp && targetApp !== currentApp) {
      violations.push({ file: path.relative(repoRoot, file), spec, targetApp, currentApp });
    }
  }
}

if (violations.length) {
  console.error("meimei-apps-cross-import-check: forbidden cross-app imports:");
  for (const v of violations) {
    console.error(`  ${v.file}: "${v.spec}" → apps/${v.targetApp} (owner apps/${v.currentApp})`);
  }
  process.exit(1);
}
console.log("meimei-apps-cross-import-check: ok (no apps/* → apps/* imports)");
