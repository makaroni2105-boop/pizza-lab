/**
 * Markdown 知識記事の読み込み（Node fs）。
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import type { KnowledgeEntry, KnowledgeSummaryType, KnowledgeTier } from "./knowledge-types";

export const KNOWLEDGE_CONTENT_DIR = join(process.cwd(), "content", "knowledge");

function splitFrontmatter(raw: string): { frontmatter: string; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);

  if (!match) {
    return { frontmatter: "", body: raw.trim() };
  }

  return { frontmatter: match[1], body: match[2].trim() };
}

function parseScalar(value: string): string | boolean | number {
  const trimmed = value.trim();

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  return trimmed.replace(/^["']|["']$/g, "");
}

export function parseFrontmatterLines(frontmatter: string): Record<string, string | boolean | number> {
  const meta: Record<string, string | boolean | number> = {};

  for (const line of frontmatter.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const colonIndex = trimmed.indexOf(":");

    if (colonIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    meta[key] = parseScalar(value);
  }

  return meta;
}

function parseListField(value: string | boolean | number | undefined): string[] {
  if (typeof value !== "string" || value.trim() === "") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseTier(value: unknown): KnowledgeTier {
  const tier = Number(value);

  if (tier === 1 || tier === 2 || tier === 3 || tier === 4 || tier === 5) {
    return tier;
  }

  return 2;
}

function parseSummaryType(value: unknown): KnowledgeSummaryType {
  const allowed: KnowledgeSummaryType[] = [
    "summary",
    "practice",
    "parameter",
    "glossary",
    "comparison",
  ];

  if (typeof value === "string" && allowed.includes(value as KnowledgeSummaryType)) {
    return value as KnowledgeSummaryType;
  }

  return "summary";
}

export function parseKnowledgeMarkdown(
  raw: string,
  relativePath: string,
): KnowledgeEntry | null {
  const { frontmatter, body } = splitFrontmatter(raw);
  const meta = parseFrontmatterLines(frontmatter);

  if (typeof meta.id !== "string" || typeof meta.titleJa !== "string") {
    return null;
  }

  return {
    id: meta.id,
    tier: parseTier(meta.tier),
    category: typeof meta.category === "string" ? meta.category : "science/general",
    titleJa: meta.titleJa,
    summaryType: parseSummaryType(meta.summaryType),
    tags: parseListField(meta.tags),
    keywords: parseListField(meta.keywords),
    aiUsable: meta.aiUsable !== false,
    body,
    relativePath,
  };
}

function collectMarkdownFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectMarkdownFiles(fullPath, files);
    } else if (name.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

export function loadKnowledgeEntriesFromDir(
  rootDir: string = KNOWLEDGE_CONTENT_DIR,
): KnowledgeEntry[] {
  let files: string[] = [];

  try {
    files = collectMarkdownFiles(rootDir);
  } catch {
    return [];
  }

  const entries: KnowledgeEntry[] = [];

  for (const filePath of files) {
    const raw = readFileSync(filePath, "utf8");
    const relativePath = relative(process.cwd(), filePath).replace(/\\/g, "/");
    const entry = parseKnowledgeMarkdown(raw, relativePath);

    if (entry) {
      entries.push(entry);
    }
  }

  return entries.sort((a, b) => a.titleJa.localeCompare(b.titleJa, "ja"));
}

export function loadAllKnowledgeEntries(): KnowledgeEntry[] {
  return loadKnowledgeEntriesFromDir();
}

export function getKnowledgeEntryById(
  id: string,
  entries?: KnowledgeEntry[],
): KnowledgeEntry | undefined {
  const list = entries ?? loadAllKnowledgeEntries();
  return list.find((entry) => entry.id === id);
}
