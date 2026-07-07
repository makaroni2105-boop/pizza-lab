/**
 * DoughJournal の localStorage 永続化（Phase 4d）。
 * ブラウザのみ。D1 / API 未使用。
 */

import {
  LAB_STORAGE_KEYS,
  type CraftsmanMood,
  type DoughJournal,
  type JournalEntryType,
} from "@/types/lab";

import type { StorageLike } from "@/lib/profile/profile-storage";
import { getBrowserStorage } from "@/lib/profile/profile-storage";

import { isDoughJournal, validateDoughJournal } from "./lab-validation";

export interface JournalStorageState {
  entries: DoughJournal[];
}

export interface JournalBodySections {
  observation: string;
  hypothesis: string;
  procedure: string;
  result: string;
  nextTry: string;
}

export interface CreateDoughJournalInput {
  shopId: string;
  title?: string;
  entryType?: JournalEntryType;
  craftsmanMood?: CraftsmanMood;
  sections?: JournalBodySections;
  labSessionId?: string | null;
  runId?: string | null;
  tags?: string[];
}

export interface SaveDoughJournalResult {
  ok: true;
  entry: DoughJournal;
}

export interface SaveDoughJournalError {
  ok: false;
  errors: string[];
}

export type SaveDoughJournalOutcome = SaveDoughJournalResult | SaveDoughJournalError;

const SECTION_LABELS: Record<keyof JournalBodySections, string> = {
  observation: "観察",
  hypothesis: "仮説",
  procedure: "手順",
  result: "結果",
  nextTry: "次に試すこと",
};

const SECTION_ORDER: Array<keyof JournalBodySections> = [
  "observation",
  "hypothesis",
  "procedure",
  "result",
  "nextTry",
];

function createEmptyState(): JournalStorageState {
  return { entries: [] };
}

export function createEmptyJournalBodySections(): JournalBodySections {
  return {
    observation: "",
    hypothesis: "",
    procedure: "",
    result: "",
    nextTry: "",
  };
}

export function formatJournalBody(sections: JournalBodySections): string {
  return SECTION_ORDER.map((key) => {
    const content = sections[key].trim();

    if (!content) {
      return "";
    }

    return `## ${SECTION_LABELS[key]}\n${content}`;
  })
    .filter(Boolean)
    .join("\n\n");
}

export function parseJournalBody(body: string): JournalBodySections {
  const sections = createEmptyJournalBodySections();

  if (!body.trim()) {
    return sections;
  }

  if (!body.includes("## ")) {
    sections.observation = body.trim();
    return sections;
  }

  for (const key of SECTION_ORDER) {
    const label = SECTION_LABELS[key];
    const pattern = new RegExp(`## ${label}\\n([\\s\\S]*?)(?=\\n## |$)`);
    const match = body.match(pattern);

    if (match?.[1]) {
      sections[key] = match[1].trim();
    }
  }

  return sections;
}

export function getJournalBodyPreview(body: string, maxLength = 80): string {
  const sections = parseJournalBody(body);

  for (const key of SECTION_ORDER) {
    const content = sections[key].trim();

    if (content) {
      return content.length > maxLength ? `${content.slice(0, maxLength)}…` : content;
    }
  }

  return "";
}

export function parseJournalStorageState(raw: string | null): JournalStorageState {
  if (!raw) {
    return createEmptyState();
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as JournalStorageState).entries)
    ) {
      return createEmptyState();
    }

    return {
      entries: (parsed as JournalStorageState).entries.filter(isDoughJournal),
    };
  } catch {
    return createEmptyState();
  }
}

export function serializeJournalStorageState(state: JournalStorageState): string {
  return JSON.stringify(state);
}

function readState(storage: StorageLike): JournalStorageState {
  return parseJournalStorageState(storage.getItem(LAB_STORAGE_KEYS.journal));
}

function writeState(storage: StorageLike, state: JournalStorageState): void {
  storage.setItem(LAB_STORAGE_KEYS.journal, serializeJournalStorageState(state));
}

export function generateDoughJournalId(): string {
  return `journal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDoughJournal(
  input: CreateDoughJournalInput,
  now?: () => number,
): DoughJournal {
  const timestamp = new Date(now?.() ?? Date.now()).toISOString();
  const title = input.title?.trim() || "無題の研究ノート";
  const sections = input.sections ?? createEmptyJournalBodySections();

  return {
    id: generateDoughJournalId(),
    shopId: input.shopId,
    title,
    body: formatJournalBody(sections),
    entryType: input.entryType ?? "observation",
    craftsmanMood: input.craftsmanMood,
    labSessionId: input.labSessionId ?? null,
    runId: input.runId ?? null,
    tags: input.tags ?? [],
    dnaSnapshotId: null,
    photoIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function listDoughJournals(storage?: StorageLike): DoughJournal[] {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return [];
  }

  return readState(store).entries.sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function listDoughJournalsByShopId(shopId: string, storage?: StorageLike): DoughJournal[] {
  return listDoughJournals(storage).filter((entry) => entry.shopId === shopId);
}

export function getDoughJournal(id: string, storage?: StorageLike): DoughJournal | null {
  return listDoughJournals(storage).find((entry) => entry.id === id) ?? null;
}

export function saveDoughJournal(
  entry: DoughJournal,
  storage?: StorageLike,
): SaveDoughJournalOutcome {
  const validation = validateDoughJournal(entry);

  if (!validation.valid) {
    return { ok: false, errors: validation.errors };
  }

  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { ok: false, errors: ["storage が利用できません"] };
  }

  const state = readState(store);
  const index = state.entries.findIndex((item) => item.id === entry.id);
  const isUpdate = index >= 0;
  const nextEntry: DoughJournal = {
    ...entry,
    updatedAt: isUpdate ? new Date().toISOString() : entry.updatedAt,
  };

  if (index >= 0) {
    state.entries[index] = nextEntry;
  } else {
    state.entries.push(nextEntry);
  }

  writeState(store, state);
  return { ok: true, entry: nextEntry };
}

export function deleteDoughJournal(id: string, storage?: StorageLike): boolean {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return false;
  }

  const state = readState(store);
  const nextEntries = state.entries.filter((entry) => entry.id !== id);

  if (nextEntries.length === state.entries.length) {
    return false;
  }

  writeState(store, { entries: nextEntries });
  return true;
}

export { LAB_STORAGE_KEYS, validateDoughJournal };
