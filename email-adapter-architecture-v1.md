# Email Adapter Architecture v1

Issue: `mvp-factory-control#703`

## Purpose

Define the Email adapter architecture and provider strategy aligned with:

- `channel-adapter-contract-v1.md`
- `channel-adapter-lifecycle-v1.md`

This issue delivers architecture and rollout plan, not full provider implementation.

## Scope

In scope:

- normalized event model for inbound email
- outbound payload model for email delivery
- provider abstraction strategy
- policy and safety gates
- phased rollout with acceptance criteria

Out of scope:

- complete production transport integration in this issue
- inbox UI implementation

## Provider Strategy

Use a provider abstraction so transport can swap without changing adapter lifecycle.

Provider modes:

1. inbound-only (webhook ingestion)
2. outbound-only (send API)
3. full duplex (inbound + outbound)

Candidate providers (selection deferred to implementation issue):

- transactional API provider
- mailbox sync provider
- SMTP relay provider

Selection criteria:

- webhook reliability
- delivery status callbacks
- sender identity/domain support
- operational observability
- rate limit behavior

## Canonical Inbound Normalized Event (Email)

```json
{
  "eventId": "email-evt-001",
  "channel": "email",
  "direction": "inbound",
  "receivedAt": "2026-03-26T13:00:00Z",
  "actor": {
    "userId": "sender@example.com",
    "displayName": "Sender Name"
  },
  "thread": {
    "threadId": "message-thread-id",
    "isGroup": false
  },
  "payload": {
    "text": "plain-text body",
    "attachments": [
      {
        "name": "file.pdf",
        "contentType": "application/pdf",
        "sizeBytes": 120000
      }
    ]
  },
  "meta": {
    "rawProvider": "email-provider",
    "rawType": "inbound-email",
    "subject": "Subject line"
  }
}
```

## Canonical Outbound Payload

```json
{
  "message": "response text",
  "attachments": [],
  "channelHints": {
    "email": {
      "subject": "Generated subject",
      "replyToThreadId": "thread-id",
      "to": ["recipient@example.com"],
      "cc": [],
      "bcc": []
    }
  }
}
```

## Policy and Safety Requirements

Minimum policy gates:

1. sender allow/deny checks
2. domain and thread policy checks
3. outbound action risk tier checks
4. approval requirement checks for sensitive sends

Security constraints:

- strip/ignore executable instruction content in untrusted sources
- attachment processing must be bounded by size/type policy
- secrets and provider credentials remain outside repo content

## Delivery State Model

Email adapter must emit:

- `queued`
- `sent`
- `delivered`
- `failed`
- `blocked`

For email, `delivered` requires provider callback or explicit provider-level delivery confirmation where available.

## Idempotency and Retry

- idempotency key: provider message id or generated `eventId`
- duplicate webhook events must not duplicate dispatch side effects
- retries preserve event id and annotate attempt metadata
- policy-blocked sends are terminal and logged as `blocked`

## Observability Requirements

Required logs per email event:

1. ingress log
2. normalized event log
3. policy decision log
4. dispatch log
5. outbound provider request log
6. delivery state log

## Implementation Phases

### Phase A: Contract and Provider Interface

- define provider adapter interface (`receive`, `send`, `status`)
- define normalized mapping for inbound fixtures
- define outbound mapping from canonical payload

Exit gate:

- fixture-based normalize/send mapping tests pass

### Phase B: Inbound Integration

- bind webhook ingestion path
- parse inbound event to canonical form
- run policy-check and dispatch

Exit gate:

- inbound roundtrip from webhook fixture to dispatch record passes

### Phase C: Outbound Integration

- send through provider abstraction
- capture send response and delivery state
- reconcile thread/reply identifiers

Exit gate:

- outbound send + status transitions are visible and deterministic

### Phase D: Reliability and Hardening

- idempotency guard for duplicate events
- retry rules and dead-letter handling
- rate-limit handling and backoff strategy

Exit gate:

- duplicate and transient-failure tests pass

## Acceptance Checks

- [ ] canonical inbound/outbound email mappings are defined
- [ ] provider abstraction is explicit and transport-agnostic
- [ ] policy and safety checks are explicit and auditable
- [ ] delivery-state transitions are defined and observable
- [ ] idempotency/retry behavior is deterministic
- [ ] phased rollout gates are clear and testable
