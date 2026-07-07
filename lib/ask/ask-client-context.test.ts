import { describe, expect, it, beforeEach } from "vitest";

import { createLearningRun } from "@/lib/learning/learning-run";
import { saveLearningRun } from "@/lib/learning/learning-storage";
import { saveLabSession, createLabSessionDraft } from "@/lib/lab/lab-storage";
import { DEMO_SHOP_ID, PROFILE_STORAGE_KEY } from "@/lib/profile/profile-storage";
import { getDemoShopProfile } from "@/lib/profile/demo-profiles";
import type { StorageLike } from "@/lib/profile/profile-storage";

import {
  buildAskClientContextPayload,
  resolveAskClientShopId,
  summarizeAskClientContext,
} from "./ask-client-context";

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();

  return {
    getItem(key: string) {
      return map.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
    removeItem(key: string) {
      map.delete(key);
    },
  };
}

describe("ask-client-context", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
    const profile = getDemoShopProfile(DEMO_SHOP_ID);
    storage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        profiles: [profile],
        selectedShopId: DEMO_SHOP_ID,
      }),
    );
  });

  it("resolveAskClientShopId returns selected shop", () => {
    expect(resolveAskClientShopId(storage)).toBe(DEMO_SHOP_ID);
  });

  it("buildAskClientContextPayload collects shop-scoped data", () => {
    saveLabSession(
      createLabSessionDraft({ shopId: DEMO_SHOP_ID, title: "Lab test" }),
      storage,
    );
    saveLearningRun(
      createLearningRun({
        id: "run-1",
        shopId: DEMO_SHOP_ID,
        mixerKey: "spiral:a",
        recordedAt: "2026-07-07T10:00:00.000Z",
        snapshot: { flourTempC: 18, waterTempC: 12, roomTempC: 24 },
        predictedFrictionC: 4,
        predictedDoughTempC: 24,
        actualDoughTempC: 25,
      }),
      storage,
    );

    const payload = buildAskClientContextPayload(DEMO_SHOP_ID, storage);
    const summary = summarizeAskClientContext(payload);

    expect(payload.shopId).toBe(DEMO_SHOP_ID);
    expect(payload.profile?.name).toBeTruthy();
    expect(summary.labSessions).toBe(1);
    expect(summary.learningRuns).toBe(1);
  });

  it("filters other shop data out", () => {
    saveLabSession(
      createLabSessionDraft({ shopId: "other-shop", title: "Other" }),
      storage,
    );

    const payload = buildAskClientContextPayload(DEMO_SHOP_ID, storage);

    expect(payload.labSessions).toHaveLength(0);
  });
});
