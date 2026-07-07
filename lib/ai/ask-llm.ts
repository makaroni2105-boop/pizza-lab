/**
 * Ask LLM パイプライン（Phase 5b — mock のみ）。
 * buildResearchContext → prompt → mock LLM → safety
 */

import type {
  AnswerSafetyResult,
  LLMAdapter,
  ResearchContext,
} from "@/types/ai";
import { applyAnswerSafetyRules } from "./answer-safety";
import { createMockLLMAdapter } from "./llm-mock";
import { buildAskPrompt } from "./prompt-builder";

export interface RunAskLlmPipelineOptions {
  adapter?: LLMAdapter;
}

/** mock LLM で Ask 回答パイプラインを実行（外部 API 不使用） */
export async function runAskLlmPipeline(
  context: ResearchContext,
  options: RunAskLlmPipelineOptions = {},
): Promise<AnswerSafetyResult> {
  const adapter = options.adapter ?? createMockLLMAdapter();
  const prompt = buildAskPrompt(context);
  const completion = await adapter.complete({ prompt, context });

  return applyAnswerSafetyRules({
    answer: completion.text,
    context,
  });
}
