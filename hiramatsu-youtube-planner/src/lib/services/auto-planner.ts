/**
 * Auto Planner Service
 * 週次の自動企画生成を統括するオーケストレーションサービス
 */

import prisma from '@/lib/prisma';
import { Orchestrator } from '@/lib/agents/orchestrator';
import { youtubeAnalytics } from './youtube-analytics';
import { discordNotify } from './discord-notify';
import type { Keyword, AutoPlanBatch, Project, BatchStatus } from '@prisma/client';
import type { TrendData, SelectedKeyword, BatchRunOptions } from '@/types/batch';

// 最大同時実行数
const MAX_CONCURRENT = 3;

// 進捗通知の間隔（件数）
const PROGRESS_NOTIFY_INTERVAL = 10;

export class AutoPlannerService {
  private llmProvider: 'claude' | 'openai';

  constructor(llmProvider: 'claude' | 'openai' = 'claude') {
    this.llmProvider = llmProvider;
  }

  /**
   * キーワード選定ロジック
   * ボリューム順、使用回数が少ない順で優先
   */
  async selectKeywords(
    count: number,
    options: BatchRunOptions = {}
  ): Promise<Keyword[]> {
    const {
      minVolume,
      maxUsageCount,
      includeCategories,
      excludeCategories,
    } = options;

    const where: any = {
      isActive: true,
    };

    if (minVolume) {
      where.volume = { gte: minVolume };
    }

    if (maxUsageCount !== undefined) {
      where.usageCount = { lte: maxUsageCount };
    }

    if (includeCategories && includeCategories.length > 0) {
      where.category = { in: includeCategories };
    }

    if (excludeCategories && excludeCategories.length > 0) {
      where.NOT = { category: { in: excludeCategories } };
    }

    // スコアリング: 使用回数が少なく、ボリュームが高いものを優先
    const keywords = await prisma.keyword.findMany({
      where,
      orderBy: [
        { usageCount: 'asc' },
        { volume: 'desc' },
        { priority: 'desc' },
        { lastUsedAt: 'asc' },
      ],
      take: count,
    });

    return keywords;
  }

  /**
   * トレンドデータを取得
   */
  async analyzeTrends(): Promise<TrendData | null> {
    if (!youtubeAnalytics.isConfigured()) {
      console.log('YouTube Analytics not configured, skipping trend analysis');
      return null;
    }

    try {
      return await youtubeAnalytics.getTrendData();
    } catch (error) {
      console.error('Failed to analyze trends:', error);
      return null;
    }
  }

  /**
   * キーワードにスコアを付与
   */
  scoreKeywords(
    keywords: Keyword[],
    trendData: TrendData | null
  ): SelectedKeyword[] {
    // トレンドキーワードを抽出
    const trendKeywords = new Set<string>();
    if (trendData) {
      // 自チャンネルのタグ
      trendData.channelTrends.forEach((trend) => {
        trend.tags?.forEach((tag) => trendKeywords.add(tag.toLowerCase()));
      });
      // 競合のキーワード
      trendData.competitorTrends.forEach((comp) => {
        comp.topPerformingKeywords?.forEach((kw) =>
          trendKeywords.add(kw.toLowerCase())
        );
      });
    }

    return keywords.map((kw) => {
      let score = 0;
      let reasons: string[] = [];

      // ボリュームスコア（40%）
      if (kw.volume) {
        const volumeScore = Math.min(kw.volume / 10000, 1) * 40;
        score += volumeScore;
        if (kw.volume >= 5000) {
          reasons.push(`高ボリューム(${kw.volume})`);
        }
      }

      // 使用回数スコア（30%）
      const usageScore = Math.max(0, 30 - kw.usageCount * 10);
      score += usageScore;
      if (kw.usageCount === 0) {
        reasons.push('未使用');
      } else if (kw.usageCount <= 2) {
        reasons.push(`使用回数少(${kw.usageCount}回)`);
      }

      // 最終使用日スコア（20%）
      if (kw.lastUsedAt) {
        const daysSinceLastUsed =
          (Date.now() - kw.lastUsedAt.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.min(daysSinceLastUsed / 30, 1) * 20;
        score += recencyScore;
        if (daysSinceLastUsed >= 30) {
          reasons.push('30日以上未使用');
        }
      } else {
        score += 20;
      }

      // トレンドボーナス（+10%）
      if (trendKeywords.has(kw.keyword.toLowerCase())) {
        score += 10;
        reasons.push('トレンド');
      }

      // 優先度ボーナス
      score += kw.priority * 2;
      if (kw.priority >= 5) {
        reasons.push('高優先度');
      }

      return {
        id: kw.id,
        keyword: kw.keyword,
        volume: kw.volume ?? undefined,
        score: Math.round(score * 100) / 100,
        reason: reasons.join(', ') || '通常選定',
      };
    });
  }

  /**
   * 単一の企画を生成
   */
  async generateSinglePlan(
    keyword: string,
    batchId: string,
    trendContext?: string
  ): Promise<Project | null> {
    try {
      // プロジェクト作成
      const project = await prisma.project.create({
        data: {
          userInstruction: `キーワード「${keyword}」で平松建築のYouTube動画企画を作成してください。${trendContext || ''}`,
          keyword,
          status: 'IN_PROGRESS',
          batchId,
        },
      });

      // Orchestratorで Phase 1 のみ実行（企画立案）
      const orchestrator = new Orchestrator(this.llmProvider);

      try {
        const phase1Result = await orchestrator.runPhase1(
          project.userInstruction,
          (phase, step, stepName) => {
            // 実行ログを記録
            prisma.execution.create({
              data: {
                projectId: project.id,
                phase,
                step,
                agentName: stepName,
                status: 'RUNNING',
              },
            }).catch(console.error);
          }
        );

        // プロジェクトを更新
        const updatedProject = await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'DRAFT', // Phase1完了後はDRAFTに（後で人間がレビュー）
            phase1Result: phase1Result,
            title: phase1Result.seo_keyword?.title || null,
            keyword: phase1Result.seo_keyword?.keyword || keyword,
          },
        });

        return updatedProject;
      } catch (error) {
        // エラー時はプロジェクトをFAILEDに
        await prisma.project.update({
          where: { id: project.id },
          data: {
            status: 'FAILED',
          },
        });
        throw error;
      }
    } catch (error) {
      console.error(`Failed to generate plan for keyword "${keyword}":`, error);
      return null;
    }
  }

  /**
   * 並列で企画を生成
   */
  async generatePlansParallel(
    keywords: SelectedKeyword[],
    batchId: string,
    trendContext?: string,
    onProgress?: (completed: number, total: number, latest?: Project) => void
  ): Promise<{ success: Project[]; failed: string[] }> {
    const success: Project[] = [];
    const failed: string[] = [];
    let completed = 0;

    // 並列処理用のキュー
    const queue = [...keywords];
    const running: Promise<void>[] = [];

    const processNext = async () => {
      const kw = queue.shift();
      if (!kw) return;

      try {
        const project = await this.generateSinglePlan(
          kw.keyword,
          batchId,
          trendContext
        );

        if (project) {
          success.push(project);

          // キーワードの使用回数を更新
          await prisma.keyword.update({
            where: { id: kw.id },
            data: {
              usageCount: { increment: 1 },
              lastUsedAt: new Date(),
            },
          });
        } else {
          failed.push(kw.keyword);
        }
      } catch {
        failed.push(kw.keyword);
      }

      completed++;
      onProgress?.(completed, keywords.length, success[success.length - 1]);
    };

    // 最大同時実行数で並列処理
    while (queue.length > 0 || running.length > 0) {
      // 空きがあれば新しいタスクを開始
      while (running.length < MAX_CONCURRENT && queue.length > 0) {
        const task = processNext();
        running.push(task);
        task.finally(() => {
          const index = running.indexOf(task);
          if (index > -1) running.splice(index, 1);
        });
      }

      // いずれかのタスクが完了するのを待つ
      if (running.length > 0) {
        await Promise.race(running);
      }
    }

    return { success, failed };
  }

  /**
   * バッチ実行のメインエントリポイント
   */
  async runBatch(
    triggeredBy: 'cron' | 'manual' = 'manual',
    options: BatchRunOptions = {}
  ): Promise<AutoPlanBatch> {
    const targetCount = options.targetCount ?? 30;

    // 既に実行中のバッチがあるかチェック
    const runningBatch = await prisma.autoPlanBatch.findFirst({
      where: { status: 'RUNNING' },
    });

    if (runningBatch) {
      throw new Error('別のバッチが実行中です。完了するまでお待ちください。');
    }

    // バッチを作成
    const batch = await prisma.autoPlanBatch.create({
      data: {
        triggeredBy,
        targetCount,
        status: 'RUNNING',
      },
    });

    try {
      // 開始通知
      if (discordNotify.isConfigured()) {
        await discordNotify.notifyBatchStart(targetCount);
      }

      // トレンド分析
      console.log('Analyzing trends...');
      const trendData = options.skipTrendAnalysis
        ? null
        : await this.analyzeTrends();

      // キーワード選定
      console.log('Selecting keywords...');
      const keywords = await this.selectKeywords(targetCount, options);

      if (keywords.length === 0) {
        throw new Error('選定可能なキーワードがありません。キーワードを追加してください。');
      }

      // キーワードにスコアを付与
      const scoredKeywords = this.scoreKeywords(keywords, trendData);
      scoredKeywords.sort((a, b) => b.score - a.score);

      // バッチを更新
      await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          trendData: trendData as any,
          selectedKeywords: scoredKeywords as any,
          totalPlans: scoredKeywords.length,
        },
      });

      // トレンドコンテキストを生成
      let trendContext = '';
      if (trendData) {
        const topTrends = trendData.channelTrends.slice(0, 5);
        if (topTrends.length > 0) {
          trendContext = `\n\n最近の人気動画傾向: ${topTrends.map((t) => t.title).join(', ')}`;
        }
      }

      // 企画を並列生成
      console.log(`Generating ${scoredKeywords.length} plans...`);
      const { success, failed } = await this.generatePlansParallel(
        scoredKeywords,
        batch.id,
        trendContext,
        async (completed, total, latest) => {
          // 定期的にバッチ進捗を更新
          await prisma.autoPlanBatch.update({
            where: { id: batch.id },
            data: {
              completedPlans: completed - failed.length,
              failedPlans: failed.length,
            },
          });

          // 進捗通知（10件ごと）
          if (
            completed % PROGRESS_NOTIFY_INTERVAL === 0 &&
            discordNotify.isConfigured()
          ) {
            await discordNotify.notifyProgress(completed, total, latest?.title ?? undefined);
          }
        }
      );

      // 最終ステータスを決定
      let finalStatus: BatchStatus;
      if (failed.length === 0) {
        finalStatus = 'COMPLETED';
      } else if (success.length === 0) {
        finalStatus = 'FAILED';
      } else {
        finalStatus = 'PARTIAL';
      }

      // バッチを完了
      const completedBatch = await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          status: finalStatus,
          completedPlans: success.length,
          failedPlans: failed.length,
          completedAt: new Date(),
          error: failed.length > 0 ? `失敗したキーワード: ${failed.join(', ')}` : null,
        },
      });

      // 完了通知
      if (discordNotify.isConfigured()) {
        await discordNotify.notifyBatchComplete({
          id: completedBatch.id,
          triggeredAt: completedBatch.triggeredAt,
          status: completedBatch.status,
          completedPlans: completedBatch.completedPlans,
          failedPlans: completedBatch.failedPlans,
          totalPlans: completedBatch.totalPlans,
        });
      }

      console.log(
        `Batch completed: ${success.length} success, ${failed.length} failed`
      );

      return completedBatch;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // エラー時のバッチ更新
      const failedBatch = await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // エラー通知
      if (discordNotify.isConfigured()) {
        await discordNotify.notifyError(errorMessage, 'AutoPlanner.runBatch');
      }

      throw error;
    }
  }

  /**
   * バッチの進捗を取得
   */
  async getBatchProgress(batchId: string) {
    const batch = await prisma.autoPlanBatch.findUnique({
      where: { id: batchId },
      include: {
        projects: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!batch) return null;

    const progress =
      batch.totalPlans > 0
        ? Math.round(
            ((batch.completedPlans + batch.failedPlans) / batch.totalPlans) * 100
          )
        : 0;

    return {
      batchId: batch.id,
      status: batch.status,
      progress,
      completedPlans: batch.completedPlans,
      failedPlans: batch.failedPlans,
      totalPlans: batch.totalPlans,
      projects: batch.projects,
    };
  }
}

// シングルトンインスタンス
export const autoPlanner = new AutoPlannerService();
