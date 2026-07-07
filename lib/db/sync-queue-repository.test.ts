import { describe, expect, it, beforeEach } from "vitest";

import { createMemoryD1 } from "./d1-mock";
import {
  enqueueSyncItem,
  listPendingSyncItems,
  updateSyncItemStatus,
} from "./sync-queue-repository";

describe("sync-queue-repository", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("enqueues and lists pending items", async () => {
    await enqueueSyncItem(db, {
      id: "sync-1",
      shopId: "shop-1",
      entityType: "learning_run",
      entityId: "run-1",
      operation: "upsert",
      payloadJson: '{"id":"run-1"}',
      clientId: "client-1",
      createdAt: "2026-07-07T10:00:00.000Z",
    });

    const pending = await listPendingSyncItems(db, 10);
    expect(pending).toHaveLength(1);
    expect(pending[0]?.entity_type).toBe("learning_run");
    expect(pending[0]?.status).toBe("pending");
  });

  it("updates sync item status", async () => {
    await enqueueSyncItem(db, {
      id: "sync-2",
      shopId: "shop-1",
      entityType: "shop_profile",
      entityId: "shop-1",
      operation: "upsert",
      clientId: "client-1",
      createdAt: "2026-07-07T10:00:00.000Z",
    });

    const updated = await updateSyncItemStatus(
      db,
      "sync-2",
      "done",
      "2026-07-07T10:05:00.000Z",
    );

    expect(updated).toBe(true);

    const pending = await listPendingSyncItems(db, 10);
    expect(pending).toHaveLength(0);
  });
});
