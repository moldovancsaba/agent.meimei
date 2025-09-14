# 🗺️ ROADMAP.md — ChangeMass v1.3.0

Last Updated: 2025-09-14T09:24:28.000Z
Status: Forward-looking development plan (no historical entries)

Q3 2025 — Category Enhancements
- Title: Introduce “Coveralls” clothing category (slug: coveralls)
  - Priority: High
  - Dependencies:
    - Frontend: Add category to Upload form and Manage filters
    - Build hygiene: Exclude legacy duplicate files from TypeScript
    - Documentation: Version sync and plan logging
  - Rationale: Enable full-body items (driver suits/overalls) to support try-on scenarios covering torso, arms, and legs.
  - Owner: AI Developer
  - Planned at: 2025-09-08T09:21:23.000Z
  - Acceptance: Category selectable in upload, filterable in manage list, build succeeds

Q3 2025 — Full-Body Coveralls Try-On (Replicate primary, LightX fallback)
- Title: Coveralls AI Try-On — Engine selection + fallback
  - Priority: High
  - Dependencies:
    - Backend: app/api/try-on/route.ts selection flow; app/lib/api/lightx-upload/tryon
    - Types/Schema: TryOnGeneration engine field
    - Frontend: TryOnWorkflow coveralls UX gate
    - Config: next.config.js images allowlist, env knobs
  - Rationale: Robust support for one-piece/full-body items (overalls/jumpsuits) with graceful fallback
  - Owner: AI Developer
  - Planned at: 2025-09-14T08:41:53.000Z
  - Acceptance: Replicate succeeds or LightX fallback engages; engine/model persisted; UX gate enforced; images render

Q3 2025 — Stability & Reliability
- Title: Option A Quick Patch — Replicate try-on timeouts
  - Priority: High
  - Scope: Env-configurable polling/timeout, persist predictionId, allow replicate.delivery, docs/version alignment
  - Dependencies: None
  - Owner: Backend/Infra
  - Planned at: 2025-09-10T09:14:26.000Z
  - Acceptance: No 5-minute timeouts in typical load; predictionId stored; replicate.delivery images render

