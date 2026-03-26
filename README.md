# agent.meimei

`agent.meimei` is a fresh OpenClaw workspace and product shell for a large-skill agent system.

This repository is the source of truth for:

- the agent identity
- the operating rules
- the skill catalog
- the OpenClaw collaboration model
- the work backlog and release discipline

The project is intentionally markdown-first so it can grow from a clean foundation without hiding important behavior in code.

## What this is

- A product workspace for a long-lived agent named MeiMei.
- A place to define hundreds of skills in a predictable structure.
- A collaboration model where OpenClaw handles orchestration and OC provides human steering and approval.

## What is in the repo

- `agent.md` - identity and behavioral contract.
- `architecture.md` - system shape and boundaries.
- `workflow.md` - intake to delivery flow.
- `runbook.md` - day-to-day operating steps.
- `security.md` - safety and access rules.
- `testing.md` - verification expectations.
- `definition-of-done.md` - shipping bar.
- `skills/` - skill packs and catalog scaffolding.
- `openclaw.config.json` - repo-local OpenClaw config that points the runtime at this workspace.
- `scripts/oc` - wrapper that pins `openclaw` to this repo-local config.
- `scripts/oc-launch` - launch helper for the gateway.
- `scripts/oc-status` - health and readiness helper.
- `Makefile` - convenience targets for launch, status, doctor, skills, and agent turns.
- `dashboard/server.mjs` - localhost control panel for settings and OpenClaw operations.
- `package.json` - `npm run dashboard` entry point for the control panel.

## Current state

This is the foundation layer only.
It is designed to support:

- many reusable skills
- repeatable delivery
- safe collaboration with OC
- future implementation work without rethinking the base structure

## Next step

Start by reading `agent.md`, `architecture.md`, and `skills/catalog.md`.

## Launch

Use one of these from the repo root:

- `./scripts/oc-status`
- `./scripts/oc-launch`
- `make status`
- `make launch`
- `npm run dashboard` then open `http://127.0.0.1:3030`
