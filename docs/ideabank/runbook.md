# agent.meimei Ideabank Runbook

Date: 2026-03-23

## Purpose

This is the short execution runbook for agents working the `agent.meimei` ideabank.

Use this for live work.
Use the full manual for doctrine, edge-case reasoning, and policy detail:

- [agent.meimei.ideabank.operations-manual.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.operations-manual.md)

## Canonical Locations

- Repo: `moldovancsaba/mvp-factory-control`
- Board: [MVP Factory Board](https://github.com/users/moldovancsaba/projects/1)
- Inventory: [agent.meimei.ideabank.inventory.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.inventory.md)
- Audit: [agent.meimei.ideabank.audit.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.audit.md)

## Hard Rules

- Work one card at a time only.
- Never reduce source meaning.
- Never create a duplicate casually.
- Always compare against the existing board first.
- Always set board fields.
- Always run validator.
- Always verify board placement.
- Never move to the next card before the current one is fully closed.

## Summary Rule

Every new issue must include a plain-English summary near the top of the body.

Use one short paragraph that tells a product owner:

- what the agent should do
- why it matters
- what the expected result is

Do not bury the meaning inside technical detail.

## Required Board Fields

- `Status`: `IDEA BANK`
- `Agent`: `MeiMei`
- `Product`: `agent.meimei`
- `Type`: `Feature`
- `Priority`: `P0`

## Required Title Format

`agent.meimei #<github_issue_number> P0: <Card Title>`

## Required Card Structure

Every card must contain:

- `## Objective`
- `## Unified Context`
- `## Based On`
- `## Problem`
- `## Goal`
- `## Scope`
- `## Execution Prompt`
- `## Implementation Expectations`
- `## Scope / Non-Goals`
- `## Constraints`
- `## Acceptance Checks`
- `## Dependencies`
- `## Out of Scope`
- `## Risks`
- `## Delivery Artifact`
- `## Developer Notes`

## Decision Flow

For any incoming idea, choose exactly one:

1. Create new card
2. Extend existing card
3. Merge into existing card
4. Reject as duplicate
5. Repair existing card

## Duplicate Check

Ask:

1. Is this the same primitive under different wording?
2. Is this only a sub-feature of an existing card?
3. Does it add a real new control, trust, storage, retrieval, runtime, or governance dimension?
4. Is it just a downstream effect of something already covered?

If same primitive:

- do not create a new card
- merge or extend the canonical card

## Dependency Check

Only list hard prerequisites in `## Dependencies`.

Use a dependency only if the current card cannot be implemented coherently without it.

Do not list:

- adjacent cards
- downstream consumers
- “nice to have” related cards

Check every dependency against the actual board, not memory.

## Creation / Repair Workflow

### 1. Intake

Extract from source:

- temp issue number
- title
- based-on ideas
- problem
- goal
- scope
- implementation notes
- acceptance criteria
- dependencies
- brutal truth

### 2. Compare Against Board

Check:

- exact duplicates
- semantic duplicates
- parent/child overlap
- existing weak card needing repair instead of new creation

### 3. Draft Body

Draft full card locally first.

Requirements:

- preserve source
- enrich into developer-deliverable form
- add unified context
- make scope and constraints operational

### 4. Create Or Edit Issue

For new card:

```bash
gh issue create \
  -R moldovancsaba/mvp-factory-control \
  --title "agent.meimei P0: <Title>" \
  --body-file <draft_file>
```

Then normalize title:

```bash
gh issue edit <issue_number> \
  -R moldovancsaba/mvp-factory-control \
  --title "agent.meimei #<issue_number> P0: <Title>"
```

For repair:

```bash
gh issue edit <issue_number> \
  -R moldovancsaba/mvp-factory-control \
  --body-file <draft_file>
```

### 5. Set Board Fields

```bash
./scripts/mvp-factory-set-project-fields.sh <issue_number> \
  --status 'IDEA BANK' \
  --agent 'MeiMei' \
  --product 'agent.meimei' \
  --type 'Feature' \
  --priority 'P0'
```

### 6. Run Validator

```bash
node ./scripts/mvp-factory-validate-prompt-package.js \
  --issue <issue_number> \
  --repo moldovancsaba/mvp-factory-control \
  --json
```

Required result:

- `valid: true`
- no missing sections
- no weak sections

### 7. Verify Board

```bash
gh issue view <issue_number> \
  -R moldovancsaba/mvp-factory-control \
  --json number,title,url,projectItems
```

Required result:

- issue exists
- title correct
- board item present
- status is `IDEA BANK`

### 8. Fix Any Failure

