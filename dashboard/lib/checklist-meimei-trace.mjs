/**
 * Writes Checklist Node LLM completions to `meimei_jobs` for System Monitor (R6).
 * Rows use `payload_kind: checklist_trace_v1`, status **completed** — not claimed by workers.
 * @aligned package agent-meimei 0.8.15
 */

import { createMeimeiJobQueue } from "./meimei-job-queue.mjs";

/**
 * @param {string|null|undefined} repoRoot
 * @param {object} opts
 * @param {string} [opts.traceId]
 * @param {string} opts.jobKind
 * @param {string} opts.projectId
 * @param {string} opts.jobId
 * @param {string|null} [opts.model]
 * @param {number|null} [opts.observationCount]
 */
export function recordChecklistInferenceTrace(repoRoot, opts) {
  if (!repoRoot || typeof repoRoot !== "string") return;
  const traceId = (opts.traceId && String(opts.traceId).trim()) || undefined;
  try {
    const queue = createMeimeiJobQueue(repoRoot);
    queue.appendCompletedLedgerRow({
      traceId,
      adapterName: "checklist",
      payload: {
        kind: "checklist_trace_v1",
        checklist: {
          job_kind: String(opts.jobKind || "checklist").slice(0, 64),
          project_id: String(opts.projectId || "").slice(0, 120),
          job_id: String(opts.jobId || "").slice(0, 120),
          model: opts.model != null ? String(opts.model).slice(0, 80) : null
        }
      },
      resultJson: {
        ok: true,
        observation_count:
          opts.observationCount != null && Number.isFinite(Number(opts.observationCount))
            ? Number(opts.observationCount)
            : null
      }
    });
  } catch (err) {
    console.warn(
      "[checklist/monitor-trace]",
      err instanceof Error ? err.message : String(err)
    );
  }
}
