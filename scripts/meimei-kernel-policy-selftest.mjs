#!/usr/bin/env node
/**
 * MM-KERNEL-302 — policy effective caps + dispatch precondition (no HTTP).
 */
import {
  assertCapabilityAllowed,
  assertManifestCapabilitiesSatisfiedForDispatch,
  effectiveAllowedCapabilities
} from "../dashboard/lib/kernel-app-policy.mjs";

function fail(m) {
  console.error(`FAIL: ${m}`);
  process.exit(1);
}

function ok(m) {
  console.log(`PASS: ${m}`);
}

const baseManifest = {
  capabilities: {
    required: ["inference", "jobs.enqueue"],
    optional: ["monitor.read"]
  }
};

const matchTight = {
  manifest: baseManifest,
  policy: { schemaVersion: 1, capabilities: { allow: ["inference"] } }
};

if (assertManifestCapabilitiesSatisfiedForDispatch(matchTight).ok) {
  fail("expected manifest/policy conflict when jobs.enqueue required but not allowed");
}

const matchOk = {
  manifest: baseManifest,
  policy: { schemaVersion: 1, capabilities: { allow: ["inference", "jobs.enqueue", "monitor.read"] } }
};
if (!assertManifestCapabilitiesSatisfiedForDispatch(matchOk).ok) {
  fail("expected satisfied dispatch for full allow");
}

const denied = assertCapabilityAllowed(matchTight, "jobs.enqueue");
if (denied.ok) fail("expected jobs.enqueue denied under tight allow");

const allowed = assertCapabilityAllowed(matchOk, "inference");
if (!allowed.ok) fail("expected inference allowed");

const eff = effectiveAllowedCapabilities({
  manifest: { capabilities: { required: ["inference"], optional: [] } },
  policy: { schemaVersion: 1, capabilities: { deny: ["inference"] } }
});
if (eff.has("inference")) fail("deny should remove inference");

const emptyManifestInf = assertCapabilityAllowed({ manifest: {}, policy: undefined }, "inference");
if (!emptyManifestInf.ok) fail("empty manifest should allow façade caps until policy restricts");

ok("kernel-app-policy selftest");
