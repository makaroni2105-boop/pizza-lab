/**
 * Ask API 型定義。
 * Phase 3b: Knowledge キーワード検索。
 * Phase 5c: useLlm + mock RAG（後方互換）。
 */

import type {
  KnowledgeEntry,
  KnowledgeSearchResult,
} from "@/lib/knowledge/knowledge-types";
import type {
  AskSourceCitation,
  AnswerSafetyWarning,
  ResearchContext,
  ResearchContextInput,
} from "@/types/ai";

export interface AskRequestBody {
  question: string;
  /** true のときのみ mock LLM RAG。未指定 / false は knowledge_search */
  useLlm?: boolean;
  shopId?: string;
  /** 事前構築 ResearchContext または ResearchContextInput 相当の部分データ */
  context?: AskRequestContextPayload;
}

/** API body.context — 完全な ResearchContext または buildResearchContext 入力 */
export type AskRequestContextPayload = ResearchContext | ResearchContextInput;

export interface AskCandidate {
  id: string;
  titleJa: string;
  tier: KnowledgeEntry["tier"];
  category: string;
  excerpt: string;
  relativePath: string;
  score: number;
}

export type AskKnowledgeSearchMode = "knowledge_search";
export type AskLlmMode = "llm_rag" | "llm_refusal";
export type AskResponseMode = AskKnowledgeSearchMode | AskLlmMode;

export interface AskKnowledgeSearchSuccessResponse {
  success: true;
  mode: AskKnowledgeSearchMode;
  /** 外部 LLM / AI 生成は使用しない */
  aiUsed: false;
  question: string;
  keywords: string[];
  guide: string;
  candidates: AskCandidate[];
}

export interface AskLlmSuccessResponse {
  success: true;
  mode: AskLlmMode;
  aiUsed: true;
  question: string;
  answer: string;
  sources: AskSourceCitation[];
  nextStep?: string;
  disclaimers: string[];
  warnings: AnswerSafetyWarning[];
  provider: "mock";
  model: string;
}

/** @deprecated AskKnowledgeSearchSuccessResponse を使用 */
export type AskSuccessResponse = AskKnowledgeSearchSuccessResponse;

export interface AskErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type AskApiResponse =
  | AskKnowledgeSearchSuccessResponse
  | AskLlmSuccessResponse
  | AskErrorResponse;

export interface AskSearchOptions {
  limit?: number;
  excerptMaxLength?: number;
}

export interface AskRouteResult {
  question: string;
  keywords: string[];
  results: KnowledgeSearchResult[];
}

export interface AskHandlerResult {
  status: number;
  body: AskApiResponse;
}

export interface AskHandlerDeps {
  entries?: KnowledgeEntry[];
  options?: AskSearchOptions;
  /** テスト用 — ResearchContext synthesizedAt */
  synthesizedAt?: string;
}

export type { AskSourceCitation, AnswerSafetyWarning };
