/**
 * Validate policy objects against schemas/meimei.app.policy.v1.json (MM-KERNEL-302).
 */
import fs from "node:fs";
import path from "node:path";
import { validateManifestAgainstSchema } from "./meimei-app-manifest-validate.mjs";

export function policySchemaPath(repoRoot) {
  return path.join(repoRoot, "schemas", "meimei.app.policy.v1.json");
}

export function loadPolicySchemaSync(repoRoot) {
  return JSON.parse(fs.readFileSync(policySchemaPath(repoRoot), "utf8"));
}

/**
 * @param {string} repoRoot
 * @param {unknown} policy
 * @returns {string[]}
 */
export function validateMeimeiAppPolicyObject(repoRoot, policy) {
  const schema = loadPolicySchemaSync(repoRoot);
  return validateManifestAgainstSchema(schema, policy, "$");
}
