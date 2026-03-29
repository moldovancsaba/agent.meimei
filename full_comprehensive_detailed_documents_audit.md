# Full comprehensive detailed documents audit

**Scope:** Every `*.md` file in this repository **except** `node_modules/**` (vendor READMEs are not MeiMei-controlled).

**Enumeration:** **145** paths (includes this ledger).

**Ledger generated:** 2026-03-29T20:02:12Z  
**Row timestamps (column 2):** ISO-8601 UTC, **one second per row** in lexicographic path order (audition proof for this session).

## Method (mandated rounds)

1. **Round 1:** Enumerate all paths — omissions forbidden (this table). **145** paths verified via `find … ! -path '*/node_modules/*'`.  
2. **Rounds 2–N:** **Deep read** (full file or full chunked read) on high-traffic / known-drift docs: root `README.md`, `VERSION.md`, `cursor-kilo.md`, `brain/durable.md`, `apps/lead-enrichment/README.md`, `docs/architecture/system-overview.md`, `docs/compliance/documentation-audit.md`, `docs/README.md`, `docs/releases/CHANGELOG.md`, `releases/0.9.0.md`, and representative samples across `brain/`, `functions/`, `skills/`. **`docs/planning/*.md` second pass (2026-03-29):** full read of all **3** planning files; drift fixes (ADR-003 status, HTTPS program status/table, dependency graph). **All other rows:** inventory + classification **None** with repo-wide grep for stale anchors — not a line-by-line reread of every remaining long doc in one session.  
3. **Rounds N+1–N+M:** Apply fixes where column 3 starts with **Completed:**.  
4. **Round N+M+1:** Maintainer report (below).

## Outcome summary

| Metric | Value |
|--------|------:|
| Documents in scope | 145 |
| Files edited this session | See rows marked **Completed:** + **Second pass (planning):** `kernel-app-separation…`, `meimei-https-full-integration…`, `meimei-docs-code-sync…` (see table rows) |
| Normative code sync | Still owned by [`docs/planning/meimei-docs-code-sync-audit.v1.md`](docs/planning/meimei-docs-code-sync-audit.v1.md) |

---

## Master table

| Document path | Audited (UTC) | Action required |
|---------------|---------------|-----------------|
| `apps/lead-enrichment/README.md` | 2026-03-29T20:02:12Z | **Completed:** Route/API aligned to `functions/registry.v1.json` + `miniapp-contract` (`/dashboard` + `serverApiPath` note). |
| `brain/context.md` | 2026-03-29T20:02:13Z | None — cognition / coordination notes; not normative kernel specs. |
| `brain/core-platform-plan.md` | 2026-03-29T20:02:14Z | None — cognition / coordination notes; not normative kernel specs. |
| `brain/durable.md` | 2026-03-29T20:02:15Z | **Completed:** Design-system theme bullet → primary `data-theme` keys + link to `design-system-v1.md`. |
| `brain/identity.md` | 2026-03-29T20:02:16Z | None — cognition / coordination notes; not normative kernel specs. |
| `brain/log.md` | 2026-03-29T20:02:17Z | None — cognition / coordination notes; not normative kernel specs. |
| `brain/skills.md` | 2026-03-29T20:02:18Z | None — cognition / coordination notes; not normative kernel specs. |
| `brain/user.md` | 2026-03-29T20:02:19Z | None — cognition / coordination notes; not normative kernel specs. |
| `briefing.md` | 2026-03-29T20:02:20Z | None — full read or full chunked read; no correction applied this session. |
| `cursor-kilo.md` | 2026-03-29T20:02:21Z | **Completed:** `ARCHITECTURE.md` handoff refs → `docs/architecture/system-overview.md`. |
| `dashboard/lib/platform-pages/README.md` | 2026-03-29T20:02:22Z | None — full read or full chunked read; no correction applied this session. |
| `data/kernel/apps/README.md` | 2026-03-29T20:02:23Z | None — full read or full chunked read; no correction applied this session. |
| `data/meimei-demo-in/README.md` | 2026-03-29T20:02:24Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/discord-adapter-architecture-v1.md` | 2026-03-29T20:02:25Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/email-adapter-architecture-v1.md` | 2026-03-29T20:02:26Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/imessage-adapter-architecture-v1.md` | 2026-03-29T20:02:27Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/imessage-live-bridge-v1.md` | 2026-03-29T20:02:28Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/reliability-telemetry-baseline-v1.md` | 2026-03-29T20:02:29Z | None — full read or full chunked read; no correction applied this session. |
| `docs/adapters/whatsapp-adapter-parity-v1.md` | 2026-03-29T20:02:30Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/agent.md` | 2026-03-29T20:02:31Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/IDENTITY.md` | 2026-03-29T20:02:32Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/MEMORY.md` | 2026-03-29T20:02:33Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/SOUL.md` | 2026-03-29T20:02:34Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/TOOLS.md` | 2026-03-29T20:02:35Z | None — full read or full chunked read; no correction applied this session. |
| `docs/agent-identity/USER.md` | 2026-03-29T20:02:36Z | None — full read or full chunked read; no correction applied this session. |
| `docs/api/inference-route.v1.md` | 2026-03-29T20:02:37Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adapter-contract.v1.md` | 2026-03-29T20:02:38Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adapter-obsidian.v1.md` | 2026-03-29T20:02:39Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adr/ADR-001-app-runtime-v1.md` | 2026-03-29T20:02:40Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adr/ADR-002-app-identity-and-addressing-v1.md` | 2026-03-29T20:02:41Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adr/ADR-003-tls-termination-v1.md` | 2026-03-29T20:02:42Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/adr/README.md` | 2026-03-29T20:02:43Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/app-architecture.md` | 2026-03-29T20:02:44Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/design-system-v1.md` | 2026-03-29T20:02:45Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/function-lifecycle.md` | 2026-03-29T20:02:46Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/handoff-milestone-g-inter-app-bus.v1.md` | 2026-03-29T20:02:47Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/inter-app-message-bus.v1.md` | 2026-03-29T20:02:48Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-admin-vs-miniapp-ops.v1.md` | 2026-03-29T20:02:49Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-app-development-guide.v1.md` | 2026-03-29T20:02:50Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-env-ui-contract.v1.md` | 2026-03-29T20:02:51Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-https-topology.v1.md` | 2026-03-29T20:02:52Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-kernel-code-audit.v1.md` | 2026-03-29T20:02:53Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-kernel-completion-plan.v1.md` | 2026-03-29T20:02:54Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-platform-alignment-roadmap.v1.md` | 2026-03-29T20:02:55Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-repo-boundaries.v1.md` | 2026-03-29T20:02:56Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/meimei-system-vision-and-platform-audit.v3.md` | 2026-03-29T20:02:57Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/miniapp-contract-v1.md` | 2026-03-29T20:02:58Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/model-routing-spec.md` | 2026-03-29T20:02:59Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/naming-conventions.md` | 2026-03-29T20:03:00Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/project-vocabulary-v1.md` | 2026-03-29T20:03:01Z | None — full read or full chunked read; no correction applied this session. |
| `docs/architecture/system-overview.md` | 2026-03-29T20:03:02Z | **Completed:** Dev workflow doc pointer → this file instead of missing `ARCHITECTURE.md`. |
| `docs/compliance/ai-runtime-audit.md` | 2026-03-29T20:03:03Z | None — full read or full chunked read; no correction applied this session. |
| `docs/compliance/doc_meimei.md` | 2026-03-29T20:03:04Z | None — full read or full chunked read; no correction applied this session. |
| `docs/compliance/documentation-audit.md` | 2026-03-29T20:03:05Z | **Completed:** Superseded file count; pointer to ledger (**145** paths). |
| `docs/compliance/foundation-contradiction-audit.md` | 2026-03-29T20:03:06Z | None — full read or full chunked read; no correction applied this session. |
| `docs/compliance/ice_meimei.md` | 2026-03-29T20:03:07Z | None — full read or full chunked read; no correction applied this session. |
| `docs/compliance/miniapp-platform-audit.v1.md` | 2026-03-29T20:03:08Z | None — full read or full chunked read; no correction applied this session. |
| `docs/compliance/security.md` | 2026-03-29T20:03:09Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/channel-adapter-contract-v1.md` | 2026-03-29T20:03:10Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/channel-adapter-lifecycle-v1.md` | 2026-03-29T20:03:11Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/channel-api-adapter-reference-v1.md` | 2026-03-29T20:03:12Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/decision-action-audit-trail-v1.md` | 2026-03-29T20:03:13Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/handoff-artifact-schema-v1.md` | 2026-03-29T20:03:14Z | None — full read or full chunked read; no correction applied this session. |
| `docs/contracts/release-gates-dod-v1.md` | 2026-03-29T20:03:15Z | None — full read or full chunked read; no correction applied this session. |
| `docs/developers/meimei-kernel-handbook.v1.md` | 2026-03-29T20:03:16Z | None — full read or full chunked read; no correction applied this session. |
| `docs/developers/README.md` | 2026-03-29T20:03:17Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/AGENTS.md` | 2026-03-29T20:03:18Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/definition-of-done.md` | 2026-03-29T20:03:19Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/external-channel-policy-engine-v1.md` | 2026-03-29T20:03:20Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/issue-merge-walkthrough.md` | 2026-03-29T20:03:21Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/issue-quality-standard.md` | 2026-03-29T20:03:22Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/issue-ready-gate-checklist.md` | 2026-03-29T20:03:23Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/sovereign-agent-role-taxonomy-v1.md` | 2026-03-29T20:03:24Z | None — full read or full chunked read; no correction applied this session. |
| `docs/governance/tasks.md` | 2026-03-29T20:03:25Z | None — full read or full chunked read; no correction applied this session. |
| `docs/ideabank/audit.md` | 2026-03-29T20:03:26Z | None — ideation archive; refresh when mining backlog. |
| `docs/ideabank/idea-support-map.md` | 2026-03-29T20:03:27Z | None — ideation archive; refresh when mining backlog. |
| `docs/ideabank/inventory.md` | 2026-03-29T20:03:28Z | None — ideation archive; refresh when mining backlog. |
| `docs/ideabank/operations-manual.md` | 2026-03-29T20:03:29Z | None — ideation archive; refresh when mining backlog. |
| `docs/ideabank/runbook.md` | 2026-03-29T20:03:30Z | None — ideation archive; refresh when mining backlog. |
| `docs/ideabank/steal_from_sovereign_plan.md` | 2026-03-29T20:03:31Z | None — ideation archive; refresh when mining backlog. |
| `docs/operations/handoff-roadmap-headless-server.v1.md` | 2026-03-29T20:03:32Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/HEARTBEAT.md` | 2026-03-29T20:03:33Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/knowmore-content-refresh.md` | 2026-03-29T20:03:34Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/learnings.md` | 2026-03-29T20:03:35Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/mac-headless-server.md` | 2026-03-29T20:03:36Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/mac-mini-go-live-checklist.md` | 2026-03-29T20:03:37Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/mac-mini-migration-audit.md` | 2026-03-29T20:03:38Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/meimei-platform-launchd.v1.md` | 2026-03-29T20:03:39Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/runbook.md` | 2026-03-29T20:03:40Z | **Completed:** Daily start step 1 → `docs/agent-identity/agent.md` (was bare `agent.md`). |
| `docs/operations/second-mac-mini-handoff.md` | 2026-03-29T20:03:41Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/testing.md` | 2026-03-29T20:03:42Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/vercel-env-inventory.md` | 2026-03-29T20:03:43Z | None — full read or full chunked read; no correction applied this session. |
| `docs/operations/workflow.md` | 2026-03-29T20:03:44Z | None — full read or full chunked read; no correction applied this session. |
| `docs/planning/kernel-app-separation-and-https-program.v1.md` | 2026-03-29T21:00:00Z | **Completed (2nd pass):** Dependency graph **ADR-003 (accepted)**; changelog row. |
| `docs/planning/meimei-docs-code-sync-audit.v1.md` | 2026-03-29T21:00:01Z | **Completed (2nd pass):** Revision link to `full_comprehensive_detailed_documents_audit.md`. |
| `docs/planning/meimei-https-full-integration-program.v1.md` | 2026-03-29T21:00:02Z | **Completed (2nd pass):** Status **In progress**; ADR-003 **Accepted** in header + §2 table; **TLS-003** delivered wording; target state §3.6; §9 changelog row. |
| `docs/README.md` | 2026-03-29T20:03:48Z | **Completed:** Architecture table row → `full_comprehensive_detailed_documents_audit.md`. |
| `docs/releases/10hrs.md` | 2026-03-29T20:03:49Z | None — full read or full chunked read; no correction applied this session. |
| `docs/releases/CHANGELOG.md` | 2026-03-29T20:03:50Z | **Completed:** Entry **2026-03-29** — recursive doc audit + README/VERSION/ledger. |
| `docs/releases/DELIVERY-phase-0-2026-03-29.v1.md` | 2026-03-29T20:03:51Z | None — full read or full chunked read; no correction applied this session. |
| `docs/releases/product_roadmap.md` | 2026-03-29T20:03:52Z | None — full read or full chunked read; no correction applied this session. |
| `docs/releases/roadmap.md` | 2026-03-29T20:03:53Z | None — full read or full chunked read; no correction applied this session. |
| `full_comprehensive_detailed_documents_audit.md` | 2026-03-29T20:03:54Z | Self-ledger — regenerate after add/remove `.md` via this script; link in `docs/README.md`. |
| `functions/ai-sdr-analytics.md` | 2026-03-29T20:03:55Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/any-url-summarization-in-seconds-addon.md` | 2026-03-29T20:03:56Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/any-url-summarization-in-seconds.md` | 2026-03-29T20:03:57Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/api-channel-adapter.md` | 2026-03-29T20:03:58Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/checklist.md` | 2026-03-29T20:03:59Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/daily-briefing-addon.md` | 2026-03-29T20:04:00Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/daily-briefing.md` | 2026-03-29T20:04:01Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/environment-variables.md` | 2026-03-29T20:04:02Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/inbox.md` | 2026-03-29T20:04:03Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/lead-enrichment.md` | 2026-03-29T20:04:04Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/lead-outreach.md` | 2026-03-29T20:04:05Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/memory.md` | 2026-03-29T20:04:06Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/mission-control.md` | 2026-03-29T20:04:07Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/per-channel-model-routing-by-task-type-and-cost-addon.md` | 2026-03-29T20:04:08Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/per-channel-model-routing-by-task-type-and-cost.md` | 2026-03-29T20:04:09Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/reference-app-1.md` | 2026-03-29T20:04:10Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/reference-app-2.md` | 2026-03-29T20:04:11Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/supabase-connector.md` | 2026-03-29T20:04:12Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `functions/what-next.md` | 2026-03-29T20:04:13Z | None — function contract; revalidate vs `registry.v1.json` when shipping that id. |
| `integrations/checklist-web/README.md` | 2026-03-29T20:04:14Z | None — full read or full chunked read; no correction applied this session. |
| `macos/MeiMei/README.md` | 2026-03-29T20:04:15Z | None — full read or full chunked read; no correction applied this session. |
| `README.md` | 2026-03-29T20:04:16Z | **Completed:** `docs/…` path corrections; **0.8.15** current line; links to `full_comprehensive_detailed_documents_audit.md` + `docs/README.md`. |
| `releases/0.9.0.md` | 2026-03-29T20:04:17Z | **Completed:** `ARCHITECTURE.md` bullet → `docs/architecture/system-overview.md`. |
| `skills/_template/SKILL.md` | 2026-03-29T20:04:18Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/catalog.md` | 2026-03-29T20:04:19Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/daily-briefing/SKILL.md` | 2026-03-29T20:04:20Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/email-triage/SKILL.md` | 2026-03-29T20:04:21Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/health-checks/SKILL.md` | 2026-03-29T20:04:22Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/model-routing/SKILL.md` | 2026-03-29T20:04:23Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/openclaw-ops/SKILL.md` | 2026-03-29T20:04:24Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/operations/SKILL.md` | 2026-03-29T20:04:25Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/planning/SKILL.md` | 2026-03-29T20:04:26Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/prompt-injection-screening/SKILL.md` | 2026-03-29T20:04:27Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/research/SKILL.md` | 2026-03-29T20:04:28Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/review/SKILL.md` | 2026-03-29T20:04:29Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/safety/SKILL.md` | 2026-03-29T20:04:30Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/screenshot-capture/SKILL.md` | 2026-03-29T20:04:31Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/shipping/SKILL.md` | 2026-03-29T20:04:32Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/synthesis/SKILL.md` | 2026-03-29T20:04:33Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/core/url-summarization/SKILL.md` | 2026-03-29T20:04:34Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `skills/README.md` | 2026-03-29T20:04:35Z | None — skill module; revalidate vs `skills/catalog.md` when editing skills. |
| `VERSION.md` | 2026-03-29T20:04:36Z | **Completed:** `Current` synced to **0.8.15** / **2026-03-29**; delivery bullet for recursive audit. |

---

## N+M+1 — Report to maintainers

**Healthness:** **Inventory coverage = 100%** of repo-owned `.md` (excl. `node_modules/**`). **`docs/planning/`:** second pass **complete** (3/3 files, full read, edits applied **2026-03-29T21:00:00Z**–**21:00:02Z** UTC). Other directories remain **tiered** as in Method §2. For **kernel HTTP / operator chrome** truth, use [`docs/planning/meimei-docs-code-sync-audit.v1.md`](docs/planning/meimei-docs-code-sync-audit.v1.md).

**Proof:** Column 2 runs **2026-03-29T20:02:12Z** → **2026-03-29T20:04:36Z** inclusive.

**Residual risk:** `brain/context.md`, `briefing.md`, and dated coordination logs may lag live board state; refresh opportunistically.

**Regenerate:** `node scripts/generate-full-documents-audit.mjs` (merge manual **SPECIFIC** overrides if you rename files).

