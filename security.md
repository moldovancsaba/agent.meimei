# Security

## Principles

- Least privilege.
- Explicit approval for sensitive actions.
- No hidden policy changes inside skills.
- No blind trust in external input.

## Workspace safety

- Treat the workspace as persistent but not sacred.
- Keep private keys, secrets, and tokens out of versioned content.
- Do not store production credentials in skill files.

## Skill safety

Each skill must declare its scope clearly.

Skills should avoid:

- ambiguous commands
- unrestricted shell execution
- implicit data exfiltration
- hidden side effects

## Collaboration safety

OC should approve:

- broad architectural changes
- access changes
- anything that materially expands agent autonomy

## Review checklist

Before shipping a change, confirm:

- the change is necessary
- the scope is bounded
- the behavior is documented
- the skill or doc does not overreach

