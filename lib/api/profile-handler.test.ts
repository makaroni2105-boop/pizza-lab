import { describe, expect, it, beforeEach } from "vitest";

import { createMemoryD1 } from "@/lib/db/d1-mock";
import {
  findShopProfileById,
  listShopProfiles,
  upsertShopProfile,
} from "@/lib/db/profile-repository";
import {
  handleProfileDeleteRequest,
  handleProfileGetRequest,
  handleProfileListRequest,
  handleProfileUpsertRequest,
} from "@/lib/api/profile-handler";
import { ProfileMemoryStore } from "@/lib/profile/profile-memory-store";
import type { ShopProfile } from "@/types/profile";

const sampleProfile: ShopProfile = {
  id: "shop-api-1",
  name: "API Test Shop",
  location: { city: "Napoli", country: "IT" },
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

describe("profile-handler", () => {
  let memory: ProfileMemoryStore;

  beforeEach(() => {
    memory = new ProfileMemoryStore();
  });

  it("lists profiles from memory when db is absent", async () => {
    memory.upsert(sampleProfile);

    const result = await handleProfileListRequest({ memory });

    expect(result.status).toBe(200);
    expect(result.body.success).toBe(true);
    if (result.body.success && "profiles" in result.body) {
      expect(result.body.profiles).toHaveLength(1);
    }
  });

  it("upserts and reads profile via D1", async () => {
    const db = createMemoryD1();

    const upsert = await handleProfileUpsertRequest(sampleProfile, { db, memory });
    expect(upsert.status).toBe(200);

    const get = await handleProfileGetRequest("shop-api-1", { db, memory });
    expect(get.status).toBe(200);
    if (get.body.success && "profile" in get.body) {
      expect(get.body.profile.name).toBe("API Test Shop");
      expect(get.body.profile.flour.primaryFlourId).toBe("flour-1");
    }
  });

  it("falls back to memory when D1 read fails", async () => {
    memory.upsert(sampleProfile);

    const brokenDb = {
      prepare: () => {
        throw new Error("d1 down");
      },
    };

    const result = await handleProfileGetRequest("shop-api-1", {
      db: brokenDb,
      memory,
    });

    expect(result.status).toBe(200);
    if (result.body.success && "profile" in result.body) {
      expect(result.body.profile.name).toBe("API Test Shop");
    }
  });

  it("returns 404 when profile not found", async () => {
    const result = await handleProfileGetRequest("missing", { memory });

    expect(result.status).toBe(404);
    expect(result.body.success).toBe(false);
  });

  it("deletes profile from memory", async () => {
    memory.upsert(sampleProfile);

    const deleted = await handleProfileDeleteRequest("shop-api-1", { memory });
    expect(deleted.status).toBe(200);
    if (deleted.body.success && "deleted" in deleted.body) {
      expect(deleted.body.deleted).toBe(true);
    }

    const get = await handleProfileGetRequest("shop-api-1", { memory });
    expect(get.status).toBe(404);
  });

  it("returns 400 for invalid upsert body", async () => {
    const result = await handleProfileUpsertRequest({ foo: "bar" }, { memory });
    expect(result.status).toBe(400);
  });
});

describe("profile-repository orchestration", () => {
  const db = createMemoryD1();

  beforeEach(() => {
    db.clear();
  });

  it("upsertShopProfile writes shops and profiles tables", async () => {
    await upsertShopProfile(db, sampleProfile);

    const profile = await findShopProfileById(db, "shop-api-1");
    expect(profile?.name).toBe("API Test Shop");

    const list = await listShopProfiles(db);
    expect(list).toHaveLength(1);
  });
});
