---
name: core_health_checks
description: Run or describe recurring system health checks for reliability signals.
---

# Health Checks

## When to use

Use this skill when the system needs to watch for missed jobs, failures, or degraded conditions.

## What it does

- Identifies important health signals.
- Converts them into a repeatable check routine.
- Separates normal noise from true failure.

## Instructions

- Focus on the smallest meaningful signal set.
- Report actionable failures first.
- Keep the check routine predictable.

## Guardrails

- Do not bury operational failure behind a status summary.
- Do not make checks so broad that they become unusable.

