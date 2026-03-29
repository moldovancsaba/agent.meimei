/**
 * Validates objects against schemas/meimei.app.manifest.v1.json (subset of JSON Schema keywords).
 * Shared by `scripts/validate-meimei-app-manifest.mjs` and `kernel-app-registry.mjs`.
 *
 * @see docs/planning/kernel-app-separation-and-https-program.v1.md (MM-KERNEL-201)
 */
import fs from "node:fs";
import path from "node:path";

/** @param {string} repoRoot */
export function manifestSchemaPath(repoRoot) {
  return path.join(repoRoot, "schemas", "meimei.app.manifest.v1.json");
}

/** @param {string} repoRoot */
export function loadManifestSchemaSync(repoRoot) {
  const p = manifestSchemaPath(repoRoot);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

/**
 * @param {unknown} schema
 * @param {unknown} data
 * @param {string} jsonPath
 * @returns {string[]}
 */
export function validateManifestAgainstSchema(schema, data, jsonPath = "$") {
  const errors = [];
  const p = jsonPath;

  if (schema === true) return errors;
  if (schema === false) {
    errors.push(`${p}: false schema`);
    return errors;
  }
  if (typeof schema !== "object" || schema === null) return errors;

  if ("const" in schema && data !== schema.const) {
    errors.push(`${p}: expected const ${JSON.stringify(schema.const)}, got ${JSON.stringify(data)}`);
  }

  if (Array.isArray(schema.enum) && !schema.enum.includes(data)) {
    errors.push(`${p}: must be one of ${schema.enum.join(", ")}`);
  }

  if (schema.type === "integer") {
    if (typeof data !== "number" || !Number.isInteger(data)) {
      errors.push(`${p}: expected integer`);
    } else if (typeof schema.minimum === "number" && data < schema.minimum) {
      errors.push(`${p}: must be >= ${schema.minimum}`);
    }
  }

  if (schema.type === "string") {
    if (typeof data !== "string") {
      errors.push(`${p}: expected string`);
    } else {
      if (typeof schema.minLength === "number" && data.length < schema.minLength) {
        errors.push(`${p}: minLength ${schema.minLength}`);
      }
      if (typeof schema.maxLength === "number" && data.length > schema.maxLength) {
        errors.push(`${p}: maxLength ${schema.maxLength}`);
      }
      if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(data)) {
        errors.push(`${p}: does not match pattern ${schema.pattern}`);
      }
    }
  }

  if (schema.type === "object") {
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      errors.push(`${p}: expected object`);
      return errors;
    }
    const props = schema.properties && typeof schema.properties === "object" ? schema.properties : {};
    const required = Array.isArray(schema.required) ? schema.required : [];
    for (const key of required) {
      if (!(key in data)) errors.push(`${p}: missing required property "${key}"`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(data)) {
        if (!Object.prototype.hasOwnProperty.call(props, key)) {
          errors.push(`${p}: additional property "${key}" not allowed`);
        }
      }
    }
    for (const key of Object.keys(data)) {
      if (!Object.prototype.hasOwnProperty.call(props, key)) continue;
      errors.push(...validateManifestAgainstSchema(props[key], data[key], `${p}.${key}`));
    }
  }

  if (schema.type === "array") {
    if (!Array.isArray(data)) {
      errors.push(`${p}: expected array`);
      return errors;
    }
    if (typeof schema.minItems === "number" && data.length < schema.minItems) {
      errors.push(`${p}: minItems ${schema.minItems}`);
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      for (const item of data) {
        const key = JSON.stringify(item);
        if (seen.has(key)) errors.push(`${p}: duplicate items (uniqueItems)`);
        seen.add(key);
      }
    }
    const itemSchema = schema.items;
    if (itemSchema && typeof itemSchema === "object") {
      data.forEach((item, i) => {
        errors.push(...validateManifestAgainstSchema(itemSchema, item, `${p}[${i}]`));
      });
    }
  }

  return errors;
}

/**
 * @param {string} repoRoot
 * @param {unknown} manifest
 * @returns {string[]} errors (empty if valid)
 */
export function validateMeimeiAppManifestObject(repoRoot, manifest) {
  const schema = loadManifestSchemaSync(repoRoot);
  return validateManifestAgainstSchema(schema, manifest, "$");
}
