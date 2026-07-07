/**
 * LabSession の localStorage 永続化（Phase 4a）。
 * ブラウザのみ。D1 / API 未使用。
 */

import {
  LAB_STORAGE_KEYS,
  type DNAPresetType,
  type LabSession,
  type LabSessionStatus,
} from "@/types/lab";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

export interface LabStorageState {
  sessions: LabSession[];
}

export interface CreateLabSessionDraftInput {
  shopId: string;
  title?: string;
  hypothesis?: string | null;
  presetType?: DNAPresetType;
  tags?: string[];
}

function createEmptyState(): LabStorageState {
  return { sessions: [] };
}

const LAB_STATUSES: LabSessionStatus[] = ["draft", "running", "completed", "archived"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isLabSession(value: unknown): value is LabSession {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.shopId === "string" &&
    typeof value.status === "string" &&
    LAB_STATUSES.includes(value.status as LabSessionStatus) &&
    isStringArray(value.runIds) &&
    isStringArray(value.journalEntryIds) &&
    isStringArray(value.comparisonIds) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function parseLabStorageState(raw: string | null): LabStorageState {
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed) || !Array.isArray(parsed.sessions)) {
      return createEmptyState();
    }

    return {
      sessions: parsed.sessions.filter(isLabSession),
    };
  } catch {
    return createEmptyState();
  }
}

export function serializeLabStorageState(state: LabStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): LabStorageState {
  return parseLabStorageState(storage.getItem(LAB_STORAGE_KEYS.sessions));
}

function writeState(storage: StorageLike, state: LabStorageState): void {
  storage.setItem(LAB_STORAGE_KEYS.sessions, serializeLabStorageState(state));
}

export function generateLabSessionId(): string {
  return `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createLabSessionDraft(
  input: CreateLabSessionDraftInput,
  now?: () => number,
): LabSession {
  const timestamp = new Date(now?.() ?? Date.now()).toISOString();
  const title = input.title?.trim() || "無題の研究ノート";

  return {
    id: generateLabSessionId(),
    shopId: input.shopId,
    title,
    status: "draft",
    presetType: input.presetType ?? "research",
    hypothesis: input.hypothesis?.trim() || null,
    runIds: [],
    journalEntryIds: [],
    comparisonIds: [],
    summary: null,
    tags: input.tags ?? [],
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
  };
}

export function listLabSessions(storage?: StorageLike): LabSession[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).sessions.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listLabSessionsByShopId(
  shopId: string,
  storage?: StorageLike,
): LabSession[] {
  return listLabSessions(storage).filter((session) => session.shopId === shopId);
}

export function getLabSession(id: string, storage?: StorageLike): LabSession | null {
  return listLabSessions(storage).find((session) => session.id === id) ?? null;
}

export function saveLabSession(session: LabSession, storage?: StorageLike): LabSession {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return session;
  }

  const state = readState(store);
  const index = state.sessions.findIndex((item) => item.id === session.id);
  const isUpdate = index >= 0;
  const nextSession: LabSession = {
    ...session,
    updatedAt: isUpdate ? new Date().toISOString() : session.updatedAt,
  };

  if (index >= 0) {
    state.sessions[index] = nextSession;
  } else {
    state.sessions.push(nextSession);
  }

  writeState(store, state);
  return nextSession;
}

export function deleteLabSession(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const nextSessions = state.sessions.filter((session) => session.id !== id);

  if (nextSessions.length === state.sessions.length) {
    return false;
  }

  writeState(store, { sessions: nextSessions });
  return true;
}

export { LAB_STORAGE_KEYS };
