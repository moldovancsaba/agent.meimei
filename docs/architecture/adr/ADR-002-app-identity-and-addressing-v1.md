# ADR-002 — App identity & addressing

**Status:** Proposed  
**Date:** 2026-03-29  
**Depends on:** [ADR-001](ADR-001-app-runtime-v1.md)

## Context

Operators need a stable, opaque identifier for policy, audit, telemetry, and API routing. Human-readable slugs (and historical GitHub issue ids in URLs) are useful for catalog UX but are not sufficient as the sole security and policy key.

## Proposal

1. **Canonical id:** Each registered app receives an immutable **`app_id`** (UUID v4 or ULID — pick one in implementation; ULID preferred for sortable logs).
2. **Persistence:** `app_id` is stored in the kernel app registry; never reassigned to a different install after deletion (tombstone + audit).
3. **External API:** Privileged kernel APIs require **`app_id`** (header or path segment) plus authentication material issued or configured at registration.
4. **Human URLs:** Keep optional **display routes** (e.g. issue-based paths) as redirects or aliases resolved **after** `app_id` authentication, or migrate to `/apps/{appId}/…` — final UX decided in **MM-KERNEL-502**; this ADR only fixes the **policy key**.

## Open points

- Exact public URL shape vs internal `app_id` (see program issue MM-KERNEL-502).
- Rotation of signing secrets per app without changing `app_id`.

## Consequences

- Monitor feed, jobs metadata, and env access can consistently tag **`app_id`**.
- Registry validation and CI can enforce presence of `app_id` for new registrations.
