/**
 * Cloudflare D1 型定義（最小サブセット）。
 * NALIPO 等の他プロジェクト DB とは独立 — pizza_lab_* テーブルのみ。
 */

/** Wrangler binding 名（wrangler.toml と一致） */
export const PIZZA_LAB_D1_BINDING = "DB";

/** pizza_lab_* テーブル名 */
export const PIZZA_LAB_TABLES = {
  shops: "pizza_lab_shops",
  profiles: "pizza_lab_profiles",
  learningRuns: "pizza_lab_learning_runs",
  weatherCache: "pizza_lab_weather_cache",
  syncQueue: "pizza_lab_sync_queue",
  dailyPrepRecords: "pizza_lab_daily_prep_records",
  dailyPrepRecordRevisions: "pizza_lab_daily_prep_record_revisions",
} as const;

export type PizzaLabTableName =
  (typeof PIZZA_LAB_TABLES)[keyof typeof PIZZA_LAB_TABLES];

export interface D1Meta {
  duration: number;
  changes: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
}

export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  meta: D1Meta;
  results?: T[];
  error?: string;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/** Worker / API Route が受け取る env（binding: DB） */
export interface PizzaLabD1Env {
  DB: D1Database;
}

/** pizza_lab_shops 行 */
export interface PizzaLabShopRow {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** pizza_lab_profiles 行 */
export interface PizzaLabProfileRow {
  shop_id: string;
  default_preset_id: string | null;
  flour_json: string;
  mixer_json: string;
  method_json: string;
  ddt_json: string;
  presets_json: string;
  learning_json: string;
  schema_version: number;
  updated_at: string;
}

/** pizza_lab_learning_runs 行 */
export interface PizzaLabLearningRunRow {
  id: string;
  shop_id: string;
  mixer_key: string;
  recorded_at: string;
  flour_temp_c: number;
  water_temp_c: number;
  room_temp_c: number;
  predicted_friction_c: number;
  predicted_dough_temp_c: number;
  actual_dough_temp_c: number;
  target_ddt_c: number | null;
  craftsman_score: number | null;
  memo: string | null;
  created_at: string;
}

/** pizza_lab_weather_cache 行 */
export interface PizzaLabWeatherCacheRow {
  cache_key: string;
  latitude: number;
  longitude: number;
  ambient_temp_c: number;
  ambient_humidity_pct: number;
  source: string;
  fetched_at: string;
  expires_at: string;
}

export type SyncQueueEntityType =
  | "shop"
  | "shop_profile"
  | "learning_run"
  | "knowledge_entry";

export type SyncQueueOperation = "upsert" | "delete";

export type SyncQueueStatus = "pending" | "processing" | "done" | "failed";

/** pizza_lab_daily_prep_records 行 */
export interface PizzaLabDailyPrepRecordRow {
  id: string;
  prep_date_jst: string;
  shop_id: string | null;
  total_flour_kg: number;
  baseline_formula_json: string;
  session_adjustment_json: string | null;
  computed_formula_json: string;
  computed_materials_json: string;
  actual_materials_json: string;
  room_temp_c: number | null;
  memo: string | null;
  dough_state_11am: string | null;
  process_readings_json: string | null;
  idempotency_key: string | null;
  weather_snapshot_json: string;
  ai_search_json: string;
  current_revision: number;
  created_at: string;
  updated_at: string;
}

/** pizza_lab_daily_prep_record_revisions 行 */
export interface PizzaLabDailyPrepRecordRevisionRow {
  id: string;
  record_id: string;
  revision_number: number;
  created_at: string;
  change_kind: string;
  record_snapshot_json: string;
}

/** pizza_lab_sync_queue 行 */
export interface PizzaLabSyncQueueRow {
  id: string;
  shop_id: string | null;
  entity_type: SyncQueueEntityType;
  entity_id: string;
  operation: SyncQueueOperation;
  payload_json: string | null;
  client_id: string;
  status: SyncQueueStatus;
  retry_count: number;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

export interface ShopUpsertInput {
  id: string;
  name: string;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  setupCompletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileUpsertInput {
  shopId: string;
  defaultPresetId?: string | null;
  flourJson: string;
  mixerJson: string;
  methodJson: string;
  ddtJson: string;
  presetsJson: string;
  learningJson: string;
  schemaVersion?: number;
  updatedAt: string;
}

export interface SyncQueueEnqueueInput {
  id: string;
  shopId?: string | null;
  entityType: SyncQueueEntityType;
  entityId: string;
  operation: SyncQueueOperation;
  payloadJson?: string | null;
  clientId: string;
  createdAt: string;
}
