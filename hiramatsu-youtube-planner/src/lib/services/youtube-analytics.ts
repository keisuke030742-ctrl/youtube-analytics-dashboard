/**
 * YouTube Analytics Service
 * YouTube Data APIを使ってトレンドデータを取得
 */

import type {
  YouTubeVideo,
  YouTubeSearchResult,
  VideoPerformance,
} from '@/types/youtube';
import type { ChannelTrend, CompetitorTrend, TrendData } from '@/types/batch';

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAnalyticsService {
  private apiKey: string;
  private channelId: string;
  private competitorChannelIds: string[];

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY || '';
    this.channelId = process.env.CHANNEL_ID || '';
    this.competitorChannelIds = (process.env.COMPETITOR_CHANNEL_IDS || '')
      .split(',')
      .filter(Boolean);
  }

  /**
   * 設定が有効かチェック
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.channelId;
  }

  /**
   * 自チャンネルの最近の動画を取得
   */
  async getChannelVideos(maxResults: number = 20): Promise<YouTubeVideo[]> {
    if (!this.isConfigured()) {
      console.warn('YouTube API not configured');
      return [];
    }

    try {
      // チャンネルの動画を検索
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set('key', this.apiKey);
      searchUrl.searchParams.set('channelId', this.channelId);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('order', 'date');
      searchUrl.searchParams.set('maxResults', maxResults.toString());

      const searchRes = await fetch(searchUrl.toString());
      if (!searchRes.ok) {
        throw new Error(`YouTube API error: ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      const videoIds = searchData.items
        .map((item: any) => item.id.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) return [];

      // 動画の詳細情報を取得
      const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      videosUrl.searchParams.set('key', this.apiKey);
      videosUrl.searchParams.set('id', videoIds);
      videosUrl.searchParams.set('part', 'snippet,statistics');

      const videosRes = await fetch(videosUrl.toString());
      if (!videosRes.ok) {
        throw new Error(`YouTube API error: ${videosRes.status}`);
      }

      const videosData = await videosRes.json();

      return videosData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
        tags: item.snippet.tags || [],
        statistics: {
          viewCount: parseInt(item.statistics.viewCount || '0', 10),
          likeCount: parseInt(item.statistics.likeCount || '0', 10),
          commentCount: parseInt(item.statistics.commentCount || '0', 10),
        },
      }));
    } catch (error) {
      console.error('Failed to get channel videos:', error);
      return [];
    }
  }

  /**
   * 自チャンネルのトレンドデータを取得
   */
  async getChannelTrends(): Promise<ChannelTrend[]> {
    const videos = await this.getChannelVideos(20);

    return videos.map((video) => ({
      videoId: video.id,
      title: video.title,
      publishedAt: video.publishedAt,
      viewCount: video.statistics.viewCount,
      likeCount: video.statistics.likeCount,
      commentCount: video.statistics.commentCount,
      tags: video.tags,
    }));
  }

  /**
   * 競合チャンネルのトレンドデータを取得
   */
  async getCompetitorTrends(): Promise<CompetitorTrend[]> {
    if (!this.isConfigured() || this.competitorChannelIds.length === 0) {
      return [];
    }

    const results: CompetitorTrend[] = [];

    for (const channelId of this.competitorChannelIds) {
      try {
        // チャンネル情報を取得
        const channelUrl = new URL(`${YOUTUBE_API_BASE}/channels`);
        channelUrl.searchParams.set('key', this.apiKey);
        channelUrl.searchParams.set('id', channelId);
        channelUrl.searchParams.set('part', 'snippet');

        const channelRes = await fetch(channelUrl.toString());
        if (!channelRes.ok) continue;

        const channelData = await channelRes.json();
        const channelName = channelData.items?.[0]?.snippet?.title || 'Unknown';

        // 人気動画を取得
        const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
        searchUrl.searchParams.set('key', this.apiKey);
        searchUrl.searchParams.set('channelId', channelId);
        searchUrl.searchParams.set('part', 'snippet');
        searchUrl.searchParams.set('type', 'video');
        searchUrl.searchParams.set('order', 'viewCount');
        searchUrl.searchParams.set('maxResults', '10');

        const searchRes = await fetch(searchUrl.toString());
        if (!searchRes.ok) continue;

        const searchData = await searchRes.json();
        const videoIds = searchData.items
          .map((item: any) => item.id.videoId)
          .filter(Boolean)
          .join(',');

        if (!videoIds) continue;

        // 動画の詳細情報を取得
        const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
        videosUrl.searchParams.set('key', this.apiKey);
        videosUrl.searchParams.set('id', videoIds);
        videosUrl.searchParams.set('part', 'snippet,statistics');

        const videosRes = await fetch(videosUrl.toString());
        if (!videosRes.ok) continue;

        const videosData = await videosRes.json();

        const recentVideos = videosData.items.map((item: any) => ({
          videoId: item.id,
          title: item.snippet.title,
          publishedAt: item.snippet.publishedAt,
          viewCount: parseInt(item.statistics.viewCount || '0', 10),
        }));

        // タグからキーワードを抽出
        const allTags = videosData.items.flatMap(
          (item: any) => item.snippet.tags || []
        );
        const tagCounts = allTags.reduce((acc: Record<string, number>, tag: string) => {
          acc[tag] = (acc[tag] || 0) + 1;
          return acc;
        }, {});
        const topPerformingKeywords = Object.entries(tagCounts)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 10)
          .map(([tag]) => tag);

        results.push({
          channelId,
          channelName,
          recentVideos,
          topPerformingKeywords,
        });
      } catch (error) {
        console.error(`Failed to get competitor trends for ${channelId}:`, error);
      }
    }

    return results;
  }

  /**
   * キーワードで動画を検索
   */
  async searchVideos(
    query: string,
    maxResults: number = 10
  ): Promise<YouTubeSearchResult> {
    if (!this.isConfigured()) {
      return { videos: [], totalResults: 0 };
    }

    try {
      const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
      searchUrl.searchParams.set('key', this.apiKey);
      searchUrl.searchParams.set('q', `${query} 住宅 家づくり`);
      searchUrl.searchParams.set('part', 'snippet');
      searchUrl.searchParams.set('type', 'video');
      searchUrl.searchParams.set('order', 'viewCount');
      searchUrl.searchParams.set('maxResults', maxResults.toString());

      const searchRes = await fetch(searchUrl.toString());
      if (!searchRes.ok) {
        throw new Error(`YouTube API error: ${searchRes.status}`);
      }

      const searchData = await searchRes.json();
      const videoIds = searchData.items
        .map((item: any) => item.id.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) {
        return { videos: [], totalResults: 0 };
      }

      // 動画の詳細情報を取得
      const videosUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
      videosUrl.searchParams.set('key', this.apiKey);
      videosUrl.searchParams.set('id', videoIds);
      videosUrl.searchParams.set('part', 'snippet,statistics');

      const videosRes = await fetch(videosUrl.toString());
      if (!videosRes.ok) {
        throw new Error(`YouTube API error: ${videosRes.status}`);
      }

      const videosData = await videosRes.json();

      const videos: YouTubeVideo[] = videosData.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelId: item.snippet.channelId,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || '',
        tags: item.snippet.tags || [],
        statistics: {
          viewCount: parseInt(item.statistics.viewCount || '0', 10),
          likeCount: parseInt(item.statistics.likeCount || '0', 10),
          commentCount: parseInt(item.statistics.commentCount || '0', 10),
        },
      }));

      return {
        videos,
        totalResults: searchData.pageInfo?.totalResults || videos.length,
        nextPageToken: searchData.nextPageToken,
      };
    } catch (error) {
      console.error('Failed to search videos:', error);
      return { videos: [], totalResults: 0 };
    }
  }

  /**
   * 動画のパフォーマンスを計算
   */
  calculatePerformance(videos: YouTubeVideo[]): VideoPerformance[] {
    const now = new Date();

    return videos.map((video) => {
      const publishedAt = new Date(video.publishedAt);
      const daysSincePublish = Math.max(
        1,
        (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      );

      const viewsPerDay = video.statistics.viewCount / daysSincePublish;
      const engagementRate =
        video.statistics.viewCount > 0
          ? (video.statistics.likeCount + video.statistics.commentCount) /
            video.statistics.viewCount
          : 0;

      return {
        videoId: video.id,
        title: video.title,
        viewsPerDay: Math.round(viewsPerDay),
        engagementRate: Math.round(engagementRate * 10000) / 100, // パーセント
      };
    });
  }

  /**
   * 全トレンドデータを取得
   */
  async getTrendData(): Promise<TrendData> {
    const [channelTrends, competitorTrends] = await Promise.all([
      this.getChannelTrends(),
      this.getCompetitorTrends(),
    ]);

    return {
      channelTrends,
      competitorTrends,
      timestamp: new Date().toISOString(),
    };
  }
}

// シングルトンインスタンス
export const youtubeAnalytics = new YouTubeAnalyticsService();
