# MeiMei kernel handbook — v1

**Status:** technical reference for developers.  
**Stack:** Node.js **ESM** (`.mjs`), **≥22.5** per [`package.json`](../../package.json).  
**Related:** [meimei-kernel-code-audit.v1.md](../architecture/meimei-kernel-code-audit.v1.md), [meimei-repo-boundaries.v1.md](../architecture/meimei-repo-boundaries.v1.md), [inference-route.v1.md](../api/inference-route.v1.md), [ai-runtime-audit.md](../compliance/ai-runtime-audit.md).

---

## Table of contents

1. [Terminology](#1-terminology)
2. [Boot and process model](#2-boot-and-process-model)
3. [Configuration surface](#3-configuration-surface)
4. [HTTP routing model](#4-http-routing-model)
5. [Registry and function contracts](#5-registry-and-function-contracts)
6. [Inference API (`POST /api/meimei/route`)](#6-inference-api-post-apimeimeiroute)
7. [Job queue and worker](#7-job-queue-and-worker)
8. [LLM primitives (`llm.mjs`)](#8-llm-primitives-llmmjs)
9. [Integrating another platform](#9-integrating-another-platform)
10. [Debugging and observability](#10-debugging-and-observability)
11. [Known limitations and honesty](#11-known-limitations-and-honesty)

---

## 1. Terminology

| Term | Meaning |
|------|---------|
| **Kernel** | Shared runtime: HTTP entry [`dashboard/server.mjs`](../../dashboard/server.mjs), allowlisted [`dashboard/lib/*`](../architecture/meimei-repo-boundaries.v1.md) modules, env store, jobs, inference route, static design system. **Not** a separate npm package today. |
| **Module (miniapp / tool)** | One row in [`functions/registry.v1.json`](../../functions/registry.v1.json) with implementation in [`apps/<id>/index.mjs`](../../apps). |
| **Platform UI** | Home, admin, catalog HTML — often `render*` in server or [`dashboard/lib/platform-pages/`](../../dashboard/lib/platform-pages). |
| **Integration** | External products (e.g. Checklist web) via [`integrations/*`](../../integrations) and bridge modules. |

**Mental model:** Kernel **routes and delegates**; modules **own product rules**.

---

## 2. Boot and process model

1. **Entry:** `npm start` / `npm run dashboard` → `node dashboard/server.mjs`.
2. **Repo root:** Derived from module paths (`import.meta.url`) and runtime helpers from [`dashboard/lib/runtime.mjs`](../../dashboard/lib/runtime.mjs).
3. **Registry:** [`loadRegistrySync()`](../../dashboard/lib/miniapp-registry.mjs) reads `functions/registry.v1.json` at startup.
4. **Job worker:** [`startMeimeiJobWorker`](../../dashboard/lib/meimei-job-worker.mjs) runs **in the same process** as the HTTP server unless `MEIMEI_JOB_WORKER=0`.

There is no mandatory second process for inference; scale-out patterns are **not** part of v1 kernel docs.

---

## 3. Configuration surface

| Layer | Location | Role |
|-------|----------|------|
| Dashboard surface | [`dashboard/lib/dashboard-surface.mjs`](../../dashboard/lib/dashboard-surface.mjs) + [`config/dashboard-surface.v1.json`](../../config/dashboard-surface.v1.json) | Listen target, path prefixes, health route, knowmore pointers |
| Listen normalization | [`config/dashboard-listen-normalize.mjs`](../../config/dashboard-listen-normalize.mjs) | Bind address normalization |
| Page layout | [`dashboard/lib/page-layout.mjs`](../../dashboard/lib/page-layout.mjs) | Merged layout doc, flow HTML, miniapp page keys |
| Operator env | [`dashboard/lib/meimei-env-store.mjs`](../../dashboard/lib/meimei-env-store.mjs) | Persisted JSON `data/meimei-environment.v1.json`, catalog `config/meimei-env-catalog.v1.json` |
| Inference | Env `OLLAMA_HOST`, `MEIMEI_INFERENCE_MAX_CONTEXT` | Ollama base URL, context token guard |

---

## 4. HTTP routing model

All traffic hits **one** `http.createServer` callback in [`dashboard/server.mjs`](../../dashboard/server.mjs) (~L3581+). Processing order is **sequential if-statements** (not a framework router).

**Typical buckets (conceptual):**

1. **Liveness** — `GET` health JSON (fast).
2. **Monitor** — `GET /api/meimei/monitor/feed` — job lineage for System monitor UI.
3. **Inference** — `POST /api/meimei/route` — OpenAI-shaped body → [`handleMeimeiInferenceRoute`](../../dashboard/lib/inference-route.mjs).
4. **Checklist** — Proxy / bridge paths (integration).
5. **Static** — Files under [`public/`](../../public) with path traversal guard.
6. **JSON APIs** — `/api/*` including LLM cache, env store, miniapp `POST` delegates.
7. **HTML** — `render*` functions + layout merge for dashboard pages.

**Path normalization:** `stripDashboardMountPrefix` supports reverse-proxy mounted paths; see server implementation for the exact prefix rules.

**Adding a route:** Prefer a **new module** (`apps/*` or `dashboard/lib/*`) and a **short** branch in `server.mjs` that only parses the body and delegates — per [meimei-repo-boundaries.v1.md §4](../architecture/meimei-repo-boundaries.v1.md).

---

## 5. Registry and function contracts

### 5.1 Machine registry

- **File:** [`functions/registry.v1.json`](../../functions/registry.v1.json)
- **Validation:** `npm run registry:validate` → [`scripts/validate-function-registry.mjs`](../../scripts/validate-function-registry.mjs)

Each entry includes stable **`id`**, **`route`** (contract path like `/dashboard/<issue>/<slug>`), **`apiPath`**, display metadata, and category (`apps` vs `tools`).

### 5.2 Code resolution

[`miniapp-registry.mjs`](../../dashboard/lib/miniapp-registry.mjs):

- `parseContractRoute` — validates contract route shape.
- `serverApiPath` — strips `/dashboard` prefix for the local server’s `/api/...` paths.
- `buildMiniappIssueRoute` / `buildDashboardCatalog` — UI cards and path maps.

### 5.3 Human specs

Each miniapp should have a matching [`functions/<id>.md`](../../functions) describing actions, env, and transport (R8/R4 patterns).

### 5.4 Cross-app imports

**Forbidden:** `apps/foo` importing `apps/bar`. Enforced by `npm run boundary:check`. Use **queue / bus** patterns from adapter and inter-app docs when needed.

---

## 6. Inference API (`POST /api/meimei/route`)

**Canonical spec:** [inference-route.v1.md](../api/inference-route.v1.md).

### 6.1 Minimal mental model

- **Request:** OpenAI Chat Completions JSON: `model`, `messages[]` with string `content`, optional `temperature`, `max_tokens`.
- **Extensions:** `meimei.traceId`, `meimei.taskCategory` (with `model: "router-auto"`), `meimei.localOnly` (must be true or omitted in v1).
- **Response:** `choices`, `usage`, `meimei_meta` (`backend_used`, `latency_ms`, `trace_id`, `ollama_model_requested`).

### 6.2 Trace ID

Server resolves trace id in order: header **`x-meimei-trace-id`** → `body.meimei.traceId` → UUID. Logs: `[meimei/route][<traceId>]`.

### 6.3 Error codes (selected)

| Status | Meaning |
|--------|---------|
| 400 | Malformed body / messages |
| 413 | Estimated context exceeds limit |
| 501 | `stream: true` or `localOnly: false` (not implemented v1) |
| 502 / 503 | Ollama error or unreachable |

### 6.4 `router-auto`

[`inference-route.mjs`](../../dashboard/lib/inference-route.mjs) maps `meimei.taskCategory` to concrete Ollama tags (e.g. `summarize` → `qwen3.5:0.8b`, `reason` → `llama3:latest`). This is **deterministic**, not an LLM router — align product copy with [ai-runtime-audit.md](../compliance/ai-runtime-audit.md).

---

## 7. Job queue and worker

**Contract:** [adapter-contract.v1.md](../architecture/adapter-contract.v1.md).

### 7.1 Storage

- Path: `data/meimei/meimei-jobs.sqlite`
- Engine: `node:sqlite` with WAL and `busy_timeout`.

### 7.2 Row shape (conceptual)

- **`payload_kind`:** `inference_v1` (worker-handled) or `app_task` (sovereign inbox processors).
- **`status`:** `pending` → `processing` → `completed` | `failed`.
- **`trace_id`:** Correlation for monitor feed and Claim Check artifacts.

### 7.3 Worker behavior

[`meimei-job-worker.mjs`](../../dashboard/lib/meimei-job-worker.mjs):

1. Poll `claimNextInferencePending()` (inference-only queue).
2. Parse JSON payload; call `handleMeimeiInferenceRoute`.
3. On success, store result JSON; on failure, retry until `MEIMEI_JOB_MAX_FAILURES`.
4. **Correlation:** Optional enqueue of `app_task` reply (`meimei_correlation` in body) for inter-app flows.
5. **Large outputs:** Spill to `data/meimei/artifacts/<trace_id>/digest.md` when over 64 KiB (Claim Check).

### 7.4 Demos

- `npm run jobs:demo-enqueue`
- `npm run jobs:demo-file-drop`

---

## 8. LLM primitives (`llm.mjs`)

**File:** [`dashboard/lib/llm.mjs`](../../dashboard/lib/llm.mjs).

| Export (representative) | Role |
|-------------------------|------|
| `callOllama` | Raw chat against Ollama with retries/timeouts |
| `callOllamaJson` | Structured JSON extraction (handles `format: json`, `thinking` quirks) |
| `parseJsonResponse` / `extractFirstJsonObject` | Defensive JSON extraction from model text |
| `checkOllamaHealth` / `listModels` | Ops |
| Routing config helpers | Brain/muscle channel config (used by dashboard APIs) |
| Cache helpers | LRU prompt cache |

**When to use what:**

- **New adapter / external integration** — Prefer **`POST /api/meimei/route`** so clients speak one OpenAI-shaped contract.
- **In-repo miniapp** — Migrating from raw `llm.mjs` to inference route is encouraged per kernel completion plan Phase K3 / platform roadmap R2.

**OpenClaw:** Agent turns via `scripts/oc-agent` use a **different** stack; they are **not** replaced by `inference-route` v1. See [ai-runtime-audit.md](../compliance/ai-runtime-audit.md).

---

## 9. Integrating another platform

### 9.1 Mode A — HTTP consumer (recommended)

Treat the dashboard as a **local service**:

1. Ensure Ollama is reachable from the host running MeiMei.
2. Call **`POST /api/meimei/route`** with the v1 JSON contract.
3. Propagate **`x-meimei-trace-id`** for supportability.
4. Terminate TLS and authenticate at your boundary — the kernel does not define a public multi-tenant auth model.

**Pros:** Stable contract, no need to vendor JavaScript. **Cons:** Network hop, same-machine or trusted network typical.

### 9.2 Mode B — Code reuse / vendoring

If you copy kernel code into another repo:

1. **Take:** `inference-route.mjs` + minimal deps, or full allowlisted subset per your lawyer/license.
2. **Take:** Job queue only if you also ship SQLite schema migrations and worker loop.
3. **Do not assume:** `server.mjs` — it is product-shaped and large.
4. **Replace:** `repoRoot` resolution, paths under `data/`, and any `apps/*` you do not want.
5. **Align:** Node version, ESM, and `fetch` availability.

Document your fork’s **diff** from upstream contracts in your own changelog.

---

## 10. Debugging and observability

| Tool | Use |
|------|-----|
| Server logs | `[meimei/route][traceId]` and job worker `[meimei/jobs]` lines |
| `GET /api/meimei/monitor/feed` | Recent jobs; `trace_id` query for chronological slice |
| [`dashboard/lib/meimei-monitor-feed.mjs`](../../dashboard/lib/meimei-monitor-feed.mjs) | Row formatting for UI |
| `./scripts/oc-readiness` | OpenClaw / gateway expectations |
| `npm run dashboard:probe` | Local dashboard probe |

---

## 11. Known limitations and honesty

1. **Inference v1** is **blocking** only — no SSE (`stream: true` → 501).
2. **No cloud fallback** in v1 — `meimei.localOnly: false` → 501.
3. **Product surfaces** may use **OpenClaw**, **rules**, or **sample data** — the kernel’s inference route does **not** make those uniform. Read [ai-runtime-audit.md](../compliance/ai-runtime-audit.md) before external messaging.
4. **`server.mjs` size** — extraction ongoing; use [`meimei-kernel-code-audit.v1.md`](../architecture/meimei-kernel-code-audit.v1.md) for current debt.
5. **Future packaging** — `@meimei/kernel` workspace is **optional future** per kernel completion plan; handbook describes **current** layout.

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-03-30 | Initial v1 handbook. |
