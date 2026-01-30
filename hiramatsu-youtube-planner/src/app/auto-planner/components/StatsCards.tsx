'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BatchStats {
  total: number;
  byStatus: Record<string, number>;
  recentSuccessRate: number;
  recentBatches: any[];
}

interface KeywordStats {
  total: number;
  active: number;
  inactive: number;
  avgVolume: number;
  avgUsageCount: number;
  byCategory: Record<string, number>;
}

interface StatsCardsProps {
  batchStats?: BatchStats;
  keywordStats?: KeywordStats;
}

export function StatsCards({ batchStats, keywordStats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* キーワード数 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            登録キーワード
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {keywordStats?.total ?? '-'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            アクティブ: {keywordStats?.active ?? 0}件
          </p>
        </CardContent>
      </Card>

      {/* 実行回数 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            総実行回数
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {batchStats?.total ?? '-'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            完了: {batchStats?.byStatus?.COMPLETED ?? 0}回
          </p>
        </CardContent>
      </Card>

      {/* 成功率 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            直近成功率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {batchStats?.recentSuccessRate ?? '-'}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            直近10回の平均
          </p>
        </CardContent>
      </Card>

      {/* 平均ボリューム */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            平均検索ボリューム
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {keywordStats?.avgVolume
              ? Math.round(keywordStats.avgVolume).toLocaleString()
              : '-'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            平均使用回数: {keywordStats?.avgUsageCount?.toFixed(1) ?? '-'}回
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
