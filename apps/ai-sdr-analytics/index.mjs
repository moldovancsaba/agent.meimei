/**
 * AI SDR analytics — outbound + workflow funnel (#651)
 */

import { buildGtmAnalyticsPayload } from "../../dashboard/lib/gtm-analytics.mjs";
import { loadRegistrySync, miniappRuntimeConfig } from "../../dashboard/lib/miniapp-registry.mjs";

const META = {
  id: "ai-sdr-analytics",
  name: "AI SDR analytics",
  description: "Operator dashboard for outbound metrics and lead workflow funnel",
  category: "apps",
  issueId: "651"
};

function catalogLinks() {
  const { routes: R } = miniappRuntimeConfig(loadRegistrySync());
  return {
    leadOutreach: R["lead-outreach"]?.cardHref ?? "/653/Lead_outreach",
    leadEnrichment: R["lead-enrichment"]?.cardHref ?? "/649/Lead_enrichment"
  };
}

async function processAiSdrAnalytics(body = {}, repoRoot) {
  const action = String(body.action || "overview");
  const links = catalogLinks();
  if (action === "overview") {
    return {
      ok: true,
      issue: 651,
      title: "AI SDR analytics",
      summary:
        "Unified view of outbound events (#654 JSONL) and lead workflow queue (#650). Local files only; both paths are gitignored.",
      links: {
        leadOutreach: links.leadOutreach,
        leadEnrichment: links.leadEnrichment,
        issue651: "https://github.com/moldovancsaba/mvp-factory-control/issues/651"
      }
    };
  }
  if (action === "metrics") {
    const payload = await buildGtmAnalyticsPayload(repoRoot);
    return { ok: true, ...payload };
  }
  return { ok: false, error: "Unknown action. Use overview or metrics." };
}

async function handleApi(req, body, repoRoot) {
  return processAiSdrAnalytics(body || {}, repoRoot);
}

export { META, handleApi, processAiSdrAnalytics };
