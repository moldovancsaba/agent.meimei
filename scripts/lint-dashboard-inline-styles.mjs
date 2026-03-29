#!/usr/bin/env node
/**
 * Fails if dashboard HTML builders (and a few related shells) reintroduce inline style="" or embedded <style> blocks.
 * Exception: `page-layout.mjs` may use exactly one `style="${style}"` on `.layout-flow` (grid column vars).
 * Strip helpers must not embed the literal substring `<style` (or similar) so this check stays accurate.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const platformDir = path.join(root, "dashboard/lib/platform-pages");
const files = [
  path.join(root, "dashboard/server.mjs"),
  path.join(root, "dashboard/lib/page-layout.mjs"),
  path.join(root, "dashboard/lib/checklist-local-integration.mjs"),
  path.join(root, "apps/checklist/index.mjs"),
  path.join(root, "apps/explain-it/index.mjs"),
  ...fs
    .readdirSync(platformDir)
    .filter((f) => f.endsWith(".mjs"))
    .map((f) => path.join(platformDir, f))
];

/** Only `buildLayoutFlowHtml` may inject grid column CSS variables on `.layout-flow`. */
function isAllowedPageLayoutStyleLine(rel, line) {
  return (
    rel.replace(/\\/g, "/").endsWith("dashboard/lib/page-layout.mjs") &&
    line.includes("layout-flow") &&
    line.includes('style="${style}"')
  );
}

const violations = [];

for (const file of files) {
  const rel = path.relative(root, file);
  const txt = fs.readFileSync(file, "utf8");
  if (txt.includes("<style")) {
    violations.push({ file: rel, reason: "embedded <style> block — move rules to public/styles/design-system.css" });
  }
  const lines = txt.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.includes('style="') && !isAllowedPageLayoutStyleLine(rel, line)) {
      violations.push({ file: rel, line: i + 1, reason: 'inline style=" — use ds-* classes / design tokens' });
    }
  }
}

if (violations.length) {
  console.error("Inline style / embedded stylesheet violations:\n");
  for (const v of violations) {
    console.error(`  ${v.file}${v.line ? `:${v.line}` : ""} — ${v.reason}`);
  }
  process.exit(1);
}

console.log(`OK — ${files.length} file(s) checked (dashboard shells + server + checklist/explain-it apps).`);
