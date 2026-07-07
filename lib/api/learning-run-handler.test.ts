import { describe, expect, it, beforeEach } from "vitest";

import { createMemoryD1 } from "@/lib/db/d1-mock";
import {
  handleLearningRunDeleteRequest,
  handleLearningRunListRequest,
  handleLearningRunUpsertRequest,
} from "@/lib/api/learning-run-handler";
import type { LearningRun } from "@/lib/learning/learning-types";
import { LearningRunMemoryStore } from "@/lib/learning/learning-run-memory-store";

const sampleRun: LearningRun = {
  id: "run-api-1",
  shopId: "shop-1",
  mixerKey: "spiral",
  recordedAt: "2026-07-07T10:00:00.000Z",
  snapshot: { flourTempC: 20, waterTempC: 8, roomTempC: 26 },
  predictedFrictionC: 12,
  predictedDoughTempC: 24,
  actualDoughTempC: 25,
  targetDdtC: 24,
  craftsmanScore: 4,
  memo: "good",
};

describe("learning-run-handler", () => {
  let memory: LearningRunMemoryStore;

  beforeEach(() => {
    memory = new LearningRunMemoryStore();
  });

  it("returns 400 when shopId is missing on list", async () => {
    const result = await handleLearningRunListRequest("", { memory });
    expect(result.status).toBe(400);
    expect(result.body.success).toBe(false);
  });

  it("lists runs from memory when db is absent", async () => {
    memory.upsert(sampleRun);

    const result = await handleLearningRunListRequest("shop-1", { memory });

    expect(result.status).toBe(200);
    if (result.body.success && "runs" in result.body) {
      expect(result.body.runs).toHaveLength(1);
      expect(result.body.runs[0]?.id).toBe("run-api-1");
    }
  });

  it("saves and lists runs via D1", async () => {
    const db = createMemoryD1();

    const save = await handleLearningRunUpsertRequest(sampleRun, { db, memory });
    expect(save.status).toBe(200);

    const list = await handleLearningRunListRequest("shop-1", { db, memory });
    expect(list.status).toBe(200);
    if (list.body.success && "runs" in list.body) {
      expect(list.body.runs).toHaveLength(1);
      expect(list.body.runs[0]?.actualDoughTempC).toBe(25);
    }
  });

  it("falls back to memory when D1 list fails", async () => {
    memory.upsert(sampleRun);

    const brokenDb = {
      prepare: () => {
        throw new Error("d1 down");
      },
    };

    const result = await handleLearningRunListRequest("shop-1", {
      db: brokenDb,
      memory,
    });

    expect(result.status).toBe(200);
    if (result.body.success && "runs" in result.body) {
      expect(result.body.runs).toHaveLength(1);
    }
  });

  it("deletes run from D1", async () => {
    const db = createMemoryD1();

    await handleLearningRunUpsertRequest(sampleRun, { db, memory });

    const deleted = await handleLearningRunDeleteRequest("run-api-1", { db, memory });
    expect(deleted.status).toBe(200);
    if (deleted.body.success && "deleted" in deleted.body) {
      expect(deleted.body.deleted).toBe(true);
    }

    const list = await handleLearningRunListRequest("shop-1", { db, memory });
    if (list.body.success && "runs" in list.body) {
      expect(list.body.runs).toHaveLength(0);
    }
  });

  it("returns 404 when run not found on delete", async () => {
    const result = await handleLearningRunDeleteRequest("missing", { memory });
    expect(result.status).toBe(404);
  });

  it("returns 400 for invalid upsert body", async () => {
    const result = await handleLearningRunUpsertRequest({ invalid: true }, { memory });
    expect(result.status).toBe(400);
  });
});
