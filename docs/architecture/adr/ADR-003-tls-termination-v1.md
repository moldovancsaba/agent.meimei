# ADR-003 — TLS termination (HTTPS everywhere)

**Status:** Accepted  
**Date:** 2026-03-29  
**Accepted:** 2026-03-30

## Context

Product requirement: **HTTPS for all user-facing and operator-facing access**, including localhost (via locally trusted certs). Today `dashboard/server.mjs` uses `http.createServer`; `scripts/meimei-cert` already generates **`meimei.localhost`** material under `~/.openclaw/certs/`.

## Decision

1. **External contract:** Documented **operator and browser** URLs are **`https://`** (e.g. **`https://meimei.localhost:8443/dashboard/`**). Upstream Node HTTP on loopback remains implementation detail behind **`scripts/meimei-domain.mjs`**.
2. **Default topology (A — reverse proxy):** TLS terminates in **`meimei-domain`** (**HTTPS** on **127.0.0.1:8443** by default). Node dashboard listens on **loopback HTTP** only unless explicitly configured otherwise. Option **B** (Node `https.createServer`) remains available for future spikes; it is **not** the default dev/prod path.
3. **Internal kernel ↔ app (v1 in-process):** No TLS on the wire (in-memory). Future sidecars: TLS or mutual auth on loopback per **MM-KERNEL-701**.

## Consequences

- Smoke/probe/docs default toward **`https://meimei.localhost:8443`** when TLS mode envs are set; plain **`http://127.0.0.1:<port>`** remains for direct-engineer debugging only and must be labeled **upstream**, not **canonical**.
- Runbooks and go-live checklist treat **HTTPS dashboard URL** as the pass/fail **product** surface.
- Optional **`MEIMEI_DOMAIN_HTTP_REDIRECT=1`** provides HTTP→HTTPS redirect on a separate loopback port for mistaken **`http://`** clients.

## References

- Topology: [`meimei-https-topology.v1.md`](../meimei-https-topology.v1.md)
- Program: [`meimei-https-full-integration-program.v1.md`](../../planning/meimei-https-full-integration-program.v1.md)
