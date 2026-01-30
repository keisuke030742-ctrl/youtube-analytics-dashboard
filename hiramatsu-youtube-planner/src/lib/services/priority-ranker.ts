/**
 * Priority Ranker Service
 * 生成された企画を優先度でランキング
 *
 * 評価基準:
 * - キーワードボリューム (25%)
 * - トレンド適合度 (20%)
 * - ユニーク性 (20%)
 * - 競合ギャップ (20%)
 * - チャンネル適合度 (15%)
 */

import prisma from '@/lib/prisma';
import { createLLMClient } from '@/lib/llm/llm-factory';
import type { LLMProvider } from '@/types/agent';

interface PriorityFactor {
  name: string;
  score: number;
  weight: number;
  description: string;
}

interface RankedPlan {
  id: string;
  title: string | null;
  keyword: string | null;
  score: number;
  rank: number;
  factors: PriorityFactor[];
  estimatedViews?: number;
}

interface RankingCriteria {
  name: string;
  weight: number;
}

interface RankingOptions {
  criteria?: RankingCriteria[];
  useLLM?: boolean;
}

export class PriorityRanker {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider = 'claude') {
    this.llmProvider = llmProvider;
  }

  /**
   * 企画をランキング
   */
  async rankPlans(
    projectIds: string[],
    options: RankingOptions = {}
  ): Promise<RankedPlan[]> {
    const criteria = options.criteria || [
      { name: 'keyword_volume', weight: 0.25 },
      { name: 'trend_alignment', weight: 0.20 },
      { name: 'uniqueness', weight: 0.20 },
      { name: 'competition_gap', weight: 0.20 },
      { name: 'channel_fit', weight: 0.15 },
    ];

    // プロジェクトデータを取得
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      include: {
        executions: {
          where: { phase: 1 },
          orderBy: { step: 'asc' },
        },
      },
    });

    // 各プロジェクトをスコアリング
    const scored: RankedPlan[] = await Promise.all(
      projects.map(async project => {
        const factors = await this.calculateFactors(project, criteria);
        const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

        return {
          id: project.id,
          title: project.title,
          keyword: project.keyword,
          score: totalScore,
          rank: 0,
          factors,
          estimatedViews: this.estimateViews(totalScore),
        };
      })
    );

    // スコア順にソート
    scored.sort((a, b) => b.score - a.score);

    // ランク付け
    scored.forEach((plan, index) => {
      plan.rank = index + 1;
    });

    // LLMで最終調整（オプション）
    if (options.useLLM && scored.length > 5) {
      return this.llmRerank(scored);
    }

    return scored;
  }

  /**
   * 各評価基準のスコアを計算
   */
  private async calculateFactors(
    project: {
      id: string;
      keyword: string | null;
      phase1Result: unknown;
    },
    criteria: RankingCriteria[]
  ): Promise<PriorityFactor[]> {
    const factors: PriorityFactor[] = [];

    for (const criterion of criteria) {
      const factor = await this.calculateSingleFactor(project, criterion.name);
      factors.push({
        ...factor,
        weight: criterion.weight,
      });
    }

    return factors;
  }

  /**
   * 単一要因のスコアを計算
   */
  private async calculateSingleFactor(
    project: {
      id: string;
      keyword: string | null;
      phase1Result: unknown;
    },
    factorName: string
  ): Promise<Omit<PriorityFactor, 'weight'>> {
    switch (factorName) {
      case 'keyword_volume': {
        // キーワードの検索ボリュームを取得
        if (!project.keyword) {
          return { name: factorName, score: 50, description: 'キーワードなし' };
        }

        const keyword = await prisma.keyword.findUnique({
          where: { keyword: project.keyword },
        });

        if (!keyword || !keyword.volume) {
          return { name: factorName, score: 50, description: 'ボリューム不明' };
        }

        // ボリュームをスコアに変換（対数スケール）
        const score = Math.min(100, Math.log10(keyword.volume + 1) * 25);
        return {
          name: factorName,
          score,
          description: `月間${keyword.volume.toLocaleString()}回`,
        };
      }

      case 'trend_alignment': {
        // トレンドとの適合度
        if (!project.keyword) {
          return { name: factorName, score: 50, description: 'キーワードなし' };
        }

        const keyword = await prisma.keyword.findUnique({
          where: { keyword: project.keyword },
        });

        const trendScores: Record<string, number> = {
          rising: 100,
          stable: 60,
          declining: 20,
        };

        const score = trendScores[keyword?.trend || 'stable'] || 60;
        return {
          name: factorName,
          score,
          description: keyword?.trend || 'stable',
        };
      }

      case 'uniqueness': {
        // 過去の企画との重複チェック
        if (!project.keyword) {
          return { name: factorName, score: 50, description: 'キーワードなし' };
        }

        // 同じキーワードの過去企画数
        const pastCount = await prisma.project.count({
          where: {
            keyword: project.keyword,
            id: { not: project.id },
            status: 'COMPLETED',
          },
        });

        // 過去になければ高スコア
        const score = Math.max(0, 100 - pastCount * 20);
        return {
          name: factorName,
          score,
          description: pastCount === 0 ? '初めての企画' : `過去${pastCount}件`,
        };
      }

      case 'competition_gap': {
        // 競合との差別化ポイント
        const phase1Result = project.phase1Result as {
          differentiation?: { uniquePoints?: string[] };
        } | null;

        if (!phase1Result?.differentiation?.uniquePoints) {
          return { name: factorName, score: 50, description: '分析なし' };
        }

        const uniquePoints = phase1Result.differentiation.uniquePoints;
        const score = Math.min(100, uniquePoints.length * 25);
        return {
          name: factorName,
          score,
          description: `${uniquePoints.length}個の差別化ポイント`,
        };
      }

      case 'channel_fit': {
        // チャンネルとの適合度（Phase1の分析結果を使用）
        const phase1Result = project.phase1Result as {
          purpose?: { alignment?: number };
        } | null;

        const alignment = phase1Result?.purpose?.alignment || 70;
        return {
          name: factorName,
          score: alignment,
          description: `適合度${alignment}%`,
        };
      }

      default:
        return { name: factorName, score: 50, description: '不明' };
    }
  }

  /**
   * LLMで再ランキング
   */
  private async llmRerank(plans: RankedPlan[]): Promise<RankedPlan[]> {
    const llm = createLLMClient(this.llmProvider);

    const prompt = `
あなたはYouTube企画の優先度評価エキスパートです。
以下の企画一覧を、「今すぐ制作すべき順」に並び替えてください。

## 評価の観点
1. **即時性**: 今の時期・トレンドに合っているか
2. **視聴者ニーズ**: 強い需要があるか
3. **差別化**: 競合との差別化ができているか
4. **制作効率**: すぐに制作に取り掛かれるか

## 現在のランキング
${plans.slice(0, 15).map((p, i) => `${i + 1}. "${p.title || p.keyword}" (スコア: ${p.score.toFixed(1)})`).join('\n')}

## 出力形式
上位10件のIDを優先順に出力してください。
\`\`\`json
{
  "ranking": ["id1", "id2", "id3", ...]
}
\`\`\`
`;

    try {
      const response = await llm.generate(prompt);

      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        return plans;
      }

      const parsed = JSON.parse(jsonMatch[1]);
      const newRanking = parsed.ranking as string[];

      // 新しい順序で再構成
      const reranked: RankedPlan[] = [];
      let rank = 1;

      for (const id of newRanking) {
        const plan = plans.find(p => p.id === id);
        if (plan) {
          reranked.push({ ...plan, rank });
          rank++;
        }
      }

      // LLMが選ばなかった企画を追加
      for (const plan of plans) {
        if (!reranked.find(r => r.id === plan.id)) {
          reranked.push({ ...plan, rank });
          rank++;
        }
      }

      return reranked;
    } catch (error) {
      console.error('LLM reranking failed:', error);
      return plans;
    }
  }

  /**
   * スコアから推定視聴回数を計算
   */
  private estimateViews(score: number): number {
    // スコア100で10万回、スコア50で1万回程度を想定
    const baseViews = 1000;
    const multiplier = Math.pow(10, score / 50);
    return Math.round(baseViews * multiplier);
  }

  /**
   * ランキング結果をDBに保存
   */
  async saveRankingResult(
    batchId: string,
    rankedPlans: RankedPlan[]
  ): Promise<void> {
    // バッチにランキング結果を保存
    await prisma.autoPlanBatch.update({
      where: { id: batchId },
      data: {
        rankingPhaseResult: rankedPlans.map(p => ({
          projectId: p.id,
          rank: p.rank,
          score: p.score,
        })),
      },
    });

    // 各プロジェクトに優先度情報を保存
    for (const plan of rankedPlans) {
      await prisma.project.update({
        where: { id: plan.id },
        data: {
          priorityRank: plan.rank,
          priorityScore: plan.score,
          priorityFactors: JSON.parse(JSON.stringify(plan.factors)),
          estimatedViews: plan.estimatedViews,
        },
      });
    }
  }
}

// シングルトンインスタンス
export const priorityRanker = new PriorityRanker();
