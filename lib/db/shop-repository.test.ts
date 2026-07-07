import { describe, expect, it, beforeEach } from "vitest";

import { createMemoryD1 } from "./d1-mock";
import {
  findShopById,
  listActiveShops,
  softDeleteShop,
  upsertShop,
} from "./shop-repository";

describe("shop-repository", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("upserts and finds a shop", async () => {
    await upsertShop(db, {
      id: "shop-1",
      name: "Test Pizzeria",
      city: "Napoli",
      country: "IT",
      latitude: 40.8518,
      longitude: 14.2681,
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T00:00:00.000Z",
    });

    const shop = await findShopById(db, "shop-1");
    expect(shop?.name).toBe("Test Pizzeria");
    expect(shop?.city).toBe("Napoli");
  });

  it("lists active shops excluding soft-deleted", async () => {
    await upsertShop(db, {
      id: "shop-a",
      name: "A",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T00:01:00.000Z",
    });
    await upsertShop(db, {
      id: "shop-b",
      name: "B",
      createdAt: "2026-07-07T00:00:00.000Z",
      updatedAt: "2026-07-07T00:02:00.000Z",
    });

    await softDeleteShop(db, "shop-a", "2026-07-07T01:00:00.000Z");

    const shops = await listActiveShops(db);
    expect(shops).toHaveLength(1);
    expect(shops[0]?.id).toBe("shop-b");
  });
});
