"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Target,
  RefreshCw,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChannelInfo, useVideos } from "@/hooks/useYouTubeData";

interface AnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  recommendations: string[];
  nextActions: Array<{
    priority: "high" | "medium" | "low";
    action: string;
    reason: string;
  }>;
}

interface VideoSuggestion {
  title: string;
  description: string;
  targetAudience: string;
  expectedPerformance: string;
  keywords: string[];
}

interface SuggestionsResult {
  suggestions: VideoSuggestion[];
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

export default function AIInsightsPage() {
  const { status } = useSession();
  const { data: channelInfo, loading: channelLoading } = useChannelInfo();
  const { data: videos, loading: videosLoading } = useVideos(10);

  const [activeTab, setActiveTab] = useState("analysis");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [suggestions, setSuggestions] = useState<VideoSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!channelInfo || !videos || videos.length === 0) {
      setError("チャンネル情報または動画データがありません");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const { startDate, endDate } = getDateRange(28);
      const prevPeriod = getDateRange(56);

      // Fetch analytics data
      const [analyticsRes, trafficRes, prevAnalyticsRes] = await Promise.all([
        fetch(`/api/youtube/analytics?type=overview&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/youtube/analytics?type=traffic&startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/youtube/analytics?type=overview&startDate=${prevPeriod.startDate}&endDate=${startDate}`),
      ]);

      let metrics = {
        views: 0,
        watchTime: 0,
        subscribers: channelInfo.subscriberCount,
        subscribersGained: 0,
        subscribersLost: 0,
        averageViewDuration: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      };

      let previousPeriodMetrics = {
        views: 0,
        watchTime: 0,
        subscribers: channelInfo.subscriberCount,
      };

      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.rows) {
          analyticsData.rows.forEach((row: (string | number)[]) => {
            metrics.views += Number(row[1]) || 0;
            metrics.watchTime += Number(row[2]) || 0;
            metrics.averageViewDuration += Number(row[3]) || 0;
            metrics.subscribersGained += Number(row[5]) || 0;
            metrics.subscribersLost += Number(row[6]) || 0;
            metrics.likes += Number(row[7]) || 0;
            metrics.comments += Number(row[9]) || 0;
            metrics.shares += Number(row[10]) || 0;
          });
          if (analyticsData.rows.length > 0) {
            metrics.averageViewDuration = Math.round(metrics.averageViewDuration / analyticsData.rows.length);
          }
        }
      }

      if (prevAnalyticsRes.ok) {
        const prevData = await prevAnalyticsRes.json();
        if (prevData.rows) {
          prevData.rows.forEach((row: (string | number)[]) => {
            previousPeriodMetrics.views += Number(row[1]) || 0;
            previousPeriodMetrics.watchTime += Number(row[2]) || 0;
          });
        }
      }

      // Process traffic sources
      const trafficSources: Array<{ source: string; views: number; percentage: number }> = [];
      if (trafficRes.ok) {
        const trafficData = await trafficRes.json();
        if (trafficData.rows) {
          const totalViews = trafficData.rows.reduce((sum: number, row: (string | number)[]) => sum + (Number(row[1]) || 0), 0);
          trafficData.rows.slice(0, 5).forEach((row: (string | number)[]) => {
            const views = Number(row[1]) || 0;
            trafficSources.push({
              source: translateTrafficSource(String(row[0])),
              views,
              percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
            });
          });
        }
      }

      // Process top videos
      const topVideos = videos
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 5)
        .map((v) => ({
          title: v.title,
          views: v.viewCount,
          watchTime: 0,
          likes: v.likeCount,
          comments: v.commentCount,
        }));

      // Call AI analysis API
      const analysisResponse = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "performance",
          data: {
            channelName: channelInfo.title,
            period: `${startDate} - ${endDate}`,
            metrics,
            topVideos,
            trafficSources,
            previousPeriodMetrics,
          },
        }),
      });

      if (analysisResponse.ok) {
        const result = await analysisResponse.json();
        setAnalysisResult(result);
      } else {
        throw new Error("AI分析に失敗しました");
      }

      // Get video suggestions
      const suggestionsResponse = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "suggestions",
          data: {
            channelName: channelInfo.title,
            topVideos: topVideos.map((v) => ({
              title: v.title,
              views: v.views,
              engagement: v.views > 0 ? ((v.likes + v.comments) / v.views) * 100 : 0,
            })),
            recentTrends: ["AI・機械学習", "生産性向上", "最新テクノロジー"],
          },
        }),
      });

      if (suggestionsResponse.ok) {
        const suggResult: SuggestionsResult = await suggestionsResponse.json();
        setSuggestions(suggResult.suggestions || []);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setError(err instanceof Error ? err.message : "分析中にエラーが発生しました");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Auto-analyze on first load
  useEffect(() => {
    if (channelInfo && videos && videos.length > 0 && !analysisResult && !isAnalyzing) {
      handleAnalyze();
    }
  }, [channelInfo, videos]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      default:
        return "";
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "high":
        return "優先度：高";
      case "medium":
        return "優先度：中";
      case "low":
        return "優先度：低";
      default:
        return "";
    }
  };

  const isLoading = status === "loading" || channelLoading || videosLoading;

  if (isLoading) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-primary" />
            AI分析・提案
          </h1>
          <p className="text-muted-foreground">
            Claude AIによるチャンネル分析と改善提案
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              再分析
            </>
          )}
        </Button>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {isAnalyzing && (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg">AIがチャンネルを分析中...</p>
            <p className="text-sm text-muted-foreground">これには数秒かかることがあります</p>
          </div>
        </div>
      )}

      {!isAnalyzing && analysisResult && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="analysis">パフォーマンス分析</TabsTrigger>
            <TabsTrigger value="suggestions">動画アイデア提案</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>分析サマリー</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg leading-relaxed">{analysisResult.summary}</p>
              </CardContent>
            </Card>

            {/* SWOT-like Analysis */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Strengths */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-500">
                    <CheckCircle2 className="h-5 w-5" />
                    強み
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.strengths.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Weaknesses */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="h-5 w-5" />
                    課題
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.weaknesses.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <TrendingDown className="h-4 w-4 mt-0.5 text-red-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Opportunities */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-blue-500">
                    <Lightbulb className="h-5 w-5" />
                    機会
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {analysisResult.opportunities.map((item, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  改善提案
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {analysisResult.recommendations.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            {/* Next Actions */}
            <Card>
              <CardHeader>
                <CardTitle>ネクストアクション</CardTitle>
                <CardDescription>
                  優先度順に整理された具体的なアクションプラン
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analysisResult.nextActions.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      <Badge
                        variant="outline"
                        className={cn("flex-shrink-0", getPriorityColor(action.priority))}
                      >
                        {getPriorityLabel(action.priority)}
                      </Badge>
                      <div className="space-y-1">
                        <p className="font-medium">{action.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {action.reason}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suggestions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  おすすめ動画アイデア
                </CardTitle>
                <CardDescription>
                  過去のパフォーマンスとトレンドを基にしたAI提案
                </CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.length > 0 ? (
                  <div className="space-y-6">
                    {suggestions.map((suggestion, index) => (
                      <div key={index}>
                        {index > 0 && <Separator className="my-6" />}
                        <div className="space-y-3">
                          <h3 className="text-lg font-semibold">{suggestion.title}</h3>
                          <p className="text-muted-foreground">{suggestion.description}</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            <div>
                              <span className="text-sm font-medium">ターゲット: </span>
                              <span className="text-sm text-muted-foreground">
                                {suggestion.targetAudience}
                              </span>
                            </div>
                            <div>
                              <span className="text-sm font-medium">予想効果: </span>
                              <span className="text-sm text-muted-foreground">
                                {suggestion.expectedPerformance}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {suggestion.keywords.map((keyword, kidx) => (
                              <Badge key={kidx} variant="secondary">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                    動画提案を生成するには「再分析」ボタンをクリックしてください
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!isAnalyzing && !analysisResult && !error && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">AI分析を開始</h3>
              <p className="text-muted-foreground mb-4">
                「再分析」ボタンをクリックして、チャンネルのパフォーマンス分析を開始してください
              </p>
              <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                <Sparkles className="mr-2 h-4 w-4" />
                分析を開始
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
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
