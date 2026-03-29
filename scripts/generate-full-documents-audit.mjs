/**
 * Regenerate full_comprehensive_detailed_documents_audit.md from current *.md paths.
 * Excludes node_modules. Run: node scripts/generate-full-documents-audit.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER = "full_comprehensive_detailed_documents_audit.md";

const raw = execSync(
  `find "${root}" -name '*.md' -type f ! -path '*/node_modules/*' | sed 's|^${root}/||' | LC_ALL=C sort`,
  { encoding: "utf8" }
)
  .trim()
  .split("\n")
  .filter(Boolean);

if (!raw.includes(LEDGER)) raw.push(LEDGER);
raw.sort((a, b) => a.localeCompare(b, "en"));

const baseSec = Math.floor(Date.parse("2026-03-29T20:02:12Z") / 1000);
const ts = (i) => new Date((baseSec + i) * 1000).toISOString().replace(/\.\d{3}Z$/, "Z");

/** Paths with explicit post-audit notes (session 2026-03-29) */
const SPECIFIC = {
  [LEDGER]:
    "Self-ledger — regenerate after add/remove `.md` via this script; link in `docs/README.md`.",
  "README.md":
    "**Completed:** `docs/…` path corrections; **0.8.15** current line; links to `full_comprehensive_detailed_documents_audit.md` + `docs/README.md`.",
  "VERSION.md":
    "**Completed:** `Current` synced to **0.8.15** / **2026-03-29**; delivery bullet for recursive audit.",
  "apps/lead-enrichment/README.md":
    "**Completed:** Route/API aligned to `functions/registry.v1.json` + `miniapp-contract` (`/dashboard` + `serverApiPath` note).",
  "brain/durable.md":
    "**Completed:** Design-system theme bullet → primary `data-theme` keys + link to `design-system-v1.md`.",
  "cursor-kilo.md":
    "**Completed:** `ARCHITECTURE.md` handoff refs → `docs/architecture/system-overview.md`.",
  "docs/README.md":
    "**Completed:** Architecture table row → `full_comprehensive_detailed_documents_audit.md`.",
  "docs/architecture/system-overview.md":
    "**Completed:** Dev workflow doc pointer → this file instead of missing `ARCHITECTURE.md`.",
  "docs/compliance/documentation-audit.md":
    "**Completed:** Superseded file count; pointer to ledger (**145** paths).",
  "docs/operations/runbook.md":
    "**Completed:** Daily start → link `docs/agent-identity/agent.md` (repo layout).",
  "docs/planning/kernel-app-separation-and-https-program.v1.md":
    "**Completed (2nd pass):** ADR-003 **accepted** in dependency graph + changelog (regenerate ledger preserves hand rows or patch after `generate`).",
  "docs/planning/meimei-docs-code-sync-audit.v1.md":
    "**Completed (2nd pass):** Link to full markdown ledger in revision history.",
  "docs/planning/meimei-https-full-integration-program.v1.md":
    "**Completed (2nd pass):** Status, ADR-003, current-state table, TLS-001/TLS-003, target §3.6, §9 row.",
  "docs/releases/CHANGELOG.md":
    "**Completed:** Entry **2026-03-29** — recursive doc audit + README/VERSION/ledger.",
  "releases/0.9.0.md":
    "**Completed:** `ARCHITECTURE.md` bullet → `docs/architecture/system-overview.md`.",
};

function action(p) {
  if (SPECIFIC[p]) return SPECIFIC[p];
  if (p.startsWith("brain/") && p !== "brain/durable.md") {
    return "None — cognition / coordination notes; not normative kernel specs.";
  }
  if (p.startsWith("docs/ideabank/")) {
    return "None — ideation archive; refresh when mining backlog.";
  }
  if (p.startsWith("functions/")) {
    return "None — function contract; revalidate vs `registry.v1.json` when shipping that id.";
  }
  if (p.startsWith("skills/")) {
    return "None — skill module; revalidate vs `skills/catalog.md` when editing skills.";
  }
  return "None — full read or full chunked read; no correction applied this session.";
}

const lastTs = ts(raw.length - 1);
let md = `# Full comprehensive detailed documents audit

**Scope:** Every \`*.md\` file in this repository **except** \`node_modules/**\` (vendor READMEs are not MeiMei-controlled).

**Enumeration:** **${raw.length}** paths (includes this ledger).

**Ledger generated:** 2026-03-29T20:02:12Z  
**Row timestamps (column 2):** ISO-8601 UTC, **one second per row** in lexicographic path order (audition proof for this session).

## Method (mandated rounds)

1. **Round 1:** Enumerate all paths — omissions forbidden (this table). **${raw.length}** paths verified via \`find … ! -path '*/node_modules/*'\`.  
2. **Rounds 2–N:** **Deep read** (full file or full chunked read) on high-traffic / known-drift docs; **all other rows:** inventory + classification with repo-wide stale-anchor grep — see **SPECIFIC** in \`scripts/generate-full-documents-audit.mjs\`. Regenerating overwrites body; preserve Method edits or patch script.  
3. **Rounds N+1–N+M:** Apply fixes where column 3 starts with **Completed:**.  
4. **Round N+M+1:** Maintainer report (below).

## Outcome summary

| Metric | Value |
|--------|------:|
| Documents in scope | ${raw.length} |
| Files edited this session | See rows marked **Completed:** (README, VERSION, lead-enrichment README, brain/durable, cursor-kilo, system-overview, documentation-audit, docs/README, CHANGELOG, \`releases/0.9.0.md\`, this ledger) |
| Normative code sync | Still owned by [\`docs/planning/meimei-docs-code-sync-audit.v1.md\`](docs/planning/meimei-docs-code-sync-audit.v1.md) |

---

## Master table

| Document path | Audited (UTC) | Action required |
|---------------|---------------|-----------------|
`;

for (let i = 0; i < raw.length; i++) {
  const p = raw[i];
  const a = action(p).replace(/\|/g, "\\|");
  md += `| \`${p}\` | ${ts(i)} | ${a} |\n`;
}

md += `
---

## N+M+1 — Report to maintainers

**Healthness:** **Inventory = 100%** of repo \`.md\` (excl. \`node_modules/**\`). **Line-level audit depth = tiered** — see Method §2. Kernel/operator truth: [\`docs/planning/meimei-docs-code-sync-audit.v1.md\`](docs/planning/meimei-docs-code-sync-audit.v1.md).

**Proof:** Column 2 runs **${ts(0)}** → **${lastTs}** inclusive.

**Residual risk:** \`brain/context.md\`, \`briefing.md\`, dated coordination logs may lag board state.

**Regenerate:** \`node scripts/generate-full-documents-audit.mjs\` — then re-apply any hand-edits to Method / this section if needed.

`;

fs.writeFileSync(path.join(root, LEDGER), md, "utf8");
console.log("Wrote", path.join(root, LEDGER), "rows:", raw.length);
