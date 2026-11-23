import { describe, expect, it } from "vitest";

import {
  handleDailyPrepRecordCreateRequest,
  handleDailyPrepRecordListRequest,
  handleDailyPrepRecordRevisionsRequest,
  handleDailyPrepRecordUpdateRequest,
} from "@/lib/api/daily-prep-record-handler";
import { createMemoryD1 } from "@/lib/db/d1-mock";
import { createDailyPrepRecordMemoryStore } from "@/lib/db/daily-prep-record-memory-store";
import type { WeatherCurrent } from "@/lib/weather/weather-types";

const mockWeather: WeatherCurrent = {
  ambientTempC: 17.5,
  ambientHumidityPct: 55,
  fetchedAt: "2026-11-23T01:00:00.000Z",
  latitude: 34.2386,
  longitude: 132.5616,
  source: "open-meteo",
};

const testDeps = {
  persistenceMode: "test" as const,
  accessAuth: { ok: true, email: "vitest@local" },
};

describe("daily-prep-record handler", () => {
  it("creates and lists in memory (test mode)", async () => {
    const memory = createDailyPrepRecordMemoryStore();

    const created = await handleDailyPrepRecordCreateRequest(
      {
        totalFlourKg: 10,
        prepDateJst: "2026-11-23",
        roomTempC: 23,
        memo: "昼仕込み",
      },
      {
        ...testDeps,
        memory,
        fetchWeather: async () => mockWeather,
        newId: () => "id-create-1",
        now: () => "2026-11-23T01:00:00.000Z",
      },
    );

    expect(created.status).toBe(201);
    expect(created.body.success).toBe(true);

    const list = await handleDailyPrepRecordListRequest(10, {
      ...testDeps,
      memory,
    });
    expect(list.status).toBe(200);
    expect((list.body as { records: unknown[] }).records).toHaveLength(1);
  });

  it("rejects persistence without D1 in production mode", async () => {
    const created = await handleDailyPrepRecordCreateRequest(
      { totalFlourKg: 10, prepDateJst: "2026-11-23" },
      {
        persistenceMode: "production",
        accessAuth: { ok: true },
        fetchWeather: async () => mockWeather,
      },
    );

    expect(created.status).toBe(503);
    expect((created.body as { error: { code: string } }).error.code).toBe(
      "DB_UNAVAILABLE",
    );
  });

  it("rejects unauthenticated in production mode", async () => {
    const db = createMemoryD1();
    const list = await handleDailyPrepRecordListRequest(10, {
      persistenceMode: "production",
      db,
    });

    expect(list.status).toBe(401);
  });

  it("ignores dev auth skip in production mode", async () => {
    const previous = process.env.PIZZA_LAB_DEV_SKIP_ACCESS_AUTH;
    process.env.PIZZA_LAB_DEV_SKIP_ACCESS_AUTH = "1";

    try {
      const created = await handleDailyPrepRecordCreateRequest(
        { totalFlourKg: 10, prepDateJst: "2026-11-23" },
        {
          persistenceMode: "production",
          db: createMemoryD1(),
          fetchWeather: async () => mockWeather,
        },
      );

      expect(created.status).toBe(401);
    } finally {
      if (previous === undefined) {
        delete process.env.PIZZA_LAB_DEV_SKIP_ACCESS_AUTH;
      } else {
        process.env.PIZZA_LAB_DEV_SKIP_ACCESS_AUTH = previous;
      }
    }
  });

  it("saves when weather fetch fails", async () => {
    const memory = createDailyPrepRecordMemoryStore();

    const created = await handleDailyPrepRecordCreateRequest(
      { totalFlourKg: 10, prepDateJst: "2026-11-23" },
      {
        ...testDeps,
        memory,
        fetchWeather: async () => {
          throw new Error("weather down");
        },
        newId: () => "id-weather-fail",
        now: () => "2026-11-23T02:00:00.000Z",
      },
    );

    expect(created.status).toBe(201);
    const record = (created.body as { record: { weather: { fetchStatus: string } } })
      .record;
    expect(record.weather.fetchStatus).toBe("unavailable");
  });

  it("stores revision on update", async () => {
    const memory = createDailyPrepRecordMemoryStore();

    await handleDailyPrepRecordCreateRequest(
      { totalFlourKg: 8, prepDateJst: "2026-11-22" },
      {
        ...testDeps,
        memory,
        fetchWeather: async () => mockWeather,
        newId: () => "id-update-1",
        now: () => "2026-11-22T10:00:00.000Z",
      },
    );

    const updated = await handleDailyPrepRecordUpdateRequest(
      { id: "id-update-1", memo: "修正メモ", expectedRevision: 1 },
      {
        ...testDeps,
        memory,
        now: () => "2026-11-22T12:00:00.000Z",
      },
    );

    expect(updated.status).toBe(200);

    const revisions = await handleDailyPrepRecordRevisionsRequest("id-update-1", {
      ...testDeps,
      memory,
    });

    expect((revisions.body as { revisions: unknown[] }).revisions.length).toBeGreaterThanOrEqual(
      2,
    );
  });

  it("returns revision conflict", async () => {
    const memory = createDailyPrepRecordMemoryStore();

    await handleDailyPrepRecordCreateRequest(
      { totalFlourKg: 8, prepDateJst: "2026-11-22" },
      {
        ...testDeps,
        memory,
        fetchWeather: async () => mockWeather,
        newId: () => "id-conflict",
        now: () => "2026-11-22T10:00:00.000Z",
      },
    );

    const conflict = await handleDailyPrepRecordUpdateRequest(
      { id: "id-conflict", memo: "x", expectedRevision: 99 },
      { ...testDeps, memory },
    );

    expect(conflict.status).toBe(409);
  });

  it("persists via D1 mock", async () => {
    const db = createMemoryD1();

    const created = await handleDailyPrepRecordCreateRequest(
      { totalFlourKg: 12, prepDateJst: "2026-11-21" },
      {
        ...testDeps,
        db,
        fetchWeather: async () => mockWeather,
        newId: () => "id-d1-1",
        now: () => "2026-11-21T09:00:00.000Z",
      },
    );

    expect(created.status).toBe(201);

    const list = await handleDailyPrepRecordListRequest(5, { ...testDeps, db });
    expect((list.body as { records: { id: string }[] }).records[0]?.id).toBe(
      "id-d1-1",
    );
  });

  it("replays idempotent create on D1", async () => {
    const db = createMemoryD1();

    const body = {
      totalFlourKg: 12,
      prepDateJst: "2026-11-21",
      idempotencyKey: "same-day-key",
    };

    const first = await handleDailyPrepRecordCreateRequest(body, {
      ...testDeps,
      db,
      fetchWeather: async () => mockWeather,
      newId: () => "id-dup-1",
      now: () => "2026-11-21T09:00:00.000Z",
    });

    const second = await handleDailyPrepRecordCreateRequest(body, {
      ...testDeps,
      db,
      fetchWeather: async () => mockWeather,
      newId: () => "id-dup-2",
      now: () => "2026-11-21T09:00:01.000Z",
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect((second.body as { idempotentReplay?: boolean }).idempotentReplay).toBe(
      true,
    );

    const list = await handleDailyPrepRecordListRequest(5, { ...testDeps, db });
    expect((list.body as { records: unknown[] }).records).toHaveLength(1);
  });
});