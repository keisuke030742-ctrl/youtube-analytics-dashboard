import { google } from "googleapis";

// Create OAuth2 client
export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
}

// Get YouTube Data API client
export function getYouTubeClient(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.youtube({
    version: "v3",
    auth: oauth2Client,
  });
}

// Get YouTube Analytics API client
export function getYouTubeAnalyticsClient(accessToken: string) {
  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({ access_token: accessToken });

  return google.youtubeAnalytics({
    version: "v2",
    auth: oauth2Client,
  });
}

// Fetch channel info
export async function getChannelInfo(accessToken: string) {
  const youtube = getYouTubeClient(accessToken);

  const response = await youtube.channels.list({
    part: ["snippet", "statistics", "contentDetails"],
    mine: true,
  });

  const channel = response.data.items?.[0];
  if (!channel) {
    throw new Error("Channel not found");
  }

  return {
    id: channel.id!,
    title: channel.snippet?.title || "",
    description: channel.snippet?.description || "",
    customUrl: channel.snippet?.customUrl,
    thumbnail: channel.snippet?.thumbnails?.default?.url || "",
    subscriberCount: parseInt(channel.statistics?.subscriberCount || "0"),
    videoCount: parseInt(channel.statistics?.videoCount || "0"),
    viewCount: parseInt(channel.statistics?.viewCount || "0"),
  };
}

// Fetch channel videos
export async function getChannelVideos(
  accessToken: string,
  maxResults: number = 50
) {
  const youtube = getYouTubeClient(accessToken);

  // First, get the uploads playlist ID
  const channelResponse = await youtube.channels.list({
    part: ["contentDetails"],
    mine: true,
  });

  const uploadsPlaylistId =
    channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    throw new Error("Uploads playlist not found");
  }

  // Get videos from the uploads playlist
  const playlistResponse = await youtube.playlistItems.list({
    part: ["snippet", "contentDetails"],
    playlistId: uploadsPlaylistId,
    maxResults,
  });

  const videoIds =
    playlistResponse.data.items?.map(
      (item) => item.contentDetails?.videoId!
    ) || [];

  if (videoIds.length === 0) {
    return [];
  }

  // Get detailed video statistics
  const videosResponse = await youtube.videos.list({
    part: ["snippet", "statistics", "contentDetails"],
    id: videoIds,
  });

  return (
    videosResponse.data.items?.map((video) => ({
      id: video.id!,
      title: video.snippet?.title || "",
      description: video.snippet?.description || "",
      thumbnail:
        video.snippet?.thumbnails?.medium?.url ||
        video.snippet?.thumbnails?.default?.url ||
        "",
      publishedAt: video.snippet?.publishedAt || "",
      duration: video.contentDetails?.duration || "",
      viewCount: parseInt(video.statistics?.viewCount || "0"),
      likeCount: parseInt(video.statistics?.likeCount || "0"),
      commentCount: parseInt(video.statistics?.commentCount || "0"),
      tags: video.snippet?.tags || [],
    })) || []
  );
}

// Fetch analytics data
export async function getAnalyticsData(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,subscribersGained,subscribersLost,likes,dislikes,comments,shares",
    dimensions: "day",
    sort: "day",
  });

  return response.data;
}

// Fetch demographics data
export async function getDemographicsData(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "viewerPercentage",
    dimensions: "ageGroup,gender",
  });

  return response.data;
}

// Fetch traffic source data
export async function getTrafficSourceData(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "insightTrafficSourceType",
    sort: "-views",
  });

  return response.data;
}

// Fetch device data
export async function getDeviceData(
  accessToken: string,
  startDate: string,
  endDate: string
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics: "views,estimatedMinutesWatched",
    dimensions: "deviceType",
    sort: "-views",
  });

  return response.data;
}

// Fetch video performance data
export async function getVideoPerformanceData(
  accessToken: string,
  startDate: string,
  endDate: string,
  maxResults: number = 10
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  const response = await analytics.reports.query({
    ids: "channel==MINE",
    startDate,
    endDate,
    metrics:
      "views,estimatedMinutesWatched,averageViewDuration,annotationClickThroughRate,annotationImpressions,likes,comments",
    dimensions: "video",
    sort: "-views",
    maxResults,
  });

  return response.data;
}

// Fetch traffic sources for a specific video
export async function getVideoTrafficSources(
  accessToken: string,
  videoId: string,
  startDate: string,
  endDate: string
) {
  const analytics = getYouTubeAnalyticsClient(accessToken);

  try {
    const response = await analytics.reports.query({
      ids: "channel==MINE",
      startDate,
      endDate,
      metrics: "views,estimatedMinutesWatched",
      dimensions: "insightTrafficSourceType",
      filters: `video==${videoId}`,
      sort: "-views",
    });

    return (
      response.data.rows?.map((row) => ({
        source: String(row[0]),
        views: Number(row[1]) || 0,
        watchTime: Number(row[2]) || 0,
      })) || []
    );
  } catch (error) {
    console.error(`Error fetching traffic for video ${videoId}:`, error);
    return [];
  }
}

// YouTubeService class for easier usage
export class YouTubeService {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async getChannelInfo() {
    return getChannelInfo(this.accessToken);
  }

  async getVideos(maxResults: number = 50) {
    return getChannelVideos(this.accessToken, maxResults);
  }

  async getAnalytics(startDate: string, endDate: string) {
    return getAnalyticsData(this.accessToken, startDate, endDate);
  }

  async getDemographics(startDate: string, endDate: string) {
    return getDemographicsData(this.accessToken, startDate, endDate);
  }

  async getTrafficSources(startDate: string, endDate: string) {
    return getTrafficSourceData(this.accessToken, startDate, endDate);
  }

  async getDevices(startDate: string, endDate: string) {
    return getDeviceData(this.accessToken, startDate, endDate);
  }

  async getVideoPerformance(startDate: string, endDate: string, maxResults: number = 10) {
    return getVideoPerformanceData(this.accessToken, startDate, endDate, maxResults);
  }

  async getVideoTrafficSources(videoId: string, startDate: string, endDate: string) {
    return getVideoTrafficSources(this.accessToken, videoId, startDate, endDate);
  }
}
