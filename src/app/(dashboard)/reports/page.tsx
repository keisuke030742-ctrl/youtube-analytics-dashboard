"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { cn } from "@/lib/utils";

// Sample report data
const sampleReport = {
  period: "2026年1月1日 - 2026年1月27日",
  executiveSummary:
    "今月のチャンネルパフォーマンスは全体的に好調で、特に再生回数と視聴時間が前月比で大幅に増加しました。AI関連のコンテンツが特に好評で、新規登録者の獲得に貢献しています。",
  highlights: [
    "総再生回数が前月比+25%の145,000回を達成",
    "平均視聴時間が8分を超え、業界平均を上回る",
    "AI関連動画の平均CTRが7.5%と高水準",
    "コメント数が前月比+40%増加、エンゲージメント向上",
  ],
  concerns: [
    "週末の投稿頻度が低下傾向",
    "ショート動画のパフォーマンスにばらつき",
  ],
  nextSteps: [
    "人気のAIテーマで続編シリーズを企画",
    "週末の投稿を週1本追加",
    "ショート動画のA/Bテストを実施",
  ],
  outlook:
    "現在のトレンドが継続すれば、来月は登録者数15,000人突破が見込めます。AI関連コンテンツへの注力と投稿頻度の維持が重要です。",
  metrics: {
    views: { value: 145000, change: 25 },
    watchTime: { value: 4800, change: 18 },
    subscribers: { value: 10600, change: 4.2 },
    engagement: { value: 8.5, change: 12 },
  },
};

const pastReports = [
  { id: "1", period: "2026年1月", status: "完了", createdAt: "2026-01-27" },
  { id: "2", period: "2025年12月", status: "完了", createdAt: "2025-12-31" },
  { id: "3", period: "2025年11月", status: "完了", createdAt: "2025-11-30" },
];

export default function ReportsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [reportType, setReportType] = useState("monthly");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsGenerating(false);
  };

  const MetricCard = ({
    label,
    value,
    change,
    format: formatType = "number",
  }: {
    label: string;
    value: number;
    change: number;
    format?: "number" | "hours" | "percentage";
  }) => {
    const formatValue = (val: number) => {
      switch (formatType) {
        case "hours":
          return `${Math.floor(val / 60)}時間`;
        case "percentage":
          return `${val.toFixed(1)}%`;
        default:
          return val.toLocaleString();
      }
    };

    return (
      <div className="p-4 rounded-lg bg-muted/50">
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-bold">{formatValue(value)}</p>
        <div
          className={cn(
            "flex items-center gap-1 text-sm",
            change >= 0 ? "text-green-500" : "text-red-500"
          )}
        >
          {change >= 0 ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          {change >= 0 ? "+" : ""}
          {change}% 前月比
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            レポート
          </h1>
          <p className="text-muted-foreground">
            チャンネルパフォーマンスのレポートを生成・閲覧できます
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>レポート生成</CardTitle>
          <CardDescription>
            期間とタイプを選択してレポートを生成します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">レポートタイプ</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">週次レポート</SelectItem>
                  <SelectItem value="monthly">月次レポート</SelectItem>
                  <SelectItem value="quarterly">四半期レポート</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">期間</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[240px] justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ja }) : "日付を選択"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  レポート生成
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Current Report */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>最新レポート</CardTitle>
            <CardDescription>{sampleReport.period}</CardDescription>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            PDFダウンロード
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="総再生回数"
              value={sampleReport.metrics.views.value}
              change={sampleReport.metrics.views.change}
            />
            <MetricCard
              label="総視聴時間"
              value={sampleReport.metrics.watchTime.value}
              change={sampleReport.metrics.watchTime.change}
              format="hours"
            />
            <MetricCard
              label="チャンネル登録者"
              value={sampleReport.metrics.subscribers.value}
              change={sampleReport.metrics.subscribers.change}
            />
            <MetricCard
              label="エンゲージメント率"
              value={sampleReport.metrics.engagement.value}
              change={sampleReport.metrics.engagement.change}
              format="percentage"
            />
          </div>

          <Separator />

          {/* Executive Summary */}
          <div>
            <h3 className="text-lg font-semibold mb-2">エグゼクティブサマリー</h3>
            <p className="text-muted-foreground leading-relaxed">
              {sampleReport.executiveSummary}
            </p>
          </div>

          <Separator />

          {/* Highlights & Concerns */}
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-green-500">
                <CheckCircle2 className="h-5 w-5" />
                ハイライト
              </h3>
              <ul className="space-y-2">
                {sampleReport.highlights.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 mt-1 text-green-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-500">
                <AlertCircle className="h-5 w-5" />
                注意点
              </h3>
              <ul className="space-y-2">
                {sampleReport.concerns.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-1 text-yellow-500 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <Separator />

          {/* Next Steps */}
          <div>
            <h3 className="text-lg font-semibold mb-3">推奨アクション</h3>
            <ol className="space-y-2">
              {sampleReport.nextSteps.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </div>

          <Separator />

          {/* Outlook */}
          <div>
            <h3 className="text-lg font-semibold mb-2">今後の見通し</h3>
            <p className="text-muted-foreground leading-relaxed">
              {sampleReport.outlook}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Past Reports */}
      <Card>
        <CardHeader>
          <CardTitle>過去のレポート</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pastReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{report.period}</p>
                    <p className="text-sm text-muted-foreground">
                      作成日: {report.createdAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{report.status}</Badge>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
