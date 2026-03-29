# Lead Enrichment App

**Issue:** #649
**Category:** Apps
**Route (browser / contract):** `/dashboard/649/Lead_enrichment` (see `functions/registry.v1.json`)

**API (contract path):** `POST /dashboard/api/functions/lead-enrichment` — upstream Node matches `/api/functions/lead-enrichment` after `serverApiPath()` (see `docs/architecture/miniapp-contract-v1.md`).

## Description

Enriches contacts and companies with structured sales data for personalized outreach campaigns.

## API

### Request

```json
{
  "source": "linkedin|email|company|phone",
  "sourceData": {
    "profileUrl": "...",
    "email": "...",
    "domain": "...",
    "phone": "..."
  },
  "enrichmentLevel": "basic|standard|full",
  "priority": "low|medium|high"
}
```

### Response

```json
{
  "ok": true,
  "lead": {
    "id": "enriched_abc123",
    "source": "email",
    "sourceData": {...},
    "profile": {
      "name": "John Doe",
      "title": "CEO",
      "company": "acme.com"
    },
    "signals": [...],
    "priority": "high"
  },
  "audit": {...}
}
```

## Test

```bash
curl -s -X POST http://127.0.0.1:45285/api/functions/lead-enrichment \
  -H "content-type: application/json" \
  -d '{"source":"email","sourceData":{"email":"john@acme.com"}}'
```

## Dependencies

- `dashboard/lib/llm.mjs` (callOllamaJson)
- `dashboard/lib/brain/index.mjs` (brain.log)
- Ollama at localhost:11434

## Status

✅ Production — uses real Ollama LLM
