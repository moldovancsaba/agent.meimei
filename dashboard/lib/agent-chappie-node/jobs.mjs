/**
 * POST /jobs — Node-native pipeline (Ollama via MeiMei llm.mjs), compatible job_result contract.
 */
import crypto from "node:crypto";
import { getAgentChappieDb } from "./db.mjs";
import { callOllamaJson } from "../llm.mjs";

const SIGNAL_TYPES = new Set([
  "pricing_change",
  "opening",
  "closure",
  "staffing",
  "offer",
  "asset_sale",
  "messaging_shift",
  "proof_signal",
  "vendor_adoption"
]);

function normSignal(t) {
  const s = String(t || "").trim();
  return SIGNAL_TYPES.has(s) ? s : "messaging_shift";
}

function sha256Hex(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function validateJobRequest(jr) {
  if (!jr || typeof jr !== "object") throw new Error("job_request required");
  for (const k of ["job_id", "app_id", "project_id", "requested_capability", "submitted_at"]) {
    if (!jr[k] || typeof jr[k] !== "string") throw new Error(`job_request.${k} required`);
  }
  const pc = jr.priority_class;
  const jc = jr.job_class;
  if (!["critical", "normal", "low"].includes(pc)) throw new Error("job_request.priority_class invalid");
  if (!["heavy", "light"].includes(jc)) throw new Error("job_request.job_class invalid");
  const ip = jr.input_payload;
  if (!ip || typeof ip !== "object") throw new Error("job_request.input_payload required");
  const ctxOk = ["meeting_notes", "call_summary", "working_document"].includes(ip.context_type);
  if (!ctxOk) throw new Error("input_payload.context_type invalid");
  if (!ip.prompt || typeof ip.prompt !== "string") throw new Error("input_payload.prompt required");
  if (!Array.isArray(ip.artifacts) || ip.artifacts.length < 1) {
    throw new Error("input_payload.artifacts must be non-empty");
  }
  for (let i = 0; i < ip.artifacts.length; i++) {
    const a = ip.artifacts[i];
    if (!a || a.type !== "upload" || !a.ref) throw new Error(`artifact ${i} invalid`);
  }
}

/**
 * @param {string} dbPath
 * @param {object} payload { job_request, source_package }
 */
export async function processJobPayload(dbPath, payload) {
  validateJobRequest(payload.job_request);
  const jr = payload.job_request;
  const sp = payload.source_package;
  if (!sp || typeof sp !== "object") throw new Error("source_package required");

  const projectId = String(jr.project_id);
  const jobId = String(jr.job_id);
  const rawText = String(sp.raw_text || "");
  const sourceRef = String(sp.source_ref || `source_${jobId}`);
  const sourceKind = String(sp.source_kind || "manual_text");
  const projectSummary = String(sp.project_summary || "managed_on_meimei");
  const competitor = sp.competitor != null ? String(sp.competitor) : null;
  const region = sp.region != null ? String(sp.region) : null;
  const sourceHash = sha256Hex(`${projectId}|${sourceRef}|${rawText.length}|${rawText.slice(0, 8000)}`);

  const db = getAgentChappieDb(dbPath);
  const displayLabel =
    sp.file_name ||
    (rawText.trim()
      ? `${rawText.trim().split(/\n/)[0].split(".")[0].trim().slice(0, 72)}${rawText.length > 72 ? "…" : ""}`
      : sourceRef);

  const insSnap = db.prepare(`
    insert into source_snapshots (
      source_ref, project_id, source_kind, project_summary, raw_text, competitor, region,
      source_hash, display_label, status
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(source_ref) do update set
      project_summary = excluded.project_summary,
      raw_text = excluded.raw_text,
      competitor = excluded.competitor,
      region = excluded.region,
      source_hash = excluded.source_hash,
      display_label = coalesce(source_snapshots.display_label, excluded.display_label),
      status = coalesce(source_snapshots.status, excluded.status)
  `);
  insSnap.run(
    sourceRef,
    projectId,
    sourceKind,
    projectSummary,
    rawText,
    competitor,
    region,
    sourceHash,
    displayLabel,
    "received"
  );

  const prompt = `You are a competitive intelligence analyst. Read the source and return JSON ONLY (no markdown).

Required shape:
{
  "summary": "2-4 sentences for operators",
  "observations": [
    {
      "signal_id": "unique id like obs_1",
      "signal_type": "one of: pricing_change, opening, closure, staffing, offer, asset_sale, messaging_shift, proof_signal, vendor_adoption",
      "competitor": "entity name or Unknown",
      "region": "e.g. US, EU, global",
      "summary": "short signal",
      "confidence": 0.0-1.0,
      "business_impact": "low|medium|high"
    }
  ],
  "recommended_tasks": [
    { "rank": 1, "title": "...", "why_now": "...", "expected_advantage": "...", "evidence_refs": ["obs_1"] },
    { "rank": 2, "title": "...", "why_now": "...", "expected_advantage": "...", "evidence_refs": ["obs_2"] },
    { "rank": 3, "title": "...", "why_now": "...", "expected_advantage": "...", "evidence_refs": ["obs_1"] }
  ]
}

Rules:
- Exactly 3 recommended_tasks with ranks 1,2,3 in order.
- evidence_refs must list signal_id values that exist in observations (repeat allowed).
- At least 1 observation.

Job prompt (context): ${JSON.stringify(jr.input_payload.prompt).slice(0, 2000)}
Source ref: ${sourceRef}
Text (may truncate):
${rawText.slice(0, 14000)}`;

  const llm = await callOllamaJson(prompt, {
    model: "qwen3.5:0.8b",
    temperature: 0.25,
    maxTokens: 4096
  });
  const data = llm.data && typeof llm.data === "object" ? llm.data : {};
  const observationsIn = Array.isArray(data.observations) ? data.observations : [];
  const tasksIn = Array.isArray(data.recommended_tasks) ? data.recommended_tasks : [];
  const summary = String(data.summary || "Source processed by MeiMei native worker.");

  const observedAt = nowIso();
  const obsInsert = db.prepare(`
    insert into system_observations (
      signal_id, project_id, competitor, region, signal_type, summary, source_ref,
      observed_at, confidence, business_impact, superseded_by
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    on conflict(signal_id) do update set
      summary = excluded.summary,
      observed_at = excluded.observed_at,
      confidence = excluded.confidence,
      business_impact = excluded.business_impact
  `);

  const seenIds = new Set();
  for (const o of observationsIn.slice(0, 24)) {
    const sid = String(o.signal_id || `obs_${crypto.randomUUID().slice(0, 8)}`);
    if (seenIds.has(sid)) continue;
    seenIds.add(sid);
    obsInsert.run(
      sid,
      projectId,
      String(o.competitor || "Unknown").slice(0, 200),
      String(o.region || "global").slice(0, 120),
      normSignal(o.signal_type),
      String(o.summary || "").slice(0, 2000),
      sourceRef,
      String(o.observed_at || observedAt),
      Math.min(1, Math.max(0, Number(o.confidence ?? 0.6))),
      ["low", "medium", "high"].includes(String(o.business_impact)) ? o.business_impact : "medium",
      null
    );
  }

  if (seenIds.size === 0) {
    const sid = `obs_${crypto.randomUUID().slice(0, 8)}`;
    obsInsert.run(
      sid,
      projectId,
      "Unknown",
      "global",
      "proof_signal",
      rawText.trim() ? rawText.trim().slice(0, 400) : "Empty source — add content and re-run.",
      sourceRef,
      observedAt,
      0.35,
      "low",
      null
    );
    seenIds.add(sid);
  }

  const allObs = db
    .prepare(
      `select signal_id from system_observations where project_id = ? and superseded_by is null`
    )
    .all(projectId);
  const validRef = new Set(allObs.map((r) => r.signal_id));

  /** @type {Array<{rank:number,title:string,why_now:string,expected_advantage:string,evidence_refs:string[]}>} */
  let tasks = tasksIn
    .filter((t) => t && typeof t === "object")
    .map((t) => ({
      rank: Number(t.rank),
      title: String(t.title || "").slice(0, 500),
      why_now: String(t.why_now || "").slice(0, 800),
      expected_advantage: String(t.expected_advantage || "").slice(0, 800),
      evidence_refs: Array.isArray(t.evidence_refs)
        ? t.evidence_refs.map((x) => String(x)).filter((x) => validRef.has(x))
        : []
    }))
    .filter((t) => t.title);

  if (tasks.length < 3) {
    const filler = Array.from(validRef)[0] || "obs_placeholder";
    while (tasks.length < 3) {
      const r = tasks.length + 1;
      tasks.push({
        rank: r,
        title: `Follow up on source ${sourceRef.slice(0, 40)}`,
        why_now: "MeiMei native worker generated a fallback task to preserve the three-move contract.",
        expected_advantage: "Keeps the workspace actionable while you add richer source text.",
        evidence_refs: [filler].filter((x) => validRef.has(x))
      });
    }
  }
  tasks = tasks.slice(0, 3);
  const firstEvidence = Array.from(validRef)[0];
  for (let i = 0; i < 3; i++) {
    const refs =
      tasks[i].evidence_refs && tasks[i].evidence_refs.length
        ? tasks[i].evidence_refs
        : firstEvidence
          ? [firstEvidence]
          : [];
    tasks[i] = { ...tasks[i], rank: i + 1, evidence_refs: refs };
  }

  db.prepare(`delete from intelligence_cards where project_id = ?`).run(projectId);
  db.prepare(`delete from card_scores where project_id = ?`).run(projectId);

  const insCard = db.prepare(`
    insert into intelligence_cards (
      card_id, project_id, insight, implication, potential_moves_json, segment, competitor, channel,
      fact_refs_json, source_refs_json, state, expires_at, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', null,
      strftime('%Y-%m-%dT%H:%M:%fZ','now'), strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  `);
  const insScore = db.prepare(`
    insert into card_scores (card_id, project_id, confidence, impact_score, freshness_score, evidence_strength, rank_score)
    values (?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < tasks.length; i++) {
    const t = tasks[i];
    const cardId = `meimei:${jobId}:${t.rank}`;
    const moves = [t.why_now.slice(0, 200), t.expected_advantage.slice(0, 200)];
    insCard.run(
      cardId,
      projectId,
      t.title,
      t.why_now,
      JSON.stringify(moves),
      "meimei_native",
      null,
      null,
      JSON.stringify(t.evidence_refs),
      JSON.stringify([sourceRef])
    );
    const rs = 0.95 - i * 0.05;
    insScore.run(cardId, projectId, 0.75, 0.7, 0.65, 0.72, rs);
  }

  db.prepare(
    `insert into project_active_checklist (project_id, job_id, tasks_json, updated_at)
     values (?, ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
     on conflict(project_id) do update set job_id = excluded.job_id, tasks_json = excluded.tasks_json`
  ).run(projectId, jobId, JSON.stringify(tasks));

  const traceRefs = [...new Set(tasks.flatMap((t) => t.evidence_refs))];

  db.prepare(
    `update source_snapshots set
      status = ?, processing_summary = ?, key_takeaway = ?, business_impact = ?,
      linked_task_titles_json = ?, source_confidence = ?, signal_count = ?, knowledge_count = ?,
      last_used_in_checklist = 1
     where source_ref = ?`
  ).run(
    "processed",
    summary.slice(0, 2000),
    summary.slice(0, 400),
    "medium",
    JSON.stringify(tasks.map((t) => t.title)),
    0.72,
    seenIds.size,
    0,
    sourceRef
  );

  db.prepare(
    `insert into flashcard_pipeline_runs (run_id, job_id, project_id, pipeline_source, reason, detail_json)
     values (?, ?, ?, 'meimei_node', '', ?)`
  ).run(`run_${jobId}`, jobId, projectId, JSON.stringify({ engine: "meimei-node", observation_count: seenIds.size }));

  const completedAt = nowIso();
  const job_result = {
    job_id: jobId,
    app_id: String(jr.app_id),
    project_id: projectId,
    status: "complete",
    completed_at: completedAt,
    result_payload: {
      recommended_tasks: tasks,
      summary
    },
    decision_summary: { route: "proceed", confidence: 0.82 },
    trace_run_id: `meimei-node-${jobId}`,
    trace_refs: traceRefs
  };

  return {
    job_result,
    observation_count: seenIds.size,
    observation_refs: Array.from(seenIds)
  };
}
