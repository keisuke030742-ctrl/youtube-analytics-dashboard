"use client";

import { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Video, Eye, Clock, ThumbsUp, MessageSquare, Loader2 } from "lucide-react";
import { useVideos } from "@/hooks/useYouTubeData";

interface VideoWithMetrics {
  id: string;
  title: string;
  thumbnail: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

function parseDuration(duration: string): string {
  // Parse ISO 8601 duration format (PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export default function VideosPage() {
  const { status } = useSession();
  const { data: videos, loading, error } = useVideos(50);

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("views");

  const processedVideos = useMemo(() => {
    if (!videos) return [];
    return videos.map((video) => ({
      ...video,
      formattedDuration: parseDuration(video.duration),
      formattedDate: formatDate(video.publishedAt),
    }));
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return processedVideos.filter((video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [processedVideos, searchQuery]);

  const sortedVideos = useMemo(() => {
    return [...filteredVideos].sort((a, b) => {
      switch (sortBy) {
        case "views":
          return b.viewCount - a.viewCount;
        case "likes":
          return b.likeCount - a.likeCount;
        case "comments":
          return b.commentCount - a.commentCount;
        case "date":
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        default:
          return 0;
      }
    });
  }, [filteredVideos, sortBy]);

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">動画データを読み込み中...</p>
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
        <h1 className="text-3xl font-bold tracking-tight">動画分析</h1>
        <p className="text-muted-foreground">
          全動画のパフォーマンスを確認・比較できます
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="動画を検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">並び替え:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="views">再生回数</SelectItem>
                  <SelectItem value="likes">高評価数</SelectItem>
                  <SelectItem value="comments">コメント数</SelectItem>
                  <SelectItem value="date">公開日</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video Table */}
      <Card>
        <CardHeader>
          <CardTitle>動画一覧</CardTitle>
          <CardDescription>
            全{sortedVideos.length}件の動画
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedVideos.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[400px]">動画</TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Eye className="h-4 w-4" />
                      再生回数
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Clock className="h-4 w-4" />
                      時間
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      高評価
                    </div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MessageSquare className="h-4 w-4" />
                      コメント
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVideos.map((video) => (
                  <TableRow key={video.id} className="cursor-pointer hover:bg-accent">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-16 w-24 rounded-md">
                          <AvatarImage src={video.thumbnail} />
                          <AvatarFallback className="rounded-md">
                            <Video className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium line-clamp-2">{video.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {video.formattedDate}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(video.viewCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="outline">{video.formattedDuration}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.likeCount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(video.commentCount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              {searchQuery ? "検索結果がありません" : "動画がありません"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
