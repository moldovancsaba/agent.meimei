# Issue merge walkthrough (agent.meimei)

## Purpose

Give OC and MeiMei one repeatable way to **review backlog issues**, **tie them to shipped miniapps**, and **record dependencies** so the board stays honest and the roadmap stays readable.

This is a **human walkthrough**, not an automated merge. The “merge” is merging *intent*: each issue gets a clear home (which miniapp or platform area) and a change type (FR or CR).

## When to run it

- After a batch of new IDEA BANK issues lands.
- Before promoting items to **Ready (NEXT)**.
- Whenever you feel the board and the product story have drifted apart.

## Definitions

- **Miniapp** — A shipped function page + API contract (tracked by a GitHub issue id, e.g. `#516`).
- **FR (feature request)** — New capability or meaningful UX depth **on top of** an existing miniapp (or platform). Delivers new user value; may reuse the same route family.
- **CR (change request)** — Adjust how something **already shipped** behaves: fixes, tightening, policy, copy, performance, or contract-safe refinements. Still tied to a miniapp or platform area.

If something is a **new** surface (not an extension of 516/517/518), it stays a **candidate miniapp** until you split or scope it into its own delivery issue.

## Walkthrough steps (in order)

1. **Pick a slice**  
   Filter the MVP Factory board by product `agent.meimei` (or a milestone). Work in small batches (for example 10–15 issues).

2. **Classify**  
   For each issue, decide:
   - **Target:** which shipped miniapp (`#516`, `#517`, `#518`) or **platform** (dashboard, design system, adapters, ops) or **new miniapp candidate**.
   - **Type:** **FR** or **CR** (or neither — pure doc/ops — then link to repo doc instead of a miniapp).

3. **Dependency**  
   Ask: *Does this only make sense after something else exists?*  
   - If it extends `#516`, it **builds on** `#516` (baseline already shipped).  
   - If it blocks another issue, note **blocked by** / **blocks** in the issue body (GitHub does not always show a single “depends on” field for every account; the body is the durable record).

4. **Edit the issue body**  
   Add or update the block at the **top** of the issue (see template below). Keep the rest of the issue unchanged.

5. **Cross-link (optional but good)**  
   - Comment on the **parent miniapp issue** (e.g. `#516`) with one line: “FR tracked: `#535` …”  
   - Or reference in `product_roadmap.md` so the executive view stays current.

6. **Board fields**  
   Align **Status** with reality (IDEA BANK → Ready when gated). Use **Priority** as you already do. Do not mark **Done** until acceptance is true in the product.

## Issue body template (copy-paste)

Put this at the **top** of the issue, then a horizontal rule, then the existing description.

```markdown
## Product traceability (agent.meimei)

| Field | Value |
|-------|--------|
| **Change type** | FR or CR |
| **Target** | Miniapp `#516` / `#517` / `#518` — *short name* — or Platform: *area* |
| **Relationship** | One sentence: builds on / refines / blocks … |

---
```

## Governance

- **Source of truth for shipped scope** remains this repo (`functions/`, `miniapp-contract-v1.md`, dashboard routes).
- **Source of truth for intent and sequencing** is the board plus `product_roadmap.md`.
- If traceability and code disagree, **fix the docs or the issue** — not the vocabulary.

## Related documents

- [product_roadmap.md](./product_roadmap.md) — executive view of miniapps and FR/CR themes.
- [function-lifecycle.md](./function-lifecycle.md) — how new functions are delivered.
- [miniapp-contract-v1.md](./miniapp-contract-v1.md) — contract shape for miniapps.
