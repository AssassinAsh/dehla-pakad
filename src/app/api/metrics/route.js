import { NextResponse } from "next/server";
import metrics from "../../../utils/metrics.js";

export async function GET() {
  try {
    const metricsData = await metrics.register.getMetricsAsJSON();

    return NextResponse.json(metricsData, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Error generating metrics:", error);
    return new NextResponse("Error generating metrics", { status: 500 });
  }
}
