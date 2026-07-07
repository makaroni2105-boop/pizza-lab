/**
 * FlourBlend の localStorage 永続化（Phase 4c）。
 * ブラウザのみ。D1 / API 未使用。
 */

import {
  LAB_STORAGE_KEYS,
  type FlourBlend,
  type FlourBlendComponent,
  type FlourBlendMethodContext,
} from "@/types/lab";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

import { isFlourBlend, isFlourBlendPercentValid, validateFlourBlend } from "./lab-validation";

export interface BlendStorageState {
  blends: FlourBlend[];
}

export interface CreateFlourBlendInput {
  shopId: string;
  name?: string;
  components?: FlourBlendComponent[];
  methodContext?: FlourBlendMethodContext;
  notes?: string | null;
  dnaId?: string | null;
}

export interface SaveFlourBlendResult {
  ok: true;
  blend: FlourBlend;
}

export interface SaveFlourBlendError {
  ok: false;
  errors: string[];
}

export type SaveFlourBlendOutcome = SaveFlourBlendResult | SaveFlourBlendError;

function createEmptyState(): BlendStorageState {
  return { blends: [] };
}

export function parseBlendStorageState(raw: string | null): BlendStorageState {
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as BlendStorageState).blends)
    ) {
      return createEmptyState();
    }

    return {
      blends: (parsed as BlendStorageState).blends.filter(isFlourBlend),
    };
  } catch {
    return createEmptyState();
  }
}

export function serializeBlendStorageState(state: BlendStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): BlendStorageState {
  return parseBlendStorageState(storage.getItem(LAB_STORAGE_KEYS.blends));
}

function writeState(storage: StorageLike, state: BlendStorageState): void {
  storage.setItem(LAB_STORAGE_KEYS.blends, serializeBlendStorageState(state));
}

export function generateFlourBlendId(): string {
  return `blend-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateFlourBlendComponentId(): string {
  return `blend-comp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function createDefaultBlendComponents(): FlourBlendComponent[] {
  return [
    { flourId: generateFlourBlendComponentId(), percent: 70, label: undefined },
    { flourId: generateFlourBlendComponentId(), percent: 30, label: undefined },
  ];
}

export function createFlourBlend(
  input: CreateFlourBlendInput,
  now?: () => number,
): FlourBlend {
  const timestamp = new Date(now?.() ?? Date.now()).toISOString();
  const name = input.name?.trim() || "無題のブレンド";

  return {
    id: generateFlourBlendId(),
    shopId: input.shopId,
    name,
    components: input.components ?? createDefaultBlendComponents(),
    methodContext: input.methodContext,
    dnaId: input.dnaId ?? null,
    notes: input.notes?.trim() || null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function listFlourBlends(storage?: StorageLike): FlourBlend[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).blends.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listFlourBlendsByShopId(shopId: string, storage?: StorageLike): FlourBlend[] {
  return listFlourBlends(storage).filter((blend) => blend.shopId === shopId);
}

export function getFlourBlend(id: string, storage?: StorageLike): FlourBlend | null {
  return listFlourBlends(storage).find((blend) => blend.id === id) ?? null;
}

export function saveFlourBlend(
  blend: FlourBlend,
  storage?: StorageLike,
): SaveFlourBlendOutcome {
  const validation = validateFlourBlend(blend);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { ok: false, errors: ["storage が利用できません"] };
  }

  const state = readState(store);
  const index = state.blends.findIndex((item) => item.id === blend.id);
  const isUpdate = index >= 0;
  const nextBlend: FlourBlend = {
    ...blend,
    updatedAt: isUpdate ? new Date().toISOString() : blend.updatedAt,
  };

  if (index >= 0) {
    state.blends[index] = nextBlend;
  } else {
    state.blends.push(nextBlend);
  }

  writeState(store, state);
  return { ok: true, blend: nextBlend };
}

export function deleteFlourBlend(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const nextBlends = state.blends.filter((blend) => blend.id !== id);

  if (nextBlends.length === state.blends.length) {
    return false;
  }

  writeState(store, { blends: nextBlends });
  return true;
}

export function formatComponentLabel(flourName: string, role: string): string | undefined {
  const name = flourName.trim();
  const roleText = role.trim();

  if (!name && !roleText) {
    return undefined;
  }

  if (roleText) {
    return `${name || "粉"}（${roleText}）`;
  }

  return name;
}

export function parseComponentLabel(label?: string): { flourName: string; role: string } {
  if (!label) {
    return { flourName: "", role: "" };
  }

  const match = label.match(/^(.+?)（(.+)）$/);

  if (match) {
    return { flourName: match[1] ?? "", role: match[2] ?? "" };
  }

  return { flourName: label, role: "" };
}

export { LAB_STORAGE_KEYS, isFlourBlendPercentValid, validateFlourBlend };
