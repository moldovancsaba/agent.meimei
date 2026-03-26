#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS: ${message}`);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireObject(obj, field) {
  if (!isObject(obj)) {
    fail(`${field} must be an object`);
    return false;
  }
  return true;
}

function requireNonEmptyString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${field} must be a non-empty string`);
    return false;
  }
  return true;
}

function requireBoolean(value, field) {
  if (typeof value !== "boolean") {
    fail(`${field} must be a boolean`);
    return false;
  }
  return true;
}

function requireAllTrue(obj, fields, parentName) {
  fields.forEach((key) => {
    const field = `${parentName}.${key}`;
    if (!requireBoolean(obj[key], field)) return;
    if (obj[key] !== true) {
      fail(`${field} must be true for release readiness`);
    }
  });
}

function validate(data) {
  if (!requireObject(data, "root")) return;
  if (data.version !== "v1") {
    fail('version must be "v1"');
  }

  if (requireObject(data.release, "release")) {
    requireNonEmptyString(data.release.id, "release.id");
    requireNonEmptyString(data.release.workItem, "release.workItem");
  }

  if (requireObject(data.dod, "dod")) {
    requireAllTrue(
      data.dod,
      [
        "intentClear",
        "scopeBounded",
        "docsUpdated",
        "skillCatalogConsistent",
        "plainLanguageHandoff",
        "noObviousContradictions"
      ],
      "dod"
    );
  }

  if (requireObject(data.testing, "testing")) {
    requireAllTrue(
      data.testing,
      [
        "scopeChecked",
        "namingChecked",
        "catalogIntegrityChecked",
        "docCoherenceChecked",
        "workflowClarityChecked"
      ],
      "testing"
    );
  }

  if (requireObject(data.risk, "risk")) {
    const higherRiskOk = requireBoolean(data.risk.higherRisk, "risk.higherRisk");
    requireBoolean(data.risk.ocReview, "risk.ocReview");
    requireBoolean(data.risk.securityCheck, "risk.securityCheck");
    requireBoolean(data.risk.verificationNotes, "risk.verificationNotes");
    if (higherRiskOk && data.risk.higherRisk) {
      if (data.risk.ocReview !== true) fail("risk.ocReview must be true for higher-risk work");
      if (data.risk.securityCheck !== true) fail("risk.securityCheck must be true for higher-risk work");
      if (data.risk.verificationNotes !== true) fail("risk.verificationNotes must be true for higher-risk work");
    }
  }

  if (requireObject(data.evidence, "evidence")) {
    requireNonEmptyString(data.evidence.commit, "evidence.commit");
    if (!Array.isArray(data.evidence.files) || data.evidence.files.length < 1) {
      fail("evidence.files must be a non-empty array");
    }
    if (!Array.isArray(data.evidence.commands) || data.evidence.commands.length < 1) {
      fail("evidence.commands must be a non-empty array");
    }
    requireNonEmptyString(data.evidence.notes, "evidence.notes");
  }

  if (requireObject(data.decision, "decision")) {
    const readyOk = requireBoolean(data.decision.ready, "decision.ready");
    if (!Array.isArray(data.decision.blockedBy)) {
      fail("decision.blockedBy must be an array");
    } else if (readyOk && data.decision.ready && data.decision.blockedBy.length > 0) {
      fail("decision.blockedBy must be empty when decision.ready=true");
    }
  }
}

async function main() {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: node scripts/validate-release-gates.mjs <path-to-release-gate.json>");
    process.exit(1);
  }
  const filePath = path.isAbsolute(input) ? input : path.resolve(repoRoot, input);
  const raw = await readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  validate(data);
  if (process.exitCode) return;
  pass(`Release gates passed: ${path.relative(repoRoot, filePath)}`);
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
