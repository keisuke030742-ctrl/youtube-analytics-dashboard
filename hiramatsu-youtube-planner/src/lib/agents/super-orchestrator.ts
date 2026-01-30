/**
 * Super Orchestrator - 完全自動化システムの統括
 *
 * 「AIを動かすAI」として機能し、以下を自動実行:
 * 1. キーワード戦略AI（30キーワード選定）
 * 2. 並列企画生成（既存Orchestrator × 30回）
 * 3. 優先度ランキング
 * 4. Slack通知
 */

import prisma from '@/lib/prisma';
import { Orchestrator } from './orchestrator';
import { KeywordStrategyAI } from '@/lib/services/keyword-strategy';
import { PriorityRanker } from '@/lib/services/priority-ranker';
import { slackNotify } from '@/lib/services/slack-notify';
import type { LLMProvider } from '@/types/agent';

interface SuperOrchestratorOptions {
  llmProvider?: LLMProvider;
  targetCount?: number;
  strategy?: 'volume_first' | 'untapped' | 'trending' | 'balanced';
  concurrency?: number; // 同時実行数
}

interface SelectedKeyword {
  keyword: string;
  score: number;
  reason: string;
  category?: string | null;
  estimatedVolume: number;
  priority: number;
}

interface BatchResult {
  batchId: string;
  status: 'COMPLETED' | 'PARTIAL' | 'FAILED';
  totalPlans: number;
  completedPlans: number;
  failedPlans: number;
  topPlans: { id: string; title: string | null; keyword: string | null; priorityRank: number }[];
}

export class SuperOrchestrator {
  private llmProvider: LLMProvider;
  private keywordStrategy: KeywordStrategyAI;
  private priorityRanker: PriorityRanker;
  private targetCount: number;
  private strategy: SuperOrchestratorOptions['strategy'];
  private concurrency: number;

  constructor(options: SuperOrchestratorOptions = {}) {
    this.llmProvider = options.llmProvider || 'claude';
    this.targetCount = options.targetCount || 30;
    this.strategy = options.strategy || 'balanced';
    this.concurrency = options.concurrency || 5;
    this.keywordStrategy = new KeywordStrategyAI(this.llmProvider);
    this.priorityRanker = new PriorityRanker(this.llmProvider);
  }

  /**
   * メインエントリポイント: 週次企画生成
   */
  async runWeeklyGeneration(triggeredBy: 'cron' | 'manual' = 'cron'): Promise<BatchResult> {
    // バッチを作成
    const batch = await prisma.autoPlanBatch.create({
      data: {
        triggeredBy,
        targetCount: this.targetCount,
        status: 'RUNNING',
      },
    });

    const startTime = Date.now();

    try {
      // 開始通知
      await slackNotify.notifyBatchStart(batch.id, this.targetCount);
      await this.logExecution(batch.id, 'batch', 'started', 'バッチ開始');

      // Phase 1: キーワード戦略AI
      console.log('[SuperOrchestrator] Phase 1: Keyword Strategy');
      const selectedKeywords = await this.runKeywordStrategy(batch.id);

      if (selectedKeywords.length === 0) {
        throw new Error('キーワードが選定できませんでした');
      }

      // キーワード戦略完了通知
      await slackNotify.notifyStrategyComplete(batch.id, selectedKeywords);

      // Phase 2: 企画生成（並列チャンク処理）
      console.log('[SuperOrchestrator] Phase 2: Plan Generation');
      const projectIds = await this.runPlanGeneration(batch.id, selectedKeywords);

      // Phase 3: 優先度ランキング
      console.log('[SuperOrchestrator] Phase 3: Priority Ranking');
      await this.runPriorityRanking(batch.id, projectIds);

      // バッチ完了
      const updatedBatch = await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          status: projectIds.length === selectedKeywords.length ? 'COMPLETED' : 'PARTIAL',
          completedAt: new Date(),
          totalPlans: selectedKeywords.length,
          completedPlans: projectIds.length,
          failedPlans: selectedKeywords.length - projectIds.length,
        },
        include: {
          projects: {
            orderBy: { priorityRank: 'asc' },
            take: 5,
          },
        },
      });

      // 完了通知
      await slackNotify.notifyBatchComplete({
        id: batch.id,
        triggeredAt: batch.triggeredAt,
        status: updatedBatch.status,
        completedPlans: updatedBatch.completedPlans,
        failedPlans: updatedBatch.failedPlans,
        totalPlans: updatedBatch.totalPlans,
        topPlans: updatedBatch.projects.map((p: { title: string | null; priorityRank: number | null; keyword: string | null }) => ({
          title: p.title || '無題',
          priorityRank: p.priorityRank || 0,
          keyword: p.keyword || '',
        })),
      });

      await this.logExecution(
        batch.id,
        'batch',
        'completed',
        `バッチ完了 (${Date.now() - startTime}ms)`,
        { duration: Date.now() - startTime }
      );

      return {
        batchId: batch.id,
        status: updatedBatch.status as BatchResult['status'],
        totalPlans: updatedBatch.totalPlans,
        completedPlans: updatedBatch.completedPlans,
        failedPlans: updatedBatch.failedPlans,
        topPlans: updatedBatch.projects.map((p: { id: string; title: string | null; keyword: string | null; priorityRank: number | null }) => ({
          id: p.id,
          title: p.title,
          keyword: p.keyword,
          priorityRank: p.priorityRank || 0,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // エラー更新
      await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // エラー通知
      await slackNotify.notifyError(errorMessage, 'SuperOrchestrator.runWeeklyGeneration');

      await this.logExecution(batch.id, 'batch', 'failed', errorMessage);

      throw error;
    }
  }

  /**
   * Phase 1: キーワード戦略AI
   */
  private async runKeywordStrategy(batchId: string): Promise<SelectedKeyword[]> {
    await this.logExecution(batchId, 'keyword_strategy', 'started', 'キーワード戦略開始');

    try {
      // トレンドデータ取得
      const trendData = await this.keywordStrategy.getTrendData();

      // キーワード選定
      const selectedKeywords = await this.keywordStrategy.selectKeywords(
        {
          targetCount: this.targetCount,
          strategy: this.strategy || 'balanced',
          excludeRecentlyUsed: 14, // 14日以内使用を除外
          maxUsageCount: 3, // 3回以上使用したキーワードは除外
          preferUntapped: true,
        },
        trendData
      );

      // 結果を保存
      await this.keywordStrategy.saveStrategyResult(batchId, selectedKeywords);

      await this.logExecution(
        batchId,
        'keyword_strategy',
        'completed',
        `${selectedKeywords.length}件のキーワードを選定`,
        { keywords: selectedKeywords.map(k => k.keyword) }
      );

      return selectedKeywords;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logExecution(batchId, 'keyword_strategy', 'failed', errorMessage);
      throw error;
    }
  }

  /**
   * Phase 2: 企画生成（並列チャンク処理）
   */
  private async runPlanGeneration(
    batchId: string,
    keywords: SelectedKeyword[]
  ): Promise<string[]> {
    await this.logExecution(batchId, 'plan_generation', 'started', '企画生成開始');

    const projectIds: string[] = [];
    let completed = 0;
    let failed = 0;

    // チャンク処理（同時実行数を制限）
    for (let i = 0; i < keywords.length; i += this.concurrency) {
      const chunk = keywords.slice(i, i + this.concurrency);

      // 並列実行
      const results = await Promise.allSettled(
        chunk.map(kw => this.generateSinglePlan(batchId, kw))
      );

      // 結果収集
      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          projectIds.push(result.value);
          completed++;
        } else {
          failed++;
          if (result.status === 'rejected') {
            console.error('[SuperOrchestrator] Plan generation failed:', result.reason);
          }
        }
      }

      // 進捗を更新
      await prisma.autoPlanBatch.update({
        where: { id: batchId },
        data: {
          completedPlans: completed,
          failedPlans: failed,
        },
      });

      // 進捗通知（10件ごと）
      if (completed > 0 && completed % 10 === 0) {
        const latestProject = await prisma.project.findFirst({
          where: { id: projectIds[projectIds.length - 1] },
        });

        await slackNotify.notifyProgress(
          batchId,
          completed,
          keywords.length,
          latestProject?.title || undefined
        );
      }

      // 次のチャンクとの間に少し待機（レート制限対策）
      if (i + this.concurrency < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    await this.logExecution(
      batchId,
      'plan_generation',
      completed > 0 ? 'completed' : 'failed',
      `${completed}/${keywords.length}件の企画を生成`,
      { completed, failed }
    );

    return projectIds;
  }

  /**
   * 単一企画生成（Phase 1のみ実行）
   */
  private async generateSinglePlan(
    batchId: string,
    keyword: SelectedKeyword
  ): Promise<string | null> {
    try {
      // プロジェクトを作成
      const project = await prisma.project.create({
        data: {
          userInstruction: this.buildInstruction(keyword),
          keyword: keyword.keyword,
          status: 'IN_PROGRESS',
          batchId,
        },
      });

      // Orchestrator で Phase 1 を実行
      const orchestrator = new Orchestrator(this.llmProvider);

      const phase1Result = await orchestrator.runPhase1(
        this.buildInstruction(keyword),
        async (phase, step, stepName) => {
          // 実行ログを記録
          await prisma.execution.create({
            data: {
              projectId: project.id,
              phase,
              step,
              agentName: stepName,
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
        }
      );

      // 結果を保存
      await prisma.project.update({
        where: { id: project.id },
        data: {
          status: 'COMPLETED',
          phase1Result: phase1Result,
          title: (phase1Result.purpose as { title?: string })?.title || keyword.keyword,
        },
      });

      return project.id;
    } catch (error) {
      console.error(`[SuperOrchestrator] Failed to generate plan for "${keyword.keyword}":`, error);
      return null;
    }
  }

  /**
   * Phase 3: 優先度ランキング
   */
  private async runPriorityRanking(
    batchId: string,
    projectIds: string[]
  ): Promise<void> {
    if (projectIds.length === 0) {
      return;
    }

    await this.logExecution(batchId, 'priority_ranking', 'started', '優先度ランキング開始');

    try {
      const rankedPlans = await this.priorityRanker.rankPlans(projectIds, {
        useLLM: true, // LLMで最終調整
      });

      await this.priorityRanker.saveRankingResult(batchId, rankedPlans);

      await this.logExecution(
        batchId,
        'priority_ranking',
        'completed',
        `${rankedPlans.length}件をランキング`,
        { topPlan: rankedPlans[0]?.title }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logExecution(batchId, 'priority_ranking', 'failed', errorMessage);
      // ランキング失敗は致命的ではないので続行
    }
  }

  /**
   * キーワードから指示文を生成
   */
  private buildInstruction(keyword: SelectedKeyword): string {
    return `
【自動生成企画】

キーワード: ${keyword.keyword}
カテゴリ: ${keyword.category || '未分類'}
選定理由: ${keyword.reason}
推定検索ボリューム: 月間${keyword.estimatedVolume.toLocaleString()}回
優先度: ${keyword.priority}位

---

上記のキーワードに基づいて、平松建築のYouTubeチャンネルにふさわしい企画を立案してください。

ターゲット視聴者:
- 住宅建築を検討している30-50代の家庭
- 特に高気密高断熱住宅、太陽光発電、省エネ住宅に興味がある層
- 「失敗したくない」「正しい情報を知りたい」という動機で検索している

チャンネルの特徴:
- 平松社長が建築のプロ目線で本音で語るスタイル
- 業界の裏話や、他では聞けない情報が人気
- 視聴者との信頼関係を大切にしている
`.trim();
  }

  /**
   * 実行ログを記録
   */
  private async logExecution(
    batchId: string,
    phase: string,
    status: 'started' | 'completed' | 'failed',
    action: string,
    output?: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.autoExecutionLog.create({
        data: {
          batchId,
          phase,
          action,
          status,
          startedAt: new Date(),
          completedAt: status !== 'started' ? new Date() : undefined,
          output: output ? JSON.parse(JSON.stringify(output)) : undefined,
        },
      });
    } catch (error) {
      console.error('[SuperOrchestrator] Failed to log execution:', error);
    }
  }

  /**
   * 手動で特定のキーワードリストから企画生成
   */
  async runWithKeywords(
    keywords: string[],
    triggeredBy: 'manual' = 'manual'
  ): Promise<BatchResult> {
    // キーワードをSelectedKeyword形式に変換
    const selectedKeywords: SelectedKeyword[] = keywords.map((kw, i) => ({
      keyword: kw,
      score: 100 - i,
      reason: '手動指定',
      category: null,
      estimatedVolume: 0,
      priority: i + 1,
    }));

    // バッチを作成
    const batch = await prisma.autoPlanBatch.create({
      data: {
        triggeredBy,
        targetCount: keywords.length,
        status: 'RUNNING',
        selectedKeywords: keywords,
      },
    });

    try {
      await slackNotify.notifyBatchStart(batch.id, keywords.length);

      const projectIds = await this.runPlanGeneration(batch.id, selectedKeywords);
      await this.runPriorityRanking(batch.id, projectIds);

      const updatedBatch = await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: {
          status: projectIds.length === keywords.length ? 'COMPLETED' : 'PARTIAL',
          completedAt: new Date(),
          totalPlans: keywords.length,
          completedPlans: projectIds.length,
          failedPlans: keywords.length - projectIds.length,
        },
        include: {
          projects: {
            orderBy: { priorityRank: 'asc' },
            take: 5,
          },
        },
      });

      await slackNotify.notifyBatchComplete({
        id: batch.id,
        triggeredAt: batch.triggeredAt,
        status: updatedBatch.status,
        completedPlans: updatedBatch.completedPlans,
        failedPlans: updatedBatch.failedPlans,
        totalPlans: updatedBatch.totalPlans,
        topPlans: updatedBatch.projects.map((p: { title: string | null; priorityRank: number | null; keyword: string | null }) => ({
          title: p.title || '無題',
          priorityRank: p.priorityRank || 0,
          keyword: p.keyword || '',
        })),
      });

      return {
        batchId: batch.id,
        status: updatedBatch.status as BatchResult['status'],
        totalPlans: updatedBatch.totalPlans,
        completedPlans: updatedBatch.completedPlans,
        failedPlans: updatedBatch.failedPlans,
        topPlans: updatedBatch.projects.map((p: { id: string; title: string | null; keyword: string | null; priorityRank: number | null }) => ({
          id: p.id,
          title: p.title,
          keyword: p.keyword,
          priorityRank: p.priorityRank || 0,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await prisma.autoPlanBatch.update({
        where: { id: batch.id },
        data: { status: 'FAILED', error: errorMessage },
      });
      await slackNotify.notifyError(errorMessage, 'SuperOrchestrator.runWithKeywords');
      throw error;
    }
  }
}

// デフォルトエクスポート
export const superOrchestrator = new SuperOrchestrator();
