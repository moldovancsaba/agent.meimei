# 📦 RELEASE_NOTES.md — ChangeMass

## [v1.3.0] — 2025-09-14
- Added: Full-body Coveralls/Overalls/Jumpsuit try-on support
  - Category-aware engine selection with TRYON_BACKEND_PRIORITY (default replicate,lightx)
  - Replicate primary (idm-vton); optional REPLICATE_MODEL_COVERALLS override; enriched garment description
  - LightX fallback with auto LightX CDN upload if lightxUrl missing
  - Persistence: engine (replicate|lightx) and generationModel saved on TryOnGeneration
  - Frontend: UX gate requiring full-body confirmation for coveralls
  - Next.js image allowlist: replicate.delivery and LightX CDN
  - Env: TRYON_BACKEND_PRIORITY, NEXT_PUBLIC_TRYON_BACKEND_PRIORITY, REPLICATE_MODEL_COVERALLS

Notes
- Timestamps follow ISO 8601 with milliseconds in UTC across logs and docs.
- No automated tests added (tests prohibited by policy).
