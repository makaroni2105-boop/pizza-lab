/**
 * ComparisonRun の localStorage 永続化（Phase 4e）。
 * ブラウザのみ。D1 / API 未使用。
 */

import {
  LAB_STORAGE_KEYS,
  type ComparisonDimension,
  type ComparisonRun,
  type ComparisonSide,
  type ComparisonStatus,
} from "@/types/lab";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

import { isComparisonRun, validateComparisonRun } from "./lab-validation";

export interface ComparisonStorageState {
  runs: ComparisonRun[];
}

export interface ComparisonSideDraft {
  label: string;
  memo: string;
  refId: string;
  refType: "run" | "session" | "";
}

export interface ComparisonDimensionDraft {
  key: string;
  label: string;
  valueA: string;
  valueB: string;
}

export interface CreateComparisonRunInput {
  shopId: string;
  title?: string;
  status?: ComparisonStatus;
  sideA?: ComparisonSide;
  sideB?: ComparisonSide;
  hypothesis?: string | null;
}

export interface SaveComparisonRunResult {
  ok: true;
  run: ComparisonRun;
}

export interface SaveComparisonRunError {
  ok: false;
  errors: string[];
}

export type SaveComparisonRunOutcome = SaveComparisonRunResult | SaveComparisonRunError;

export const SIDE_MEMO_KEY_A = "internal:sideA:memo";
export const SIDE_MEMO_KEY_B = "internal:sideB:memo";
export const OBSERVATION_DIMENSION_KEY = "internal:observation";

function createEmptyState(): ComparisonStorageState {
  return { runs: [] };
}

export function createDefaultComparisonSide(label: string): ComparisonSide {
  return {
    label,
    runId: null,
    labSessionId: null,
  };
}

export function createEmptyComparisonSideDraft(label: string): ComparisonSideDraft {
  return {
    label,
    memo: "",
    refId: "",
    refType: "",
  };
}

export function parseComparisonStorageState(raw: string | null): ComparisonStorageState {
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as ComparisonStorageState).runs)
    ) {
      return createEmptyState();
    }

    return {
      runs: (parsed as ComparisonStorageState).runs.filter(isComparisonRun),
    };
  } catch {
    return createEmptyState();
  }
}

export function serializeComparisonStorageState(state: ComparisonStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): ComparisonStorageState {
  return parseComparisonStorageState(storage.getItem(LAB_STORAGE_KEYS.comparisons));
}

function writeState(storage: StorageLike, state: ComparisonStorageState): void {
  storage.setItem(LAB_STORAGE_KEYS.comparisons, serializeComparisonStorageState(state));
}

export function generateComparisonRunId(): string {
  return `compare-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function generateComparisonDimensionKey(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

export function createComparisonRun(
  input: CreateComparisonRunInput,
  now?: () => number,
): ComparisonRun {
  const timestamp = new Date(now?.() ?? Date.now()).toISOString();
  const title = input.title?.trim() || "無題の比較";

  return {
    id: generateComparisonRunId(),
    shopId: input.shopId,
    title,
    status: input.status ?? "draft",
    sideA: input.sideA ?? createDefaultComparisonSide("Side A"),
    sideB: input.sideB ?? createDefaultComparisonSide("Side B"),
    dimensions: [],
    hypothesis: input.hypothesis?.trim() || null,
    conclusion: null,
    nextSteps: null,
    journalEntryIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function listComparisonRuns(storage?: StorageLike): ComparisonRun[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).runs.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listComparisonRunsByShopId(shopId: string, storage?: StorageLike): ComparisonRun[] {
  return listComparisonRuns(storage).filter((run) => run.shopId === shopId);
}

export function getComparisonRun(id: string, storage?: StorageLike): ComparisonRun | null {
  return listComparisonRuns(storage).find((run) => run.id === id) ?? null;
}

export function saveComparisonRun(
  run: ComparisonRun,
  storage?: StorageLike,
): SaveComparisonRunOutcome {
  const validation = validateComparisonRun(run);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { ok: false, errors: ["storage が利用できません"] };
  }

  const state = readState(store);
  const index = state.runs.findIndex((item) => item.id === run.id);
  const isUpdate = index >= 0;
  const nextRun: ComparisonRun = {
    ...run,
    updatedAt: isUpdate ? new Date().toISOString() : run.updatedAt,
  };

  if (index >= 0) {
    state.runs[index] = nextRun;
  } else {
    state.runs.push(nextRun);
  }

  writeState(store, state);
  return { ok: true, run: nextRun };
}

export function deleteComparisonRun(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const nextRuns = state.runs.filter((run) => run.id !== id);

  if (nextRuns.length === state.runs.length) {
    return false;
  }

  writeState(store, { runs: nextRuns });
  return true;
}

export function isInternalComparisonDimension(dimension: ComparisonDimension): boolean {
  return (
    dimension.key === SIDE_MEMO_KEY_A ||
    dimension.key === SIDE_MEMO_KEY_B ||
    dimension.key === OBSERVATION_DIMENSION_KEY
  );
}

export function getUserComparisonDimensions(dimensions: ComparisonDimension[]): ComparisonDimensionDraft[] {
  return dimensions
    .filter((dimension) => !isInternalComparisonDimension(dimension))
    .map((dimension) => ({
      key: dimension.key,
      label: dimension.label,
      valueA: dimension.valueA === null || dimension.valueA === undefined ? "" : String(dimension.valueA),
      valueB: dimension.valueB === null || dimension.valueB === undefined ? "" : String(dimension.valueB),
    }));
}

export function getSideMemo(dimensions: ComparisonDimension[], side: "A" | "B"): string {
  const key = side === "A" ? SIDE_MEMO_KEY_A : SIDE_MEMO_KEY_B;
  const dimension = dimensions.find((item) => item.key === key);
  const value = dimension?.valueA;

  return typeof value === "string" ? value : "";
}

export function getComparisonObservation(dimensions: ComparisonDimension[]): string {
  const dimension = dimensions.find((item) => item.key === OBSERVATION_DIMENSION_KEY);
  const value = dimension?.valueA;

  return typeof value === "string" ? value : "";
}

export function buildComparisonDimensions(input: {
  userDimensions: ComparisonDimensionDraft[];
  sideAMemo: string;
  sideBMemo: string;
  observation: string;
}): ComparisonDimension[] {
  const dimensions: ComparisonDimension[] = input.userDimensions
    .filter((dimension) => dimension.label.trim())
    .map((dimension) => ({
      key: dimension.key || generateComparisonDimensionKey(),
      label: dimension.label.trim(),
      valueA: dimension.valueA.trim() || null,
      valueB: dimension.valueB.trim() || null,
    }));

  if (input.sideAMemo.trim()) {
    dimensions.push({
      key: SIDE_MEMO_KEY_A,
      label: "Side A メモ",
      valueA: input.sideAMemo.trim(),
      valueB: null,
    });
  }

  if (input.sideBMemo.trim()) {
    dimensions.push({
      key: SIDE_MEMO_KEY_B,
      label: "Side B メモ",
      valueA: input.sideBMemo.trim(),
      valueB: null,
    });
  }

  if (input.observation.trim()) {
    dimensions.push({
      key: OBSERVATION_DIMENSION_KEY,
      label: "観察",
      valueA: input.observation.trim(),
      valueB: null,
    });
  }

  return dimensions;
}

export function comparisonSideDraftFromSide(side: ComparisonSide): ComparisonSideDraft {
  const refId = side.labSessionId ?? side.runId ?? "";

  return {
    label: side.label,
    memo: "",
    refId,
    refType: side.labSessionId ? "session" : side.runId ? "run" : "",
  };
}

export function applySideDraftToComparisonSide(draft: ComparisonSideDraft): ComparisonSide {
  const label = draft.label.trim() || "Side";
  const refId = draft.refId.trim();

  if (!refId) {
    return {
      label,
      runId: null,
      labSessionId: null,
    };
  }

  const refType =
    draft.refType ||
    (refId.startsWith("lab-") ? "session" : refId.startsWith("run-") ? "run" : "run");

  if (refType === "session") {
    return {
      label,
      labSessionId: refId,
      runId: null,
    };
  }

  return {
    label,
    runId: refId,
    labSessionId: null,
  };
}

export function getComparisonPreview(run: ComparisonRun): string {
  if (run.hypothesis?.trim()) {
    return run.hypothesis.trim();
  }

  if (run.conclusion?.trim()) {
    return run.conclusion.trim();
  }

  const observation = getComparisonObservation(run.dimensions);

  if (observation) {
    return observation;
  }

  return `${run.sideA.label} vs ${run.sideB.label}`;
}

export { LAB_STORAGE_KEYS, validateComparisonRun };
