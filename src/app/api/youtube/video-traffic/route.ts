import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { YouTubeService } from "@/lib/youtube";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || getDefaultStartDate();
    const endDate = searchParams.get("endDate") || getDefaultEndDate();

    const youtubeService = new YouTubeService(session.accessToken);

    // Get channel info first
    const channelInfo = await youtubeService.getChannelInfo();
    if (!channelInfo) {
      return NextResponse.json({ error: "Channel not found" }, { status: 404 });
    }

    // Get videos
    const videos = await youtubeService.getVideos(50);

    // Get traffic source data for each video
    const videoTrafficData = await Promise.all(
      videos.map(async (video) => {
        try {
          const trafficData = await youtubeService.getVideoTrafficSources(
            video.id,
            startDate,
            endDate
          );

          // Calculate traffic percentages
          const totalViews = trafficData.reduce((sum, t) => sum + t.views, 0);
          const trafficBreakdown = trafficData.map((t) => ({
            source: t.source,
            views: t.views,
            percentage: totalViews > 0 ? (t.views / totalViews) * 100 : 0,
          }));

          // Determine video type based on traffic
          const videoType = classifyVideoType(trafficBreakdown);

          // Check if it's a long-term video (published > 30 days ago and still getting views)
          const publishedDate = new Date(video.publishedAt);
          const daysSincePublished = Math.floor(
            (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          const isLongTerm = daysSincePublished > 30 && totalViews > 0;

          return {
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            daysSincePublished,
            totalViewsInPeriod: totalViews,
            trafficBreakdown,
            videoType,
            isLongTerm,
          };
        } catch (error) {
          console.error(`Error fetching traffic for video ${video.id}:`, error);
          return {
            id: video.id,
            title: video.title,
            thumbnail: video.thumbnail,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            daysSincePublished: 0,
            totalViewsInPeriod: 0,
            trafficBreakdown: [],
            videoType: "unknown",
            isLongTerm: false,
          };
        }
      })
    );

    // Group videos by type
    const groupedVideos = {
      search: videoTrafficData.filter((v) => v.videoType === "search"),
      suggested: videoTrafficData.filter((v) => v.videoType === "suggested"),
      browse: videoTrafficData.filter((v) => v.videoType === "browse"),
      longTerm: videoTrafficData.filter((v) => v.isLongTerm),
      external: videoTrafficData.filter((v) => v.videoType === "external"),
      other: videoTrafficData.filter(
        (v) => v.videoType === "other" || v.videoType === "unknown"
      ),
    };

    return NextResponse.json({
      videos: videoTrafficData,
      groupedVideos,
      summary: {
        totalVideos: videoTrafficData.length,
        searchType: groupedVideos.search.length,
        suggestedType: groupedVideos.suggested.length,
        browseType: groupedVideos.browse.length,
        longTermType: groupedVideos.longTerm.length,
        externalType: groupedVideos.external.length,
      },
    });
  } catch (error) {
    console.error("Error in video-traffic API:", error);
    return NextResponse.json(
      { error: "Failed to fetch video traffic data" },
      { status: 500 }
    );
  }
}

function classifyVideoType(
  trafficBreakdown: Array<{ source: string; views: number; percentage: number }>
): string {
  const searchTraffic = trafficBreakdown.find(
    (t) => t.source === "YT_SEARCH" || t.source === "SEARCH"
  );
  const suggestedTraffic = trafficBreakdown.find(
    (t) => t.source === "SUGGESTED" || t.source === "RELATED_VIDEO"
  );
  const browseTraffic = trafficBreakdown.find(
    (t) => t.source === "BROWSE" || t.source === "BROWSE_FEATURES"
  );
  const externalTraffic = trafficBreakdown.find(
    (t) => t.source === "EXT_URL" || t.source === "EXTERNAL"
  );

  const searchPct = searchTraffic?.percentage || 0;
  const suggestedPct = suggestedTraffic?.percentage || 0;
  const browsePct = browseTraffic?.percentage || 0;
  const externalPct = externalTraffic?.percentage || 0;

  // Classify based on dominant traffic source (threshold: 40%)
  if (searchPct >= 40) return "search";
  if (suggestedPct >= 40) return "suggested";
  if (browsePct >= 40) return "browse";
  if (externalPct >= 40) return "external";

  // If no dominant source, use the highest one
  const max = Math.max(searchPct, suggestedPct, browsePct, externalPct);
  if (max === searchPct && searchPct > 20) return "search";
  if (max === suggestedPct && suggestedPct > 20) return "suggested";
  if (max === browsePct && browsePct > 20) return "browse";
  if (max === externalPct && externalPct > 20) return "external";

  return "other";
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
