"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Plus, Trash2, ExternalLink, RefreshCw, User } from "lucide-react";
import { toast } from "sonner";

// Sample channel data - will be replaced with real data
const sampleChannels = [
  {
    id: "1",
    youtubeId: "UC123456",
    title: "サンプルチャンネル1",
    thumbnail: "",
    subscriberCount: 10600,
    videoCount: 120,
    viewCount: 1500000,
    customUrl: "@samplechannel1",
    isActive: true,
  },
  {
    id: "2",
    youtubeId: "UC789012",
    title: "サンプルチャンネル2",
    thumbnail: "",
    subscriberCount: 5200,
    videoCount: 45,
    viewCount: 320000,
    customUrl: "@samplechannel2",
    isActive: false,
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [channels, setChannels] = useState(sampleChannels);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddChannel = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    toast.success("チャンネルを追加しました");
    setIsAddingChannel(false);
    setIsLoading(false);
  };

  const handleRemoveChannel = async (channelId: string) => {
    setChannels(channels.filter((c) => c.id !== channelId));
    toast.success("チャンネルを削除しました");
  };

  const handleRefreshChannel = async (channelId: string) => {
    toast.success("チャンネル情報を更新しました");
  };

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`;
    }
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8" />
          設定
        </h1>
        <p className="text-muted-foreground">
          アカウントとチャンネルの管理
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={session?.user?.image || ""} />
              <AvatarFallback>
                {session?.user?.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg font-semibold">{session?.user?.name}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Channel Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>チャンネル管理</CardTitle>
            <CardDescription>
              分析対象のYouTubeチャンネルを管理します
            </CardDescription>
          </div>
          <Dialog open={isAddingChannel} onOpenChange={setIsAddingChannel}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                チャンネルを追加
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>チャンネルを追加</DialogTitle>
                <DialogDescription>
                  Google認証を使用してYouTubeチャンネルを接続します
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>接続方法</Label>
                  <p className="text-sm text-muted-foreground">
                    「接続」ボタンをクリックすると、Googleアカウントの認証画面に移動します。
                    チャンネルの所有者またはマネージャー権限を持つアカウントでログインしてください。
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddingChannel(false)}>
                  キャンセル
                </Button>
                <Button onClick={handleAddChannel} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      接続中...
                    </>
                  ) : (
                    "Googleで接続"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {channels.map((channel, index) => (
              <div key={channel.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={channel.thumbnail} />
                      <AvatarFallback>{channel.title.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{channel.title}</p>
                        {channel.isActive && (
                          <Badge variant="secondary">アクティブ</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {channel.customUrl}
                      </p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>登録者: {formatNumber(channel.subscriberCount)}</span>
                        <span>動画: {channel.videoCount}本</span>
                        <span>総再生: {formatNumber(channel.viewCount)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRefreshChannel(channel.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        window.open(
                          `https://youtube.com/${channel.customUrl}`,
                          "_blank"
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRemoveChannel(channel.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {channels.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>接続されているチャンネルはありません</p>
                <p className="text-sm">「チャンネルを追加」から接続してください</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Keys (for reference) */}
      <Card>
        <CardHeader>
          <CardTitle>API設定</CardTitle>
          <CardDescription>
            外部APIの接続状況
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">YouTube Data API</p>
                <p className="text-sm text-muted-foreground">動画・チャンネル情報の取得</p>
              </div>
              <Badge variant="secondary">接続済み</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">YouTube Analytics API</p>
                <p className="text-sm text-muted-foreground">詳細な分析データの取得</p>
              </div>
              <Badge variant="secondary">接続済み</Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Claude API (Anthropic)</p>
                <p className="text-sm text-muted-foreground">AI分析・提案機能</p>
              </div>
              <Badge variant={process.env.ANTHROPIC_API_KEY ? "secondary" : "outline"}>
                {process.env.ANTHROPIC_API_KEY ? "接続済み" : "未設定"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
