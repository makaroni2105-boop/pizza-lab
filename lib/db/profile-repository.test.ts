import { describe, expect, it, beforeEach } from "vitest";

import type { ShopProfile } from "@/types/profile";

import { createMemoryD1 } from "./d1-mock";
import {
  findProfileByShopId,
  profileRowToShopProfileParts,
  shopProfileToProfileUpsert,
  upsertProfile,
} from "./profile-repository";

const sampleProfile: ShopProfile = {
  id: "shop-1",
  name: "Test",
  flour: { primaryFlourId: "flour-1" },
  mixer: { type: "spiral" },
  method: { method: "napoli", hydrationPercent: 60 },
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
  learning: [{ mixerKey: "spiral", runCount: 3, learnedFrictionOffset: 0, isLearningComplete: false }],
  updatedAt: "2026-07-07T00:00:00.000Z",
};

describe("profile-repository", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("upserts and reads profile JSON columns", async () => {
    await upsertProfile(db, shopProfileToProfileUpsert(sampleProfile));

    const row = await findProfileByShopId(db, "shop-1");
    expect(row).not.toBeNull();

    const parts = profileRowToShopProfileParts(row!);
    expect(parts.flour.primaryFlourId).toBe("flour-1");
    expect(parts.presets).toHaveLength(1);
    expect(parts.learning?.[0]?.runCount).toBe(3);
  });
});
