/**
 * Ask API — 公開 API + HTTP ハンドラー。
 * Phase 3b: Knowledge キーワード検索。
 * Phase 5c: useLlm + mock RAG（feature flag）。
 */

import { loadAllKnowledgeEntries } from "@/lib/knowledge/knowledge-loader";

import { handleAskLlmRequest } from "./ask-llm-handler";
import {
  isAskRequestBody,
  normalizeAskQuestion,
  routeAskQuestion,
} from "./ask-router";
import { buildAskSuccessResponse } from "./ask-response";
import type {
  AskApiResponse,
  AskHandlerDeps,
  AskHandlerResult,
  AskSearchOptions,
} from "./ask-types";

export type {
  AskApiResponse,
  AskCandidate,
  AskErrorResponse,
  AskHandlerDeps,
  AskHandlerResult,
  AskKnowledgeSearchSuccessResponse,
  AskLlmSuccessResponse,
  AskRequestBody,
  AskRequestContextPayload,
  AskResponseMode,
  AskRouteResult,
  AskSearchOptions,
  AskSourceCitation,
  AskSuccessResponse,
  AnswerSafetyWarning,
} from "./ask-types";

export {
  extractAskKeywords,
  isAskRequestBody,
  normalizeAskQuestion,
  routeAskQuestion,
} from "./ask-router";

export {
  buildAskGuide,
  buildAskSuccessResponse,
  tierLabel,
} from "./ask-response";

export {
  buildAskClientContextPayload,
  resolveAskClientShopId,
  summarizeAskClientContext,
} from "./ask-client-context";

export type { AskClientContextSummary } from "./ask-client-context";

export {
  buildAskLlmSuccessResponse,
  handleAskLlmRequest,
  isResearchContext,
  resolveAskResearchContext,
} from "./ask-llm-handler";

export async function handleAskRequest(
  body: unknown,
  deps?: AskHandlerDeps,
): Promise<AskHandlerResult> {
  if (!isAskRequestBody(body)) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "body に question (string) が必要です",
        },
      },
    };
  }

  const question = normalizeAskQuestion(body.question);

  if (!question) {
    return {
      status: 400,
      body: {
        success: false,
        error: {
          code: "INVALID_QUESTION",
          message: "question を入力してください",
        },
      },
    };
  }

  const entries = deps?.entries ?? loadAllKnowledgeEntries();
  const route = routeAskQuestion(question, entries, deps?.options);

  if (body.useLlm === true) {
    return handleAskLlmRequest(body, question, route, deps);
  }

  const response = buildAskSuccessResponse(route);

  return {
    status: 200,
    body: response,
  };
}

export function processAskQuestion(
  question: string,
  entries: NonNullable<AskHandlerDeps["entries"]>,
  options?: AskSearchOptions,
): AskApiResponse {
  const normalized = normalizeAskQuestion(question);

  if (!normalized) {
    return {
      success: false,
      error: {
        code: "INVALID_QUESTION",
        message: "question を入力してください",
      },
    };
  }

  const route = routeAskQuestion(normalized, entries, options);
  return buildAskSuccessResponse(route);
}
