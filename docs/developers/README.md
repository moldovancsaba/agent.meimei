# Developer guides — MeiMei kernel

Documentation for engineers who need to **understand**, **extend**, or **integrate** the MeiMei platform core (kernel).

| Document | Audience | Purpose |
|----------|----------|---------|
| [meimei-kernel-handbook.v1.md](meimei-kernel-handbook.v1.md) | Implementers, integrators | Atomic technical guide: boot, routing, inference, jobs, registry, integration modes |
| [../architecture/meimei-kernel-code-audit.v1.md](../architecture/meimei-kernel-code-audit.v1.md) | Tech leads, auditors | Code audit, `server.mjs` debt, comment quality, CI boundaries |
| [../architecture/system-overview.md](../architecture/system-overview.md) | All developers | Product-level architecture (LLM, Brain, dashboard) |
| [../architecture/meimei-repo-boundaries.v1.md](../architecture/meimei-repo-boundaries.v1.md) | Contributors | Layers, allowlist, `server.mjs` rules |
| [../api/inference-route.v1.md](../api/inference-route.v1.md) | API consumers | `POST /api/meimei/route` contract |
| [../compliance/ai-runtime-audit.md](../compliance/ai-runtime-audit.md) | Anyone shipping AI features | Truth table: Ollama vs OpenClaw vs rules vs stubs |

**Suggested reading order:** system overview → boundaries → this handbook → inference API spec → compliance audit (before claiming “AI-native” externally).
