'use client';

import { trpc } from '@/lib/trpc/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewProjectForm() {
  const router = useRouter();
  const [userInstruction, setUserInstruction] = useState('');
  const [llmProvider, setLlmProvider] = useState<'claude' | 'openai'>('claude');
  const [isCreating, setIsCreating] = useState(false);

  const createProjectMutation = trpc.project.create.useMutation();
  const runPhase1Mutation = trpc.planner.runPhase1.useMutation();
  const runAllMutation = trpc.planner.runAll.useMutation();

  const handleCreateAndRun = async (runAll: boolean) => {
    if (!userInstruction.trim()) {
      alert('企画の内容を入力してください');
      return;
    }

    setIsCreating(true);

    try {
      // 1. プロジェクトを作成
      const project = await createProjectMutation.mutateAsync({
        userInstruction,
      });

      // 2. Phase 1を実行（または全フェーズ）
      if (runAll) {
        await runAllMutation.mutateAsync({
          projectId: project.id,
          userInstruction,
          llmProvider,
        });
      } else {
        await runPhase1Mutation.mutateAsync({
          projectId: project.id,
          userInstruction,
          llmProvider,
        });
      }

      // 3. 完了したらプロジェクト詳細画面へ
      router.push(`/projects/${project.id}`);
    } catch (error) {
      console.error('Failed to create project:', error);
      alert('企画の作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => router.push('/')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              ← 戻る
            </button>
            <h1 className="text-2xl font-bold text-gray-900">新規企画作成</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="mb-6">
            <label
              htmlFor="userInstruction"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              企画の内容・指示
            </label>
            <textarea
              id="userInstruction"
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="例: 住宅ローンの選び方について、初心者向けに解説する動画を作りたい"
              value={userInstruction}
              onChange={(e) => setUserInstruction(e.target.value)}
              disabled={isCreating}
            />
            <p className="mt-2 text-sm text-gray-500">
              どのような動画を作りたいか、できるだけ詳しく入力してください
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              使用するLLMモデル
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="claude"
                  checked={llmProvider === 'claude'}
                  onChange={(e) =>
                    setLlmProvider(e.target.value as 'claude' | 'openai')
                  }
                  disabled={isCreating}
                  className="mr-2"
                />
                <span className="text-gray-700">Claude Sonnet 4.5（推奨）</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="openai"
                  checked={llmProvider === 'openai'}
                  onChange={(e) =>
                    setLlmProvider(e.target.value as 'claude' | 'openai')
                  }
                  disabled={isCreating}
                  className="mr-2"
                />
                <span className="text-gray-700">GPT-4o</span>
              </label>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              実行モード選択
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* ステップバイステップ実行 */}
              <button
                onClick={() => router.push('/projects/new/step-by-step')}
                disabled={isCreating}
                className="p-6 border-2 border-green-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  ステップバイステップ実行
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  各ステップの結果を確認しながら進めます。全24ステップを1つずつ実行します。
                </p>
                <span className="text-sm font-medium text-green-600">
                  🆕 推奨：結果を確認したい方
                </span>
              </button>

              {/* Phase 1のみ実行 */}
              <button
                onClick={() => handleCreateAndRun(false)}
                disabled={isCreating}
                className="p-6 border-2 border-blue-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  Phase 1のみ実行
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  企画立案・リサーチ（11ステップ）のみを実行します。結果を確認してから次のフェーズに進めます。
                </p>
                <span className="text-sm font-medium text-blue-600">
                  推奨：初めての方
                </span>
              </button>

              {/* 全フェーズ一括実行 */}
              <button
                onClick={() => handleCreateAndRun(true)}
                disabled={isCreating}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <h4 className="font-semibold text-gray-900 mb-2">
                  全フェーズ一括実行
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Phase 1〜4（全24ステップ）を一度に実行し、最終台本まで生成します。
                </p>
                <span className="text-sm font-medium text-green-600">
                  推奨：一気に作成したい方
                </span>
              </button>
            </div>
          </div>

          {isCreating && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <p className="text-blue-800">
                  企画を作成中です。しばらくお待ちください...
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">💡 ヒント</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>• Phase 1では、キーワード選定、ペルソナ設定、競合分析などを行います</li>
            <li>• 実行には数分かかる場合があります</li>
            <li>• 結果はいつでも編集・再実行できます</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
