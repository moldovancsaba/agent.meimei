# Project Vocabulary v1

## Purpose

Define one canonical vocabulary for `agent.meimei` so architecture, issues, release notes, and runtime docs use consistent terms.

## Canonical terms

- **MeiMei:** The product agent identity and operator-facing experience in this repository.
- **OC:** Human control partner responsible for priorities, approvals, and acceptance.
- **OpenClaw:** Runtime/orchestration stack used by MeiMei.
- **Miniapp:** A user-facing capability delivered under the miniapp contract standard.
- **Function page:** A dashboard route implementing a miniapp UI flow.
- **Adapter:** Channel integration component that normalizes ingress and delivery lifecycle behavior.
- **Policy engine:** Deterministic rule evaluator that allows/blocks/risk-classifies actions.
- **Readiness gate:** Unified go/no-go operational check before launch/release.
- **Release gate:** Machine-checkable rule set mapped to DoD/testing for release decisioning.
- **Handoff artifact:** Structured inter-role delivery record used for stage-gate transitions.
- **Audit trail:** Append-only, hash-chained event log for decisions/actions.
- **Reliability telemetry:** Event stream and summary metrics used for reliability/SLO visibility.
- **Design system:** Centralized token + component model in `public/styles/design-system.css`.
- **Theme:** Visual token profile selected via `data-theme` (green, blue, orange, red).

## Style and wording rules

- Use **must** for hard requirements.
- Use **should** for strong recommendations.
- Use **may** for optional behavior.
- Avoid slang, emotional phrasing, and ambiguous shorthand in core documentation.
- Keep issue/release wording focused on:
  - objective
  - impact
  - verification path

## Release-note wording standard

Each release note item should answer:

1. What changed?
2. Why it matters?
3. How to verify/use it?

Recommended bullet format:

- `Changed:` concise technical change.
- `Impact:` user/operator outcome.
- `Verify:` command/route or artifact to confirm.
