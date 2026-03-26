---
name: core_review
description: Inspect a change for correctness, risk, and missing coverage.
---

# Review

## When to use

Use this skill when a change needs to be checked before shipping or handoff.

## What it does

- Finds regressions and missing assumptions.
- Checks scope and contract drift.
- Highlights risks first.

## Instructions

- Look for concrete failures.
- Prefer line-specific findings.
- Separate severity from style concerns.

## Guardrails

- Do not turn review into a rewrite unless explicitly requested.
- Do not bury the issue under general commentary.

