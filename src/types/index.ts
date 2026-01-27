// YouTube Channel
export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  thumbnail: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

// YouTube Video
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags?: string[];
}

// Analytics Data
export interface AnalyticsData {
  views: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  subscribersGained: number;
  subscribersLost: number;
  likes: number;
  dislikes: number;
  comments: number;
  shares: number;
}

// Time Series Data
export interface TimeSeriesData {
  date: string;
  views: number;
  watchTime: number;
  subscribers: number;
}

// Demographics Data
export interface DemographicsData {
  ageGroup: string;
  gender: string;
  percentage: number;
}

// Traffic Source
export interface TrafficSource {
  source: string;
  views: number;
  percentage: number;
}

// Device Type
export interface DeviceData {
  device: string;
  views: number;
  percentage: number;
}

// Video Performance
export interface VideoPerformance {
  videoId: string;
  title: string;
  thumbnail: string;
  views: number;
  watchTime: number;
  averageViewDuration: number;
  ctr: number;
  impressions: number;
  likes: number;
  comments: number;
}

// AI Analysis Result
export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
  nextActions: {
    priority: "high" | "medium" | "low";
    action: string;
    reason: string;
  }[];
}

// Dashboard KPI
export interface DashboardKPI {
  label: string;
  value: number | string;
  change: number;
  changeType: "increase" | "decrease" | "neutral";
  format?: "number" | "duration" | "percentage";
}

// Date Range
export interface DateRange {
  startDate: Date;
  endDate: Date;
}
