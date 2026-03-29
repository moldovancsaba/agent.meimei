# Kernel external apps — UI / static shell strategy (MM-KERNEL-502)

This note closes the **“how does an external app ship a browser UI?”** gap relative to in-repo miniapps that use registry `internalPath` and dashboard HTML shells.

## Options (pick per app)

1. **Catalog deep link only** — Kernel [`kernel-catalog-merge.mjs`](../../dashboard/lib/kernel-catalog-merge.mjs) lists external + builtin apps on **Apps** / **Tools**; the card links to `internalPath` derived from `meimei.app.json` `routes` (issue id + slug) or a stable `/kernel/…` fallback. The app serves its own UI from a **separate origin** (e.g. local dev server or packaged static site).
2. **Reverse-proxy path prefix** — Operator configures `meimei-domain` (or another proxy) to map e.g. `/dashboard/apps/myvendor/` → static files or upstream HTTP **only over TLS** (ADR-003). Kernel does not need to read files from `install_path` for GET in v1.
3. **Dev-only iframe** — External app runs on `http://127.0.0.1:<port>` during development; production uses HTTPS origin #1 or #2. Do not rely on mixed-content iframes from the canonical dashboard HTTPS URL.

## UX

- **Operator catalog** remains the discovery surface; “External (local)” launchers stay separate from kernel apps (see Apps page).
- **SDK** targets HTTPS base URL + `app_id` headers for API only; UI transport is out of band for the pilot.

## ADR-002

Acceptance: external apps **do not** assume the dashboard serves their static assets unless an explicit proxy rule exists; document the chosen option in the app’s operator README.
