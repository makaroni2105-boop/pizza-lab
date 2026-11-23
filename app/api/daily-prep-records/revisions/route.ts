import { NextResponse } from "next/server";

import { handleDailyPrepRecordRevisionsRequest } from "@/lib/api/daily-prep-record-handler";
import { getOptionalRequestDb } from "@/lib/db/get-request-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const recordId = searchParams.get("recordId") ?? "";

  const result = await handleDailyPrepRecordRevisionsRequest(recordId, {
    request,
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}