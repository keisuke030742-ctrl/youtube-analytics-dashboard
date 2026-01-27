import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getAnalyticsData,
  getDemographicsData,
  getTrafficSourceData,
  getDeviceData,
  getVideoPerformanceData,
} from "@/lib/youtube";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate") || getDefaultStartDate();
    const endDate = searchParams.get("endDate") || getDefaultEndDate();
    const type = searchParams.get("type") || "overview";

    let data;

    switch (type) {
      case "overview":
        data = await getAnalyticsData(session.accessToken, startDate, endDate);
        break;
      case "demographics":
        data = await getDemographicsData(session.accessToken, startDate, endDate);
        break;
      case "traffic":
        data = await getTrafficSourceData(session.accessToken, startDate, endDate);
        break;
      case "devices":
        data = await getDeviceData(session.accessToken, startDate, endDate);
        break;
      case "videos":
        data = await getVideoPerformanceData(session.accessToken, startDate, endDate);
        break;
      default:
        data = await getAnalyticsData(session.accessToken, startDate, endDate);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}

function getDefaultStartDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 28);
  return date.toISOString().split("T")[0];
}

function getDefaultEndDate(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}
