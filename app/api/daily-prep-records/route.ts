import { NextResponse } from "next/server";

import {
  handleDailyPrepRecordCreateRequest,
  handleDailyPrepRecordListRequest,
  handleDailyPrepRecordUpdateRequest,
} from "@/lib/api/daily-prep-record-handler";
import { getOptionalRequestDb } from "@/lib/db/get-request-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "60");

  const result = await handleDailyPrepRecordListRequest(limit, {
    request,
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

  const result = await handleDailyPrepRecordCreateRequest(body, {
    request,
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

  const result = await handleDailyPrepRecordUpdateRequest(body, {
    request,
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}