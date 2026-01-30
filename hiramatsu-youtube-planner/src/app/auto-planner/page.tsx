'use client';

// 静的生成をスキップ（tRPCが必要なため）
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BatchHistory } from './components/BatchHistory';
import { KeywordManager } from './components/KeywordManager';
import { StatsCards } from './components/StatsCards';

type TabType = 'dashboard' | 'keywords' | 'history';

export default function AutoPlannerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isRunning, setIsRunning] = useState(false);

  // バッチ統計を取得
  const { data: batchStats, refetch: refetchBatchStats } = trpc.batch.stats.useQuery();

  // キーワード統計を取得
  const { data: keywordStats } = trpc.keyword.stats.useQuery();

  // 実行中のバッチをチェック
  const { data: hasRunning, refetch: refetchRunning } = trpc.batch.hasRunning.useQuery();

  // 手動実行
  const handleManualRun = async () => {
    if (hasRunning) {
      alert('別のバッチが実行中です。完了するまでお待ちください。');
      return;
    }

    const confirmed = confirm(
      '週次企画生成を手動実行しますか？\n\n30個の企画が自動生成されます。'
    );
    if (!confirmed) return;

    setIsRunning(true);

    try {
      const response = await fetch('/api/cron/generate-weekly-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${prompt('CRON_SECRET を入力してください:')}`,
        },
        body: JSON.stringify({
          targetCount: 30,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(
          `生成完了！\n\n成功: ${result.completedPlans}件\n失敗: ${result.failedPlans}件`
        );
        refetchBatchStats();
        refetchRunning();
      } else {
        alert(`エラー: ${result.error}`);
      }
    } catch (error) {
      alert(`実行に失敗しました: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Auto Planner
              </h1>
              <p className="text-sm text-gray-500">
                週次自動企画生成システム
              </p>
            </div>
            <Button
              onClick={handleManualRun}
              disabled={isRunning || hasRunning}
              className="bg-green-600 hover:bg-green-700"
            >
              {isRunning ? '実行中...' : hasRunning ? 'バッチ実行中' : '手動実行'}
            </Button>
          </div>
        </div>
      </header>

      {/* タブ */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ダッシュボード
          </button>
          <button
            onClick={() => setActiveTab('keywords')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === 'keywords'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            キーワード管理
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            実行履歴
          </button>
        </div>
      </div>

      {/* コンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* 統計カード */}
            <StatsCards
              batchStats={batchStats}
              keywordStats={keywordStats}
            />

            {/* 最新バッチ */}
            <Card>
              <CardHeader>
                <CardTitle>最新の実行結果</CardTitle>
                <CardDescription>
                  直近10回のバッチ実行結果
                </CardDescription>
              </CardHeader>
              <CardContent>
                {batchStats?.recentBatches && batchStats.recentBatches.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">実行日時</th>
                          <th className="text-left py-2 px-4">ステータス</th>
                          <th className="text-right py-2 px-4">成功</th>
                          <th className="text-right py-2 px-4">失敗</th>
                          <th className="text-right py-2 px-4">合計</th>
                        </tr>
                      </thead>
                      <tbody>
                        {batchStats.recentBatches.map((batch) => (
                          <tr key={batch.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-4">
                              {new Date(batch.triggeredAt).toLocaleString('ja-JP')}
                            </td>
                            <td className="py-2 px-4">
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  batch.status === 'COMPLETED'
                                    ? 'bg-green-100 text-green-800'
                                    : batch.status === 'PARTIAL'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : batch.status === 'FAILED'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {batch.status}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right text-green-600">
                              {batch.completedPlans}
                            </td>
                            <td className="py-2 px-4 text-right text-red-600">
                              {batch.failedPlans}
                            </td>
                            <td className="py-2 px-4 text-right">
                              {batch.totalPlans}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">
                    まだ実行履歴がありません
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cron設定情報 */}
            <Card>
              <CardHeader>
                <CardTitle>自動実行スケジュール</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-mono text-sm">
                    <span className="text-gray-500">Cron:</span>{' '}
                    <span className="text-blue-600">0 1 * * 1</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    毎週月曜日 10:00（JST）に自動実行
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'keywords' && <KeywordManager />}

        {activeTab === 'history' && <BatchHistory />}
      </main>
    </div>
  );
}
