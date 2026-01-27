"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Tv,
  Layout,
  Clock,
  ExternalLink,
  Video,
  Loader2,
  TrendingUp,
  Eye,
  BarChart3,
} from "lucide-react";

interface TrafficBreakdown {
  source: string;
  views: number;
  percentage: number;
}

interface VideoData {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  daysSincePublished: number;
  totalViewsInPeriod: number;
  trafficBreakdown: TrafficBreakdown[];
  videoType: string;
  isLongTerm: boolean;
}

interface GroupedVideos {
  search: VideoData[];
  suggested: VideoData[];
  browse: VideoData[];
  longTerm: VideoData[];
  external: VideoData[];
  other: VideoData[];
}

interface Summary {
  totalVideos: number;
  searchType: number;
  suggestedType: number;
  browseType: number;
  longTermType: number;
  externalType: number;
}

const videoTypeConfig = {
  search: {
    label: "検索流入型",
    icon: Search,
    color: "bg-blue-500",
    description: "YouTube検索から多く視聴されている動画",
  },
  suggested: {
    label: "関連動画型",
    icon: Tv,
    color: "bg-purple-500",
    description: "関連動画・おすすめから多く視聴されている動画",
  },
  browse: {
    label: "ブラウジング型",
    icon: Layout,
    color: "bg-green-500",
    description: "ホーム画面・急上昇から多く視聴されている動画",
  },
  longTerm: {
    label: "長期再生型",
    icon: Clock,
    color: "bg-orange-500",
    description: "公開から30日以上経過しても再生が続いている動画",
  },
  external: {
    label: "外部流入型",
    icon: ExternalLink,
    color: "bg-pink-500",
    description: "外部サイトやSNSから多く視聴されている動画",
  },
};

function translateTrafficSource(source: string): string {
  const translations: Record<string, string> = {
    "YT_SEARCH": "YouTube検索",
    "SEARCH": "YouTube検索",
    "SUGGESTED": "関連動画",
    "RELATED_VIDEO": "関連動画",
    "BROWSE": "ブラウジング",
    "BROWSE_FEATURES": "ブラウジング",
    "EXT_URL": "外部",
    "EXTERNAL": "外部",
    "YT_CHANNEL": "チャンネルページ",
    "NOTIFICATION": "通知",
    "PLAYLIST": "再生リスト",
    "END_SCREEN": "終了画面",
    "YT_OTHER_PAGE": "その他",
  };
  return translations[source] || source;
}

function VideoCard({ video }: { video: VideoData }) {
  const topTraffic = video.trafficBreakdown
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3);

  return (
    <div className="flex gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-20 w-32 rounded-md flex-shrink-0">
        <AvatarImage src={video.thumbnail} className="object-cover" />
        <AvatarFallback className="rounded-md">
          <Video className="h-8 w-8" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-medium line-clamp-2 mb-1">{video.title}</h3>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {video.viewCount.toLocaleString()}回
          </span>
          <span>{video.daysSincePublished}日前</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {topTraffic.map((traffic, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {translateTrafficSource(traffic.source)} {traffic.percentage.toFixed(0)}%
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function VideoTypeSection({
  type,
  videos,
}: {
  type: keyof typeof videoTypeConfig;
  videos: VideoData[];
}) {
  const config = videoTypeConfig[type];
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${config.color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          {config.label}
          <Badge variant="secondary" className="ml-auto">
            {videos.length}本
          </Badge>
        </CardTitle>
        <CardDescription>{config.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {videos.length > 0 ? (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-[100px] text-muted-foreground">
            該当する動画がありません
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ContentPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedVideos, setGroupedVideos] = useState<GroupedVideos | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function fetchVideoTraffic() {
      if (status !== "authenticated") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch("/api/youtube/video-traffic");
        if (!response.ok) {
          throw new Error("Failed to fetch video traffic data");
        }
        const data = await response.json();
        setGroupedVideos(data.groupedVideos);
        setSummary(data.summary);
        setError(null);
      } catch (err) {
        console.error("Error fetching video traffic:", err);
        setError(err instanceof Error ? err.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }

    fetchVideoTraffic();
  }, [status]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">動画データを分析中...</p>
          <p className="text-xs text-muted-foreground">初回は少し時間がかかります</p>
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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-destructive">エラーが発生しました: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          コンテンツ分析
        </h1>
        <p className="text-muted-foreground">
          動画をトラフィックソースで分類し、パフォーマンスパターンを分析します
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.searchType}</p>
                  <p className="text-xs text-muted-foreground">検索流入型</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Tv className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.suggestedType}</p>
                  <p className="text-xs text-muted-foreground">関連動画型</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Layout className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.browseType}</p>
                  <p className="text-xs text-muted-foreground">ブラウジング型</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.longTermType}</p>
                  <p className="text-xs text-muted-foreground">長期再生型</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-pink-500" />
                <div>
                  <p className="text-2xl font-bold">{summary.externalType}</p>
                  <p className="text-xs text-muted-foreground">外部流入型</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="search">検索流入型</TabsTrigger>
          <TabsTrigger value="suggested">関連動画型</TabsTrigger>
          <TabsTrigger value="browse">ブラウジング型</TabsTrigger>
          <TabsTrigger value="longTerm">長期再生型</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {groupedVideos && (
            <div className="grid gap-6 lg:grid-cols-2">
              <VideoTypeSection type="search" videos={groupedVideos.search.slice(0, 3)} />
              <VideoTypeSection type="suggested" videos={groupedVideos.suggested.slice(0, 3)} />
              <VideoTypeSection type="browse" videos={groupedVideos.browse.slice(0, 3)} />
              <VideoTypeSection type="longTerm" videos={groupedVideos.longTerm.slice(0, 3)} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="search">
          {groupedVideos && (
            <VideoTypeSection type="search" videos={groupedVideos.search} />
          )}
        </TabsContent>

        <TabsContent value="suggested">
          {groupedVideos && (
            <VideoTypeSection type="suggested" videos={groupedVideos.suggested} />
          )}
        </TabsContent>

        <TabsContent value="browse">
          {groupedVideos && (
            <VideoTypeSection type="browse" videos={groupedVideos.browse} />
          )}
        </TabsContent>

        <TabsContent value="longTerm">
          {groupedVideos && (
            <VideoTypeSection type="longTerm" videos={groupedVideos.longTerm} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
