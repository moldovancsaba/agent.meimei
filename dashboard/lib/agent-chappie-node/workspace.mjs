/**
 * Build GET /projects/:id/workspace payload (subset of Python build_workspace_payload).
 */
import { getAgentChappieDb } from "./db.mjs";

function parseJsonArray(s, fallback = []) {
  if (!s) return fallback;
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

/**
 * @param {string} dbPath
 * @param {string} projectId
 */
export function buildWorkspacePayload(dbPath, projectId) {
  const db = getAgentChappieDb(dbPath);

  const sourceRows = db
    .prepare(
      `select source_ref, source_kind, created_at, raw_text, status, processing_summary,
              key_takeaway, business_impact, linked_task_titles_json, source_confidence,
              signal_count, knowledge_count, last_used_in_checklist
       from source_snapshots where project_id = ? order by created_at desc limit 40`
    )
    .all(projectId);

  const observationRows = db
    .prepare(
      `select signal_id, signal_type, summary, observed_at, source_ref
       from system_observations
       where project_id = ? and superseded_by is null
       order by observed_at desc limit 200`
    )
    .all(projectId);

  const intelRows = db
    .prepare(
      `select ic.card_id, ic.project_id, ic.insight, ic.implication, ic.potential_moves_json,
              ic.segment, ic.competitor, ic.channel, ic.fact_refs_json, ic.source_refs_json,
              ic.state, ic.expires_at,
              cs.confidence, cs.impact_score, cs.freshness_score, cs.evidence_strength, cs.rank_score,
              cs.quarantine_reason, cs.gate_flags_json
       from intelligence_cards ic
       left join card_scores cs on ic.card_id = cs.card_id
       where ic.project_id = ?
       order by ic.updated_at desc`
    )
    .all(projectId);

  const intelligence_cards = intelRows.map((row) => ({
    card_id: row.card_id,
    project_id: row.project_id,
    insight: row.insight,
    implication: row.implication,
    potential_moves: parseJsonArray(row.potential_moves_json),
    fact_refs: parseJsonArray(row.fact_refs_json),
    source_refs: parseJsonArray(row.source_refs_json),
    segment: row.segment || "",
    competitor: row.competitor,
    channel: row.channel,
    state: row.state || "candidate",
    expires_at: row.expires_at,
    confidence: Number(row.confidence ?? 0.6),
    impact_score: Number(row.impact_score ?? 0.5),
    freshness_score: Number(row.freshness_score ?? 0.5),
    evidence_strength: Number(row.evidence_strength ?? 0.5),
    rank_score: Number(row.rank_score ?? 0.5),
    quarantine_reason: row.quarantine_reason,
    gate_flags: row.gate_flags_json ? parseJsonArray(row.gate_flags_json) : []
  }));

  const visible_intelligence_cards = intelligence_cards.filter((c) => c.state === "active");

  const managed_sources = db
    .prepare(
      `select source_id, project_id, label, source_kind, content_text, repeat_interval,
              repeat_anchor_at, status, last_run_at, last_result_status, last_result_summary,
              created_at, updated_at
       from managed_sources where project_id = ? order by updated_at desc`
    )
    .all(projectId);

  const managedJobRows = db
    .prepare(
      `select managed_job_id, project_id, name, trigger_type, schedule_text, status, source_id,
              last_run_at, last_result_status, last_action_summary, last_expected_impact, last_runs_json,
              created_at, updated_at
       from managed_jobs where project_id = ? order by updated_at desc`
    )
    .all(projectId);

  const managed_jobs = managedJobRows.map((j) => {
    const { last_runs_json, ...rest } = j;
    return { ...rest, last_runs: parseJsonArray(last_runs_json) };
  });

  let latest_flashcard_pipeline_run = null;
  const pipeRow = db
    .prepare(
      `select run_id, job_id, project_id, pipeline_source, reason, detail_json, created_at
       from flashcard_pipeline_runs where project_id = ? order by created_at desc limit 1`
    )
    .get(projectId);
  if (pipeRow) {
    let detail = {};
    try {
      detail = pipeRow.detail_json ? JSON.parse(pipeRow.detail_json) : {};
    } catch {
      detail = {};
    }
    latest_flashcard_pipeline_run = {
      run_id: pipeRow.run_id,
      job_id: pipeRow.job_id,
      project_id: pipeRow.project_id,
      pipeline_source: pipeRow.pipeline_source,
      reason: pipeRow.reason || "",
      detail,
      created_at: pipeRow.created_at
    };
  }

  const market_summary = {
    pricing_changes: observationRows.filter((r) => r.signal_type === "pricing_change").length,
    closure_signals: observationRows.filter((r) => r.signal_type === "closure").length,
    offer_signals: observationRows.filter((r) => r.signal_type === "offer" || r.signal_type === "asset_sale")
      .length
  };

  return {
    project_id: projectId,
    recent_sources: sourceRows.slice(0, 5).map((row) => ({
      source_ref: row.source_ref,
      source_kind: row.source_kind,
      created_at: row.created_at,
      preview: String(row.raw_text || "").slice(0, 220)
    })),
    recent_activity: observationRows.slice(0, 6).map((row) => ({
      signal_id: row.signal_id,
      signal_type: row.signal_type,
      summary: row.summary,
      observed_at: row.observed_at,
      source_ref: row.source_ref
    })),
    market_summary,
    fact_chips: [],
    intelligence_cards,
    visible_intelligence_cards,
    latest_flashcard_pipeline_run,
    draft_segments: [],
    competitive_snapshot: {
      pricing_position: "",
      acquisition_strategy_comparison: "",
      active_threats: [],
      immediate_opportunities: [],
      reference_competitor: ""
    },
    knowledge_summary: [],
    monitor_jobs: [],
    knowledge_cards: [],
    source_cards: sourceRows.slice(0, 12).map((row) => ({
      source_ref: row.source_ref,
      label: row.source_ref,
      source_kind: row.source_kind,
      status: row.status || "processed",
      processing_summary: row.processing_summary || "",
      last_used_in_checklist: Boolean(row.last_used_in_checklist),
      signal_count: row.signal_count ?? 0,
      key_takeaway: row.key_takeaway || "",
      business_impact: row.business_impact || "",
      linked_tasks: parseJsonArray(row.linked_task_titles_json),
      confidence: row.source_confidence ?? 0.58,
      created_at: row.created_at,
      preview: String(row.raw_text || "").slice(0, 220)
    })),
    managed_sources,
    managed_jobs
  };
}
