import { describe, expect, it, beforeEach } from "vitest";

import {
  handleSyncQueueEnqueueRequest,
  handleSyncQueueListRequest,
  handleSyncQueueUpdateStatusRequest,
  parseListLimit,
} from "@/lib/api/sync-queue-handler";
import { createMemoryD1 } from "@/lib/db/d1-mock";
import { SyncQueueMemoryStore } from "@/lib/db/sync-queue-memory-store";

describe("sync-queue-handler", () => {
  let memory: SyncQueueMemoryStore;

  beforeEach(() => {
    memory = new SyncQueueMemoryStore();
  });

  it("parseListLimit clamps invalid values", () => {
    expect(parseListLimit(null)).toBe(20);
    expect(parseListLimit("999")).toBe(100);
    expect(parseListLimit("5")).toBe(5);
  });

  it("lists pending items from memory", async () => {
    await handleSyncQueueEnqueueRequest(
      {
        id: "sync-1",
        shopId: "shop-1",
        entityType: "learning_run",
        entityId: "run-1",
        operation: "upsert",
        clientId: "client-1",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
      { memory },
    );

    const result = await handleSyncQueueListRequest(10, { memory });

    expect(result.status).toBe(200);
    if (result.body.success && "items" in result.body) {
      expect(result.body.items).toHaveLength(1);
      expect(result.body.items[0]?.entityType).toBe("learning_run");
    }
  });

  it("enqueues via D1", async () => {
    const db = createMemoryD1();

    const result = await handleSyncQueueEnqueueRequest(
      {
        id: "sync-d1",
        entityType: "shop_profile",
        entityId: "shop-1",
        operation: "upsert",
        clientId: "client-1",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
      { db, memory },
    );

    expect(result.status).toBe(200);
    if (result.body.success && "item" in result.body) {
      expect(result.body.item.status).toBe("pending");
    }

    const list = await handleSyncQueueListRequest(10, { db, memory });
    if (list.body.success && "items" in list.body) {
      expect(list.body.items).toHaveLength(1);
    }
  });

  it("updates status via D1 and removes from pending list", async () => {
    const db = createMemoryD1();

    await handleSyncQueueEnqueueRequest(
      {
        id: "sync-2",
        entityType: "learning_run",
        entityId: "run-1",
        operation: "delete",
        clientId: "client-1",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
      { db, memory },
    );

    const updated = await handleSyncQueueUpdateStatusRequest(
      { id: "sync-2", status: "done" },
      { db, memory, now: () => new Date("2026-07-07T10:05:00.000Z").getTime() },
    );

    expect(updated.status).toBe(200);
    if (updated.body.success && "updated" in updated.body) {
      expect(updated.body.updated).toBe(true);
    }

    const list = await handleSyncQueueListRequest(10, { db, memory });
    if (list.body.success && "items" in list.body) {
      expect(list.body.items).toHaveLength(0);
    }
  });

  it("falls back to memory when D1 list fails", async () => {
    await handleSyncQueueEnqueueRequest(
      {
        id: "sync-mem",
        entityType: "shop",
        entityId: "shop-1",
        operation: "upsert",
        clientId: "client-1",
        createdAt: "2026-07-07T10:00:00.000Z",
      },
      { memory },
    );

    const brokenDb = {
      prepare: () => {
        throw new Error("d1 down");
      },
    };

    const result = await handleSyncQueueListRequest(10, { db: brokenDb, memory });
    expect(result.status).toBe(200);
    if (result.body.success && "items" in result.body) {
      expect(result.body.items).toHaveLength(1);
    }
  });

  it("returns 400 for invalid enqueue body", async () => {
    const result = await handleSyncQueueEnqueueRequest({ bad: true }, { memory });
    expect(result.status).toBe(400);
  });

  it("returns 404 when sync item not found on update", async () => {
    const result = await handleSyncQueueUpdateStatusRequest(
      { id: "missing", status: "done" },
      { memory },
    );
    expect(result.status).toBe(404);
  });
});
