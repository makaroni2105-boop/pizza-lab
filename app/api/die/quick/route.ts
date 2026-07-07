import { NextResponse } from "next/server";

import { handleDieQuickRequest } from "@/lib/api/die-quick-handler";

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INVALID_JSON",
          message: "JSON ボディを解析できません",
        },
      },
      { status: 400 },
    );
  }

  const result = handleDieQuickRequest(body, new Date().toISOString());

  return NextResponse.json(result.body, { status: result.status });
}

export function GET(): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "POST のみ対応しています",
      },
    },
    { status: 405 },
  );
}
