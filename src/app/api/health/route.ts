import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    timestamp: Date.now(),
    version: "1.0.0",
    server: "dehla-pakad-api",
  });
}
