import { NextResponse } from "next/server";

import { getOptionalRequestDb } from "@/lib/db/get-request-db";
import { handleWeatherRequest } from "@/lib/weather/weather-handler";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const latitude = Number(searchParams.get("latitude"));
  const longitude = Number(searchParams.get("longitude"));

  const result = await handleWeatherRequest(latitude, longitude, {
    db: getOptionalRequestDb(),
  });

  return NextResponse.json(result.body, { status: result.status });
}