import { evaluateExternalChannelPolicy } from "./external-channel-policy-engine.mjs";

function nowIso() {
  return new Date().toISOString();
}

function normalizeRoutingInput(input, method = "POST") {
  return {
    eventId: `api-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    channel: "api",
    direction: "inbound",
    receivedAt: nowIso(),
    actor: {
      userId: "api-client",
      displayName: "API client"
    },
    thread: {
      threadId: "api-request",
      isGroup: false
    },
    payload: {
      text: "",
      attachments: []
    },
    meta: {
      rawProvider: "dashboard-http",
      rawType: `${method}-model-routing`
    },
    input: {
      channel: String(input.channel || "dashboard"),
      taskType: String(input.taskType || "chat"),
      costTarget: String(input.costTarget || "low"),
      message: String(input.message || ""),
      actionIntent: String(input.actionIntent || "execute"),
      approved: input.approved === true
    }
  };
}

function policyCheck(event) {
  return evaluateExternalChannelPolicy(event.input);
}

export async function routeViaApiAdapter(input, { previewModelRouting, method = "POST" }) {
  const stages = [];
  const event = normalizeRoutingInput(input, method);
  stages.push({ stage: "ingress", at: nowIso() });
  stages.push({ stage: "normalize", at: nowIso(), eventId: event.eventId });

  const policy = policyCheck(event);
  stages.push({ stage: "policy-check", at: nowIso(), allowed: policy.allowed, reason: policy.reason });
  if (!policy.allowed) {
    return {
      ok: false,
      code: 400,
      error: policy.reason,
      adapter: {
        channel: "api",
        lifecycle: stages,
        state: "blocked"
      }
    };
  }

  const route = await previewModelRouting({
    channel: event.input.channel,
    taskType: event.input.taskType,
    costTarget: event.input.costTarget,
    message: event.input.message
  });
  stages.push({ stage: "dispatch", at: nowIso(), ok: true });
  stages.push({ stage: "egress", at: nowIso(), ok: true });
  stages.push({ stage: "delivery-state", at: nowIso(), state: "delivered" });

  return {
    ok: true,
    code: 200,
    route,
    adapter: {
      channel: "api",
      lifecycle: stages,
      state: "delivered"
    }
  };
}
