#!/usr/bin/env node
/**
 * Validates a MeiMei external app manifest against schemas/meimei.app.manifest.v1.json.
 *
 * Usage:
 *   node scripts/validate-meimei-app-manifest.mjs
 *   node scripts/validate-meimei-app-manifest.mjs path/to/meimei.app.json
 *
 * @see docs/planning/kernel-app-separation-and-https-program.v1.md (MM-KERNEL-201)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadManifestSchemaSync,
  validateManifestAgainstSchema
} from "../dashboard/lib/meimei-app-manifest-validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultManifestPath = path.join(
  repoRoot,
  "docs",
  "planning",
  "examples",
  "meimei.app.example.json"
);

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`PASS: ${msg}`);
}

function main() {
  const manifestPath = path.resolve(repoRoot, process.argv[2] || defaultManifestPath);

  if (!fs.existsSync(manifestPath)) {
    fail(`manifest not found: ${manifestPath}`);
    return;
  }

  let schema;
  let manifest;
  try {
    schema = loadManifestSchemaSync(repoRoot);
  } catch (e) {
    fail(`schema load failed: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (e) {
    fail(`invalid manifest JSON: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const errors = validateManifestAgainstSchema(schema, manifest, "$");
  if (errors.length) {
    for (const line of errors) console.error(line);
    fail(`meimei app manifest validation: ${errors.length} error(s) for ${manifestPath}`);
    return;
  }
  ok(`meimei app manifest OK — ${path.relative(repoRoot, manifestPath)}`);
}

main();
