/**
 * pizza_lab_daily_prep_records / revisions Repository。
 */

import type {
  DailyPrepRecord,
  DailyPrepRecordRevision,
} from "@/types/daily-prep-record";
import {
  NALIPO_DAILY_PREP_BASELINE,
  type DailyPrepSessionAdjustment,
} from "@/types/daily-prep";
import type {
  DailyPrepAppliedFormula,
  DailyPrepDayBefore,
  DailyPrepDayOf,
} from "@/types/daily-prep";

import { execute, queryAll, queryFirst } from "./d1-client";
import {
  PIZZA_LAB_TABLES,
  type D1Database,
  type PizzaLabDailyPrepRecordRevisionRow,
  type PizzaLabDailyPrepRecordRow,
} from "./d1-types";

const RECORDS = PIZZA_LAB_TABLES.dailyPrepRecords;
const REVISIONS = PIZZA_LAB_TABLES.dailyPrepRecordRevisions;

export async function listDailyPrepRecords(
  db: D1Database,
  limit: number,
): Promise<DailyPrepRecord[]> {
  const rows = await queryAll<PizzaLabDailyPrepRecordRow>(
    db,
    `SELECT * FROM ${RECORDS} ORDER BY prep_date_jst DESC, updated_at DESC LIMIT ?`,
    limit,
  );

  return rows.map(rowToRecord);
}

export async function findDailyPrepRecordByIdempotencyKey(
  db: D1Database,
  key: string,
): Promise<DailyPrepRecord | null> {
  const row = await queryFirst<PizzaLabDailyPrepRecordRow>(
    db,
    `SELECT * FROM ${RECORDS} WHERE idempotency_key = ?`,
    key,
  );

  return row ? rowToRecord(row) : null;
}

export async function findDailyPrepRecordById(
  db: D1Database,
  id: string,
): Promise<DailyPrepRecord | null> {
  const row = await queryFirst<PizzaLabDailyPrepRecordRow>(
    db,
    `SELECT * FROM ${RECORDS} WHERE id = ?`,
    id,
  );

  return row ? rowToRecord(row) : null;
}

export async function insertDailyPrepRecord(
  db: D1Database,
  record: DailyPrepRecord,
): Promise<void> {
  const row = recordToRow(record);

  await execute(
    db,
    `INSERT INTO ${RECORDS} (
      id, prep_date_jst, shop_id, total_flour_kg,
      baseline_formula_json, session_adjustment_json,
      computed_formula_json, computed_materials_json, actual_materials_json,
      room_temp_c, memo, dough_state_11am, process_readings_json, idempotency_key,
      weather_snapshot_json, ai_search_json,
      current_revision, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.prep_date_jst,
    row.shop_id,
    row.total_flour_kg,
    row.baseline_formula_json,
    row.session_adjustment_json,
    row.computed_formula_json,
    row.computed_materials_json,
    row.actual_materials_json,
    row.room_temp_c,
    row.memo,
    row.dough_state_11am,
    row.process_readings_json,
    row.idempotency_key,
    row.weather_snapshot_json,
    row.ai_search_json,
    row.current_revision,
    row.created_at,
    row.updated_at,
  );
}

export async function updateDailyPrepRecord(
  db: D1Database,
  record: DailyPrepRecord,
): Promise<boolean> {
  const row = recordToRow(record);
  const result = await execute(
    db,
    `UPDATE ${RECORDS} SET
      prep_date_jst = ?,
      actual_materials_json = ?,
      room_temp_c = ?,
      memo = ?,
      dough_state_11am = ?,
      process_readings_json = ?,
      ai_search_json = ?,
      current_revision = ?,
      updated_at = ?
     WHERE id = ?`,
    row.prep_date_jst,
    row.actual_materials_json,
    row.room_temp_c,
    row.memo,
    row.dough_state_11am,
    row.process_readings_json,
    row.ai_search_json,
    row.current_revision,
    row.updated_at,
    row.id,
  );

  return result.meta.changes > 0;
}

export async function insertDailyPrepRecordRevision(
  db: D1Database,
  revision: DailyPrepRecordRevision,
): Promise<void> {
  await execute(
    db,
    `INSERT INTO ${REVISIONS} (
      id, record_id, revision_number, created_at, change_kind, record_snapshot_json
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    revision.id,
    revision.recordId,
    revision.revisionNumber,
    revision.createdAt,
    revision.changeKind,
    JSON.stringify(revision.recordSnapshot),
  );
}

export async function listDailyPrepRecordRevisions(
  db: D1Database,
  recordId: string,
): Promise<DailyPrepRecordRevision[]> {
  const rows = await queryAll<PizzaLabDailyPrepRecordRevisionRow>(
    db,
    `SELECT * FROM ${REVISIONS} WHERE record_id = ? ORDER BY revision_number ASC`,
    recordId,
  );

  return rows.map((row) => ({
    id: row.id,
    recordId: row.record_id,
    revisionNumber: row.revision_number,
    createdAt: row.created_at,
    changeKind: row.change_kind as "create" | "update",
    recordSnapshot: JSON.parse(row.record_snapshot_json) as DailyPrepRecord,
  }));
}

function recordToRow(record: DailyPrepRecord): PizzaLabDailyPrepRecordRow {
  return {
    id: record.id,
    prep_date_jst: record.prepDateJst,
    shop_id: record.shopId,
    total_flour_kg: record.totalFlourKg,
    baseline_formula_json: JSON.stringify(record.baselineFormula),
    session_adjustment_json: record.sessionAdjustment
      ? JSON.stringify(record.sessionAdjustment)
      : null,
    computed_formula_json: JSON.stringify(record.computedFormula),
    computed_materials_json: JSON.stringify(record.computedMaterials),
    actual_materials_json: JSON.stringify(record.actualMaterials),
    room_temp_c: record.roomTempC,
    memo: record.memo,
    dough_state_11am: record.doughState11am,
    process_readings_json: JSON.stringify(record.processReadings),
    idempotency_key: record.idempotencyKey ?? null,
    weather_snapshot_json: JSON.stringify(record.weather),
    ai_search_json: JSON.stringify(record.aiSearch),
    current_revision: record.currentRevision,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

function rowToRecord(row: PizzaLabDailyPrepRecordRow): DailyPrepRecord {
  return {
    id: row.id,
    prepDateJst: row.prep_date_jst,
    shopId: row.shop_id,
    totalFlourKg: row.total_flour_kg,
    baselineFormula: JSON.parse(
      row.baseline_formula_json,
    ) as typeof NALIPO_DAILY_PREP_BASELINE,
    sessionAdjustment: row.session_adjustment_json
      ? (JSON.parse(
          row.session_adjustment_json,
        ) as DailyPrepSessionAdjustment)
      : null,
    computedFormula: JSON.parse(
      row.computed_formula_json,
    ) as DailyPrepAppliedFormula,
    computedMaterials: JSON.parse(row.computed_materials_json) as {
      dayBefore: DailyPrepDayBefore;
      dayOf: DailyPrepDayOf;
    },
    actualMaterials: JSON.parse(row.actual_materials_json) as {
      dayBefore: DailyPrepDayBefore;
      dayOf: DailyPrepDayOf;
    },
    roomTempC: row.room_temp_c,
    processReadings: row.process_readings_json
      ? (JSON.parse(row.process_readings_json) as DailyPrepRecord["processReadings"])
      : { prepWaterTempC: null, finalDoughTempC: null },
    idempotencyKey: row.idempotency_key ?? null,
    memo: row.memo,
    doughState11am: row.dough_state_11am as DailyPrepRecord["doughState11am"],
    weather: JSON.parse(row.weather_snapshot_json) as DailyPrepRecord["weather"],
    aiSearch: JSON.parse(row.ai_search_json) as DailyPrepRecord["aiSearch"],
    currentRevision: row.current_revision,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}