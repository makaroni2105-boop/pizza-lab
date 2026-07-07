import { NextResponse } from "next/server";

import {
  handleSyncWorkerProcessRequest,
  parseSyncWorkerLimit,
} from "@/lib/api/sync-worker-handler";
import { getOptionalRequestDb } from "@/lib/db/get-request-db";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseSyncWorkerLimit(searchParams.get("limit"));

  const result = await handleSyncWorkerProcessRequest({
    db: getOptionalRequestDb(),
    limit,
  });

  return NextResponse.json(result.body, { status: result.status });
}
