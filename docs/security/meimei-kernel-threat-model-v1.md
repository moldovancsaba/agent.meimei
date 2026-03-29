# MeiMei kernel apps — lightweight threat model (MM-KERNEL-701)

## Assets

- **Registry** (`data/kernel/apps/registry.json`) — `app_id`, `install_path`, manifest, optional `auth_secret_sha256` (SHA-256 only), optional `policy`.
- **Job queue** (`meimei_jobs`) — payloads may contain user content and `kernel_app_id` for attribution.
- **Env store** (`data/meimei-environment.v1.json`) — secrets; app-scoped env API returns values only for `policy.env.allowKeys`.

## Trust boundaries

- **Browser / same-origin dashboard** — Builtins may use `kernel.authExempt`; external callers should use **HTTPS** (ADR-003) and secrets when enabled (`MEIMEI_KERNEL_APP_AUTH`, per-app secret).
- **External HTTP clients** — Must present correct `app_id` (path + header when auth is on) and secret if configured; wrong values → **401**/**403**.

## Policy (MM-KERNEL-302)

- Effective capabilities = manifest declarations, or **full v1 cap set** if the manifest omits `capabilities`, then refined by `policy.allow` / `policy.deny`.
- Policy cannot remove a **required** manifest capability without failing dispatch (**403** `policy_invalid`).
- **Env read** is **deny-by-default** per key: empty `allowKeys` → **403** on env façade.

## Misuse scenarios

| Scenario | Mitigation |
|----------|------------|
| Stolen `X-MeiMei-App-Secret` | Rotate secret (re-register); only hash on disk. |
| Forged `app_id` in path | Optional global auth + header match; secret binds to row. |
| App exfiltrates env | Allowlist keys only; no list-all endpoint. |
| Job queue flooding | Rate limits / quotas are **future**; operator monitors `monitor/feed` + `app_id`. |

## Monitoring

- Use `GET /api/meimei/monitor/feed?app_id=` for per-app job visibility (MM-KERNEL-703).
