/**
 * 自動生成バッチ関連の型定義
 */

export type BatchStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export interface AutoPlanBatch {
  id: string;
  triggeredAt: Date;
  triggeredBy: 'cron' | 'manual';
  status: BatchStatus;
  targetCount: number;
  totalPlans: number;
  completedPlans: number;
  failedPlans: number;
  trendData?: TrendData | null;
  selectedKeywords?: SelectedKeyword[] | null;
  error?: string | null;
  completedAt?: Date | null;
}

export interface SelectedKeyword {
  id: string;
  keyword: string;
  volume?: number;
  score: number;
  reason: string;
}

export interface TrendData {
  channelTrends: ChannelTrend[];
  competitorTrends: CompetitorTrend[];
  timestamp: string;
}

export interface ChannelTrend {
  videoId: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  avgViewDuration?: number;
  tags?: string[];
}

export interface CompetitorTrend {
  channelId: string;
  channelName: string;
  recentVideos: {
    videoId: string;
    title: string;
    publishedAt: string;
    viewCount: number;
  }[];
  topPerformingKeywords?: string[];
}

export interface BatchRunOptions {
  targetCount?: number;
  includeCategories?: string[];
  excludeCategories?: string[];
  minVolume?: number;
  maxUsageCount?: number;
  skipTrendAnalysis?: boolean;
}

export interface BatchProgress {
  batchId: string;
  status: BatchStatus;
  currentStep: string;
  progress: number; // 0-100
  completedPlans: number;
  totalPlans: number;
  errors: string[];
}
