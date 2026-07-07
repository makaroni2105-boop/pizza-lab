/**
 * Pizza-Lab D1 Repository 層 — 公開 API。
 * UI / localStorage からはまだ呼ばない（Phase 3a 雛形）。
 */

export {
  PIZZA_LAB_D1_BINDING,
  PIZZA_LAB_TABLES,
  type D1Database,
  type PizzaLabD1Env,
  type PizzaLabShopRow,
  type PizzaLabProfileRow,
  type PizzaLabLearningRunRow,
  type PizzaLabWeatherCacheRow,
  type PizzaLabSyncQueueRow,
  type ShopUpsertInput,
  type ProfileUpsertInput,
  type SyncQueueEnqueueInput,
  type SyncQueueEntityType,
  type SyncQueueOperation,
  type SyncQueueStatus,
} from "./d1-types";

export {
  nowIso,
  buildWeatherCacheKey,
  queryAll,
  queryFirst,
  execute,
} from "./d1-client";

export { getOptionalRequestDb } from "./get-request-db";

export {
  findShopById,
  listActiveShops,
  upsertShop,
  softDeleteShop,
  shopRowToLocation,
} from "./shop-repository";

export {
  findProfileByShopId,
  upsertProfile,
  profileRowToShopProfileParts,
  shopProfileToProfileUpsert,
  shopProfileToShopUpsert,
  shopRowToShopProfile,
  findShopProfileById,
  listShopProfiles,
  upsertShopProfile,
  softDeleteShopProfile,
} from "./profile-repository";

export {
  listLearningRunsByShopId,
  findLearningRunById,
  insertLearningRun,
  deleteLearningRunById,
  rowToLearningRun,
  learningRunToRow,
} from "./learning-run-repository";

export {
  findValidWeatherCache,
  findValidWeatherCacheByCoordinates,
  findValidWeatherCacheEntry,
  upsertWeatherCache,
  deleteExpiredWeatherCache,
  weatherCurrentToExpiresAtIso,
} from "./weather-cache-repository";

export {
  enqueueSyncItem,
  listPendingSyncItems,
  updateSyncItemStatus,
  incrementSyncRetry,
} from "./sync-queue-repository";

export {
  getDefaultSyncQueueMemoryStore,
  resetDefaultSyncQueueMemoryStore,
  rowToSyncQueueItem,
  SyncQueueMemoryStore,
  type SyncQueueItem,
} from "./sync-queue-memory-store";

/** 単体テスト専用 */
export { createMemoryD1, MemoryD1Database } from "./d1-mock";
