# Testing

## Scope

- runtime readiness and launch safety
- miniapp/adapter contract integrity
- release and handoff gate validity
- policy/audit/telemetry correctness
- documentation coherence and version parity

## Current automation

Primary verification commands:

- `npm run readiness`
- `npm run registry:validate`
- `npm run adapter:whatsapp:validate`
- `npm run handoff:validate -- handoffs/sample.stage-gate.v1.json`
- `npm run release:gates -- releases/sample.release-gate.v1.json`
- `npm run policy:validate`
- `npm run audit:validate`
- `npm run telemetry:validate`
- `npm run imessage:validate`

## Manual verification expectations

For major UI/runtime changes:

- load `https://meimei.localhost:8443/dashboard/`
- verify primary routes (`/`, `/knowmore`, `/admin`, and miniapp pages under `/dashboard/<issueId>/<slug>` via the local proxy)
- verify theme and component consistency per design-system rules
- verify no regressions in operator flows (status, settings, command actions)

## Documentation parity checks

For each release:

- `VERSION.md`, `CHANGELOG.md`, and `README.md` version statements must match
- release notes must include objective, impact, and verification path
- architecture and vocabulary docs must reflect current runtime behavior

