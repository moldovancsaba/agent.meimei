# Discord Adapter Architecture v1

Issue: `mvp-factory-control#704`

## Purpose

Define the Discord adapter architecture and provider strategy aligned with:

- `channel-adapter-contract-v1.md`
- `channel-adapter-lifecycle-v1.md`

This issue delivers architecture and rollout plan, not full production bot implementation.

## Scope

In scope:

- normalized event model for Discord inbound events
- outbound payload model for Discord delivery
- provider abstraction and gateway strategy
- policy and safety gates
- phased rollout with acceptance criteria

Out of scope:

- complete production deployment for Discord bot infrastructure
- advanced moderation or community management features

## Provider Strategy

Use a transport abstraction so lifecycle behavior is stable across Discord gateway/API choices.

Provider modes:

1. gateway event ingestion (WebSocket)
2. outbound message send/edit (REST API)
3. interaction callback handling (slash commands/components)

Selection criteria:

- gateway reconnect reliability
- event ordering and duplicate handling
- API rate-limit behavior and retry signals
- interaction latency and acknowledgement model
- observable delivery-state callbacks

## Canonical Inbound Normalized Event (Discord)

```json
{
  "eventId": "discord-evt-001",
  "channel": "discord",
  "direction": "inbound",
  "receivedAt": "2026-03-26T13:00:00Z",
  "actor": {
    "userId": "discord-user-id",
    "displayName": "username#1234"
  },
  "thread": {
    "threadId": "channel-or-thread-id",
    "isGroup": true
  },
  "payload": {
    "text": "hello from discord",
    "attachments": []
  },
  "meta": {
    "rawProvider": "discord",
    "rawType": "messageCreate",
    "guildId": "server-id"
  }
}
```

## Canonical Outbound Payload

```json
{
  "message": "response text",
  "attachments": [],
  "channelHints": {
    "discord": {
      "targetChannelId": "channel-id",
      "replyToMessageId": "message-id",
      "ephemeral": false
    }
  }
}
```

## Policy and Safety Requirements

Minimum policy gates:

1. guild/channel allowlist checks
2. DM policy checks (allow/deny)
3. command/action risk tier checks
4. approval requirements for sensitive operations

Security constraints:

- treat Discord content as untrusted input
- bound attachment handling by type and size policy
- prevent mention abuse via output sanitization where policy requires

## Delivery State Model

Discord adapter must emit:

- `queued`
- `sent`
- `delivered`
- `failed`
- `blocked`

`delivered` should be tied to successful Discord API acknowledgement or interaction callback confirmation.

## Idempotency and Retry

- idempotency key: Discord event id or normalized `eventId`
- duplicate gateway events must not duplicate side effects
- retry behavior preserves event id with attempt metadata
- policy-blocked actions are terminal `blocked` events

## Observability Requirements

Required logs per Discord event:

1. ingress log
2. normalized event log
3. policy decision log
4. dispatch log
5. outbound API request log
6. delivery state log

## Implementation Phases

### Phase A: Contract and Transport Interface

- define Discord transport interface (`ingest`, `send`, `ack`)
- define normalize mappings for message and interaction fixtures
- define canonical outbound-to-Discord payload mapping

Exit gate:

- normalize and outbound mapping fixture tests pass

### Phase B: Inbound Event Integration

- bind gateway/webhook event ingestion
- normalize inbound message and interaction events
- execute policy-check and dispatch flow

Exit gate:

- inbound fixture roundtrip reaches dispatch deterministically

### Phase C: Outbound Delivery Integration

- send messages via Discord API abstraction
- map acknowledgements into delivery-state events
- support thread/channel reply semantics

Exit gate:

- outbound send + delivery-state transitions are observable and repeatable

### Phase D: Reliability Hardening

- idempotency guard for duplicate events
- retry/backoff for rate-limit and transient API failures
- dead-letter flow for repeated failure scenarios

Exit gate:

- duplicate and transient-failure reliability tests pass

## Acceptance Checks

- [ ] canonical inbound/outbound Discord mappings are defined
- [ ] provider/transport abstraction is explicit and transport-agnostic
- [ ] policy and safety gates are explicit and auditable
- [ ] delivery-state transitions are defined and observable
- [ ] idempotency/retry behavior is deterministic
- [ ] phased rollout gates are clear and testable
