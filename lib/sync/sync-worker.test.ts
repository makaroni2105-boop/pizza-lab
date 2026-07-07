import { describe, expect, it, beforeEach } from "vitest";

import { createMemoryD1 } from "@/lib/db/d1-mock";
import { enqueueSyncItem, listPendingSyncItems } from "@/lib/db/sync-queue-repository";
import type { LearningRun } from "@/lib/learning/learning-types";
import {
  parseSyncWorkerLimit,
  processSyncQueue,
  processSyncQueueItem,
  verifyLearningRunSynced,
  verifyShopProfileSynced,
} from "@/lib/sync";
import type { ShopProfile } from "@/types/profile";

const fixedNow = () => new Date("2026-07-07T12:00:00.000Z").getTime();

const sampleProfile: ShopProfile = {
  id: "shop-sync-1",
  name: "Sync Shop",
  location: { city: "Tokyo", country: "JP" },
  flour: { primaryFlourId: "flour-1" },
  mixer: { type: "spiral" },
  method: { method: "napoli", hydrationPercent: 62 },
  ddt: { defaultDdt: 24 },
  presets: [
    {
      id: "preset-1",
      name: "Business",
      type: "business",
      method: { method: "napoli" },
      targetDdt: 24,
      ballWeightG: 250,
    },
  ],
};

const sampleRun: LearningRun = {
  id: "run-sync-1",
  shopId: "shop-sync-1",
  mixerKey: "spiral",
  recordedAt: "2026-07-07T10:00:00.000Z",
  snapshot: { flourTempC: 20, waterTempC: 8, roomTempC: 26 },
  predictedFrictionC: 12,
  predictedDoughTempC: 24,
  actualDoughTempC: 25,
};

describe("sync-worker", () => {
  let db: ReturnType<typeof createMemoryD1>;

  beforeEach(() => {
    db = createMemoryD1();
  });

  it("parseSyncWorkerLimit clamps invalid values", () => {
    expect(parseSyncWorkerLimit(null)).toBe(10);
    expect(parseSyncWorkerLimit("999")).toBe(50);
    expect(parseSyncWorkerLimit("3")).toBe(3);
  });

  it("returns DB_UNAVAILABLE when db is absent", async () => {
    const result = await processSyncQueue({});

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("DB_UNAVAILABLE");
    }
  });

  it("processes shop_profile upsert to done", async () => {
    await enqueueSyncItem(db, {
      id: "sync-profile-1",
      shopId: "shop-sync-1",
      entityType: "shop_profile",
      entityId: "shop-sync-1",
      operation: "upsert",
      payloadJson: JSON.stringify(sampleProfile),
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });

    const result = await processSyncQueue({ db, now: fixedNow });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.done).toBe(1);
      expect(result.outcomes[0]?.status).toBe("done");
    }

    const profile = await verifyShopProfileSynced(db, "shop-sync-1");
    expect(profile?.name).toBe("Sync Shop");

    const pending = await listPendingSyncItems(db, 10);
    expect(pending).toHaveLength(0);
  });

  it("processes learning_run upsert to done", async () => {
    await enqueueSyncItem(db, {
      id: "sync-run-1",
      shopId: "shop-sync-1",
      entityType: "learning_run",
      entityId: "run-sync-1",
      operation: "upsert",
      payloadJson: JSON.stringify(sampleRun),
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });

    const result = await processSyncQueue({ db, now: fixedNow });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.done).toBe(1);
    }

    const run = await verifyLearningRunSynced(db, "run-sync-1");
    expect(run?.actualDoughTempC).toBe(25);
  });

  it("processes learning_run delete to done", async () => {
    await enqueueSyncItem(db, {
      id: "sync-run-upsert",
      shopId: "shop-sync-1",
      entityType: "learning_run",
      entityId: "run-sync-1",
      operation: "upsert",
      payloadJson: JSON.stringify(sampleRun),
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });
    await processSyncQueue({ db, now: fixedNow });

    await enqueueSyncItem(db, {
      id: "sync-run-delete",
      shopId: "shop-sync-1",
      entityType: "learning_run",
      entityId: "run-sync-1",
      operation: "delete",
      clientId: "client-1",
      createdAt: "2026-07-07T11:01:00.000Z",
    });

    const result = await processSyncQueue({ db, now: fixedNow });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.done).toBe(1);
    }

    const run = await verifyLearningRunSynced(db, "run-sync-1");
    expect(run).toBeNull();
  });

  it("marks unsupported entity as failed", async () => {
    await enqueueSyncItem(db, {
      id: "sync-shop-1",
      shopId: "shop-sync-1",
      entityType: "shop",
      entityId: "shop-sync-1",
      operation: "upsert",
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });

    const result = await processSyncQueue({ db, now: fixedNow });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.failed).toBe(1);
      expect(result.outcomes[0]?.errorCode).toBe("UNSUPPORTED_ENTITY");
    }
  });

  it("marks invalid payload as failed", async () => {
    await enqueueSyncItem(db, {
      id: "sync-bad-payload",
      shopId: "shop-sync-1",
      entityType: "shop_profile",
      entityId: "shop-sync-1",
      operation: "upsert",
      payloadJson: '{"bad":true}',
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });

    const outcome = await processSyncQueueItem(
      db,
      {
        id: "sync-bad-payload",
        shop_id: "shop-sync-1",
        entity_type: "shop_profile",
        entity_id: "shop-sync-1",
        operation: "upsert",
        payload_json: '{"bad":true}',
        client_id: "client-1",
        status: "pending",
        retry_count: 0,
        error_message: null,
        created_at: "2026-07-07T11:00:00.000Z",
        processed_at: null,
      },
      fixedNow,
    );

    expect(outcome.status).toBe("failed");
    expect(outcome.errorCode).toBe("INVALID_PAYLOAD");
  });

  it("processes pending items in created_at order", async () => {
    await enqueueSyncItem(db, {
      id: "sync-first",
      shopId: "shop-sync-1",
      entityType: "learning_run",
      entityId: "run-a",
      operation: "upsert",
      payloadJson: JSON.stringify({ ...sampleRun, id: "run-a" }),
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });
    await enqueueSyncItem(db, {
      id: "sync-second",
      shopId: "shop-sync-1",
      entityType: "learning_run",
      entityId: "run-b",
      operation: "upsert",
      payloadJson: JSON.stringify({ ...sampleRun, id: "run-b" }),
      clientId: "client-1",
      createdAt: "2026-07-07T11:01:00.000Z",
    });

    const result = await processSyncQueue({ db, limit: 2, now: fixedNow });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.processed).toBe(2);
      expect(result.outcomes.map((item) => item.id)).toEqual(["sync-first", "sync-second"]);
    }
  });
});
