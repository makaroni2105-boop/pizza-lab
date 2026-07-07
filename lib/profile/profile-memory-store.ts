/**
 * サーバー側インメモリ Profile ストア（API fallback 用）。
 * ブラウザ localStorage（profile-storage.ts）とは独立。
 */

import type { ShopProfile } from "@/types/profile";

export class ProfileMemoryStore {
  private profiles = new Map<string, ShopProfile>();

  list(): ShopProfile[] {
    return Array.from(this.profiles.values()).sort((left, right) =>
      (right.updatedAt ?? "").localeCompare(left.updatedAt ?? ""),
    );
  }

  get(id: string): ShopProfile | null {
    return this.profiles.get(id) ?? null;
  }

  upsert(profile: ShopProfile): ShopProfile {
    this.profiles.set(profile.id, profile);
    return profile;
  }

  delete(id: string): boolean {
    return this.profiles.delete(id);
  }

  clear(): void {
    this.profiles.clear();
  }
}

let defaultStore: ProfileMemoryStore | null = null;

export function getDefaultProfileMemoryStore(): ProfileMemoryStore {
  if (!defaultStore) {
    defaultStore = new ProfileMemoryStore();
  }

  return defaultStore;
}

export function resetDefaultProfileMemoryStore(): void {
  defaultStore = null;
}
