/**
 * Cron Endpoint: Generate Weekly Plans
 * 毎週月曜日10時（JST）に自動実行
 *
 * Vercel Cron設定: "0 1 * * 1" (UTC 1:00 = JST 10:00)
 *
 * Super Orchestrator対応版:
 * - キーワード戦略AI（vidIQ + Analytics連携）
 * - 並列企画生成（30件）
 * - 優先度ランキング
 * - Slack通知
 */

import { NextRequest, NextResponse } from 'next/server';
import { autoPlanner } from '@/lib/services/auto-planner';
import { SuperOrchestrator } from '@/lib/agents/super-orchestrator';

// Vercel Cronの最大実行時間を設定（Pro: 300秒、Hobby: 10秒）
export const maxDuration = 300;

// Super Orchestratorを使用するかどうか（環境変数で制御）
const USE_SUPER_ORCHESTRATOR = process.env.USE_SUPER_ORCHESTRATOR === 'true';

/**
 * Cron認証チェック
 * Vercel Cronは自動的にAUTHORIZATION headerを付与
 */
function verifyCronAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Vercel Cronからの呼び出し
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 開発環境では認証をスキップ（オプション）
  if (process.env.NODE_ENV === 'development') {
    const skipAuth = request.headers.get('x-skip-auth');
    if (skipAuth === 'true') {
      return true;
    }
  }

  return false;
}

/**
 * GET: Cronジョブまたは手動実行
 */
export async function GET(request: NextRequest) {
  // 認証チェック
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    console.log('Starting weekly plan generation...');
    console.log(`Mode: ${USE_SUPER_ORCHESTRATOR ? 'Super Orchestrator' : 'Legacy AutoPlanner'}`);

    if (USE_SUPER_ORCHESTRATOR) {
      // Super Orchestrator版（キーワード戦略AI + 優先度ランキング付き）
      const superOrch = new SuperOrchestrator({
        targetCount: 30,
        strategy: 'balanced',
        concurrency: 5,
      });

      const result = await superOrch.runWeeklyGeneration('cron');

      return NextResponse.json({
        success: true,
        mode: 'super_orchestrator',
        batchId: result.batchId,
        status: result.status,
        completedPlans: result.completedPlans,
        failedPlans: result.failedPlans,
        topPlans: result.topPlans.slice(0, 5),
        message: `Generated ${result.completedPlans} plans (${result.failedPlans} failed) with priority ranking`,
      });
    } else {
      // 従来版（互換性維持）
      const batch = await autoPlanner.runBatch('cron', {
        targetCount: 30,
      });

      return NextResponse.json({
        success: true,
        mode: 'legacy',
        batchId: batch.id,
        status: batch.status,
        completedPlans: batch.completedPlans,
        failedPlans: batch.failedPlans,
        message: `Generated ${batch.completedPlans} plans (${batch.failedPlans} failed)`,
      });
    }
  } catch (error) {
    console.error('Cron job failed:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: 手動実行（カスタムオプション付き）
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));

    // Super Orchestratorモードを強制指定可能
    const useSuperOrch = body.useSuperOrchestrator ?? USE_SUPER_ORCHESTRATOR;

    console.log('Starting manual plan generation...');
    console.log(`Mode: ${useSuperOrch ? 'Super Orchestrator' : 'Legacy AutoPlanner'}`);

    if (useSuperOrch) {
      // Super Orchestrator版
      const superOrch = new SuperOrchestrator({
        targetCount: body.targetCount ?? 30,
        strategy: body.strategy ?? 'balanced',
        concurrency: body.concurrency ?? 5,
      });

      // キーワード指定がある場合
      if (body.keywords && Array.isArray(body.keywords)) {
        const result = await superOrch.runWithKeywords(body.keywords, 'manual');

        return NextResponse.json({
          success: true,
          mode: 'super_orchestrator',
          batchId: result.batchId,
          status: result.status,
          completedPlans: result.completedPlans,
          failedPlans: result.failedPlans,
          topPlans: result.topPlans.slice(0, 5),
          message: `Generated ${result.completedPlans} plans with specified keywords`,
        });
      }

      // 通常の自動選定
      const result = await superOrch.runWeeklyGeneration('manual');

      return NextResponse.json({
        success: true,
        mode: 'super_orchestrator',
        batchId: result.batchId,
        status: result.status,
        completedPlans: result.completedPlans,
        failedPlans: result.failedPlans,
        topPlans: result.topPlans.slice(0, 5),
        message: `Generated ${result.completedPlans} plans with priority ranking`,
      });
    } else {
      // 従来版
      const options = {
        targetCount: body.targetCount ?? 30,
        minVolume: body.minVolume,
        maxUsageCount: body.maxUsageCount,
        includeCategories: body.includeCategories,
        excludeCategories: body.excludeCategories,
        skipTrendAnalysis: body.skipTrendAnalysis ?? false,
      };

      const batch = await autoPlanner.runBatch('manual', options);

      return NextResponse.json({
        success: true,
        mode: 'legacy',
        batchId: batch.id,
        status: batch.status,
        completedPlans: batch.completedPlans,
        failedPlans: batch.failedPlans,
        message: `Generated ${batch.completedPlans} plans (${batch.failedPlans} failed)`,
      });
    }
  } catch (error) {
    console.error('Manual execution failed:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
