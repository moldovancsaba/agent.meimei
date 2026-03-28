# Core Platform Delivery Plan

**Date:** 2026-03-28
**Scope:** 54 core platform issues from `mvp-factory-control`
**Strategy:** Group into 6 delivery waves, ship what's closest to done first

---

## What's Already Done (close these issues)

These issues are substantially delivered by Phase 1-3 work. They need final verification and can be closed:

| # | Title | Status | Evidence |
|---|-------|--------|----------|
| #601 | Business Brain level 1 context prompt | DONE | `brain/identity.md` — identity, values, operating stance |
| #602 | Business Brain level 2/3 context prompt | DONE | `brain/context.md` + `brain/durable.md` — project + learned facts |
| #603 | Identity and soul file overhaul | DONE | `brain/identity.md` — canonical identity with tone, boundaries |
| #604 | `memory.md` durable notebook | DONE | `brain/durable.md` — append-only learned facts |
| #605 | Business Brain memory architecture | DONE | `dashboard/lib/brain/` — 6-layer memory system |
| #635 | Mission control board with AI logs | DONE | Mission Control tool — real OpenClaw telemetry |
| #636 | AI agent command center / control plane | PARTIAL | `/api/command` + chat UI, needs agent controls |

**Action:** Verify and close 6 issues. Mark #636 as in-progress.

---

## Wave 1: Brain Hardening (Week 1)

Strengthen the Brain system that's already built.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #564 | Durable memory backbone upgrade | S | KILO |
| #614 | Session discipline and context capping | S | KILO |
| #647 | Autonomous brain learning every 3 hours | M | CURSOR |
| #613 | Prompt caching guidance | S | KILO |

**What to build:**
- Cron job that runs `brain.think()` every 3 hours to synthesize log → durable facts
- Token counting in `callOllama()` with configurable caps
- Context window management — trim old log entries, summarize before capping
- Document prompt caching strategy for Ollama

**Acceptance:** Brain auto-learns from logs, context never exceeds token limit.

---

## Wave 2: Model Routing & Cost Control (Week 2)

Make the LLM layer smarter about which model to use.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #517 | Per-channel model routing | M | CURSOR |
| #561 | Model routing by task type and cost | M | CURSOR |
| #612 | Model routing / brain-muscle split | M | KILO |
| #615 | Heartbeat to Ollama or local model | S | KILO |
| #617 | Token optimization stack | S | KILO |
| #618 | Sub-agent config with brain + workers | M | CURSOR |
| #585 | Route presets for model routing | S | CURSOR |
| #586 | Route history for model routing | S | CURSOR |
| #587 | Default per channel for model routing | S | CURSOR |

**What to build:**
- Extend `llm.mjs` with configurable routing rules per task type
- Add Ollama health check heartbeat (cron or interval)
- Track token usage per model, per task type
- Brain uses `llama3` for reasoning, workers use `qwen3.5` for fast tasks
- Route presets UI in AI Routing tool settings

**Acceptance:** Different models used for different tasks. Token usage tracked.

---

## Wave 3: Daily Briefing System (Week 3)

Upgrade the daily briefing from single-shot to multi-source pipeline.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #518 | Daily briefing to Apple Notes | S | KILO |
| #588 | Multiple source intake | M | KILO |
| #589 | Source ranking and weighting | M | CURSOR |
| #590 | Multiple output sinks | M | KILO |
| #591 | Delivery status visibility | S | CURSOR |
| #592 | Source adapters | M | KILO |
| #593 | Sink adapters | M | CURSOR |
| #594 | Output routing policy | S | KILO |
| #595 | Source and sink config UI | M | CURSOR |

**What to build:**
- AppleScript adapter to write briefing to Apple Notes (already have Mail adapter pattern)
- Source adapter interface: Mail, Brain, Calendar, GitHub
- Sink adapter interface: Apple Notes, Markdown file, Clipboard
- Ranking/weighting config in settings
- Status tracking for each briefing run

**Acceptance:** Daily briefing pulls from 3+ sources, writes to Apple Notes.

---

## Wave 4: Dashboard & Navigation (Week 4)

Make the operator experience professional.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #637 | Visual overhaul for app dashboard | L | CURSOR |
| #638 | Sidebar navigation redesign | M | CURSOR |
| #582 | Shared MeiMei navigation | M | KILO |
| #584 | Shared function lifecycle | M | KILO |
| #562 | Workspace-first customization | S | KILO |

**What to build:**
- Sidebar nav replacing top nav chips for apps/tools
- Consistent page layout across all apps/tools
- Shared function lifecycle (loading → processing → result → error states)
- Workspace-first: operator can customize layout, theme, default view

**Acceptance:** All pages share consistent nav. Sidebar works on mobile.

---

## Wave 5: Monitoring & Health (Week 5)

Make the system self-aware and resilient.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #639 | Mission control dashboard upgrade | M | CURSOR |
| #641 | AI log summarizer | M | KILO |
| #642 | Daily AI log summarizer and memory curation | M | KILO |
| #547 | Always-on proactive heartbeats | M | CURSOR |
| #520 | Background health checks | M | CURSOR |
| #522 | Remote server health checks | S | CURSOR |
| #524 | Screening external content for prompt injection | S | KILO |
| #521 | Per-channel context separation | M | KILO |

**What to build:**
- Log summarizer: scan `brain/log.md` → extract anomalies + patterns → write to durable
- Heartbeat: periodic Ollama + OpenClaw + Mail health check
- Health dashboard in Mission Control
- Prompt injection screening for user inputs
- Context separation per channel (Mail vs Command vs API)

**Acceptance:** System detects its own failures. Log summaries in durable memory.

---

## Wave 6: Advanced Memory & Learning (Week 6)

Make the Brain truly intelligent.

| # | Title | Effort | Owner |
|---|-------|--------|-------|
| #568 | QMD memory backend support | L | KILO |
| #572 | Integrated mail, memory, browser workflow | L | CURSOR |
| #546 | Snippet capture into organized idea context | M | KILO |
| #646 | Calendar integration for self-improving brain | M | CURSOR |
| #648 | Manager / brain dispatches work to other agents | L | KILO |
| #676 | Memory layer case study | S | KILO |

**What to build:**
- Structured memory backend (upgrade from flat markdown)
- Cross-source learning: Mail → Brain, Calendar → Brain
- Snippet capture from any input → organized in Brain
- Manager agent that dispatches work to sub-agents
- Document the memory system as a case study

**Acceptance:** Brain learns from multiple sources automatically.

---

## Sizing Key

| Size | Effort | Time |
|------|--------|------|
| S | Few hours | < 1 day |
| M | 1-2 days | 1-2 days |
| L | 3-5 days | 3-5 days |

---

## Not In Scope (separate delivery plans)

These are tracked but belong to other delivery tracks:

- **Connectors** (#609, #625, #628, #629, #630, #631, #633): Separate integration plan
- **AI Employees** (#655-#662): Separate employee suite plan
- **Business Models** (#671-#680): Separate monetization plan
- **Multi-agent** (#619, #622, #623): Separate orchestration plan
- **Discord/Telegram** (#620, #621, #624, #663): Separate channel plan
- **DevOps** (#556, #538, #548, #645): Separate ops plan

---

## Immediate Next Actions

1. **Close 6 done issues** (#601, #602, #603, #604, #605, #635)
2. **Start Wave 1** — Brain hardening (auto-learn cron, context capping)
3. **Assign CURSOR** — #647 (autonomous learning) + #614 (session discipline)
4. **Assign KILO** — #564 (durable backbone) + #613 (prompt caching)
