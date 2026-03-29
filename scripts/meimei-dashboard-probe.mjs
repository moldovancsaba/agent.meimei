#!/usr/bin/env node
/**
 * Check whether the MeiMei dashboard responds (reads port from config/dashboard-surface.v1.json or PORT).
 *
 * Default: GET http://<bindHost>:<port>/ (upstream Node).
 * TLS mode: MEIMEI_PROBE_TLS=1 → GET https://<MEIMEI_PUBLIC_HOST>:8443/dashboard/api/health
 *   Trust: NODE_EXTRA_CA_CERTS=$HOME/.openclaw/certs/meimei.localhost.crt
 *   Or install cert into macOS keychain (npm run cert:install).
 */
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readSurfaceJsonSync,
  normalizeDashboardListenCandidate
} from "../config/dashboard-listen-normalize.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const surface = readSurfaceJsonSync(root);
const bindHost = surface.server?.bindHost || "127.0.0.1";
const port = normalizeDashboardListenCandidate(surface, process.env.PORT);

const publicHost = String(process.env.MEIMEI_PUBLIC_HOST || "meimei.localhost").trim() || "meimei.localhost";
const tlsPort = Number(process.env.MEIMEI_PUBLIC_TLS_PORT || 8443) || 8443;
const publicPrefix = String(process.env.MEIMEI_PUBLIC_PREFIX || "/dashboard").replace(/\/+$/, "") || "/dashboard";

function defaultCa() {
  const p = path.join(process.env.HOME || "", ".openclaw", "certs", "meimei.localhost.crt");
  try {
    if (fs.existsSync(p)) return fs.readFileSync(p);
  } catch {
    /* ignore */
  }
  return null;
}

function probeHttp(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http;
    const u = new URL(url);
    const req = lib.request(
      {
        hostname: u.hostname,
        port: u.port || (url.startsWith("https:") ? 443 : 80),
        path: u.pathname + u.search,
        method: "GET",
        timeout: 3000,
        ...options
      },
      (res) => {
        console.log(`OK — dashboard responded ${res.statusCode} at ${url}`);
        resolve();
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const tls = String(process.env.MEIMEI_PROBE_TLS || "").trim() === "1";
  if (tls) {
    const url = `https://${publicHost}:${tlsPort}${publicPrefix}/api/health`;
    const ca = process.env.NODE_EXTRA_CA_CERTS
      ? fs.readFileSync(process.env.NODE_EXTRA_CA_CERTS)
      : defaultCa();
    try {
      await probeHttp(url, ca ? { ca } : {});
      process.exit(0);
    } catch (e) {
      console.error(`FAIL — ${url} — ${e instanceof Error ? e.message : String(e)}`);
      console.error(`Ensure meimei-domain is running and trust the cert (NODE_EXTRA_CA_CERTS or keychain).`);
      process.exit(1);
    }
    return;
  }

  const url = `http://${bindHost}:${port}/`;
  const req = http.request(
    { hostname: bindHost, port, path: "/", method: "GET", timeout: 3000 },
    (res) => {
      console.log(`OK — dashboard responded ${res.statusCode} at ${url}`);
      process.exit(0);
    }
  );
  req.on("timeout", () => {
    req.destroy();
    console.error(`FAIL — no response from ${url} (timeout)`);
    console.error(`Start the server:  cd ${root} && npm run dashboard`);
    console.error(`Or LaunchAgent:      ./scripts/meimei-domain install`);
    process.exit(1);
  });
  req.on("error", (e) => {
    console.error(`FAIL — ${url} — ${e.message}`);
    console.error(`Start the server:  cd ${root} && npm run dashboard`);
    console.error(`Check logs:         tail -50 ~/.meimei/logs/dashboard-ui.err`);
    process.exit(1);
  });
  req.end();
}

main();
