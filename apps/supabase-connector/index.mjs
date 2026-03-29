/**
 * Supabase connector — PostgREST previews (#631)
 */

import {
  getSupabaseEnv,
  supabaseSelectRows,
  supabaseHealthPing
} from "../../dashboard/lib/supabase-connector.mjs";
import { loadRegistrySync, miniappRuntimeConfig } from "../../dashboard/lib/miniapp-registry.mjs";

const META = {
  id: "supabase-connector",
  name: "Supabase connector",
  description: "PostgREST health and previews for Lead Enrichment",
  category: "tools",
  issueId: "631"
};

function catalogLinks() {
  const { routes: R } = miniappRuntimeConfig(loadRegistrySync());
  return {
    leadEnrichment: R["lead-enrichment"]?.cardHref ?? "/649/Lead_enrichment"
  };
}

async function processSupabaseConnector(body = {}) {
  const action = String(body.action || "overview");
  const links = catalogLinks();
  if (action === "overview") {
    const env = getSupabaseEnv();
    return {
      ok: true,
      issue: 631,
      title: "Supabase connector",
      summary:
        "PostgREST access for Lead Enrichment (source supabase) and operator previews. Set MEIMEI_SUPABASE_URL and MEIMEI_SUPABASE_SERVICE_ROLE or MEIMEI_SUPABASE_ANON_KEY.",
      configured: env.configured,
      links: {
        leadEnrichment: links.leadEnrichment,
        issue631: "https://github.com/moldovancsaba/mvp-factory-control/issues/631"
      }
    };
  }
  if (action === "health") {
    const testTable = String(body.testTable || body.table || "").trim();
    const ping = await supabaseHealthPing(testTable || null);
    return { ok: true, issue: 631, action: "health", ...ping };
  }
  if (action === "preview_fetch") {
    try {
      const rows = await supabaseSelectRows({
        table: body.table,
        id: body.id,
        idColumn: body.idColumn,
        match: body.match,
        limit: body.limit || 5
      });
      return {
        ok: true,
        issue: 631,
        action: "preview_fetch",
        rowCount: rows.length,
        rows
      };
    } catch (e) {
      return {
        ok: false,
        issue: 631,
        error: e instanceof Error ? e.message : String(e)
      };
    }
  }
  return { ok: false, error: "Unknown action. Use overview, health, or preview_fetch." };
}

async function handleApi(req, body) {
  return processSupabaseConnector(body || {});
}

export { META, handleApi, processSupabaseConnector };
