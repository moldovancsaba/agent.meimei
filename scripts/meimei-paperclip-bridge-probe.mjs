#!/usr/bin/env node
/**
 * POST smoke for Paperclip → MeiMei webhook (`/api/integrations/paperclip/webhook`).
 *
 * Usage:
 *   npm run paperclip:bridge-probe
 *
 * Requires dashboard running. Uses port from `config/dashboard-surface.v1.json` / PORT.
 * Set MEIMEI_PAPERCLIP_BRIDGE_SECRET to test authenticated path (Ollama must be up for 200).
 */
import http from "node:http";
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
const secret = String(process.env.MEIMEI_PAPERCLIP_BRIDGE_SECRET || "").trim();

function postJson(pathname, headers, bodyObj) {
  const body = JSON.stringify(bodyObj);
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: bindHost,
        port,
        path: pathname,
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body, "utf8"),
          ...headers
        },
        timeout: 120000
      },
      (res) => {
        let data = "";
        res.on("data", (c) => {
          data += c;
        });
        res.on("end", () => {
          resolve({ status: res.statusCode || 0, body: data });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const url = `http://${bindHost}:${port}/api/integrations/paperclip/webhook`;
  console.log(`Probing ${url}`);

  const noAuth = await postJson("/api/integrations/paperclip/webhook", {}, { ping: 1 });
  console.log(`No secret header → HTTP ${noAuth.status}`);
  if (noAuth.status !== 401 && noAuth.status !== 501) {
    console.warn("Expected 401 (wrong/missing secret) or 501 (bridge disabled).");
  }

  if (!secret) {
    console.log("MEIMEI_PAPERCLIP_BRIDGE_SECRET unset — skip authenticated probe.");
    process.exit(0);
  }

  const ok = await postJson(
    "/api/integrations/paperclip/webhook",
    { "x-meimei-paperclip-secret": secret },
    {
      runId: "probe-run",
      agentId: "probe-agent",
      companyId: "probe-co",
      context: { taskId: "probe-issue", wakeReason: "probe" }
    }
  );
  console.log(`With secret → HTTP ${ok.status}`);
  console.log(ok.body.slice(0, 800));
  if (ok.status !== 200) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
