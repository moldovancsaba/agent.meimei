#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateExternalChannelPolicy } from "../dashboard/lib/external-channel-policy-engine.mjs";

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

function assert(condition, message) {
  if (!condition) fail(message);
}

const cases = [
  {
    name: "reject unsupported channel",
    input: { channel: "telegram", taskType: "chat", costTarget: "low", actionIntent: "execute" },
    expect: { allowed: false }
  },
  {
    name: "allow low-risk dashboard execute",
    input: { channel: "dashboard", taskType: "chat", costTarget: "low", actionIntent: "execute" },
    expect: { allowed: true, riskTier: "low", requiresApproval: false }
  },
  {
    name: "block high-risk send without approval",
    input: { channel: "email", taskType: "research", costTarget: "high", actionIntent: "send", approved: false },
    expect: { allowed: false, riskTier: "high", requiresApproval: true }
  },
  {
    name: "allow high-risk send with approval",
    input: { channel: "email", taskType: "research", costTarget: "high", actionIntent: "send", approved: true },
    expect: { allowed: true, riskTier: "high", requiresApproval: true }
  }
];

for (const testCase of cases) {
  const actual = evaluateExternalChannelPolicy(testCase.input);
  assert(actual.allowed === testCase.expect.allowed, `${testCase.name}: expected allowed=${testCase.expect.allowed}`);
  if (typeof testCase.expect.riskTier === "string") {
    assert(actual.riskTier === testCase.expect.riskTier, `${testCase.name}: expected riskTier=${testCase.expect.riskTier}`);
  }
  if (typeof testCase.expect.requiresApproval === "boolean") {
    assert(
      actual.requiresApproval === testCase.expect.requiresApproval,
      `${testCase.name}: expected requiresApproval=${testCase.expect.requiresApproval}`
    );
  }
}

if (process.exitCode) {
  process.exit(1);
}
pass(`Validated external-channel policy engine in ${repoRoot}`);
