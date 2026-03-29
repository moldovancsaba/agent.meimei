/**
 * Paperclip HTTP adapter webhook → MeiMei inference (Ollama via inference route).
 * Optional: POST comment back to Paperclip when PAPERCLIP_API_URL + PAPERCLIP_API_KEY are set.
 *
 * @see https://docs.paperclip.ing/adapters/http.md
 * @see https://docs.paperclip.ing/api/issues.md
 */
import crypto from "node:crypto";
import { handleMeimeiInferenceRoute } from "./inference-route.mjs";

const SECRET_HEADER = "x-meimei-paperclip-secret";

/**
 * @param {import("node:http").IncomingMessage} req
 * @param {unknown} body
 * @returns {Promise<{ status: number, json: object }>}
 */
export async function handlePaperclipMeiBridgePost(req, body) {
  const secret = String(process.env.MEIMEI_PAPERCLIP_BRIDGE_SECRET || "").trim();
  if (!secret) {
    return {
      status: 501,
      json: {
        ok: false,
        error: "MEIMEI_PAPERCLIP_BRIDGE_SECRET is not set; Paperclip bridge is disabled."
      }
    };
  }
  const provided = String(req.headers[SECRET_HEADER] || "").trim();
  if (provided !== secret) {
    return {
      status: 401,
      json: { ok: false, error: "Invalid or missing X-MeiMei-Paperclip-Secret" }
    };
  }

  const traceId = crypto.randomUUID();
  const payload =
    body && typeof body === "object"
      ? body
      : { _raw: body === undefined ? null : String(body) };

  const userContent = buildUserContentFromPaperclipPayload(payload);
  const inferBody = {
    model: "router-auto",
    messages: [
      {
        role: "system",
        content:
          "You are executing a step for a Paperclip agent run. The user message is JSON context from Paperclip (run, agent, company, task). Reply with a concise markdown note: what you infer about the task, suggested next action, and any risks. Keep it under 400 words."
      },
      { role: "user", content: userContent }
    ],
    stream: false,
    meimei: { taskCategory: "reason", localOnly: true }
  };

  const inferResult = await handleMeimeiInferenceRoute(inferBody, { traceId });
  if (inferResult.statusCode !== 200 || !inferResult.json || typeof inferResult.json !== "object") {
    return {
      status:
        inferResult.statusCode >= 400 && inferResult.statusCode < 600 ? inferResult.statusCode : 502,
      json: {
        ok: false,
        error: "inference_failed",
        detail: inferResult.json
      }
    };
  }

  const assistantText = extractAssistantText(inferResult.json);
  const paperclipBase = String(process.env.PAPERCLIP_API_URL || "").replace(/\/$/, "");
  const paperclipKey = String(process.env.PAPERCLIP_API_KEY || "").trim();
  const issueId = resolveIssueIdFromPayload(payload);
  const runId = typeof payload.runId === "string" ? payload.runId.trim() : "";

  let callbackMeta = {};
  if (paperclipBase && paperclipKey && issueId) {
    callbackMeta = await postPaperclipIssueComment({
      base: paperclipBase,
      apiKey: paperclipKey,
      issueId,
      runId,
      bodyMd: assistantText || "(empty model output)"
    });
  }

  return {
    status: 200,
    json: {
      ok: true,
      output: assistantText,
      meimei: inferResult.json.meimei_meta || null,
      paperclip: {
        issueId: issueId || null,
        commentPosted: Boolean(callbackMeta.posted),
        commentStatus: callbackMeta.commentStatus,
        commentError: callbackMeta.commentError
      },
      runId: runId || null
    }
  };
}

/**
 * @param {object} payload
 * @returns {string}
 */
function buildUserContentFromPaperclipPayload(payload) {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

/**
 * @param {object} inferJson
 * @returns {string}
 */
function extractAssistantText(inferJson) {
  const choices = Array.isArray(inferJson.choices) ? inferJson.choices : [];
  const msg = choices[0]?.message?.content;
  return typeof msg === "string" ? msg : "";
}

/**
 * @param {object} payload
 * @returns {string}
 */
function resolveIssueIdFromPayload(payload) {
  const ctx = payload.context && typeof payload.context === "object" ? payload.context : {};
  const taskId = typeof ctx.taskId === "string" ? ctx.taskId.trim() : "";
  if (taskId) return taskId;
  if (typeof payload.taskId === "string") return payload.taskId.trim();
  if (typeof payload.issueId === "string") return payload.issueId.trim();
  return "";
}

/**
 * @param {{ base: string, apiKey: string, issueId: string, runId: string, bodyMd: string }}
 * @returns {Promise<{ posted?: boolean, commentStatus?: number, commentError?: string }>}
 */
async function postPaperclipIssueComment({ base, apiKey, issueId, runId, bodyMd }) {
  const url = `${base}/api/issues/${encodeURIComponent(issueId)}/comments`;
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`
  };
  if (runId) {
    headers["x-paperclip-run-id"] = runId;
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ body: bodyMd })
    });
    if (!res.ok) {
      const t = await res.text();
      return {
        posted: false,
        commentStatus: res.status,
        commentError: t.slice(0, 500)
      };
    }
    return { posted: true, commentStatus: res.status };
  } catch (e) {
    return {
      posted: false,
      commentError: e instanceof Error ? e.message : String(e)
    };
  }
}
