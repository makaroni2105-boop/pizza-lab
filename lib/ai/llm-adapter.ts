/**
 * LLM Adapter インターフェース（Phase 5b）。
 * 外部 API 接続は将来実装 — 現段階は mock のみ。
 */

export type {
  AnswerSafetyInput,
  AnswerSafetyResult,
  AnswerSafetyWarning,
  AskLlmResponseMode,
  AskPrompt,
  AskSourceCitation,
  AskSourceType,
  LLMAdapter,
  LLMCompletionRequest,
  LLMCompletionResult,
  LLMProviderId,
} from "@/types/ai";

/** Phase 5b デフォルト — 常に mock */
export const DEFAULT_LLM_PROVIDER = "mock" as const;

export const MOCK_LLM_MODEL = "pizzalab-research-partner-mock-v1";
