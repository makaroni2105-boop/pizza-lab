import { NextResponse } from "next/server";

import {
  handleLearningRunDeleteRequest,
  handleLearningRunListRequest,
  handleLearningRunUpsertRequest,
} from "@/lib/api/learning-run-handler";
import { getOptionalRequestDb } from "@/lib/db/get-request-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const shopId = searchParams.get("shopId") ?? "";

  const result = await handleLearningRunListRequest(shopId, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}

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

  const result = await handleLearningRunUpsertRequest(body, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";

  const result = await handleLearningRunDeleteRequest(id, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
