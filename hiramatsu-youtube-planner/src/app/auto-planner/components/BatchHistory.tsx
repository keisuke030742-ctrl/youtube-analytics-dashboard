'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function BatchHistory() {
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // バッチ一覧を取得
  const { data: batchesData, isLoading } = trpc.batch.list.useQuery({
    limit: 20,
  });

  // 選択されたバッチの詳細を取得
  const { data: batchDetail } = trpc.batch.getById.useQuery(
    { id: selectedBatchId! },
    { enabled: !!selectedBatchId }
  );

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
      RUNNING: 'bg-blue-100 text-blue-800',
    }[status] || 'bg-gray-100 text-gray-800';

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${styles}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* バッチ一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>実行履歴</CardTitle>
          <CardDescription>
            過去のバッチ実行結果
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">読み込み中...</p>
          ) : batchesData?.batches && batchesData.batches.length > 0 ? (
            <div className="space-y-2">
              {batchesData.batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedBatchId === batch.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(batch.triggeredAt).toLocaleString('ja-JP')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {batch.triggeredBy === 'cron' ? '自動実行' : '手動実行'} |{' '}
                        {batch.completedPlans}/{batch.totalPlans}件成功
                      </p>
                    </div>
                    {getStatusBadge(batch.status)}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              実行履歴がありません
            </p>
          )}
        </CardContent>
      </Card>

      {/* バッチ詳細 */}
      <Card>
        <CardHeader>
          <CardTitle>詳細</CardTitle>
          <CardDescription>
            {selectedBatchId ? '選択されたバッチの詳細' : 'バッチを選択してください'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {batchDetail ? (
            <div className="space-y-4">
              {/* 基本情報 */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">実行日時</p>
                  <p className="font-medium">
                    {new Date(batchDetail.triggeredAt).toLocaleString('ja-JP')}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">完了日時</p>
                  <p className="font-medium">
                    {batchDetail.completedAt
                      ? new Date(batchDetail.completedAt).toLocaleString('ja-JP')
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">トリガー</p>
                  <p className="font-medium">
                    {batchDetail.triggeredBy === 'cron' ? '自動実行' : '手動実行'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">ステータス</p>
                  {getStatusBadge(batchDetail.status)}
                </div>
              </div>

              {/* 結果サマリー */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {batchDetail.completedPlans}
                    </p>
                    <p className="text-xs text-gray-500">成功</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {batchDetail.failedPlans}
                    </p>
                    <p className="text-xs text-gray-500">失敗</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">
                      {batchDetail.totalPlans}
                    </p>
                    <p className="text-xs text-gray-500">合計</p>
                  </div>
                </div>
              </div>

              {/* エラー情報 */}
              {batchDetail.error && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-red-800">エラー</p>
                  <p className="text-sm text-red-600 mt-1">{batchDetail.error}</p>
                </div>
              )}

              {/* 生成された企画 */}
              {batchDetail.projects && batchDetail.projects.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    生成された企画 ({batchDetail.projects.length}件)
                  </p>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batchDetail.projects.map((project) => (
                      <a
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block p-3 rounded border hover:bg-gray-50"
                      >
                        <p className="font-medium text-sm">
                          {project.title || project.keyword || '無題'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {project.keyword} | {project.status}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 選定されたキーワード */}
              {batchDetail.selectedKeywords && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    選定されたキーワード
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(batchDetail.selectedKeywords as any[]).slice(0, 20).map(
                      (kw: any, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
                        >
                          {kw.keyword}
                          {kw.volume && (
                            <span className="ml-1 text-blue-600">
                              ({kw.volume.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )
                    )}
                    {(batchDetail.selectedKeywords as any[]).length > 20 && (
                      <span className="text-xs text-gray-500">
                        ... 他{(batchDetail.selectedKeywords as any[]).length - 20}件
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center py-8 text-gray-500">
              左側のリストからバッチを選択してください
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
