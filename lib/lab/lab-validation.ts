/**
 * Lab Mode — バリデーション（純粋関数）。
 * UI / storage 層で使用。DIE / Learning は変更しない。
 */

import {
  DNA_KEYS,
  type DNAPresetType,
  type DNALearningRecord,
  type DNALearningSource,
  type DoughDNA,
  type DNAScore,
  type DNAScores,
  type FlourBlend,
  type FlourBlendComponent,
  type FlourBlendMethodContext,
  type DoughJournal,
  type JournalEntryType,
  type CraftsmanMood,
  type ComparisonRun,
  type ComparisonSide,
  type ComparisonDimension,
  type ComparisonStatus,
} from "@/types/lab";

const MIN_DNA_SCORE = 0;
const MAX_DNA_SCORE = 100;
const BLEND_PERCENT_TOLERANCE = 0.1;

export function isValidDNAScore(value: unknown): value is DNAScore {
  return typeof value === "number" && Number.isFinite(value) && value >= MIN_DNA_SCORE && value <= MAX_DNA_SCORE;
}

export function isValidDNAScores(value: unknown): value is DNAScores {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  for (const [key, score] of Object.entries(value)) {
    if (!DNA_KEYS.includes(key as (typeof DNA_KEYS)[number])) {
      return false;
    }

    if (score !== null && score !== undefined && !isValidDNAScore(score)) {
      return false;
    }
  }

  return true;
}

export function sumFlourBlendPercents(components: FlourBlendComponent[]): number {
  return components.reduce((sum, item) => sum + item.percent, 0);
}

/** 粉ブレンド比率が 100% ± tolerance か */
export function isFlourBlendPercentValid(
  components: FlourBlendComponent[],
  tolerance = BLEND_PERCENT_TOLERANCE,
): boolean {
  if (components.length < 2) {
    return false;
  }

  for (const item of components) {
    if (!Number.isFinite(item.percent) || item.percent <= 0 || item.percent > 100) {
      return false;
    }
  }

  const total = sumFlourBlendPercents(components);
  return Math.abs(total - 100) <= tolerance;
}

export function hasComparisonSideReference(side: ComparisonSide): boolean {
  return Boolean(
    (side.runId && side.runId.length > 0) ||
      (side.labSessionId && side.labSessionId.length > 0),
  );
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

const DNA_PRESET_TYPES: DNAPresetType[] = ["business", "competition", "research"];

const DNA_LEARNING_SOURCES: DNALearningSource[] = [
  "craftsman-self-eval",
  "run-actual",
  "photo-analysis",
  "manual",
];

export interface DoughDNAValidationResult {
  valid: boolean;
  errors: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidDNALearningRecord(value: unknown): value is DNALearningRecord {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.source === "string" &&
    DNA_LEARNING_SOURCES.includes(value.source as DNALearningSource) &&
    typeof value.craftsmanConfirmed === "boolean" &&
    typeof value.updatedAt === "string" &&
    (value.previousScores === undefined || isValidDNAScores(value.previousScores)) &&
    (value.updatedScores === undefined || isValidDNAScores(value.updatedScores))
  );
}

export function validateDoughDNA(value: unknown): DoughDNAValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["DoughDNA がオブジェクトではありません"] };
  }

  if (!isNonEmptyString(value.id)) {
    errors.push("id が空です");
  }

  if (!isNonEmptyString(value.shopId)) {
    errors.push("shopId が空です");
  }

  if (!isNonEmptyString(value.name)) {
    errors.push("name が空です");
  } else if (value.name.length > 60) {
    errors.push("name は 60 文字以内です");
  }

  if (
    typeof value.presetType !== "string" ||
    !DNA_PRESET_TYPES.includes(value.presetType as DNAPresetType)
  ) {
    errors.push("presetType が不正です");
  }

  if (!isValidDNAScores(value.scores)) {
    errors.push("scores が不正です");
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    errors.push("createdAt が空です");
  }

  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
    errors.push("updatedAt が空です");
  }

  if (value.description !== undefined && typeof value.description !== "string") {
    errors.push("description が不正です");
  }

  if (typeof value.description === "string" && value.description.length > 500) {
    errors.push("description は 500 文字以内です");
  }

  if (value.isDefault !== undefined && typeof value.isDefault !== "boolean") {
    errors.push("isDefault が不正です");
  }

  if (value.linkedFlourIds !== undefined && !isStringArray(value.linkedFlourIds)) {
    errors.push("linkedFlourIds が不正です");
  }

  if (
    value.linkedMixerKey !== undefined &&
    value.linkedMixerKey !== null &&
    typeof value.linkedMixerKey !== "string"
  ) {
    errors.push("linkedMixerKey が不正です");
  }

  if (value.learningHistory !== undefined) {
    if (!Array.isArray(value.learningHistory)) {
      errors.push("learningHistory が不正です");
    } else if (!value.learningHistory.every(isValidDNALearningRecord)) {
      errors.push("learningHistory の要素が不正です");
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isDoughDNA(value: unknown): value is DoughDNA {
  return validateDoughDNA(value).valid;
}

const BLEND_METHOD_CONTEXTS: FlourBlendMethodContext[] = [
  "napoli",
  "ny",
  "roma",
  "stg",
  "vpn",
  "apn",
  "custom",
];

const MAX_BLEND_COMPONENTS = 5;

export interface FlourBlendValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidFlourBlendComponent(value: unknown): value is FlourBlendComponent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.flourId) &&
    typeof value.percent === "number" &&
    Number.isFinite(value.percent) &&
    (value.label === undefined || typeof value.label === "string")
  );
}

export function validateFlourBlend(value: unknown): FlourBlendValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["FlourBlend がオブジェクトではありません"] };
  }

  if (!isNonEmptyString(value.id)) {
    errors.push("id が空です");
  }

  if (!isNonEmptyString(value.shopId)) {
    errors.push("shopId が空です");
  }

  if (!isNonEmptyString(value.name)) {
    errors.push("name が空です");
  } else if (value.name.length > 80) {
    errors.push("name は 80 文字以内です");
  }

  if (!Array.isArray(value.components)) {
    errors.push("components が不正です");
  } else {
    if (value.components.length < 2) {
      errors.push("components は 2 種類以上必要です");
    }

    if (value.components.length > MAX_BLEND_COMPONENTS) {
      errors.push(`components は ${MAX_BLEND_COMPONENTS} 種類以内です`);
    }

    if (!value.components.every(isValidFlourBlendComponent)) {
      errors.push("components の要素が不正です");
    } else if (!isFlourBlendPercentValid(value.components)) {
      errors.push("components の比率合計が 100% ではありません");
    }
  }

  if (
    value.methodContext !== undefined &&
    (typeof value.methodContext !== "string" ||
      !BLEND_METHOD_CONTEXTS.includes(value.methodContext as FlourBlendMethodContext))
  ) {
    errors.push("methodContext が不正です");
  }

  if (value.notes !== undefined && value.notes !== null && typeof value.notes !== "string") {
    errors.push("notes が不正です");
  }

  if (typeof value.notes === "string" && value.notes.length > 500) {
    errors.push("notes は 500 文字以内です");
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    errors.push("createdAt が空です");
  }

  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
    errors.push("updatedAt が空です");
  }

  return { valid: errors.length === 0, errors };
}

export function isFlourBlend(value: unknown): value is FlourBlend {
  return validateFlourBlend(value).valid;
}

const JOURNAL_ENTRY_TYPES: JournalEntryType[] = [
  "observation",
  "hypothesis",
  "procedure",
  "reflection",
  "reference",
];

const CRAFTSMAN_MOODS: CraftsmanMood[] = ["curious", "satisfied", "unsure", "breakthrough"];

export interface DoughJournalValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDoughJournal(value: unknown): DoughJournalValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["DoughJournal がオブジェクトではありません"] };
  }

  if (!isNonEmptyString(value.id)) {
    errors.push("id が空です");
  }

  if (!isNonEmptyString(value.shopId)) {
    errors.push("shopId が空です");
  }

  if (!isNonEmptyString(value.title)) {
    errors.push("title が空です");
  } else if (value.title.length > 120) {
    errors.push("title は 120 文字以内です");
  }

  if (typeof value.body !== "string") {
    errors.push("body が不正です");
  } else if (value.body.length > 8000) {
    errors.push("body は 8000 文字以内です");
  }

  if (
    typeof value.entryType !== "string" ||
    !JOURNAL_ENTRY_TYPES.includes(value.entryType as JournalEntryType)
  ) {
    errors.push("entryType が不正です");
  }

  if (
    value.craftsmanMood !== undefined &&
    (typeof value.craftsmanMood !== "string" ||
      !CRAFTSMAN_MOODS.includes(value.craftsmanMood as CraftsmanMood))
  ) {
    errors.push("craftsmanMood が不正です");
  }

  if (value.tags !== undefined && !isStringArray(value.tags)) {
    errors.push("tags が不正です");
  }

  if (value.photoIds !== undefined && !isStringArray(value.photoIds)) {
    errors.push("photoIds が不正です");
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    errors.push("createdAt が空です");
  }

  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
    errors.push("updatedAt が空です");
  }

  return { valid: errors.length === 0, errors };
}

export function isDoughJournal(value: unknown): value is DoughJournal {
  return validateDoughJournal(value).valid;
}

const COMPARISON_STATUSES: ComparisonStatus[] = ["draft", "ready", "concluded"];

export interface ComparisonRunValidationResult {
  valid: boolean;
  errors: string[];
}

function isValidComparisonSide(value: unknown): value is ComparisonSide {
  if (!isRecord(value)) {
    return false;
  }

  return isNonEmptyString(value.label);
}

function isValidComparisonDimension(value: unknown): value is ComparisonDimension {
  if (!isRecord(value)) {
    return false;
  }

  return isNonEmptyString(value.key) && isNonEmptyString(value.label);
}

export function validateComparisonRun(value: unknown): ComparisonRunValidationResult {
  const errors: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, errors: ["ComparisonRun がオブジェクトではありません"] };
  }

  if (!isNonEmptyString(value.id)) {
    errors.push("id が空です");
  }

  if (!isNonEmptyString(value.shopId)) {
    errors.push("shopId が空です");
  }

  if (!isNonEmptyString(value.title)) {
    errors.push("title が空です");
  } else if (value.title.length > 120) {
    errors.push("title は 120 文字以内です");
  }

  if (
    typeof value.status !== "string" ||
    !COMPARISON_STATUSES.includes(value.status as ComparisonStatus)
  ) {
    errors.push("status が不正です");
  }

  if (!isValidComparisonSide(value.sideA)) {
    errors.push("sideA が不正です");
  }

  if (!isValidComparisonSide(value.sideB)) {
    errors.push("sideB が不正です");
  }

  if (value.sideC !== undefined && !isValidComparisonSide(value.sideC)) {
    errors.push("sideC が不正です");
  }

  if (!Array.isArray(value.dimensions)) {
    errors.push("dimensions が不正です");
  } else if (!value.dimensions.every(isValidComparisonDimension)) {
    errors.push("dimensions の要素が不正です");
  }

  if (value.hypothesis !== undefined && value.hypothesis !== null && typeof value.hypothesis !== "string") {
    errors.push("hypothesis が不正です");
  }

  if (value.conclusion !== undefined && value.conclusion !== null && typeof value.conclusion !== "string") {
    errors.push("conclusion が不正です");
  }

  if (value.nextSteps !== undefined && value.nextSteps !== null && typeof value.nextSteps !== "string") {
    errors.push("nextSteps が不正です");
  }

  if (value.journalEntryIds !== undefined && !isStringArray(value.journalEntryIds)) {
    errors.push("journalEntryIds が不正です");
  }

  if (typeof value.createdAt !== "string" || !value.createdAt.trim()) {
    errors.push("createdAt が空です");
  }

  if (typeof value.updatedAt !== "string" || !value.updatedAt.trim()) {
    errors.push("updatedAt が空です");
  }

  return { valid: errors.length === 0, errors };
}

export function isComparisonRun(value: unknown): value is ComparisonRun {
  return validateComparisonRun(value).valid;
}
