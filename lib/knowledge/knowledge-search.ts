/**
 * Knowledge Base キーワード検索（純粋関数）。
 * AI 回答生成は行わない。
 */

import type {
  KnowledgeEntry,
  KnowledgeSearchOptions,
  KnowledgeSearchResult,
} from "./knowledge-types";

const DEFAULT_EXCERPT_MAX = 220;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function tokenizeQuery(query: string): string[] {
  return normalizeText(query)
    .split(/[\s,、。]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 1);
}

function buildSearchableText(entry: KnowledgeEntry): string {
  return normalizeText(
    [entry.titleJa, entry.category, ...entry.tags, ...entry.keywords, entry.body].join(" "),
  );
}

function scoreEntry(entry: KnowledgeEntry, tokens: string[]): number {
  if (tokens.length === 0) {
    return 0;
  }

  const haystack = buildSearchableText(entry);
  const title = normalizeText(entry.titleJa);
  let score = 0;

  for (const token of tokens) {
    if (title.includes(token)) {
      score += 4;
    }

    if (entry.keywords.some((keyword) => normalizeText(keyword).includes(token))) {
      score += 3;
    }

    if (entry.tags.some((tag) => normalizeText(tag).includes(token))) {
      score += 2;
    }

    if (haystack.includes(token)) {
      score += 1;
    }
  }

  return score;
}

function extractExcerpt(body: string, tokens: string[], maxLength: number): string {
  const plain = body.replace(/^#+\s+/gm, "").replace(/\*\*/g, "").replace(/\n+/g, " ").trim();

  if (plain.length <= maxLength) {
    return plain;
  }

  const lowerPlain = normalizeText(plain);

  for (const token of tokens) {
    const index = lowerPlain.indexOf(token);

    if (index >= 0) {
      const start = Math.max(0, index - 40);
      const snippet = plain.slice(start, start + maxLength).trim();
      return `${start > 0 ? "…" : ""}${snippet}${start + maxLength < plain.length ? "…" : ""}`;
    }
  }

  return `${plain.slice(0, maxLength).trim()}…`;
}

export function searchKnowledgeEntries(
  entries: KnowledgeEntry[],
  query: string,
  options?: KnowledgeSearchOptions,
): KnowledgeSearchResult[] {
  const tokens = tokenizeQuery(query);
  const limit = options?.limit ?? 20;
  const excerptMaxLength = options?.excerptMaxLength ?? DEFAULT_EXCERPT_MAX;

  if (tokens.length === 0) {
    return entries.slice(0, limit).map((entry) => ({
      entry,
      score: 0,
      excerpt: extractExcerpt(entry.body, [], excerptMaxLength),
    }));
  }

  const results = entries
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, tokens),
      excerpt: extractExcerpt(entry.body, tokens, excerptMaxLength),
    }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.titleJa.localeCompare(b.entry.titleJa, "ja"));

  return results.slice(0, limit);
}
