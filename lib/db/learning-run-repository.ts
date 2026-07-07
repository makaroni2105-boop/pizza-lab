/**
 * pizza_lab_learning_runs Repository。
 */

import type { CraftsmanScore, LearningRun } from "@/lib/learning/learning-types";

import { queryAll, queryFirst, execute } from "./d1-client";
import { PIZZA_LAB_TABLES, type D1Database, type PizzaLabLearningRunRow } from "./d1-types";

const TABLE = PIZZA_LAB_TABLES.learningRuns;

export async function listLearningRunsByShopId(
  db: D1Database,
  shopId: string,
): Promise<LearningRun[]> {
  const rows = await queryAll<PizzaLabLearningRunRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE shop_id = ? ORDER BY recorded_at DESC`,
    shopId,
  );

  return rows.map(rowToLearningRun);
}

export async function findLearningRunById(
  db: D1Database,
  id: string,
): Promise<LearningRun | null> {
  const row = await queryFirst<PizzaLabLearningRunRow>(
    db,
    `SELECT * FROM ${TABLE} WHERE id = ?`,
    id,
  );

  return row ? rowToLearningRun(row) : null;
}

export async function insertLearningRun(db: D1Database, run: LearningRun): Promise<void> {
  const row = learningRunToRow(run);

  await execute(
    db,
    `INSERT OR REPLACE INTO ${TABLE} (
      id, shop_id, mixer_key, recorded_at,
      flour_temp_c, water_temp_c, room_temp_c,
      predicted_friction_c, predicted_dough_temp_c, actual_dough_temp_c,
      target_ddt_c, craftsman_score, memo, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id,
    row.shop_id,
    row.mixer_key,
    row.recorded_at,
    row.flour_temp_c,
    row.water_temp_c,
    row.room_temp_c,
    row.predicted_friction_c,
    row.predicted_dough_temp_c,
    row.actual_dough_temp_c,
    row.target_ddt_c,
    row.craftsman_score,
    row.memo,
    row.created_at,
  );
}

export async function deleteLearningRunById(db: D1Database, id: string): Promise<boolean> {
  const result = await execute(db, `DELETE FROM ${TABLE} WHERE id = ?`, id);
  return result.meta.changes > 0;
}

function rowToLearningRun(row: PizzaLabLearningRunRow): LearningRun {
  return {
    id: row.id,
    shopId: row.shop_id,
    mixerKey: row.mixer_key,
    recordedAt: row.recorded_at,
    snapshot: {
      flourTempC: row.flour_temp_c,
      waterTempC: row.water_temp_c,
      roomTempC: row.room_temp_c,
    },
    predictedFrictionC: row.predicted_friction_c,
    predictedDoughTempC: row.predicted_dough_temp_c,
    actualDoughTempC: row.actual_dough_temp_c,
    targetDdtC: row.target_ddt_c ?? undefined,
    craftsmanScore: (row.craftsman_score ?? undefined) as CraftsmanScore | undefined,
    memo: row.memo,
  };
}

function learningRunToRow(run: LearningRun): PizzaLabLearningRunRow {
  return {
    id: run.id,
    shop_id: run.shopId,
    mixer_key: run.mixerKey,
    recorded_at: run.recordedAt,
    flour_temp_c: run.snapshot.flourTempC,
    water_temp_c: run.snapshot.waterTempC,
    room_temp_c: run.snapshot.roomTempC,
    predicted_friction_c: run.predictedFrictionC,
    predicted_dough_temp_c: run.predictedDoughTempC,
    actual_dough_temp_c: run.actualDoughTempC,
    target_ddt_c: run.targetDdtC ?? null,
    craftsman_score: run.craftsmanScore ?? null,
    memo: run.memo ?? null,
    created_at: run.recordedAt,
  };
}

export { rowToLearningRun, learningRunToRow };
