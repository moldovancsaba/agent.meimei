# Platform pages (`dashboard/lib/platform-pages/`)

Large **GET** HTML builders for dashboard catalog surfaces. **`dashboard/server.mjs`** imports these modules and stays a thin router.

- **`catalog-pages.mjs`** — Apps, Tools, and knowmore listing pages (shared layout + registry-driven UI).
- **`system-monitor-page.mjs`** — Tools → System monitor (queue explorer) GET HTML.

Rules: **no** imports from `apps/*`; shared helpers come from `dashboard/lib/*`. See [`meimei-repo-boundaries.v1.md`](../../docs/architecture/meimei-repo-boundaries.v1.md) §3, §6.
