/**
 * AI Routing Tool
 * 
 * Configure model routing and cost control
 * Issue: #517
 */

import { getRoutingConfig, updateRoutingConfig, MODELS, checkOllamaHealth } from "../../dashboard/lib/llm.mjs";

const META = {
  id: "ai-routing",
  name: "AI routing",
  description: "Configure model routing by task type and cost",
  category: "tools",
  issueId: "517"
};

async function handleApi(req, body) {
  const action = String(body.action || "get");

  if (action === "get") {
    const config = getRoutingConfig();
    const health = await checkOllamaHealth();
    return {
      ok: true,
      config,
      models: MODELS,
      availableModels: health.models || [],
      ollamaHealthy: health.healthy
    };
  }

  if (action === "update") {
    const updated = updateRoutingConfig(body);
    return { ok: true, config: updated };
  }

  return { ok: false, error: `Unknown action: ${action}. Valid: get, update` };
}

export { META, handleApi };
