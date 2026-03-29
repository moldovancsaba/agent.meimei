#!/usr/bin/env node
/**
 * Phase 0 guard: exactly one POST branch for checklistApiRoute in dashboard/server.mjs.
 * Companion: `meimei-apps-cross-import-check.mjs` (both run from `npm run boundary:check`).
 * @see docs/architecture/meimei-repo-boundaries.v1.md §4, §6
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const serverPath = path.join(repoRoot, "dashboard", "server.mjs");
const s = fs.readFileSync(serverPath, "utf8");
const re =
  /if\s*\(\s*req\.method\s*===\s*["']POST["']\s*&&\s*normalizedPath\s*===\s*checklistApiRoute\s*\)/g;
const matches = s.match(re) || [];
if (matches.length !== 1) {
  console.error(
    `meimei-repo-boundaries-check: expected exactly 1 POST checklistApiRoute handler in server.mjs, found ${matches.length}`
  );
  process.exit(1);
}
console.log("meimei-repo-boundaries-check: ok (single checklist POST route)");
