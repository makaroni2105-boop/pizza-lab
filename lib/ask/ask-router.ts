/**
 * Ask 質問のルーティング — キーワード抽出 + Knowledge 検索。
 * lib/knowledge/searchKnowledgeEntries を利用（Knowledge モジュールは変更しない）。
 */

import { searchKnowledgeEntries, tokenizeQuery } from "@/lib/knowledge/knowledge-search";
import type { KnowledgeEntry } from "@/lib/knowledge/knowledge-types";

import type { AskRouteResult, AskSearchOptions, AskRequestBody } from "./ask-types";

const DEFAULT_ASK_LIMIT = 5;
const DEFAULT_EXCERPT_MAX = 180;

/** 質問文から除く助詞・疑問の短語（検索ノイズ低減） */
const STOP_WORDS = new Set([
  "は",
  "が",
  "を",
  "に",
  "の",
  "で",
  "と",
  "も",
  "か",
  "な",
  "ね",
  "よ",
  "です",
  "ます",
  "でしょう",
  "ください",
  "教えて",
  "とは",
  "何",
  "なに",
  "どう",
  "なぜ",
  "why",
  "how",
  "what",
  "the",
  "a",
  "an",
]);

function extractLatinTokens(question: string): string[] {
  const matches = question.match(/[a-zA-Z][a-zA-Z0-9_-]*/g);
  if (!matches) {
    return [];
  }

  return matches.map((token) => token.toLowerCase());
}

/** 質問文から検索キーワードを抽出 */
export function extractAskKeywords(question: string): string[] {
  const tokens = tokenizeQuery(question);
  const latin = extractLatinTokens(question);
  const merged = [...tokens, ...latin];

  const keywords = merged.filter(
    (token) => token.length >= 2 || /^[a-z0-9_-]+$/i.test(token),
  );

  const filtered = keywords.filter((token) => !STOP_WORDS.has(token.toLowerCase()));

  if (filtered.length > 0) {
    return [...new Set(filtered)];
  }

  return [...new Set(tokens)];
}

export function normalizeAskQuestion(question: unknown): string | null {
  if (typeof question !== "string") {
    return null;
  }

  const trimmed = question.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isAskRequestBody(value: unknown): value is AskRequestBody {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.question !== "string") {
    return false;
  }

  if (record.useLlm !== undefined && typeof record.useLlm !== "boolean") {
    return false;
  }

  if (record.shopId !== undefined && typeof record.shopId !== "string") {
    return false;
  }

  if (
    record.context !== undefined &&
    (typeof record.context !== "object" || record.context === null || Array.isArray(record.context))
  ) {
    return false;
  }

  return true;
}

/** 質問を Knowledge Base 検索へルーティング */
export function routeAskQuestion(
  question: string,
  entries: KnowledgeEntry[],
  options?: AskSearchOptions,
): AskRouteResult {
  const keywords = extractAskKeywords(question);
  const searchQuery = keywords.length > 0 ? keywords.join(" ") : question;

  const results = searchKnowledgeEntries(entries, searchQuery, {
    limit: options?.limit ?? DEFAULT_ASK_LIMIT,
    excerptMaxLength: options?.excerptMaxLength ?? DEFAULT_EXCERPT_MAX,
  });

  return {
    question,
    keywords,
    results,
  };
}
