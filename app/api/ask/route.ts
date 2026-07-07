import { NextResponse } from "next/server";

import { handleAskRequest } from "@/lib/ask";

/**
 * POST /api/ask
 * - useLlm 未指定 / false: knowledge_search（Phase 3b）
 * - useLlm: true: mock LLM RAG（Phase 5c）
 */
export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_JSON", message: "JSON ボディが必要です" },
      },
      { status: 400 },
    );
  }

  const result = await handleAskRequest(body);

  return NextResponse.json(result.body, { status: result.status });
}
