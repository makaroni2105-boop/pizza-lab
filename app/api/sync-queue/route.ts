import { NextResponse } from "next/server";

import {
  handleSyncQueueEnqueueRequest,
  handleSyncQueueListRequest,
  handleSyncQueueUpdateStatusRequest,
  parseListLimit,
} from "@/lib/api/sync-queue-handler";
import { getOptionalRequestDb } from "@/lib/db/get-request-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseListLimit(searchParams.get("limit"));

  const result = await handleSyncQueueListRequest(limit, {
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

  const result = await handleSyncQueueEnqueueRequest(body, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}

export async function PATCH(request: Request) {
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

  const result = await handleSyncQueueUpdateStatusRequest(body, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}
