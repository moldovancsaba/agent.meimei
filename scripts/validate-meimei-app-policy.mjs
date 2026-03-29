#!/usr/bin/env node
/**
 * Validates policy JSON against schemas/meimei.app.policy.v1.json (MM-KERNEL-302).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateMeimeiAppPolicyObject } from "../dashboard/lib/meimei-app-policy-validate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const defaultPath = path.join(repoRoot, "docs", "planning", "examples", "meimei.app.policy.example.json");

const p = path.resolve(repoRoot, process.argv[2] || defaultPath);
if (!fs.existsSync(p)) {
  console.error(`FAIL: not found: ${p}`);
  process.exit(1);
}
let policy;
try {
  policy = JSON.parse(fs.readFileSync(p, "utf8"));
} catch (e) {
  console.error(`FAIL: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
const errors = validateMeimeiAppPolicyObject(repoRoot, policy);
if (errors.length) {
  for (const line of errors) console.error(line);
  process.exit(1);
}
console.log(`PASS: meimei app policy OK — ${path.relative(repoRoot, p)}`);
