# Automated Release Gates Mapped to Definition of Done v1

Issue: `mvp-factory-control#707`

## Purpose

Map `definition-of-done.md` and `testing.md` requirements to an automated, machine-checkable release gate.

## Release Gate Artifact Schema

```json
{
  "version": "v1",
  "release": {
    "id": "release-2026-03-26",
    "workItem": "mvp-factory-control#707"
  },
  "dod": {
    "intentClear": true,
    "scopeBounded": true,
    "docsUpdated": true,
    "skillCatalogConsistent": true,
    "plainLanguageHandoff": true,
    "noObviousContradictions": true
  },
  "risk": {
    "higherRisk": true,
    "ocReview": true,
    "securityCheck": true,
    "verificationNotes": true
  },
  "testing": {
    "scopeChecked": true,
    "namingChecked": true,
    "catalogIntegrityChecked": true,
    "docCoherenceChecked": true,
    "workflowClarityChecked": true
  },
  "evidence": {
    "commit": "abcdef1",
    "files": ["README.md"],
    "commands": [
      {
        "command": "npm run release:gates -- releases/sample.release-gate.v1.json",
        "result": "pass"
      }
    ],
    "notes": "Short plain-language summary for OC."
  },
  "decision": {
    "ready": true,
    "blockedBy": []
  }
}
```

## Gate Rules

Hard fail rules:

1. `version` must be `v1`.
2. `release.id` and `release.workItem` must be non-empty.
3. All `dod.*` fields must be `true`.
4. All `testing.*` fields must be `true`.
5. If `risk.higherRisk=true`, then `ocReview`, `securityCheck`, and `verificationNotes` must all be `true`.
6. `evidence.commit` must be non-empty.
7. `evidence.files` must be non-empty.
8. `evidence.notes` must be non-empty.
9. If `decision.ready=true`, `decision.blockedBy` must be empty.
10. If any hard rule fails, release readiness is `FAIL`.

## Validation Command

- `npm run release:gates -- releases/sample.release-gate.v1.json`

## Acceptance Checklist

- [ ] DoD fields are explicitly mapped to machine-checkable booleans
- [ ] testing expectations are explicitly mapped to machine-checkable booleans
- [ ] higher-risk branch rules enforce OC/security/verification requirements
- [ ] validator command returns deterministic pass/fail
- [ ] sample artifact demonstrates full gate shape
