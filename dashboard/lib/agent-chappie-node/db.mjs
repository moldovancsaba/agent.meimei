/**
 * Agent.Chappie local SQLite — schema aligned with checklist repo local_store.initialize_local_store.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, "schema.sql");

/** @type {Map<string, DatabaseSync>} */
const pool = new Map();

function readSchema() {
  return fs.readFileSync(SCHEMA_PATH, "utf8");
}

function ensureOptionalColumns(db) {
  const alters = [
    "alter table card_scores add column quarantine_reason text",
    "alter table card_scores add column gate_flags_json text",
    "alter table task_feedback add column action_type text"
  ];
  for (const sql of alters) {
    try {
      db.exec(sql);
    } catch {
      /* duplicate column */
    }
  }
}

/**
 * @param {string} dbPath absolute path to agent_brain.sqlite3
 */
export function openAgentChappieDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(readSchema());
  ensureOptionalColumns(db);
  return db;
}

/**
 * @param {string} dbPath
 * @returns {DatabaseSync}
 */
export function getAgentChappieDb(dbPath) {
  let db = pool.get(dbPath);
  if (!db) {
    db = openAgentChappieDatabase(dbPath);
    pool.set(dbPath, db);
  }
  return db;
}

export function clearAgentChappieDbPool() {
  for (const db of pool.values()) {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
  pool.clear();
}
