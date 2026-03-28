/**
 * Agent.Chappie (checklist repo) — local Python worker bridge for MeiMei.
 * Proxies HTTP to worker_bridge.py (SQLite brain, BI, job queue) and optionally spawns the worker.
 * Online Next.js app + Neon: unchanged — point AGENT_API_BASE_URL at the MeiMei proxy URL when needed.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

export const AGENT_CHAPPIE_BRIDGE_PREFIX = "/api/agent-chappie/bridge";

/** @typedef {{ root: string; host: string; port: number; secret: string; autoStart: boolean; python: string; dbPath: string | null; databaseUrl: string }} AgentChappieRuntimeConfig */

let workerChild = null;
let ensureInFlight = null;
let shutdownHooksRegistered = false;

function registerShutdownHooks() {
  if (shutdownHooksRegistered) return;
  shutdownHooksRegistered = true;
  const stop = () => {
    if (!workerChild || workerChild.killed) return;
    try {
      workerChild.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };
  process.on("exit", stop);
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

/**
 * @param {string} repoRoot MeiMei repo root (for default data dir hint only)
 * @returns {AgentChappieRuntimeConfig}
 */
export function getAgentChappieConfig(repoRoot) {
  const root = String(process.env.MEIMEI_AGENT_CHAPPIE_ROOT || "").trim();
  const host = String(process.env.MEIMEI_AGENT_CHAPPIE_WORKER_HOST || process.env.AGENT_WORKER_HOST || "127.0.0.1").trim() || "127.0.0.1";
  const port = Number(process.env.MEIMEI_AGENT_CHAPPIE_WORKER_PORT || process.env.AGENT_WORKER_PORT || 8787);
  const secret = String(
    process.env.MEIMEI_AGENT_CHAPPIE_SHARED_SECRET || process.env.AGENT_SHARED_SECRET || ""
  ).trim();
  const autoStart = String(process.env.MEIMEI_AGENT_CHAPPIE_AUTO_START || "").trim() === "1";
  const python = String(process.env.MEIMEI_AGENT_CHAPPIE_PYTHON || "python3").trim() || "python3";
  const dbOverride = String(process.env.MEIMEI_AGENT_CHAPPIE_DB_PATH || process.env.AGENT_LOCAL_DB_PATH || "").trim();
  const databaseUrl = String(
    process.env.MEIMEI_AGENT_CHAPPIE_DATABASE_URL || process.env.DATABASE_URL || ""
  ).trim();
  const dataDir = path.join(repoRoot, "data", "agent-chappie");
  const meimeiFallbackDb = path.join(dataDir, "agent_brain.sqlite3");
  return {
    root,
    host,
    port: Number.isFinite(port) ? port : 8787,
    secret,
    autoStart,
    python,
    dbPath: dbOverride || null,
    databaseUrl,
    meimeiFallbackDb
  };
}

export function workerScriptPath(root) {
  return path.join(root, "scripts", "worker_bridge.py");
}

export function workerScriptExists(root) {
  try {
    return fs.existsSync(workerScriptPath(root));
  } catch {
    return false;
  }
}

/**
 * @param {number} port
 * @param {string} host
 * @returns {Promise<{ ok: boolean; status?: number; body?: unknown; error?: string }>}
 */
export function probeWorkerHealth(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: host,
        port,
        path: "/health",
        method: "GET",
        timeout: 2500
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          try {
            resolve({
              ok: res.statusCode === 200,
              status: res.statusCode,
              body: raw ? JSON.parse(raw) : {}
            });
          } catch {
            resolve({ ok: false, status: res.statusCode, error: "invalid_json", raw: raw.slice(0, 200) });
          }
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, error: "timeout" });
    });
    req.on("error", (e) => {
      resolve({ ok: false, error: e instanceof Error ? e.message : String(e) });
    });
    req.end();
  });
}

function buildWorkerEnv(cfg, dashboardPort) {
  const gw = `http://127.0.0.1:${dashboardPort}/api/llm/gateway/generate`;
  const env = { ...process.env };
  env.AGENT_WORKER_HOST = cfg.host;
  env.AGENT_WORKER_PORT = String(cfg.port);
  if (cfg.secret) env.AGENT_SHARED_SECRET = cfg.secret;
  if (cfg.databaseUrl) env.DATABASE_URL = cfg.databaseUrl;
  env.OLLAMA_URL = gw;
  const gatewaySecret = String(process.env.MEIMEI_LLM_GATEWAY_SECRET || "").trim();
  if (gatewaySecret) env.MEIMEI_LLM_GATEWAY_SECRET = gatewaySecret;
  if (cfg.dbPath) env.AGENT_LOCAL_DB_PATH = cfg.dbPath;
  return env;
}

/**
 * @param {AgentChappieRuntimeConfig} cfg
 * @param {number} dashboardPort
 */
async function spawnWorkerProcess(cfg, dashboardPort) {
  if (!cfg.root || !workerScriptExists(cfg.root)) {
    return { ok: false, error: "MEIMEI_AGENT_CHAPPIE_ROOT missing or scripts/worker_bridge.py not found" };
  }
  if (!cfg.secret) {
    return { ok: false, error: "MEIMEI_AGENT_CHAPPIE_SHARED_SECRET (or AGENT_SHARED_SECRET) required for auto-start" };
  }
  if (cfg.dbPath) {
    fs.mkdirSync(path.dirname(cfg.dbPath), { recursive: true });
  } else {
    fs.mkdirSync(path.join(cfg.root, "runtime_status"), { recursive: true });
  }
  const script = workerScriptPath(cfg.root);
  const child = spawn(cfg.python, [script], {
    cwd: cfg.root,
    env: buildWorkerEnv(cfg, dashboardPort),
    stdio: "ignore",
    detached: false
  });
  workerChild = child;
  registerShutdownHooks();
  child.on("exit", (code, signal) => {
    if (workerChild === child) workerChild = null;
    void code;
    void signal;
  });
  child.on("error", () => {
    if (workerChild === child) workerChild = null;
  });
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 250));
    const h = await probeWorkerHealth(cfg.port, cfg.host);
    if (h.ok) return { ok: true, pid: child.pid };
  }
  return { ok: false, error: "worker did not become healthy in time", pid: child.pid };
}

/**
 * @param {AgentChappieRuntimeConfig} cfg
 * @param {number} dashboardPort
 */
export async function ensureWorkerRunning(cfg, dashboardPort) {
  if (!cfg.autoStart) return { ok: false, reason: "auto_start_disabled" };
  const h = await probeWorkerHealth(cfg.port, cfg.host);
  if (h.ok) return { ok: true, reason: "already_running", health: h };
  if (!cfg.root) return { ok: false, reason: "no_root" };
  if (ensureInFlight) return ensureInFlight;
  ensureInFlight = (async () => {
    try {
      return await spawnWorkerProcess(cfg, dashboardPort);
    } finally {
      ensureInFlight = null;
    }
  })();
  return ensureInFlight;
}

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {number} [limit]
 * @returns {Promise<Buffer>}
 */
export function readRawBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (chunk) => {
      n += chunk.length;
      if (n > limit) {
        reject(new Error("Request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function pathNeedsWorkerSecret(method, pathNoQuery) {
  if (method === "GET" && pathNoQuery === "/health") return false;
  return true;
}

/**
 * Forward to Agent.Chappie worker (localhost).
 * @param {{
 *   cfg: AgentChappieRuntimeConfig;
 *   method: string;
 *   pathWithQuery: string;
 *   body: Buffer;
 *   contentType?: string;
 * }} opts
 */
export function forwardToWorker(opts) {
  const { cfg, method, pathWithQuery, body, contentType } = opts;
  const pathNoQuery = pathWithQuery.split("?")[0] || "/";
  const headers = {};
  if (pathNeedsWorkerSecret(method, pathNoQuery) && cfg.secret) {
    headers["x-agent-shared-secret"] = cfg.secret;
  }
  if (body && body.length > 0) {
    headers["Content-Length"] = String(body.length);
    if (contentType) headers["Content-Type"] = contentType;
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: cfg.host,
        port: cfg.port,
        path: pathWithQuery,
        method,
        headers,
        timeout: 120_000
      },
      (upstream) => {
        const chunks = [];
        upstream.on("data", (c) => chunks.push(c));
        upstream.on("end", () => {
          resolve({
            statusCode: upstream.statusCode || 502,
            headers: upstream.headers,
            body: Buffer.concat(chunks)
          });
        });
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("worker_timeout"));
    });
    req.on("error", reject);
    if (body && body.length > 0) req.write(body);
    req.end();
  });
}

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade"
]);

/**
 * @param {import("node:http").IncomingHttpHeaders} h
 */
export function filterForwardResponseHeaders(h) {
  /** @type {Record<string, string | string[]>} */
  const out = {};
  for (const [k, v] of Object.entries(h)) {
    if (!k || v === undefined) continue;
    const lk = k.toLowerCase();
    if (HOP_BY_HOP.has(lk)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * @param {string} repoRoot
 * @param {number} dashboardPort
 */
export async function getAgentChappieRuntimeSummary(repoRoot, dashboardPort) {
  const cfg = getAgentChappieConfig(repoRoot);
  const scriptOk = cfg.root ? workerScriptExists(cfg.root) : false;
  const health = await probeWorkerHealth(cfg.port, cfg.host);
  const localDb =
    cfg.dbPath ||
    (cfg.root ? path.join(cfg.root, "runtime_status", "agent_brain.sqlite3") : cfg.meimeiFallbackDb);
  return {
    configured: Boolean(cfg.root && scriptOk),
    checklistRepoRoot: cfg.root || null,
    workerScriptPresent: scriptOk,
    workerHost: cfg.host,
    workerPort: cfg.port,
    workerReachable: health.ok,
    workerHealth: health,
    localDbPath: localDb,
    onlineDatabaseConfigured: Boolean(cfg.databaseUrl),
    autoStart: cfg.autoStart,
    sharedSecretConfigured: Boolean(cfg.secret),
    bridgePath: AGENT_CHAPPIE_BRIDGE_PREFIX,
    ollamaViaMeiMeiGateway: `http://127.0.0.1:${dashboardPort}/api/llm/gateway/generate`
  };
}
