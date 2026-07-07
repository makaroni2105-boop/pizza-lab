/**
 * AI / ResearchContext / Research Memory 型定義（Phase 5a）。
 * 正本: docs/ai/
 *
 * DIE / Learning / Lab / Calculator / Ask の既存型を import 参照のみ。
 */

import type { DieOutput, ConfidenceLevel } from "./die";
import type { LearningSummary, ShopProfile } from "./profile";
import type {
  ComparisonRun,
  DoughDNA,
  DoughJournal,
  FlourBlend,
  LabSession,
} from "./lab";
import type { LearningRun } from "@/lib/learning/learning-types";
import type { KnowledgeSearchResult } from "@/lib/knowledge/knowledge-types";
import type { WeatherSnapshot } from "@/lib/defaults/resolve-environment";

/** Research Memory の出典 */
export type ResearchMemorySource =
  | "learning_run"
  | "lab_session"
  | "dough_dna"
  | "flour_blend"
  | "journal"
  | "comparison";

/** ResearchContext ブロックの出典 */
export type ResearchContextSource =
  | "knowledge"
  | "learning"
  | "weather"
  | "run_history"
  | "dough_dna"
  | "flour_blend"
  | "journal"
  | "comparison"
  | "profile"
  | "die_output"
  | "research_memory";

export type ResearchConfidence = "fact" | "hypothesis" | "subjective";

/** カテゴリあたりの最大 Memory 件数（docs/ai/research-memory.md） */
export const RESEARCH_MEMORY_MAX_ITEMS_PER_CATEGORY = 5;

/** Memory excerpt の最大文字数 */
export const RESEARCH_MEMORY_EXCERPT_MAX_LENGTH = 200;

/** Knowledge 記事上限 */
export const RESEARCH_CONTEXT_KNOWLEDGE_LIMIT = 3;

/** Knowledge 抜粋の最大文字数 */
export const RESEARCH_CONTEXT_KNOWLEDGE_EXCERPT_MAX = 500;

/** Run History 直近件数 */
export const RESEARCH_CONTEXT_RUN_HISTORY_LIMIT = 5;

/** Journal / Comparison / DNA / Blend の直近件数 */
export const RESEARCH_CONTEXT_ENTITY_LIMIT = 5;

// ---------------------------------------------------------------------------
// Research Memory
// ---------------------------------------------------------------------------

export interface ResearchMemoryItem {
  id: string;
  source: ResearchMemorySource;
  label: string;
  excerpt: string;
  recordedAt: string;
  confidence: ResearchConfidence;
}

export interface ResearchMemory {
  shopId: string;
  synthesizedAt: string;
  hypotheses: ResearchMemoryItem[];
  experiments: ResearchMemoryItem[];
  results: ResearchMemoryItem[];
  openQuestions: ResearchMemoryItem[];
  nextSteps: ResearchMemoryItem[];
}

export interface ResearchMemoryInput {
  shopId: string;
  synthesizedAt?: string;
  labSessions?: LabSession[];
  learningRuns?: LearningRun[];
  doughDnas?: DoughDNA[];
  flourBlends?: FlourBlend[];
  journals?: DoughJournal[];
  comparisons?: ComparisonRun[];
  maxItemsPerCategory?: number;
}

// ---------------------------------------------------------------------------
// ResearchContext slices
// ---------------------------------------------------------------------------

export interface KnowledgeContextSlice {
  source: "knowledge";
  entryId: string;
  tier: number;
  titleJa: string;
  relativePath: string;
  excerpt: string;
  score: number;
}

export interface LearningContextSlice {
  source: "learning";
  mixerKey: string;
  runCount: number;
  learnedFrictionOffset: number;
  isLearningComplete: boolean;
  lastUpdatedAt?: string;
}

export interface WeatherContextSlice {
  source: "weather";
  ambientTempC?: number;
  ambientHumidityPct?: number;
  capturedAt?: string;
}

export interface RunHistoryContextSlice {
  source: "run_history";
  runId: string;
  recordedAt: string;
  mixerKey: string;
  predictedDoughTempC: number;
  actualDoughTempC: number;
  tempDeltaC: number;
  craftsmanScore?: number;
  memoExcerpt?: string;
}

export interface DoughDnaContextSlice {
  source: "dough_dna";
  dnaId: string;
  name: string;
  presetType: string;
  descriptionExcerpt?: string;
  configuredScoreCount: number;
  unsetScoreCount: number;
  isDefault?: boolean;
  updatedAt: string;
}

export interface FlourBlendContextSlice {
  source: "flour_blend";
  blendId: string;
  name: string;
  componentSummary: string;
  totalPercent: number;
  methodContext?: string;
  notesExcerpt?: string;
  updatedAt: string;
}

export interface JournalContextSlice {
  source: "journal";
  journalId: string;
  title: string;
  entryType: string;
  excerpt: string;
  craftsmanMood?: string;
  updatedAt: string;
}

export interface ComparisonContextSlice {
  source: "comparison";
  comparisonId: string;
  title: string;
  status: string;
  sideALabel: string;
  sideBLabel: string;
  hypothesisExcerpt?: string;
  conclusionExcerpt?: string;
  nextStepsExcerpt?: string;
  dimensionSummary?: string;
  updatedAt: string;
}

export interface ProfileContextSlice {
  source: "profile";
  shopId: string;
  shopName: string;
  defaultPresetName?: string;
  method: string;
  mixerType: string;
  primaryFlourId: string;
}

/**
 * DIE 計算結果の参照用スライス。数値は DieOutput からの写しのみ — AI は再計算しない。
 */
export interface DieOutputContextSlice {
  source: "die_output";
  referenceOnly: true;
  calculatedAt?: string;
  hydrationPct: number;
  recommendedWaterTempC: number;
  predictedDoughTempC: number;
  targetDdtC: number;
  useIce: boolean;
  iceAmountG?: number;
  frictionRiseC: number;
  frictionSource?: string;
  flourG: number;
  waterG: number;
  confidenceLevel: ConfidenceLevel;
  learningRunCount: number;
}

export interface ResearchMemoryContextSlice {
  source: "research_memory";
  memory: ResearchMemory;
}

export interface ResearchContextLimits {
  knowledge: number;
  runHistory: number;
  journal: number;
  comparison: number;
  doughDna: number;
  flourBlend: number;
}

export interface ResearchContextMeta {
  synthesizedAt: string;
  missingSources: ResearchContextSource[];
  truncatedSources: ResearchContextSource[];
  limits: ResearchContextLimits;
  totalRunCount: number;
  isLearningComplete: boolean;
}

export interface ResearchContext {
  shopId: string;
  question: string;
  knowledge: KnowledgeContextSlice[];
  learning: LearningContextSlice[];
  weather?: WeatherContextSlice;
  runHistory: RunHistoryContextSlice[];
  doughDna: DoughDnaContextSlice[];
  flourBlends: FlourBlendContextSlice[];
  journal: JournalContextSlice[];
  comparisons: ComparisonContextSlice[];
  profile?: ProfileContextSlice;
  dieOutput?: DieOutputContextSlice;
  researchMemory: ResearchMemory;
  meta: ResearchContextMeta;
}

export interface ResearchContextInput {
  shopId: string;
  question: string;
  synthesizedAt?: string;
  knowledgeEntries?: KnowledgeSearchResult[];
  profile?: ShopProfile | null;
  learning?: LearningSummary[];
  learningRuns?: LearningRun[];
  weather?: WeatherSnapshot | null;
  doughDnas?: DoughDNA[];
  flourBlends?: FlourBlend[];
  journals?: DoughJournal[];
  comparisons?: ComparisonRun[];
  labSessions?: LabSession[];
  dieOutput?: DieOutput | null;
  limits?: Partial<ResearchContextLimits>;
}

// ---------------------------------------------------------------------------
// LLM / Ask RAG（Phase 5b — mock のみ）
// ---------------------------------------------------------------------------

export type AskLlmResponseMode = "llm_rag" | "llm_refusal";

/** 出典 citation — Knowledge / Run / Lab 等 */
export type AskSourceType =
  | "knowledge"
  | "run"
  | "journal"
  | "comparison"
  | "dna"
  | "die"
  | "blend";

export interface AskSourceCitation {
  type: AskSourceType;
  id: string;
  label: string;
  href?: string;
}

export interface AskPrompt {
  system: string;
  user: string;
  /** プロンプト注入用のコンテキスト要約（JSON 文字列） */
  contextSummary: string;
}

export interface LLMCompletionRequest {
  prompt: AskPrompt;
  context: ResearchContext;
}

export type LLMProviderId = "mock";

export interface LLMCompletionResult {
  text: string;
  model: string;
  provider: LLMProviderId;
  finishReason: "stop" | "length" | "error";
}

export interface AnswerSafetyInput {
  answer: string;
  context: ResearchContext;
  sources?: AskSourceCitation[];
}

export interface AnswerSafetyWarning {
  code: string;
  message: string;
}

export interface AnswerSafetyResult {
  answer: string;
  sources: AskSourceCitation[];
  nextStep?: string;
  disclaimers: string[];
  warnings: AnswerSafetyWarning[];
  /** LLM 経路では常に true */
  aiUsed: true;
  mode: AskLlmResponseMode;
}

export interface LLMAdapter {
  readonly provider: LLMProviderId;
  readonly model: string;
  complete(request: LLMCompletionRequest): Promise<LLMCompletionResult>;
}
