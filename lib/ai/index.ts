/**
 * AI レイヤー（Phase 5a/5b）— ResearchContext / Research Memory / LLM mock。
 * 外部 LLM API は Phase 5b 以降 opt-in。現段階は mock のみ。
 */

export { synthesizeResearchMemory } from "./research-memory";
export {
  buildResearchContext,
  mapDieOutputToContextSlice,
} from "./research-context";
export {
  DEFAULT_LLM_PROVIDER,
  MOCK_LLM_MODEL,
} from "./llm-adapter";
export {
  MockLLMAdapter,
  createMockLLMAdapter,
  defaultMockLLMAdapter,
  generateMockLlmAnswer,
} from "./llm-mock";
export {
  RESEARCH_PARTNER_SYSTEM_PROMPT,
  buildAskPrompt,
} from "./prompt-builder";
export {
  FORBIDDEN_ANSWER_PHRASES,
  applyAnswerSafetyRules,
  extractSourcesFromContext,
} from "./answer-safety";
export { runAskLlmPipeline } from "./ask-llm";

export type {
  ResearchConfidence,
  ResearchContext,
  ResearchContextInput,
  ResearchContextLimits,
  ResearchContextMeta,
  ResearchContextSource,
  ResearchMemory,
  ResearchMemoryInput,
  ResearchMemoryItem,
  ResearchMemorySource,
  ComparisonContextSlice,
  DieOutputContextSlice,
  DoughDnaContextSlice,
  FlourBlendContextSlice,
  JournalContextSlice,
  KnowledgeContextSlice,
  LearningContextSlice,
  ProfileContextSlice,
  ResearchMemoryContextSlice,
  RunHistoryContextSlice,
  WeatherContextSlice,
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

export {
  RESEARCH_CONTEXT_ENTITY_LIMIT,
  RESEARCH_CONTEXT_KNOWLEDGE_EXCERPT_MAX,
  RESEARCH_CONTEXT_KNOWLEDGE_LIMIT,
  RESEARCH_CONTEXT_RUN_HISTORY_LIMIT,
  RESEARCH_MEMORY_EXCERPT_MAX_LENGTH,
  RESEARCH_MEMORY_MAX_ITEMS_PER_CATEGORY,
} from "@/types/ai";
