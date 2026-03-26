const allowedChannels = new Set(["dashboard", "whatsapp", "imessage", "discord", "email", "api", "internal-ops"]);
const allowedTaskTypes = new Set(["chat", "summary", "research", "review", "utility", "general"]);
const allowedCostTargets = new Set(["low", "medium", "high", "xhigh"]);
const allowedActionIntents = new Set(["reply", "send", "execute"]);

function blocked(reason, riskTier = "low", requiresApproval = false) {
  return { allowed: false, reason, riskTier, requiresApproval };
}

function allowed(reason, riskTier = "low", requiresApproval = false) {
  return { allowed: true, reason, riskTier, requiresApproval };
}

function classifyRiskTier({ channel, taskType, costTarget, actionIntent }) {
  if (actionIntent === "send" && (channel === "email" || channel === "discord")) return "high";
  if (taskType === "research" && costTarget !== "low") return "high";
  if (costTarget === "xhigh") return "high";
  if (costTarget === "high" || taskType === "review") return "medium";
  return "low";
}

export function evaluateExternalChannelPolicy(input) {
  const channel = String(input.channel || "").trim();
  const taskType = String(input.taskType || "").trim();
  const costTarget = String(input.costTarget || "").trim();
  const actionIntent = String(input.actionIntent || "execute").trim();
  const approved = input.approved === true;

  if (!allowedChannels.has(channel)) return blocked(`Unsupported channel: ${channel}`);
  if (!allowedTaskTypes.has(taskType)) return blocked(`Unsupported taskType: ${taskType}`);
  if (!allowedCostTargets.has(costTarget)) return blocked(`Unsupported costTarget: ${costTarget}`);
  if (!allowedActionIntents.has(actionIntent)) return blocked(`Unsupported actionIntent: ${actionIntent}`);

  const riskTier = classifyRiskTier({ channel, taskType, costTarget, actionIntent });
  const requiresApproval = riskTier === "high";
  if (requiresApproval && !approved) {
    return blocked("High-risk external-channel action requires explicit approval", riskTier, true);
  }

  return allowed("allow by external-channel policy engine", riskTier, requiresApproval);
}
