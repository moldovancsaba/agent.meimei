# External-Channel Policy Engine v1 (Risk-Tier Enforcement)

Issue: `mvp-factory-control#708`

## Purpose

Define and enforce policy-as-code checks for outbound actions and high-risk operations across external channels.

## Implementation Surface

- Policy engine module: `dashboard/lib/external-channel-policy-engine.mjs`
- Adapter integration point: `dashboard/lib/api-channel-adapter.mjs`
- API input pass-through: `dashboard/server.mjs`

## Policy Input Contract

```json
{
  "channel": "email",
  "taskType": "research",
  "costTarget": "high",
  "actionIntent": "send",
  "approved": false
}
```

## Policy Output Contract

```json
{
  "allowed": false,
  "reason": "High-risk external-channel action requires explicit approval",
  "riskTier": "high",
  "requiresApproval": true
}
```

## Enforced Rules

1. Reject unknown `channel`, `taskType`, `costTarget`, or `actionIntent`.
2. Classify risk tier (`low`, `medium`, `high`) from channel/task/cost/action signals.
3. Mark high-risk actions with `requiresApproval=true`.
4. Block high-risk actions when explicit approval is not present.
5. Return explicit, operator-readable policy reason on every decision.

## High-Risk Triggers (v1)

- `actionIntent=send` on `email` or `discord`
- `taskType=research` with non-low cost target
- `costTarget=xhigh`

## Validation

- `npm run policy:validate`

Validator confirms:

- unsupported values are blocked
- low-risk action is allowed
- high-risk action without approval is blocked
- high-risk action with approval is allowed

## Acceptance Checklist

- [ ] scope and interfaces are explicit
- [ ] policy engine is integrated into live API adapter path
- [ ] risk tier and approval behavior are deterministic
- [ ] validation checks are automated and inspectable
