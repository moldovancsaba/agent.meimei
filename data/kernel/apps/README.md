# Kernel app registry (local state)

`registry.json` in this directory holds **operator-local** registrations for externally installed MeiMei apps (see **`docs/planning/kernel-app-separation-and-https-program.v1.md`** — MM-KERNEL-202).

- The file is **gitignored**; paths inside it are absolute and machine-specific.
- Manage with: `npm run kernel:app-registry -- list|register|…` (see `scripts/meimei-kernel-app-registry.mjs`).
- Each app package must include **`meimei.app.json`** validated by **`npm run kernel:validate-app-manifest`**.

**Dynamic dispatch (MM-KERNEL-501):** when **`MEIMEI_KERNEL_EXTERNAL_APPS=1`**, `dashboard/server.mjs` resolves **`POST /api/functions/<manifest.api.pathSuffix>`** for **enabled** registry entries and **`import()`**s `manifest.entry.module` (default export **`handleApi`**). Static miniapp routes registered earlier in the server still take precedence. Without the env flag, the registry is unused at runtime (zero overhead on unmatched POSTs beyond the flag check).

### Verification (no plain HTTP)

- **Automated (CI):** **`npm run kernel:external-dispatch:selftest`** — proves registry → dynamic **`import()`** → **`handleApi`** without opening a socket.
- **Against a running dashboard:** use the **same HTTPS entrypoint** as the rest of the product (e.g. TLS terminator on **8443** + **`https://meimei.localhost`**, certs via **`scripts/meimei-cert`**). Set **`MEIMEI_SMOKE_BASE`** (or your client) to that **`https://`** origin; trust the local CA (**`NODE_EXTRA_CA_CERTS`** to `~/.openclaw/certs/meimei.localhost.crt` is one option for CLI clients). **Do not** treat **`http://127.0.0.1:<node>`** as the contract surface when the program requires HTTPS everywhere.
