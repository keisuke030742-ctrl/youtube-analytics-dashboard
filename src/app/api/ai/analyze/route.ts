import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeChannelPerformance, generateVideoSuggestions, generateReport } from "@/lib/claude";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, data } = body;

    let result;

    switch (type) {
      case "performance":
        result = await analyzeChannelPerformance(data);
        break;
      case "suggestions":
        result = await generateVideoSuggestions(
          data.channelName,
          data.topVideos,
          data.recentTrends
        );
        break;
      case "report":
        result = await generateReport(
          data.channelName,
          data.period,
          data.metrics,
          data.insights
        );
        break;
      default:
        return NextResponse.json(
          { error: "Invalid analysis type" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in AI analysis:", error);
    return NextResponse.json(
      { error: "Failed to perform AI analysis" },
      { status: 500 }
    );
  }
}
