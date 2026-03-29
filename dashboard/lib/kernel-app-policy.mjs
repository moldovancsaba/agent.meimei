/**
 * MM-KERNEL-302 — effective capability set = manifest ∪ optional policy overlay (allow/deny).
 * @see schemas/meimei.app.policy.v1.json
 */

/** When manifest omits `capabilities`, façades treat all v1 caps as declared (policy may still restrict). */
export const ALL_KERNEL_POLICY_CAPABILITIES = Object.freeze([
  "inference",
  "jobs.enqueue",
  "jobs.claim",
  "env.read",
  "filesystem.scoped",
  "monitor.read"
]);

/**
 * @param {object} manifest
 * @returns {Set<string>}
 */
export function manifestDeclaredCapabilities(manifest) {
  const req = manifest?.capabilities?.required;
  const opt = manifest?.capabilities?.optional;
  const out = new Set();
  if (Array.isArray(req)) for (const c of req) if (typeof c === "string") out.add(c);
  if (Array.isArray(opt)) for (const c of opt) if (typeof c === "string") out.add(c);
  return out;
}

/**
 * @param {{ manifest: object, policy?: object }} match registry or builtin row
 * @returns {Set<string>}
 */
export function effectiveAllowedCapabilities(match) {
  let base = manifestDeclaredCapabilities(match.manifest);
  if (base.size === 0) {
    base = new Set(ALL_KERNEL_POLICY_CAPABILITIES);
  }
  const pol = match.policy && typeof match.policy === "object" ? match.policy : null;
  if (!pol || pol.schemaVersion !== 1) return base;

  const caps = pol.capabilities;
  if (!caps || typeof caps !== "object") return base;

  let out = new Set(base);
  if (Array.isArray(caps.allow) && caps.allow.length > 0) {
    const allow = new Set(caps.allow.filter((x) => typeof x === "string"));
    out = new Set([...base].filter((c) => allow.has(c)));
  }
  if (Array.isArray(caps.deny)) {
    for (const d of caps.deny) {
      if (typeof d === "string") out.delete(d);
    }
  }
  return out;
}

/**
 * Ensures manifest.required ⊆ effective (e.g. policy cannot strip a required capability).
 * @param {{ manifest: object, policy?: object }} match
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function assertManifestCapabilitiesSatisfiedForDispatch(match) {
  const allowed = effectiveAllowedCapabilities(match);
  const required = match.manifest?.capabilities?.required;
  if (!Array.isArray(required)) return { ok: true };
  for (const r of required) {
    if (typeof r === "string" && !allowed.has(r)) {
      return { ok: false, error: `policy blocks required capability: ${r}` };
    }
  }
  return { ok: true };
}

/**
 * @param {{ manifest: object, policy?: object }} match
 * @param {string} capability
 * @returns {{ ok: true } | { ok: false, status: number, payload: object }}
 */
export function assertCapabilityAllowed(match, capability) {
  const cap = String(capability || "");
  const allowed = effectiveAllowedCapabilities(match);
  if (!allowed.has(cap)) {
    return {
      ok: false,
      status: 403,
      payload: { ok: false, error: "capability_denied", code: "FORBIDDEN", capability: cap }
    };
  }
  return { ok: true };
}

/**
 * @param {object} policy
 * @returns {string[]}
 */
export function policyEnvAllowKeys(policy) {
  const pol = policy && typeof policy === "object" ? policy : null;
  if (!pol || pol.schemaVersion !== 1) return [];
  const keys = pol.env?.allowKeys;
  if (!Array.isArray(keys)) return [];
  return keys.filter((k) => typeof k === "string" && k.length > 0);
}
