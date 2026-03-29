/**
 * Human-readable rows for GET /api/meimei/monitor/feed (Milestone H).
 * Does not embed full payloads or large result bodies — only summaries and artifact paths.
 */

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(ms) {
  const d = new Date(Number(ms) || 0);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function statusEmoji(status) {
  switch (String(status || "")) {
    case "pending":
      return "🟡";
    case "processing":
      return "🔵";
    case "completed":
      return "🟢";
    case "failed":
      return "🔴";
    default:
      return "⚪";
  }
}

function fmtAdapterName(a) {
  if (a == null || a === "") return "—";
  const s = String(a);
  const m = s.match(/^reference-app-(\d+)$/i);
  if (m) return `Ref-${m[1]}`;
  return s.replace(/_/g, "-");
}

function safeParseJson(s) {
  try {
    return JSON.parse(String(s || ""));
  } catch {
    return null;
  }
}

function inferIntentAndHint(kind, parsed) {
  if (kind === "checklist_trace_v1") {
    const c = parsed && typeof parsed === "object" && parsed.checklist ? parsed.checklist : null;
    const jk = c && c.job_kind != null ? String(c.job_kind).slice(0, 48) : "checklist";
    const pid = c && c.project_id != null ? String(c.project_id).slice(0, 32) : "";
    const hint = pid ? `project=${pid}` : "";
    return { intent: jk, hint };
  }
  if (kind !== "app_task" && kind !== "inference_v1") {
    const k = kind != null && String(kind).trim() ? String(kind).trim() : "unknown_kind";
    return { intent: k, hint: "" };
  }
  if (!parsed || typeof parsed !== "object") {
    return { intent: kind === "app_task" ? "app_task" : "inference_v1", hint: "" };
  }
  if (kind === "app_task") {
    const inner = parsed.payload;
    if (inner && typeof inner === "object") {
      const intent = inner.intent != null ? String(inner.intent) : null;
      const hints = [];
      if (inner.nonce) hints.push(`nonce=${String(inner.nonce).slice(0, 8)}…`);
      if (inner.date) hints.push(`date=${inner.date}`);
      if (inner.scope) hints.push(`scope=${String(inner.scope).slice(0, 24)}`);
      return { intent, hint: hints.join(" ") };
    }
    return { intent: null, hint: "" };
  }
  const req = parsed.request;
  const msgs = req && Array.isArray(req.messages) ? req.messages : [];
  let lastUser = "";
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i] && msgs[i].role === "user" && typeof msgs[i].content === "string") {
      lastUser = msgs[i].content;
      break;
    }
  }
  const snippet = lastUser.replace(/\s+/g, " ").trim().slice(0, 72);
  return {
    intent: "inference_v1",
    hint: snippet ? `"${snippet}${lastUser.length > 72 ? "…" : ""}"` : ""
  };
}

function extractArtifactPath(parsedPayload, resultParsed) {
  if (parsedPayload && typeof parsedPayload === "object") {
    if (typeof parsedPayload.artifact_path === "string" && parsedPayload.artifact_path.trim()) {
      return parsedPayload.artifact_path.trim();
    }
    const inner = parsedPayload.payload;
    if (inner && typeof inner === "object" && typeof inner.artifact_path === "string" && inner.artifact_path.trim()) {
      return inner.artifact_path.trim();
    }
  }
  if (resultParsed && typeof resultParsed === "object" && typeof resultParsed.artifact_path === "string") {
    const p = resultParsed.artifact_path.trim();
    if (p) return p;
  }
  return null;
}

function buildDisplayLine(row, kind, intent, hint, artifactPath) {
  const ts = formatTime(row.created_at);
  const dot = statusEmoji(row.status);
  let flow;
  let label = intent || (kind === "app_task" ? "app_task" : "inference_v1");
  if (kind === "app_task") {
    const src = fmtAdapterName(row.source_adapter);
    const tgt = fmtAdapterName(row.target_adapter);
    if (row.source_adapter && row.target_adapter) {
      flow = `${src} ➔ ${tgt}`;
    } else if (row.target_adapter) {
      flow = `→ ${tgt}`;
    } else {
      flow = fmtAdapterName(row.adapter_name);
    }
  } else {
    flow = fmtAdapterName(row.adapter_name);
  }
  let line = `[${ts}] ${dot} ${flow} : [${label}]`;
  if (hint) line += ` ${hint}`;
  if (artifactPath) line += ` 📎`;
  return line;
}

/**
 * @param {object} row meimei_jobs row
 */
export function formatMonitorRow(row) {
  const parsed = safeParseJson(row.payload);
  let kind = "inference_v1";
  const pk = row.payload_kind != null && String(row.payload_kind).trim() !== "" ? String(row.payload_kind).trim() : null;
  if (pk === "app_task") kind = "app_task";
  else if (pk === "inference_v1") kind = "inference_v1";
  else if (pk) kind = pk;
  else if (parsed?.kind === "app_task") kind = "app_task";
  else if (parsed?.kind != null && String(parsed.kind).trim() !== "") kind = String(parsed.kind).trim();
  const { intent, hint } = inferIntentAndHint(kind, parsed);
  const resultParsed = row.result_json ? safeParseJson(row.result_json) : null;
  const artifactPath = extractArtifactPath(parsed, resultParsed);

  const errorSnippet =
    row.status === "failed" && row.error_message
      ? String(row.error_message).replace(/\s+/g, " ").trim().slice(0, 160)
      : null;

  let displayLine = buildDisplayLine({ ...row, payload_kind: kind }, kind, intent, hint, artifactPath);
  if (errorSnippet) displayLine += ` — ERROR: ${errorSnippet}`;

  return {
    id: Number(row.id),
    trace_id: String(row.trace_id || ""),
    payload_kind: kind,
    status: String(row.status || ""),
    adapter_name: row.adapter_name != null ? String(row.adapter_name) : "",
    direction: String(row.direction || ""),
    target_adapter: row.target_adapter != null ? String(row.target_adapter) : null,
    source_adapter: row.source_adapter != null ? String(row.source_adapter) : null,
    created_at: Number(row.created_at) || 0,
    updated_at: Number(row.updated_at) || 0,
    display_line: displayLine,
    intent: intent || (kind === "inference_v1" ? "inference_v1" : null),
    artifact_path: artifactPath,
    error_snippet: errorSnippet
  };
}

/**
 * @param {object[]} rows
 */
export function formatMonitorFeedRows(rows) {
  return rows.map(formatMonitorRow);
}
