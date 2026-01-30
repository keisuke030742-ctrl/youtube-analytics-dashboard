'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function StepByStepPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [userInstruction, setUserInstruction] = useState('');
  const [currentState, setCurrentState] = useState<Record<string, any>>({});
  const [stepResult, setStepResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  // プロジェクト作成
  const createProjectMutation = trpc.project.create.useMutation();

  // ステップ情報取得
  const { data: stepInfo } = trpc.planner.getStepInfo.useQuery(
    { step: currentStep },
    { enabled: true }
  );

  // ステップ実行
  const runStepMutation = trpc.planner.runSingleStep.useMutation();

  // プロジェクト作成
  const handleCreateProject = async () => {
    if (!userInstruction.trim()) {
      alert('企画のテーマを入力してください');
      return;
    }

    const result = await createProjectMutation.mutateAsync({
      userInstruction,
      title: `ステップバイステップ企画: ${userInstruction.slice(0, 30)}`,
    });

    setProjectId(result.id);
  };

  // ステップ実行
  const handleRunStep = async () => {
    if (!projectId) {
      alert('先にプロジェクトを作成してください');
      return;
    }

    setIsRunning(true);
    setStepResult(null);

    try {
      const result = await runStepMutation.mutateAsync({
        projectId,
        step: currentStep,
        userInstruction: currentStep === 1 ? userInstruction : undefined,
        currentState,
      });

      setStepResult(result.stepResult);
      setCurrentState(result.updatedState);
    } catch (error) {
      console.error('ステップ実行エラー:', error);
      alert('ステップの実行に失敗しました');
    } finally {
      setIsRunning(false);
    }
  };

  // 次のステップへ
  const handleNextStep = () => {
    if (currentStep < 24) {
      setCurrentStep(currentStep + 1);
      setStepResult(null);
    } else {
      // 完了
      router.push(`/projects/${projectId}`);
    }
  };

  // 進捗率
  const progress = (currentStep / 24) * 100;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">ステップバイステップ企画作成</h1>

      {/* 進捗バー */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>進捗状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">
              ステップ {currentStep} / 24 ({Math.round(progress)}%)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* プロジェクト作成（初回のみ） */}
      {!projectId && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>企画のテーマを入力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userInstruction">テーマ</Label>
              <Input
                id="userInstruction"
                value={userInstruction}
                onChange={(e) => setUserInstruction(e.target.value)}
                placeholder="例: 住宅ローンの選び方について"
              />
            </div>
            <Button
              onClick={handleCreateProject}
              disabled={createProjectMutation.isPending}
            >
              {createProjectMutation.isPending
                ? 'プロジェクト作成中...'
                : 'プロジェクトを作成して開始'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ステップ情報 */}
      {projectId && stepInfo && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              ステップ {currentStep}: {stepInfo.stepName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Phase {stepInfo.phase}
              </p>
              <p className="mb-4">{stepInfo.description}</p>

              {!stepResult && (
                <Button
                  onClick={handleRunStep}
                  disabled={isRunning}
                  className="w-full"
                >
                  {isRunning ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      実行中...
                    </span>
                  ) : (
                    `このステップを実行`
                  )}
                </Button>
              )}
            </div>

            {/* 実行結果 */}
            {stepResult && (
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    ✅ ステップ {currentStep} が完了しました！
                  </AlertDescription>
                </Alert>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">実行結果</h4>
                  <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                    {JSON.stringify(stepResult, null, 2)}
                  </pre>
                </div>

                {currentStep < 24 ? (
                  <Button onClick={handleNextStep} className="w-full">
                    次のステップへ →
                  </Button>
                ) : (
                  <Button
                    onClick={handleNextStep}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    企画を確認する 🎉
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 現在のステート（デバッグ用） */}
      {projectId && Object.keys(currentState).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>現在のステート（デバッグ）</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap">
              {JSON.stringify(currentState, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
