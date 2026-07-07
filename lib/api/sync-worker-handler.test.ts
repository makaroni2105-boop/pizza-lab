import { describe, expect, it } from "vitest";

import {
  handleSyncWorkerProcessRequest,
  parseSyncWorkerLimit,
} from "@/lib/api/sync-worker-handler";
import { createMemoryD1 } from "@/lib/db/d1-mock";
import { enqueueSyncItem } from "@/lib/db/sync-queue-repository";
import type { ShopProfile } from "@/types/profile";

const sampleProfile: ShopProfile = {
  id: "shop-worker-1",
  name: "Worker Shop",
  flour: { primaryFlourId: "flour-1" },
  mixer: { type: "hand" },
  method: { method: "napoli" },
  ddt: { defaultDdt: 24 },
  presets: [],
};

describe("sync-worker-handler", () => {
  it("parseSyncWorkerLimit matches sync worker defaults", () => {
    expect(parseSyncWorkerLimit(null)).toBe(10);
  });

  it("returns 503 when db is absent", async () => {
    const result = await handleSyncWorkerProcessRequest({});

    expect(result.status).toBe(503);
    expect(result.body.success).toBe(false);
  });

  it("returns 200 with processed outcomes when db is available", async () => {
    const db = createMemoryD1();

    await enqueueSyncItem(db, {
      id: "sync-worker-item",
      shopId: "shop-worker-1",
      entityType: "shop_profile",
      entityId: "shop-worker-1",
      operation: "upsert",
      payloadJson: JSON.stringify(sampleProfile),
      clientId: "client-1",
      createdAt: "2026-07-07T11:00:00.000Z",
    });

    const result = await handleSyncWorkerProcessRequest({ db, limit: 5 });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    if (result.body.success) {
      expect(result.body.done).toBe(1);
    }
  });
});
