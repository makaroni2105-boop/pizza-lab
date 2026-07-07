/**
 * DoughDNA の localStorage 永続化（Phase 4b）。
 * ブラウザのみ。D1 / API 未使用。
 */

import {
  DNA_KEYS,
  LAB_STORAGE_KEYS,
  type DNAPresetType,
  type DNAScores,
  type DoughDNA,
} from "@/types/lab";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

import { isDoughDNA, validateDoughDNA } from "./lab-validation";

export interface DnaStorageState {
  profiles: DoughDNA[];
}

export interface CreateDoughDNAInput {
  shopId: string;
  name?: string;
  presetType?: DNAPresetType;
  description?: string;
  scores?: DNAScores;
  isDefault?: boolean;
}

export interface SaveDoughDNAResult {
  ok: true;
  profile: DoughDNA;
}

export interface SaveDoughDNAError {
  ok: false;
  errors: string[];
}

export type SaveDoughDNAOutcome = SaveDoughDNAResult | SaveDoughDNAError;

function createEmptyState(): DnaStorageState {
  return { profiles: [] };
}

export function createEmptyDNAScores(): DNAScores {
  const scores: DNAScores = {};

  for (const key of DNA_KEYS) {
    scores[key] = null;
  }

  return scores;
}

export function parseDnaStorageState(raw: string | null): DnaStorageState {
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as DnaStorageState).profiles)
    ) {
      return createEmptyState();
    }

    return {
      profiles: (parsed as DnaStorageState).profiles.filter(isDoughDNA),
    };
  } catch {
    return createEmptyState();
  }
}

export function serializeDnaStorageState(state: DnaStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): DnaStorageState {
  return parseDnaStorageState(storage.getItem(LAB_STORAGE_KEYS.dna));
}

function writeState(storage: StorageLike, state: DnaStorageState): void {
  storage.setItem(LAB_STORAGE_KEYS.dna, serializeDnaStorageState(state));
}

export function generateDoughDNAId(): string {
  return `dna-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDoughDNA(
  input: CreateDoughDNAInput,
  now?: () => number,
): DoughDNA {
  const timestamp = new Date(now?.() ?? Date.now()).toISOString();
  const name = input.name?.trim() || "無題の DNA";

  return {
    id: generateDoughDNAId(),
    shopId: input.shopId,
    name,
    presetType: input.presetType ?? "research",
    presetId: null,
    scores: input.scores ?? createEmptyDNAScores(),
    description: input.description?.trim() || undefined,
    isDefault: input.isDefault ?? false,
    learningHistory: [],
    linkedFlourIds: [],
    linkedMixerKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function listDoughDNA(storage?: StorageLike): DoughDNA[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).profiles.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listDoughDNAByShopId(shopId: string, storage?: StorageLike): DoughDNA[] {
  return listDoughDNA(storage).filter((profile) => profile.shopId === shopId);
}

export function getDoughDNA(id: string, storage?: StorageLike): DoughDNA | null {
  return listDoughDNA(storage).find((profile) => profile.id === id) ?? null;
}

export function saveDoughDNA(
  profile: DoughDNA,
  storage?: StorageLike,
): SaveDoughDNAOutcome {
  const validation = validateDoughDNA(profile);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { ok: false, errors: ["storage が利用できません"] };
  }

  const state = readState(store);
  const index = state.profiles.findIndex((item) => item.id === profile.id);
  const isUpdate = index >= 0;
  const nextProfile: DoughDNA = {
    ...profile,
    updatedAt: isUpdate ? new Date().toISOString() : profile.updatedAt,
  };

  if (index >= 0) {
    state.profiles[index] = nextProfile;
  } else {
    state.profiles.push(nextProfile);
  }

  writeState(store, state);
  return { ok: true, profile: nextProfile };
}

export function deleteDoughDNA(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const nextProfiles = state.profiles.filter((profile) => profile.id !== id);

  if (nextProfiles.length === state.profiles.length) {
    return false;
  }

  writeState(store, { profiles: nextProfiles });
  return true;
}

export function countSetDNAScores(scores: DNAScores): number {
  return DNA_KEYS.filter((key) => scores[key] !== null && scores[key] !== undefined).length;
}

export { LAB_STORAGE_KEYS, validateDoughDNA };
