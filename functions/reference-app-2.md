# Reference app 2 — Sovereign inbox (Milestone G)

**Registry id:** `reference-app-2`  
**UI:** `/791/Reference_app_2`  
**API:** `POST /dashboard/api/functions/reference-app-2`

## Role

Consumes **`app_task`** rows with **`target_adapter: "reference-app-2"`** inside the dashboard process (`startReferenceApp2Inbox`). **No HTTP** to Reference App 1.

## Intents handled

| Intent | Behavior |
|--------|-----------|
| `ping` | Enqueues **`app_task`** pong to **`reference-app-1`** with same **`trace_id`**, **`parent_job_id`**, **`nonce`**. |
| `standup_digest_request` | Enqueues **`inference_v1`** with **`meimei_correlation`** (§5); global worker completes inference and enqueues **`standup_digest_ready`** to **`reference-app-1`**. |

## Environment

Same **`REFAPP_FEATURE_TOGGLE`** as Reference App 1.

Optional **`MEIMEI_APP_INBOX_WORKER=0`** disables the inbox loop. **`MEIMEI_APP_INBOX_POLL_MS`** (default **2500**) bounds polling.

## API actions

| Action | Result |
|--------|--------|
| `config` | Metadata + `enabled` |
| `inbox` | Recent **`app_task`** rows for this inbox (debug) |

## Operator transport & secrets (R8 / R4)

| Topic | Guidance |
|-------|----------|
| **Local vs TLS** | Operators typically use **HTTP loopback** to the dashboard (listen and bind from `config/dashboard-surface.v1.json`). With an HTTPS reverse proxy (`scripts/meimei-domain.mjs`, LaunchAgents), browser URLs gain **`MEIMEI_PUBLIC_PREFIX`** (often `/dashboard`). Registry **`api.path`** values are logical — prepend the public prefix when calling through TLS. |
| **Secrets** | Use the MeiMei env store and [`meimei-env-ui-contract.v1.md`](../architecture/meimei-env-ui-contract.v1.md); one source of truth; no secrets embedded in static HTML or client bundles. |
