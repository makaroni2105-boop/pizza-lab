/**
 * /api/daily-prep-records ハンドラー。
 * 本番相当: D1 必須・Cloudflare Access 必須。メモリは test / 明示 dev のみ。
 */

import {
  authenticateDailyPrepApi,
  unauthenticatedResponseBody,
  type DailyPrepAccessAuth,
} from "@/lib/auth/daily-prep-api-auth";
import {
  buildDailyPrepRecordFromCompute,
  buildAiSearchDocument,
  buildUnavailableWeatherSnapshot,
  buildWeatherSnapshot,
  cloneDailyPrepRecord,
} from "@/lib/daily-prep/prep-record-build";
import { getPrepDateJstString, isValidPrepDateJst } from "@/lib/daily-prep/jst-date";
import {
  findDailyPrepRecordById,
  findDailyPrepRecordByIdempotencyKey,
  findDailyPrepRecordByShopAndPrepDate,
  insertDailyPrepRecord,
  insertDailyPrepRecordRevision,
  listDailyPrepRecordRevisions,
  listDailyPrepRecords,
  updateDailyPrepRecord,
} from "@/lib/db/daily-prep-record-repository";
import {
  createDailyPrepRecordMemoryStore,
  getDefaultDailyPrepRecordMemoryStore,
  type DailyPrepRecordMemoryStore,
} from "@/lib/db/daily-prep-record-memory-store";
import { nowIso } from "@/lib/db/d1-client";
import { PIZZA_LAB_D1_BINDING } from "@/lib/db/d1-types";
import type { D1Database } from "@/lib/db/d1-types";
import {
  canUseMemoryPersistence,
  DB_PERSIST_ERROR,
  D1_REQUIRED_ERROR,
  detectDailyPrepPersistenceMode,
  isD1RequiredForDailyPrep,
  type DailyPrepPersistenceMode,
} from "@/lib/runtime/daily-prep-persistence";
import { fetchWeatherFromProvider } from "@/lib/weather/weather-client";
import { KURE_WEATHER_COORDINATES } from "@/types/daily-prep-record";
import type {
  DailyPrepDoughState11am,
  DailyPrepProcessReadings,
  DailyPrepRecord,
  DailyPrepRecordCreateInput,
  DailyPrepRecordRevision,
  DailyPrepRecordUpdateInput,
} from "@/types/daily-prep-record";
import { computeNalipoDailyPrep } from "@/lib/daily-prep/poolish-daily-recipe";

const DOUGH_STATES = new Set<DailyPrepDoughState11am>([
  "good",
  "slow",
  "fast",
  "wet",
  "dry",
  "other",
]);

export interface DailyPrepRecordHandlerDeps {
  db?: D1Database;
  memory?: DailyPrepRecordMemoryStore;
  persistenceMode?: DailyPrepPersistenceMode;
  allowMemoryPersistence?: boolean;
  request?: Request;
  accessAuth?: DailyPrepAccessAuth;
  fetchWeather?: typeof fetchWeatherFromProvider;
  now?: () => string;
  newId?: () => string;
}

export interface DailyPrepRecordHandlerResult {
  status: number;
  body: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseProcessReadings(
  value: unknown,
): DailyPrepProcessReadings | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const prep =
    value.prepWaterTempC === null || value.prepWaterTempC === undefined
      ? null
      : Number(value.prepWaterTempC);
  const final =
    value.finalDoughTempC === null || value.finalDoughTempC === undefined
      ? null
      : Number(value.finalDoughTempC);

  if (
    (prep !== null && !Number.isFinite(prep)) ||
    (final !== null && !Number.isFinite(final))
  ) {
    return undefined;
  }

  return {
    prepWaterTempC: prep,
    finalDoughTempC: final,
  };
}

function parseCreateInput(body: unknown): DailyPrepRecordCreateInput | null {
  if (!isRecord(body)) {
    return null;
  }

  const totalFlourKg = Number(body.totalFlourKg);
  if (!Number.isInteger(totalFlourKg)) {
    return null;
  }

  const dough =
    body.doughState11am === null || body.doughState11am === undefined
      ? null
      : String(body.doughState11am);

  if (dough !== null && !DOUGH_STATES.has(dough as DailyPrepDoughState11am)) {
    return null;
  }

  const prepDateJst =
    body.prepDateJst === undefined || body.prepDateJst === null
      ? undefined
      : String(body.prepDateJst);

  if (prepDateJst !== undefined && !isValidPrepDateJst(prepDateJst)) {
    return null;
  }

  const idempotencyKey =
    body.idempotencyKey === undefined || body.idempotencyKey === null
      ? undefined
      : String(body.idempotencyKey).slice(0, 120);

  return {
    totalFlourKg,
    sessionAdjustment: isRecord(body.sessionAdjustment)
      ? (body.sessionAdjustment as DailyPrepRecordCreateInput["sessionAdjustment"])
      : undefined,
    actualMaterials: isRecord(body.actualMaterials)
      ? (body.actualMaterials as unknown as DailyPrepRecordCreateInput["actualMaterials"])
      : undefined,
    prepDateJst,
    roomTempC:
      body.roomTempC === undefined || body.roomTempC === null
        ? null
        : Number(body.roomTempC),
    memo:
      body.memo === undefined || body.memo === null
        ? null
        : String(body.memo),
    doughState11am: dough as DailyPrepDoughState11am | null,
    processReadings: parseProcessReadings(body.processReadings),
    shopId:
      body.shopId === undefined || body.shopId === null
        ? null
        : String(body.shopId),
    idempotencyKey,
  };
}

function parseUpdateInput(body: unknown): DailyPrepRecordUpdateInput | null {
  if (!isRecord(body) || typeof body.id !== "string") {
    return null;
  }

  const dough =
    body.doughState11am === undefined
      ? undefined
      : body.doughState11am === null
        ? null
        : String(body.doughState11am);

  if (
    dough !== undefined &&
    dough !== null &&
    !DOUGH_STATES.has(dough as DailyPrepDoughState11am)
  ) {
    return null;
  }

  const prepDateJst =
    body.prepDateJst === undefined ? undefined : String(body.prepDateJst);

  if (prepDateJst !== undefined && !isValidPrepDateJst(prepDateJst)) {
    return null;
  }

  const expectedRevision =
    body.expectedRevision === undefined
      ? undefined
      : Number(body.expectedRevision);

  if (
    expectedRevision !== undefined &&
    (!Number.isInteger(expectedRevision) || expectedRevision < 1)
  ) {
    return null;
  }

  return {
    id: body.id,
    prepDateJst,
    actualMaterials: isRecord(body.actualMaterials)
      ? (body.actualMaterials as unknown as DailyPrepRecordUpdateInput["actualMaterials"])
      : undefined,
    roomTempC:
      body.roomTempC === undefined
        ? undefined
        : body.roomTempC === null
          ? null
          : Number(body.roomTempC),
    memo:
      body.memo === undefined
        ? undefined
        : body.memo === null
          ? null
          : String(body.memo),
    doughState11am:
      dough === undefined
        ? undefined
        : (dough as DailyPrepDoughState11am | null),
    processReadings: parseProcessReadings(body.processReadings),
    expectedRevision,
  };
}

function resolveMode(deps?: DailyPrepRecordHandlerDeps): DailyPrepPersistenceMode {
  return deps?.persistenceMode ?? detectDailyPrepPersistenceMode();
}

async function ensureAuthorized(
  deps?: DailyPrepRecordHandlerDeps,
): Promise<DailyPrepAccessAuth> {
  const mode = resolveMode(deps);

  if (
    deps?.accessAuth?.ok &&
    (mode === "test" ||
      (mode === "production" && process.env.VITEST === "true"))
  ) {
    return deps.accessAuth;
  }

  return authenticateDailyPrepApi({
    request: deps?.request,
    persistenceMode: mode,
    accessAuthOverride: mode === "test" ? deps?.accessAuth : undefined,
  });
}

function dbRequiredFailure(): DailyPrepRecordHandlerResult {
  return {
    status: 503,
    body: {
      success: false,
      error: D1_REQUIRED_ERROR,
    },
  };
}

function resolvePersistence(
  deps?: DailyPrepRecordHandlerDeps,
): { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database } | null {
  const mode = resolveMode(deps);
  const db = deps?.db;

  if (db) {
    return {
      useMemory: false,
      memory: deps?.memory ?? getDefaultDailyPrepRecordMemoryStore(),
      db,
    };
  }

  if (isD1RequiredForDailyPrep(mode, false, deps)) {
    return null;
  }

  if (!canUseMemoryPersistence(mode, deps)) {
    return null;
  }

  return {
    useMemory: true,
    memory: deps?.memory ?? createDailyPrepRecordMemoryStore(),
  };
}

async function persistRecord(
  persistence: { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database },
  record: DailyPrepRecord,
  revision: DailyPrepRecordRevision,
): Promise<void> {
  if (persistence.useMemory) {
    persistence.memory.insert(record);
    persistence.memory.insertRevision(revision);
    return;
  }

  if (!persistence.db) {
    throw new Error("db_missing");
  }

  await insertDailyPrepRecord(persistence.db, record);
  await insertDailyPrepRecordRevision(persistence.db, revision);
}

async function loadRecord(
  persistence: { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database },
  id: string,
): Promise<DailyPrepRecord | null> {
  if (persistence.useMemory) {
    return persistence.memory.findById(id);
  }

  if (!persistence.db) {
    return null;
  }

  return findDailyPrepRecordById(persistence.db, id);
}

async function findRecordByIdempotencyKey(
  persistence: { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database },
  key: string,
): Promise<DailyPrepRecord | null> {
  if (persistence.useMemory) {
    return persistence.memory.findByIdempotencyKey(key);
  }

  if (!persistence.db) {
    return null;
  }

  return findDailyPrepRecordByIdempotencyKey(persistence.db, key);
}

async function findRecordForPrepDate(
  persistence: { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database },
  shopId: string | null | undefined,
  prepDateJst: string,
): Promise<DailyPrepRecord | null> {
  if (persistence.useMemory) {
    return persistence.memory.findByShopAndPrepDate(shopId ?? null, prepDateJst);
  }

  if (!persistence.db) {
    return null;
  }

  return findDailyPrepRecordByShopAndPrepDate(
    persistence.db,
    shopId,
    prepDateJst,
  );
}

async function applyUpdate(
  persistence: { useMemory: boolean; memory: DailyPrepRecordMemoryStore; db?: D1Database },
  updated: DailyPrepRecord,
  revision: DailyPrepRecordRevision,
): Promise<boolean> {
  if (persistence.useMemory) {
    const ok = persistence.memory.update(updated);
    if (ok) {
      persistence.memory.insertRevision(revision);
    }
    return ok;
  }

  if (!persistence.db) {
    return false;
  }

  const ok = await updateDailyPrepRecord(persistence.db, updated);
  if (!ok) {
    return false;
  }

  await insertDailyPrepRecordRevision(persistence.db, revision);
  return true;
}

export async function handleDailyPrepRecordListRequest(
  limit: number,
  deps?: DailyPrepRecordHandlerDeps,
): Promise<DailyPrepRecordHandlerResult> {
  const auth = await ensureAuthorized(deps);
  if (!auth.ok) {
    return { status: 401, body: unauthenticatedResponseBody() };
  }

  const persistence = resolvePersistence(deps);
  if (!persistence) {
    return dbRequiredFailure();
  }

  const capped = Math.min(Math.max(limit, 1), 366);
  let records: DailyPrepRecord[];

  if (!persistence.useMemory && persistence.db) {
    records = await listDailyPrepRecords(persistence.db, capped);
  } else {
    records = persistence.memory.list(capped);
  }

  return {
    status: 200,
    body: {
      success: true,
      records,
      persistence: persistence.useMemory ? "memory" : "d1",
      d1Binding: PIZZA_LAB_D1_BINDING,
    },
  };
}

export async function handleDailyPrepRecordCreateRequest(
  body: unknown,
  deps?: DailyPrepRecordHandlerDeps,
): Promise<DailyPrepRecordHandlerResult> {
  const auth = await ensureAuthorized(deps);
  if (!auth.ok) {
    return { status: 401, body: unauthenticatedResponseBody() };
  }

  const input = parseCreateInput(body);

  if (!input) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_BODY", message: "記録本体が不正です" },
      },
    };
  }

  const persistence = resolvePersistence(deps);
  if (!persistence) {
    return dbRequiredFailure();
  }

  if (input.idempotencyKey) {
    const existing = await findRecordByIdempotencyKey(
      persistence,
      input.idempotencyKey,
    );
    if (existing) {
      return {
        status: 200,
        body: {
          success: true,
          record: existing,
          idempotentReplay: true,
          persistence: persistence.useMemory ? "memory" : "d1",
        },
      };
    }
  }

  const nowForPrepDate = deps?.now?.();
  const effectivePrepDateJst =
    input.prepDateJst ??
    getPrepDateJstString(nowForPrepDate ? new Date(nowForPrepDate) : undefined);

  const duplicateForDate = await findRecordForPrepDate(
    persistence,
    input.shopId,
    effectivePrepDateJst,
  );

  if (duplicateForDate) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: "PREP_DATE_EXISTS",
          message:
            "この仕込み日の記録は既にあります。内容を直す場合は記録一覧から更新してください。",
          existingRecordId: duplicateForDate.id,
        },
      },
    };
  }

  const fetchWeather = deps?.fetchWeather ?? fetchWeatherFromProvider;
  const now = deps?.now?.() ?? nowIso();
  const newId = deps?.newId ?? (() => crypto.randomUUID());

  let weather = buildUnavailableWeatherSnapshot(now, "not_fetched");

  try {
    const weatherCurrent = await fetchWeather({
      coordinates: {
        latitude: KURE_WEATHER_COORDINATES.latitude,
        longitude: KURE_WEATHER_COORDINATES.longitude,
      },
      fetchedAt: now,
    });
    weather = buildWeatherSnapshot(weatherCurrent, null);
  } catch {
    weather = buildUnavailableWeatherSnapshot(now, "fetch_failed");
  }

  const built = buildDailyPrepRecordFromCompute({
    id: newId(),
    input,
    weather,
    nowIso: now,
  });

  if (!built.ok) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "BUILD_FAILED",
          message: `記録を組み立てられません: ${built.reason}`,
        },
      },
    };
  }

  const revision: DailyPrepRecordRevision = {
    id: `${built.record.id}-rev-1`,
    recordId: built.record.id,
    revisionNumber: 1,
    createdAt: now,
    changeKind: "create",
    recordSnapshot: cloneDailyPrepRecord(built.record),
  };

  try {
    await persistRecord(persistence, built.record, revision);
  } catch {
    return {
      status: 500,
      body: {
        success: false,
        error: DB_PERSIST_ERROR,
      },
    };
  }

  return {
    status: 201,
    body: {
      success: true,
      record: built.record,
      persistence: persistence.useMemory ? "memory" : "d1",
      weatherStatus: built.record.weather.fetchStatus,
    },
  };
}

export async function handleDailyPrepRecordUpdateRequest(
  body: unknown,
  deps?: DailyPrepRecordHandlerDeps,
): Promise<DailyPrepRecordHandlerResult> {
  const auth = await ensureAuthorized(deps);
  if (!auth.ok) {
    return { status: 401, body: unauthenticatedResponseBody() };
  }

  const input = parseUpdateInput(body);

  if (!input) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "INVALID_BODY", message: "更新内容が不正です" },
      },
    };
  }

  const persistence = resolvePersistence(deps);
  if (!persistence) {
    return dbRequiredFailure();
  }

  const existing = await loadRecord(persistence, input.id);

  if (!existing) {
    return {
      status: 404,
      body: {
        success: false,
        error: { code: "NOT_FOUND", message: "記録が見つかりません" },
      },
    };
  }

  if (
    input.expectedRevision !== undefined &&
    input.expectedRevision !== existing.currentRevision
  ) {
    return {
      status: 409,
      body: {
        success: false,
        error: {
          code: "REVISION_CONFLICT",
          message: "他の更新と競合しました。再読み込みしてください。",
          expectedRevision: input.expectedRevision,
          actualRevision: existing.currentRevision,
        },
      },
    };
  }

  const now = deps?.now?.() ?? nowIso();
  const before = cloneDailyPrepRecord(existing);

  const next: DailyPrepRecord = {
    ...existing,
    prepDateJst: input.prepDateJst ?? existing.prepDateJst,
    actualMaterials: input.actualMaterials ?? existing.actualMaterials,
    roomTempC:
      input.roomTempC === undefined ? existing.roomTempC : input.roomTempC,
    memo: input.memo === undefined ? existing.memo : input.memo,
    doughState11am:
      input.doughState11am === undefined
        ? existing.doughState11am
        : input.doughState11am,
    processReadings: input.processReadings ?? existing.processReadings,
    currentRevision: existing.currentRevision + 1,
    updatedAt: now,
  };

  const compute = computeNalipoDailyPrep({
    totalFlourKg: existing.totalFlourKg,
    adjustment: existing.sessionAdjustment ?? undefined,
  });

  if (!compute) {
    return {
      status: 500,
      body: {
        success: false,
        error: { code: "COMPUTE_FAILED", message: "既存記録の配合を再計算できません" },
      },
    };
  }

  next.aiSearch = buildAiSearchDocument(
    next.prepDateJst,
    existing.totalFlourKg,
    compute,
    next.actualMaterials,
    existing.sessionAdjustment ?? undefined,
    next.roomTempC,
    existing.weather,
    next.processReadings,
    next.doughState11am,
    next.memo,
  );

  const revision: DailyPrepRecordRevision = {
    id: `${existing.id}-rev-${next.currentRevision}`,
    recordId: existing.id,
    revisionNumber: next.currentRevision,
    createdAt: now,
    changeKind: "update",
    recordSnapshot: before,
  };

  const ok = await applyUpdate(persistence, next, revision);

  if (!ok) {
    return {
      status: 500,
      body: {
        success: false,
        error: DB_PERSIST_ERROR,
      },
    };
  }

  return {
    status: 200,
    body: {
      success: true,
      record: next,
      persistence: persistence.useMemory ? "memory" : "d1",
    },
  };
}

export async function handleDailyPrepRecordRevisionsRequest(
  recordId: string,
  deps?: DailyPrepRecordHandlerDeps,
): Promise<DailyPrepRecordHandlerResult> {
  const auth = await ensureAuthorized(deps);
  if (!auth.ok) {
    return { status: 401, body: unauthenticatedResponseBody() };
  }

  if (!recordId) {
    return {
      status: 400,
      body: {
        success: false,
        error: { code: "MISSING_ID", message: "recordId が必要です" },
      },
    };
  }

  const persistence = resolvePersistence(deps);
  if (!persistence) {
    return dbRequiredFailure();
  }

  let revisions: DailyPrepRecordRevision[];

  if (!persistence.useMemory && persistence.db) {
    revisions = await listDailyPrepRecordRevisions(persistence.db, recordId);
  } else {
    revisions = persistence.memory.listRevisions(recordId);
  }

  return {
    status: 200,
    body: {
      success: true,
      revisions,
      persistence: persistence.useMemory ? "memory" : "d1",
    },
  };
}