# ADR-001 — App runtime model (v1 scope)

**Status:** Accepted  
**Date:** 2026-03-29  
**Scope:** MeiMei kernel ↔ application layer separation — runtime topology

## Context

MeiMei today loads miniapps via static `import` from `apps/*` inside `dashboard/server.mjs`. That couples lifecycle, versioning, and failure domains to the kernel repo. The product goal is independently managed app directories (and eventually separate Git repos) with registration and policy-gated access to kernel resources.

## Decision (v1)

1. **Trust & deployment scope for v1:** **Operator-only** installation on the **same machine** as the kernel (e.g. Mac mini). Apps are not arbitrary internet-downloaded binaries; the operator controls paths and upgrades.
2. **Default runtime for v1:** **In-process dynamic loading** — the kernel resolves a registered install path and loads the app entry via controlled Node ESM `import()` (or equivalent) behind a stable dispatch layer. Rationale: lowest operational overhead on a single host, shared Node version, simplest debugging.
3. **Deferred (not v1 default):** **Out-of-process sidecars** (separate HTTP/gRPC listeners per app) remain a **future ADR** when requirements include remote app hosts, stronger isolation, or multi-language handlers.

## Consequences

- **Positive:** Faster delivery of manifest, registry, SDK, and policy without building a process supervisor first.
- **Negative:** A buggy app can still impact the kernel process unless mitigated (timeouts, worker threads, or later sidecar extraction).
- **Follow-up:** If third-party or remote apps become requirements, open **ADR-001-rev2** (or new ADR) for sidecar/supervisor; keep manifest and `app_id` stable across that migration.

## Compliance

Program issues **MM-KERNEL-501** and **MM-KERNEL-602** assume this ADR unless superseded.
