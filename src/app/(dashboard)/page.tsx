"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/dashboard/KPICard";
import { AreaChartComponent } from "@/components/charts/AreaChartComponent";
import { BarChartComponent } from "@/components/charts/BarChartComponent";
import { Eye, Clock, Users, ThumbsUp, TrendingUp, Video, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useChannelInfo, useVideos } from "@/hooks/useYouTubeData";

interface DashboardMetrics {
  totalViews: number;
  totalWatchTime: number;
  subscriberCount: number;
  totalLikes: number;
  viewsChange: number;
  watchTimeChange: number;
  subscriberChange: number;
  likesChange: number;
}

interface ViewsDataPoint {
  date: string;
  views: number;
  [key: string]: string | number;
}

interface SubscribersDataPoint {
  date: string;
  subscribers: number;
  [key: string]: string | number;
}

interface TrafficSource {
  source: string;
  views: number;
  [key: string]: string | number;
}

interface TopVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  watchTime: number;
  change: number;
}

function getDateRange(days: number) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const { data: channelInfo, loading: channelLoading } = useChannelInfo();
  const { data: videos, loading: videosLoading } = useVideos(10);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [viewsData, setViewsData] = useState<ViewsDataPoint[]>([]);
  const [subscribersData, setSubscribersData] = useState<SubscribersDataPoint[]>([]);
  const [trafficSourceData, setTrafficSourceData] = useState<TrafficSource[]>([]);
  const [topVideos, setTopVideos] = useState<TopVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }

      try {
        const { startDate, endDate } = getDateRange(7);
        const prevPeriod = getDateRange(14);

        // Fetch analytics data
        const [analyticsRes, trafficRes, prevAnalyticsRes] = await Promise.all([
          fetch(`/api/youtube/analytics?type=overview&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/youtube/analytics?type=traffic&startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/youtube/analytics?type=overview&startDate=${prevPeriod.startDate}&endDate=${startDate}`),
        ]);

        if (analyticsRes.ok) {
          const analyticsData = await analyticsRes.json();

          // Process daily data for charts
          if (analyticsData.rows) {
            const dailyViews: ViewsDataPoint[] = [];
            let totalViews = 0;
            let totalWatchTime = 0;
            let totalLikes = 0;

            analyticsData.rows.forEach((row: (string | number)[]) => {
              const date = String(row[0]);
              const views = Number(row[1]) || 0;
              const watchTime = Number(row[2]) || 0;
              const likes = Number(row[6]) || 0;

              dailyViews.push({
                date: `${date.slice(5, 7)}/${date.slice(8, 10)}`,
                views,
              });

              totalViews += views;
              totalWatchTime += watchTime;
              totalLikes += likes;
            });

            setViewsData(dailyViews);

            // Get previous period totals for comparison
            let prevTotalViews = 0;
            let prevTotalWatchTime = 0;
            let prevTotalLikes = 0;

            if (prevAnalyticsRes.ok) {
              const prevData = await prevAnalyticsRes.json();
              if (prevData.rows) {
                prevData.rows.forEach((row: (string | number)[]) => {
                  prevTotalViews += Number(row[1]) || 0;
                  prevTotalWatchTime += Number(row[2]) || 0;
                  prevTotalLikes += Number(row[6]) || 0;
                });
              }
            }

            const subscriberCount = channelInfo?.subscriberCount || 0;

            setMetrics({
              totalViews,
              totalWatchTime,
              subscriberCount,
              totalLikes,
              viewsChange: prevTotalViews > 0 ? ((totalViews - prevTotalViews) / prevTotalViews) * 100 : 0,
              watchTimeChange: prevTotalWatchTime > 0 ? ((totalWatchTime - prevTotalWatchTime) / prevTotalWatchTime) * 100 : 0,
              subscriberChange: 0, // Will be updated when we have historical subscriber data
              likesChange: prevTotalLikes > 0 ? ((totalLikes - prevTotalLikes) / prevTotalLikes) * 100 : 0,
            });
          }
        }

        // Process traffic source data
        if (trafficRes.ok) {
          const trafficData = await trafficRes.json();
          if (trafficData.rows) {
            const trafficSources: TrafficSource[] = trafficData.rows
              .slice(0, 5)
              .map((row: (string | number)[]) => ({
                source: translateTrafficSource(String(row[0])),
                views: Number(row[1]) || 0,
              }));
            setTrafficSourceData(trafficSources);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [status, channelInfo]);

  // Process top videos from videos hook
  useEffect(() => {
    if (videos && videos.length > 0) {
      const sortedVideos = [...videos]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 4)
        .map((video) => ({
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail,
          views: video.viewCount,
          watchTime: 0, // Would need additional API call for this
          change: 0, // Would need historical data
        }));
      setTopVideos(sortedVideos);
    }
  }, [videos]);

  // Generate subscriber data from channel info
  useEffect(() => {
    if (channelInfo) {
      // Generate mock trend data based on current subscriber count
      const baseCount = channelInfo.subscriberCount;
      const data: SubscribersDataPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        data.push({
          date: `${date.getMonth() + 1}/${date.getDate()}`,
          subscribers: Math.floor(baseCount - (i * Math.random() * 10)),
        });
      }
      setSubscribersData(data);
    }
  }, [channelInfo]);

  const isLoading = loading || channelLoading || videosLoading;

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">ログインしてください</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <p className="text-muted-foreground">
          {channelInfo?.title || "チャンネル"}のパフォーマンス概要を確認できます
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="総再生回数"
          value={metrics?.totalViews || 0}
          change={metrics?.viewsChange || 0}
          icon={<Eye className="h-4 w-4" />}
        />
        <KPICard
          title="総視聴時間"
          value={metrics?.totalWatchTime || 0}
          change={metrics?.watchTimeChange || 0}
          format="duration"
          icon={<Clock className="h-4 w-4" />}
        />
        <KPICard
          title="チャンネル登録者"
          value={metrics?.subscriberCount || 0}
          change={metrics?.subscriberChange || 0}
          icon={<Users className="h-4 w-4" />}
        />
        <KPICard
          title="高評価数"
          value={metrics?.totalLikes || 0}
          change={metrics?.likesChange || 0}
          icon={<ThumbsUp className="h-4 w-4" />}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>再生回数推移</CardTitle>
            <CardDescription>過去7日間の再生回数</CardDescription>
          </CardHeader>
          <CardContent>
            {viewsData.length > 0 ? (
              <AreaChartComponent
                data={viewsData}
                dataKey="views"
                xAxisKey="date"
                color="hsl(var(--chart-1))"
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>チャンネル登録者推移</CardTitle>
            <CardDescription>過去7日間の登録者数</CardDescription>
          </CardHeader>
          <CardContent>
            {subscribersData.length > 0 ? (
              <AreaChartComponent
                data={subscribersData}
                dataKey="subscribers"
                xAxisKey="date"
                color="hsl(var(--chart-2))"
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Traffic Source & Top Videos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>トラフィックソース</CardTitle>
            <CardDescription>視聴者の流入元</CardDescription>
          </CardHeader>
          <CardContent>
            {trafficSourceData.length > 0 ? (
              <BarChartComponent
                data={trafficSourceData}
                dataKey="views"
                xAxisKey="source"
                horizontal
                color="hsl(var(--chart-3))"
              />
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                データがありません
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>トップ動画</CardTitle>
            <CardDescription>最も視聴されている動画</CardDescription>
          </CardHeader>
          <CardContent>
            {topVideos.length > 0 ? (
              <div className="space-y-4">
                {topVideos.map((video, index) => (
                  <div
                    key={video.id}
                    className="flex items-center gap-4 p-2 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex-shrink-0 text-lg font-bold text-muted-foreground w-6">
                      {index + 1}
                    </div>
                    <Avatar className="h-12 w-16 rounded-md">
                      <AvatarImage src={video.thumbnail} />
                      <AvatarFallback className="rounded-md">
                        <Video className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{video.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {video.views.toLocaleString()} 回再生
                      </p>
                    </div>
                    {video.change !== 0 && (
                      <Badge
                        variant={video.change >= 0 ? "default" : "destructive"}
                        className="flex items-center gap-1"
                      >
                        <TrendingUp className="h-3 w-3" />
                        {video.change > 0 ? "+" : ""}
                        {video.change.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                動画がありません
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function translateTrafficSource(source: string): string {
  const translations: Record<string, string> = {
    "YT_SEARCH": "YouTube検索",
    "SUGGESTED": "おすすめ動画",
    "BROWSE": "ブラウジング",
    "EXT_URL": "外部",
    "YT_CHANNEL": "チャンネルページ",
    "YT_OTHER_PAGE": "その他YouTube",
    "NOTIFICATION": "通知",
    "PLAYLIST": "再生リスト",
    "END_SCREEN": "終了画面",
    "ANNOTATION": "アノテーション",
    "SUBSCRIBER": "登録者",
  };
  return translations[source] || source;
}
