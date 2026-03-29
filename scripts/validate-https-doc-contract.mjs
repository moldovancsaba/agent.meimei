#!/usr/bin/env node
/**
 * Machine checks that core HTTPS documentation stays aligned (TLS-061 baseline).
 * Does not start servers — complements future TLS-060 live HTTPS smoke on macOS.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function ok(msg) {
  console.log(`PASS: ${msg}`);
}

/** @param {string} rel */
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const checks = [
  {
    id: "adr-003-accepted",
    file: "docs/architecture/adr/ADR-003-tls-termination-v1.md",
    needles: ["**Status:** Accepted", "meimei-domain"]
  },
  {
    id: "topology",
    file: "docs/architecture/meimei-https-topology.v1.md",
    needles: ["Operator-facing path (canonical)", "upstream", "https://"]
  },
  {
    id: "runbook-https",
    file: "docs/operations/runbook.md",
    needles: ["https://meimei.localhost:8443", "NODE_EXTRA_CA_CERTS", "upstream HTTP"]
  },
  {
    id: "readme-canonical",
    file: "README.md",
    needles: ["https://meimei.localhost:8443/dashboard/", "meimei-https-topology.v1.md"]
  },
  {
    id: "miniapp-ingress",
    file: "docs/architecture/miniapp-contract-v1.md",
    needles: ["## Ingress", "HTTPS"]
  },
  {
    id: "health-shape-server",
    file: "dashboard/server.mjs",
    needles: ["public_https", "operator_url", "termination:", "transport: \"node-http\""]
  }
];

function main() {
  let bad = false;
  for (const c of checks) {
    const p = path.join(root, c.file);
    if (!fs.existsSync(p)) {
      console.error(`FAIL: missing ${c.file}`);
      bad = true;
      continue;
    }
    const text = read(c.file);
    for (const n of c.needles) {
      if (!text.includes(n)) {
        console.error(`FAIL: ${c.id} — ${c.file} must include: ${JSON.stringify(n)}`);
        bad = true;
      }
    }
  }
  if (bad) {
    fail("validate-https-doc-contract: one or more checks failed");
    return;
  }
  ok("validate-https-doc-contract — core HTTPS docs and health shape present");
}

main();
