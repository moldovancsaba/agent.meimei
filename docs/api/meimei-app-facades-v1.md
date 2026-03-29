# MeiMei kernel — app-scoped HTTP façades (v1)

**Program:** MM-KERNEL-303a–d  
**Auth:** Same as `POST /api/functions/…` — optional `MEIMEI_KERNEL_APP_AUTH=1` requires `X-MeiMei-App-Id` to match the path `app_id`; optional `X-MeiMei-App-Secret` when the registry row stores `auth_secret_sha256`. See [`kernel-app-auth.mjs`](../../dashboard/lib/kernel-app-auth.mjs).

All paths below are **after** stripping `MEIMEI_PUBLIC_PREFIX` (e.g. browser calls `https://host:8443/dashboard/api/…` when prefix is `/dashboard`).

## `POST /api/meimei/v1/apps/{app_id}/inference`

- **Capability:** `inference` (manifest + optional `policy` overlay on the registry row).
- **Body:** Same OpenAI-shaped JSON as `POST /api/meimei/route` (including optional `meimei.traceId`).
- **Response:** Same shape as the inference router; success JSON may include `meimei_meta.app_id` when scoped.

## `POST /api/meimei/v1/apps/{app_id}/jobs/enqueue`

- **Capability:** `jobs.enqueue`.
- **Body:** `{ "adapterName": string, "payload": object, "traceId"?: string, "direction"?: "ingress"|"egress" }`.
- **Behavior:** Enqueues via `meimei_jobs`; payload is augmented with `kernel_app_id` for monitor filtering.

## `GET /api/meimei/v1/apps/{app_id}/env?keys=key1,key2`

- **Capability:** `env.read`.
- **Policy:** Registry row `policy.env.allowKeys` must list each requested key; otherwise **403**.
- **Response:** `{ "ok": true, "activeProfile": string, "keys": string[], "values": { [key]: string | null } }` (values from `data/meimei-environment.v1.json` for the active profile).

## `GET /api/meimei/v1/apps/{app_id}/fs/roots`

- **Capability:** `filesystem.scoped`.
- **Status:** **501** — policy field `filesystem.roots` is reserved; server integration not implemented (MM-KERNEL-303d placeholder).

## Monitor feed

- `GET /api/meimei/monitor/feed?app_id={uuid}` — filters rows whose JSON payload contains `kernel_app_id`.
- Feed items include optional `app_id` (from payload or completed inference `meimei_meta`).

## Client library

- **`@meimei/sdk`** (`packages/meimei-sdk`) — HTTPS `fetch` client; **`npm run kernel:sdk:selftest`**.
