import { describe, expect, it } from "vitest";

import { buildDailyPrepRecordFromCompute } from "@/lib/daily-prep/prep-record-build";

import { createMemoryD1 } from "./d1-mock";
import {
  findDailyPrepRecordById,
  insertDailyPrepRecord,
  insertDailyPrepRecordRevision,
  listDailyPrepRecords,
} from "./daily-prep-record-repository";

describe("daily-prep-record repository", () => {
  it("round-trips record rows", async () => {
    const db = createMemoryD1();
    const built = buildDailyPrepRecordFromCompute({
      id: "repo-1",
      input: { totalFlourKg: 10, prepDateJst: "2026-11-20" },
      weather: {
        provider: "open-meteo",
        coordinates: {
          latitude: 34.2386,
          longitude: 132.5616,
          labelJa: "広島県呉市周辺",
        },
        fetchedAtIso: "2026-11-20T00:00:00.000Z",
        observationTimeIso: null,
        fetchStatus: "ok" as const,
        fetchErrorCode: null,
        ambientTempC: 16,
        ambientHumidityPct: 50,
      },
      nowIso: "2026-11-20T00:00:00.000Z",
    });

    expect(built.ok).toBe(true);
    if (!built.ok) {
      return;
    }

    await insertDailyPrepRecord(db, built.record);
    await insertDailyPrepRecordRevision(db, {
      id: "repo-1-rev-1",
      recordId: built.record.id,
      revisionNumber: 1,
      createdAt: built.record.createdAt,
      changeKind: "create",
      recordSnapshot: built.record,
    });

    const found = await findDailyPrepRecordById(db, "repo-1");
    expect(found?.totalFlourKg).toBe(10);

    const list = await listDailyPrepRecords(db, 10);
    expect(list).toHaveLength(1);
  });
});