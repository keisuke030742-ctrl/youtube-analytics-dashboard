import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getChannelInfo } from "@/lib/youtube";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const channelInfo = await getChannelInfo(session.accessToken);

    return NextResponse.json(channelInfo);
  } catch (error) {
    console.error("Error fetching channel info:", error);
    return NextResponse.json(
      { error: "Failed to fetch channel info" },
      { status: 500 }
    );
  }
}
