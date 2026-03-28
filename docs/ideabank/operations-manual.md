# agent.meimei Ideabank Card Operations Manual

Date: 2026-03-23

## Purpose

This document is the operating manual for creating, refining, auditing, and maintaining `agent.meimei` IDEABANK cards inside the `mvp-factory-control` GitHub issue board.

It is written as an execution protocol for future agents and operators.

The goal is not partial guidance.
The goal is exact repeatability at production-company quality.

This manual defines:

- where ideabank cards live
- what a valid card is
- how a new idea becomes a board card
- how to compare new ideas against the existing portfolio
- how to detect duplicates and merge safely
- how dependency checks must be performed
- how quality control must be run
- how edge cases must be handled
- what an agent is allowed to do and not do

This is the canonical workflow reference for `agent.meimei` ideabank operations.

## Canonical Locations

### Product Name

- `agent.meimei`

### GitHub Repository Used For Ideabank Cards

- `moldovancsaba/mvp-factory-control`

### GitHub Project Board

- [MVP Factory Board](https://github.com/users/moldovancsaba/projects/1)

### Current agent.meimei Issue Range On Board

- GitHub issues `#451` through `#503`

### Current Source Coverage

- temporary `ISSUE 001` through `ISSUE 052`
- temporary `ISSUE 063`

### Supporting Local Files

- Inventory checkpoint: [agent.meimei.ideabank.inventory.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.inventory.md)
- Audit record: [agent.meimei.ideabank.audit.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.audit.md)
- This manual: [agent.meimei.ideabank.operations-manual.md](/Users/moldovancsaba/Projects/agent.meimei/agent.meimei.ideabank.operations-manual.md)

### Supporting Repo Scripts

Located in [scripts](/Users/moldovancsaba/Projects/mvp-factory-control/scripts):

- [mvp-factory-set-project-fields.sh](/Users/moldovancsaba/Projects/mvp-factory-control/scripts/mvp-factory-set-project-fields.sh)
- [mvp-factory-validate-prompt-package.js](/Users/moldovancsaba/Projects/mvp-factory-control/scripts/mvp-factory-validate-prompt-package.js)

## Operating Principles

These rules are mandatory.

### Rule 1: One Card At A Time

Never work on more than one card at once.

A card is not complete until all of the following are true:

- the content is drafted or updated
- the GitHub issue exists or is edited
- the title is normalized
- the project fields are set correctly
- validator passes
- board placement is verified
- any failure is fixed and rechecked

Only after full closure may the next card begin.

## Plain-English Summary Requirement

Every IDEABANK issue must begin with a plain-English summary near the top of the card.

The summary must:

- explain the idea in one clear paragraph
- say what the agent should do
- say why it matters
- state the expected result in ordinary language
- avoid jargon that would confuse product owners

This summary is required, not optional.

### Rule 2: No Information Reduction

Original source information must not be reduced.

The agent may:

- clarify
- structure
- enrich
- operationalize
- expand acceptance logic
- add constraints
- add delivery artifacts
- add developer notes

The agent may not:

- compress away meaning
- remove requirements
- soften hard edges
- dilute scope
- “summarize” the source into something weaker

### Rule 3: Unified Context First

Every card must begin with a coherent unified understanding of the problem.

This is not optional.

The unified context must explain:

- where the card sits in the product
- why it exists
- what failure it prevents
- how it relates to the surrounding architecture

Without this, the card is only a task fragment, not an architecture instrument.

### Rule 4: Cards Must Be Developer-Deliverable

A valid ideabank card is not just a thought.
It must be actionable by developers.

That means the card must specify:

- objective
- problem
- goal
- scope
- execution expectations
- constraints
- acceptance checks
- dependencies
- out-of-scope boundaries
- risks
- delivery artifact

### Rule 5: Quality Control Is Mandatory

A card is not acceptable because it “looks good.”

It must pass:

- structural quality
- validator quality
- board-placement quality
- dependency-quality sanity
- wording-quality sanity

### Rule 6: Board Integrity Matters

The board is not just storage.
It is the system of record for the ideabank.

That means:

- title must be correct
- card must be on the board
- fields must be correct
- numbering drift must be corrected
- duplicates must not be allowed to silently accumulate

## What A Valid Card Must Contain

The operating template used for `agent.meimei` cards is:

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

Not every source issue starts with all of this.
The agent must enrich the source until it reaches this standard.

## Required Board Fields

Every `agent.meimei` ideabank card must have:

- `Status`: `IDEA BANK`
- `Agent`: `MeiMei`
- `Product`: `agent.meimei`
- `Type`: `Feature`
- `Priority`: `P0`

If any of these are wrong, the card is not closed.

## Required Title Format

Title format:

`agent.meimei #<github_issue_number> P0: <Card Title>`

