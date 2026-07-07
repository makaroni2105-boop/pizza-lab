import { describe, expect, it, beforeEach } from "vitest";

import type { LearningRun } from "@/lib/learning/learning-types";

import { createMemoryD1 } from "./d1-mock";
import {
  deleteLearningRunById,
  findLearningRunById,
  insertLearningRun,
  listLearningRunsByShopId,
} from "./learning-run-repository";

const sampleRun: LearningRun = {
  id: "run-1",
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

describe("learning-run-repository", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("inserts and lists runs by shop", async () => {
    await insertLearningRun(db, sampleRun);

    const runs = await listLearningRunsByShopId(db, "shop-1");
    expect(runs).toHaveLength(1);
    expect(runs[0]?.actualDoughTempC).toBe(25);
    expect(runs[0]?.snapshot.roomTempC).toBe(26);
  });

  it("finds and deletes a run by id", async () => {
    await insertLearningRun(db, sampleRun);

    const found = await findLearningRunById(db, "run-1");
    expect(found?.craftsmanScore).toBe(4);

    const deleted = await deleteLearningRunById(db, "run-1");
    expect(deleted).toBe(true);
    expect(await findLearningRunById(db, "run-1")).toBeNull();
  });
});
