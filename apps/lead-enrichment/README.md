# Lead Enrichment App

**Issue:** #649
**Category:** Apps
**Route:** `/649/Lead_enrichment`
**API:** `POST /api/functions/lead-enrichment`

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
