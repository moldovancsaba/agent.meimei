create table if not exists system_observations (
              signal_id text primary key,
              project_id text not null,
              competitor text not null,
              region text not null,
              signal_type text not null,
              summary text not null,
              source_ref text not null,
              observed_at text not null,
              confidence real not null,
              business_impact text not null,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              superseded_by text
            );

            create index if not exists idx_local_observations_project_region
              on system_observations(project_id, region, observed_at desc);
            create index if not exists idx_local_observations_competitor
              on system_observations(competitor, observed_at desc);
            create index if not exists idx_local_observations_signal_type
              on system_observations(signal_type, observed_at desc);

            create table if not exists source_snapshots (
              source_ref text primary key,
              project_id text not null,
              source_kind text not null,
              project_summary text not null,
              raw_text text not null,
              competitor text,
              region text,
              source_hash text not null,
              display_label text,
              status text not null default 'processed',
              processing_summary text,
              key_takeaway text,
              business_impact text,
              linked_task_titles_json text,
              source_confidence real,
              signal_count integer not null default 0,
              knowledge_count integer not null default 0,
              last_used_in_checklist integer not null default 0,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists project_knowledge_state (
              project_id text not null,
              region text not null,
              competitor text not null,
              latest_observed_at text not null,
              knowledge_json text not null,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              primary key (project_id, region, competitor)
            );

            create table if not exists monitor_state (
              job_name text primary key,
              last_run_at text,
              last_source_ref text,
              status text not null,
              details_json text,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists managed_sources (
              source_id text primary key,
              project_id text not null,
              label text not null,
              source_kind text not null,
              content_text text not null,
              repeat_interval text not null default 'never',
              repeat_anchor_at text,
              status text not null,
              last_run_at text,
              last_result_status text,
              last_result_summary text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists managed_jobs (
              managed_job_id text primary key,
              project_id text not null,
              name text not null,
              trigger_type text not null,
              schedule_text text,
              status text not null,
              source_id text,
              last_run_at text,
              last_result_status text,
              last_action_summary text,
              last_expected_impact text,
              last_runs_json text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists knowledge_feedback (
              knowledge_id text not null,
              project_id text not null,
              status text not null,
              confidence_source text,
              original_payload_json text,
              corrected_title text,
              corrected_summary text,
              corrected_implication text,
              corrected_potential_moves_json text,
              corrected_items_json text,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              primary key (knowledge_id, project_id)
            );

            create table if not exists draft_knowledge_segments (
              segment_id text primary key,
              project_id text not null,
              segment_kind text not null,
              title text not null,
              segment_text text not null,
              source_refs_json text not null,
              evidence_refs_json text not null,
              importance real not null,
              confidence real not null,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists draft_segment_feedback (
              segment_id text not null,
              project_id text not null,
              status text not null,
              reason text,
              original_payload_json text,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              primary key (segment_id, project_id)
            );

            create table if not exists task_feedback (
              feedback_id text primary key,
              task_id text,
              job_id text not null,
              project_id text not null,
              original_title text not null,
              original_expected_advantage text,
              feedback_type text not null,
              feedback_comment text,
              adjusted_text text,
              replacement_generated integer not null default 0,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists replacement_history (
              replacement_id text primary key,
              project_id text not null,
              prior_task_title text not null,
              replacement_title text not null,
              source_feedback_id text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists generation_memory (
              memory_id text primary key,
              project_id text not null,
              memory_kind text not null,
              pattern_key text not null,
              signal_value text,
              weight real not null default 1.0,
              source_feedback_id text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists project_active_checklist (
              project_id text primary key,
              job_id text not null,
              tasks_json text not null,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists evidence_units (
              unit_id text primary key,
              project_id text not null,
              source_ref text not null,
              unit_kind text not null,
              label text not null,
              excerpt text,
              competitor text,
              segment text,
              channel text,
              section text,
              asset text,
              claim text,
              timing text,
              confidence real not null,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create table if not exists atomic_facts (
              fact_id text primary key,
              project_id text not null,
              source_ref text not null,
              fact_type text not null,
              fact_key text not null,
              fact_value_json text not null,
              clause_text text,
              trace_ref text,
              confidence real not null,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create index if not exists idx_atomic_facts_project_type
              on atomic_facts(project_id, fact_type, created_at desc);

            create table if not exists intelligence_cards (
              card_id text primary key,
              project_id text not null,
              insight text not null,
              implication text not null,
              potential_moves_json text not null,
              segment text,
              competitor text,
              channel text,
              fact_refs_json text not null,
              source_refs_json text not null,
              state text not null default 'candidate',
              expires_at text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create index if not exists idx_intelligence_cards_project_state
              on intelligence_cards(project_id, state, updated_at desc);

            create table if not exists card_scores (
              card_id text primary key references intelligence_cards(card_id) on delete cascade,
              project_id text not null,
              confidence real not null,
              impact_score real not null,
              freshness_score real not null,
              evidence_strength real not null,
              rank_score real not null,
              scored_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create index if not exists idx_card_scores_project_rank
              on card_scores(project_id, rank_score desc, confidence desc);

            create table if not exists card_actions (
              action_id text primary key,
              card_id text not null references intelligence_cards(card_id) on delete cascade,
              project_id text not null,
              action_type text not null,
              note text,
              created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

            create index if not exists idx_card_actions_project
              on card_actions(project_id, created_at desc);

            create table if not exists card_weight_profiles (
              project_id text primary key,
              w_confidence real not null default 0.45,
              w_impact real not null default 0.40,
              w_urgency real not null default 0.15,
              sample_count integer not null default 0,
              updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
            );

create table if not exists flashcard_pipeline_runs (
  run_id text primary key,
  job_id text not null,
  project_id text not null,
  pipeline_source text not null,
  reason text,
  detail_json text,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists idx_flashcard_pipeline_runs_project
  on flashcard_pipeline_runs(project_id, created_at desc);

create table if not exists trinity_atom_progress (
  row_id text primary key,
  project_id text not null,
  job_id text not null,
  atom_index integer not null default -1,
  stage text not null,
  payload_json text not null,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
create index if not exists idx_trinity_progress_project
  on trinity_atom_progress(project_id, created_at desc);

create table if not exists held_tasks (
  held_task_id text primary key,
  project_id text not null,
  original_title text not null,
  original_rank integer,
  held_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status text not null default 'held'
);
