# Workspace packages (`@meimei/*`)

| Package | Role |
|---------|------|
| **`meimei-sdk`** | HTTP client for kernel app-scoped façades (`/api/meimei/v1/apps/{app_id}/…`). |
| **`meimei-pilot-external-app`** | Minimal process using the SDK only (env-driven smoke against a running dashboard). |

**MM-KERNEL-602:** Moving a full miniapp out of `apps/<name>/` into `packages/<name>/` is not required for the SDK to work — register the install path with `npm run kernel:app-registry -- register <dir>`. See [`kernel-apps.v1.md`](../docs/operations/kernel-apps.v1.md) (section *Migrate a miniapp toward `packages/*`*).
