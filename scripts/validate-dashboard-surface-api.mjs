/**
 * Ensures every key in config/dashboard-surface.v1.json `api` is referenced
 * from dashboard/server.mjs as `surface.api.<key>` so renamed routes cannot drift silently.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const surfacePath = path.join(root, "config", "dashboard-surface.v1.json");
const serverPath = path.join(root, "dashboard", "server.mjs");

const surface = JSON.parse(fs.readFileSync(surfacePath, "utf8"));
const server = fs.readFileSync(serverPath, "utf8");
const keys = Object.keys(surface.api || {});
const missing = keys.filter((k) => !server.includes(`surface.api.${k}`));

if (missing.length) {
  console.error(
    "FAIL: dashboard/server.mjs must reference surface.api.<key> for each config api entry. Missing:",
    missing.join(", ")
  );
  process.exit(1);
}

console.log("PASS: dashboard-surface api keys wired in server.mjs:", keys.join(", "));
