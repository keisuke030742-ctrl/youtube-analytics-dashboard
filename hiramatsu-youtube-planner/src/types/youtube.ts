/**
 * YouTube API関連の型定義
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  channelId: string;
  channelTitle: string;
  thumbnailUrl: string;
  tags?: string[];
  statistics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
  };
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

export interface YouTubeAnalyticsConfig {
  apiKey: string;
  channelId: string;
  competitorChannelIds: string[];
}

export interface VideoPerformance {
  videoId: string;
  title: string;
  viewsPerDay: number;
  engagementRate: number; // (likes + comments) / views
  retentionScore?: number;
}
