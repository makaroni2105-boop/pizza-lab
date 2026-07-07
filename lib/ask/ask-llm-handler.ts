/**
 * Ask mock LLM RAG ハンドラー（Phase 5c）。
 * ResearchContext 解決 + runAskLlmPipeline。外部 fetch / API キー不使用。
 */

import { buildResearchContext } from "@/lib/ai/research-context";
import { runAskLlmPipeline } from "@/lib/ai/ask-llm";
import { MOCK_LLM_MODEL } from "@/lib/ai/llm-adapter";
import type { ResearchContext, ResearchContextInput } from "@/types/ai";

import type {
  AskHandlerDeps,
  AskHandlerResult,
  AskLlmSuccessResponse,
  AskRequestBody,
  AskRouteResult,
} from "./ask-types";

const DEFAULT_SHOP_ID = "default-shop";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 完全な ResearchContext かどうか */
export function isResearchContext(value: unknown): value is ResearchContext {
  if (!isPlainObject(value)) {
    return false;
  }

  return (
    typeof value.shopId === "string" &&
    typeof value.question === "string" &&
    Array.isArray(value.knowledge) &&
    Array.isArray(value.runHistory) &&
    isPlainObject(value.researchMemory) &&
    isPlainObject(value.meta)
  );
}

function isResearchContextInput(value: unknown): value is ResearchContextInput {
  if (!isPlainObject(value)) {
    return false;
  }

  if (value.shopId !== undefined && typeof value.shopId !== "string") {
    return false;
  }

  if (value.question !== undefined && typeof value.question !== "string") {
    return false;
  }

  return true;
}

/** body.context または Knowledge 検索結果から ResearchContext を解決 */
export function resolveAskResearchContext(
  question: string,
  body: AskRequestBody,
  route: AskRouteResult,
  synthesizedAt: string,
): ResearchContext {
  if (body.context && isResearchContext(body.context)) {
    return {
      ...body.context,
      shopId: body.shopId ?? body.context.shopId,
      question,
    };
  }

  const partialInput = body.context && isResearchContextInput(body.context)
    ? body.context
    : undefined;

  const input: ResearchContextInput = {
    shopId: body.shopId ?? partialInput?.shopId ?? DEFAULT_SHOP_ID,
    question,
    synthesizedAt,
    knowledgeEntries:
      partialInput?.knowledgeEntries && partialInput.knowledgeEntries.length > 0
        ? partialInput.knowledgeEntries
        : route.results,
    profile: partialInput?.profile,
    learning: partialInput?.learning,
    learningRuns: partialInput?.learningRuns,
    weather: partialInput?.weather,
    doughDnas: partialInput?.doughDnas,
    flourBlends: partialInput?.flourBlends,
    journals: partialInput?.journals,
    comparisons: partialInput?.comparisons,
    labSessions: partialInput?.labSessions,
    dieOutput: partialInput?.dieOutput,
    limits: partialInput?.limits,
  };

  return buildResearchContext(input);
}

export function buildAskLlmSuccessResponse(
  question: string,
  pipeline: Awaited<ReturnType<typeof runAskLlmPipeline>>,
): AskLlmSuccessResponse {
  return {
    success: true,
    mode: pipeline.mode,
    aiUsed: true,
    question,
    answer: pipeline.answer,
    sources: pipeline.sources,
    nextStep: pipeline.nextStep,
    disclaimers: pipeline.disclaimers,
    warnings: pipeline.warnings,
    provider: "mock",
    model: MOCK_LLM_MODEL,
  };
}

export async function handleAskLlmRequest(
  body: AskRequestBody,
  question: string,
  route: AskRouteResult,
  deps?: AskHandlerDeps,
): Promise<AskHandlerResult> {
  const synthesizedAt = deps?.synthesizedAt ?? new Date().toISOString();
  const context = resolveAskResearchContext(question, body, route, synthesizedAt);
  const pipeline = await runAskLlmPipeline(context);

  return {
    status: 200,
    body: buildAskLlmSuccessResponse(question, pipeline),
  };
}
