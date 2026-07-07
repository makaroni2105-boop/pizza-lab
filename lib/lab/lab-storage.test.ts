import { describe, expect, it, beforeEach } from "vitest";

import {
  createLabSessionDraft,
  deleteLabSession,
  getLabSession,
  listLabSessions,
  listLabSessionsByShopId,
  parseLabStorageState,
  saveLabSession,
  LAB_STORAGE_KEYS,
} from "./lab-storage";
import type { StorageLike } from "@/lib/profile/profile-storage";

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

describe("lab-storage", () => {
  let storage: StorageLike;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it("creates draft session with defaults", () => {
    const session = createLabSessionDraft(
      {
        shopId: "shop-1",
        title: "  VPN 65% テスト ",
        hypothesis: "  冷蔵24hで軽さが出る ",
      },
      () => new Date("2026-07-07T10:00:00.000Z").getTime(),
    );

    expect(session.status).toBe("draft");
    expect(session.presetType).toBe("research");
    expect(session.title).toBe("VPN 65% テスト");
    expect(session.hypothesis).toBe("冷蔵24hで軽さが出る");
    expect(session.runIds).toEqual([]);
    expect(session.createdAt).toBe("2026-07-07T10:00:00.000Z");
  });

  it("saves and lists sessions newest first", () => {
    const older = createLabSessionDraft({ shopId: "shop-1", title: "Older" });
    const newer = createLabSessionDraft({ shopId: "shop-1", title: "Newer" });

    saveLabSession({ ...older, updatedAt: "2026-07-07T09:00:00.000Z" }, storage);
    saveLabSession({ ...newer, updatedAt: "2026-07-07T11:00:00.000Z" }, storage);

    const sessions = listLabSessions(storage);
    expect(sessions).toHaveLength(2);
    expect(sessions[0]?.title).toBe("Newer");
  });

  it("filters sessions by shop id", () => {
    saveLabSession(createLabSessionDraft({ shopId: "shop-a", title: "A" }), storage);
    saveLabSession(createLabSessionDraft({ shopId: "shop-b", title: "B" }), storage);

    expect(listLabSessionsByShopId("shop-a", storage)).toHaveLength(1);
    expect(listLabSessionsByShopId("shop-a", storage)[0]?.title).toBe("A");
  });

  it("deletes a session", () => {
    const session = createLabSessionDraft({ shopId: "shop-1", title: "Delete me" });
    saveLabSession(session, storage);

    expect(deleteLabSession(session.id, storage)).toBe(true);
    expect(getLabSession(session.id, storage)).toBeNull();
    expect(listLabSessions(storage)).toHaveLength(0);
  });

  it("parses invalid storage safely", () => {
    expect(parseLabStorageState(null).sessions).toEqual([]);
    expect(parseLabStorageState("{bad").sessions).toEqual([]);
    expect(parseLabStorageState(JSON.stringify({ sessions: [{ id: "x" }] })).sessions).toEqual([]);
  });

  it("uses LAB_STORAGE_KEYS.sessions", () => {
    const session = createLabSessionDraft({ shopId: "shop-1", title: "Stored" });
    saveLabSession(session, storage);

    const raw = storage.getItem(LAB_STORAGE_KEYS.sessions);
    expect(raw).toContain("Stored");
  });
});
