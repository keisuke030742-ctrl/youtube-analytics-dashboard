'use client';

import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Project } from '@prisma/client';

export default function ProjectDetailContent({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'phase1' | 'phase2' | 'phase3' | 'phase4'>('overview');

  const { data: project, isLoading } = trpc.project.getById.useQuery({
    id: projectId,
  }) as {
    data: (Project & { executions: any[] }) | null | undefined;
    isLoading: boolean;
  };

  const utils = trpc.useUtils();
  const runPhase2Mutation = trpc.planner.runPhase2.useMutation({
    onSuccess: () => utils.project.getById.invalidate({ id: projectId }),
  });
  const runPhase3Mutation = trpc.planner.runPhase3.useMutation({
    onSuccess: () => utils.project.getById.invalidate({ id: projectId }),
  });
  const runPhase4Mutation = trpc.planner.runPhase4.useMutation({
    onSuccess: () => utils.project.getById.invalidate({ id: projectId }),
  });

  const handleRunPhase2 = async () => {
    if (!confirm('Phase 2（タイトル・サムネ生成）を実行しますか？')) return;
    try {
      await runPhase2Mutation.mutateAsync({ projectId });
      alert('Phase 2の実行を開始しました');
      setActiveTab('phase2');
    } catch (e) {
      alert('実行に失敗しました');
    }
  };

  const handleRunPhase3 = async () => {
    if (!confirm('Phase 3（構成生成）を実行しますか？')) return;
    try {
      await runPhase3Mutation.mutateAsync({ projectId });
      alert('Phase 3の実行を開始しました');
      setActiveTab('phase3');
    } catch (e) {
      alert('実行に失敗しました');
    }
  };

  const handleRunPhase4 = async () => {
    if (!confirm('Phase 4（台本執筆）を実行しますか？')) return;
    try {
      await runPhase4Mutation.mutateAsync({ projectId });
      alert('Phase 4の実行を開始しました');
      setActiveTab('phase4');
    } catch (e) {
      alert('実行に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">企画が見つかりませんでした</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="mr-4 text-gray-600 hover:text-gray-900"
              >
                ← 戻る
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {project.title || '無題の企画'}
                </h1>
                <p className="text-sm text-gray-600">
                  {new Date(project.createdAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 text-sm font-medium rounded-full ${project.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-800'
                  : project.status === 'IN_PROGRESS'
                    ? 'bg-blue-100 text-blue-800'
                    : project.status === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
            >
              {project.status === 'COMPLETED'
                ? '完了'
                : project.status === 'IN_PROGRESS'
                  ? '実行中'
                  : project.status === 'FAILED'
                    ? '失敗'
                    : '下書き'}
            </span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              概要
            </button>
            <button
              onClick={() => setActiveTab('phase1')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'phase1'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
            >
              Phase 1（企画立案）
            </button>
            <button
              onClick={() => setActiveTab('phase2')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'phase2'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              disabled={!project.phase2Result}
            >
              Phase 2（タイトル）
            </button>
            <button
              onClick={() => setActiveTab('phase3')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'phase3'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              disabled={!project.phase3Result}
            >
              Phase 3（構成）
            </button>
            <button
              onClick={() => setActiveTab('phase4')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'phase4'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              disabled={!project.phase4Result}
            >
              Phase 4（台本）
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">次のアクション</h2>
              <div className="flex flex-wrap gap-4">
                {project.phase1Result && !project.phase2Result && (
                  <button
                    onClick={handleRunPhase2}
                    disabled={runPhase2Mutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {runPhase2Mutation.isPending ? '実行中...' : 'Phase 2 (タイトル) を実行'}
                  </button>
                )}
                {project.phase2Result && !project.phase3Result && (
                  <button
                    onClick={handleRunPhase3}
                    disabled={runPhase3Mutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {runPhase3Mutation.isPending ? '実行中...' : 'Phase 3 (構成) を実行'}
                  </button>
                )}
                {project.phase3Result && !project.phase4Result && (
                  <button
                    onClick={handleRunPhase4}
                    disabled={runPhase4Mutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {runPhase4Mutation.isPending ? '実行中...' : 'Phase 4 (台本) を実行'}
                  </button>
                )}
                {project.status === 'COMPLETED' && (
                  <p className="text-green-600 font-medium">全ての工程が完了しました！</p>
                )}
                {project.status === 'IN_PROGRESS' && (
                  <p className="text-blue-600 font-medium">現在エージェントが実行中です...</p>
                )}
                {!project.phase1Result && project.status !== 'IN_PROGRESS' && (
                  <p className="text-gray-500">Phase 1がまだ完了していません</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">企画情報</h2>
              <dl className="grid grid-cols-1 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">ユーザー指示</dt>
                  <dd className="mt-1 text-sm text-gray-900">{project.userInstruction}</dd>
                </div>
                {project.keyword && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">SEOキーワード</dt>
                    <dd className="mt-1 text-sm text-gray-900">{project.keyword}</dd>
                  </div>
                )}
              </dl>
            </div>

            {project.executions && project.executions.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">実行ログ</h2>
                <div className="space-y-2">
                  {project.executions.map((execution) => (
                    <div
                      key={execution.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-medium text-gray-700">
                          Phase {execution.phase}, Step {execution.step}
                        </span>
                        <span className="text-sm text-gray-600">{execution.agentName}</span>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${execution.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : execution.status === 'RUNNING'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                      >
                        {execution.status === 'COMPLETED'
                          ? '完了'
                          : execution.status === 'RUNNING'
                            ? '実行中'
                            : '失敗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'phase1' && project.phase1Result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 1 結果</h2>
            <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-[600px]">
              {JSON.stringify(project.phase1Result, null, 2)}
            </pre>
          </div>
        )}

        {activeTab === 'phase1' && !project.phase1Result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Phase 1の結果がまだありません</p>
          </div>
        )}

        {activeTab === 'phase2' && project.phase2Result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 2 結果（タイトル・サムネ）</h2>
              {project.title && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-800 mb-1">最終タイトル</p>
                  <p className="text-lg font-bold text-blue-900">{project.title}</p>
                </div>
              )}
              {project.thumbnailWord && (
                <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-1">サムネワード</p>
                  <p className="text-lg font-bold text-yellow-900">{project.thumbnailWord}</p>
                </div>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">詳細データを表示</summary>
                <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-[400px] mt-2">
                  {JSON.stringify(project.phase2Result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {activeTab === 'phase2' && !project.phase2Result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Phase 2の結果がまだありません</p>
            {project.phase1Result && (
              <button
                onClick={handleRunPhase2}
                disabled={runPhase2Mutation.isPending}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {runPhase2Mutation.isPending ? '実行中...' : 'Phase 2を実行'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'phase3' && project.phase3Result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 3 結果（構成）</h2>
              <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-[600px]">
                {JSON.stringify(project.phase3Result, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'phase3' && !project.phase3Result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Phase 3の結果がまだありません</p>
            {project.phase2Result && (
              <button
                onClick={handleRunPhase3}
                disabled={runPhase3Mutation.isPending}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {runPhase3Mutation.isPending ? '実行中...' : 'Phase 3を実行'}
              </button>
            )}
          </div>
        )}

        {activeTab === 'phase4' && project.phase4Result && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 4 結果（最終台本）</h2>
              {project.finalScript && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm font-medium text-green-800 mb-2">最終台本</p>
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 bg-white p-4 rounded border">
                      {project.finalScript}
                    </pre>
                  </div>
                </div>
              )}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">詳細データを表示</summary>
                <pre className="bg-gray-50 p-4 rounded overflow-auto text-sm max-h-[400px] mt-2">
                  {JSON.stringify(project.phase4Result, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {activeTab === 'phase4' && !project.phase4Result && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Phase 4の結果がまだありません</p>
            {project.phase3Result && (
              <button
                onClick={handleRunPhase4}
                disabled={runPhase4Mutation.isPending}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {runPhase4Mutation.isPending ? '実行中...' : 'Phase 4を実行'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
