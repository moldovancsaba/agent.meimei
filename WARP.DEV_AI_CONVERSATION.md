# 📝 WARP.DEV_AI_CONVERSATION.md — Planning Log

Timestamp: 2025-09-14T08:41:53.000Z
Author: AI Developer (Agent Mode)
Topic: Coveralls (Full-Body Overalls/Jumpsuit) Try-On — Replicate Primary, LightX Fallback

Plan Summary
- Enable category-aware engine selection for full-body garments (coveralls/overalls/jumpsuit):
  - Try Replicate first (idm-vton by default; optional REPLICATE_MODEL_COVERALLS).
  - Fallback to LightX if Replicate fails or is deprioritized by TRYON_BACKEND_PRIORITY.
- Ensure LightX fallback can auto-upload sources to LightX CDN when missing lightxUrl.
- Persist engine used (replicate|lightx) and model in TryOnGeneration for analytics and debugging.
- Add a front-end gating banner for coveralls: require “full-body person photo” confirmation before generate.
- Update Next.js image allowlist to render replicate.delivery and LightX CDN.
- Add env knobs: TRYON_BACKEND_PRIORITY, REPLICATE_MODEL_COVERALLS, NEXT_PUBLIC_TRYON_BACKEND_PRIORITY.

Tasks
1) Backend selection in app/api/try-on/route.ts with category synonyms and priority parsing.
2) Replicate primary: enrich clothingName to emphasize full-body one-piece semantics.
3) LightX fallback: auto LightX upload (server-side) when lightxUrl missing; then generate via LightX client.
4) Extend types and schema to include engine?: 'replicate'|'lightx'.
5) Frontend UX: banner + checkbox gate in app/components/tryon/TryOnWorkflow.tsx.
6) next.config.js: confirm replicate.delivery and LightX CDN remotePatterns/domains.
7) .env.example: add TRYON_BACKEND_PRIORITY, REPLICATE_MODEL_COVERALLS, NEXT_PUBLIC_TRYON_BACKEND_PRIORITY.

Notes
- All timestamps ISO 8601 with milliseconds (UTC).
- No tests will be added (policy).
- No breadcrumbs will be introduced.

