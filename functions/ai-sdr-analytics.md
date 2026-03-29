# AI SDR analytics — Miniapp contract

**Miniapp ID:** `ai-sdr-analytics`  
**GitHub:** [mvp-factory-control#651](https://github.com/moldovancsaba/mvp-factory-control/issues/651)

## Product

Operator dashboard that aggregates **local** GTM telemetry: SDR outbound JSONL (#654) and lead enrichment workflow store (#650). No third-party analytics SDK.

## Data sources (gitignored)

| File | Issue |
|------|--------|
| `data/sdr-outbound.jsonl` | #654 |
| `data/lead-enrichment-workflow.v1.json` | #650 |

## API

- `POST /dashboard/api/functions/ai-sdr-analytics`
- Actions: `overview` (default), `metrics` (full combined payload for UI and integrations)

## Related

- [Lead outreach](./lead-outreach.md) (#653 / #654)  
- [Lead enrichment](./lead-enrichment.md) (#649 / #650)

## Registry

See `functions/registry.v1.json` → `ai-sdr-analytics`.

## Operator transport & secrets (R8 / R4)

| Topic | Guidance |
|-------|----------|
| **Local vs TLS** | Operators typically use **HTTP loopback** to the dashboard (listen and bind from `config/dashboard-surface.v1.json`). With an HTTPS reverse proxy (`scripts/meimei-domain.mjs`, LaunchAgents), browser URLs gain **`MEIMEI_PUBLIC_PREFIX`** (often `/dashboard`). Registry **`api.path`** values are logical — prepend the public prefix when calling through TLS. |
| **Secrets** | Use the MeiMei env store and [`meimei-env-ui-contract.v1.md`](../architecture/meimei-env-ui-contract.v1.md); one source of truth; no secrets embedded in static HTML or client bundles. |
