/**
 * Keyword Strategy AI Service
 * キーワード選定戦略を決定するAIサービス
 *
 * ロジック:
 * 1. DB + vidIQ + Analytics からデータ収集
 * 2. スコアリング（ボリューム30% + 未使用25% + トレンド20% + vidIQ15% + 競合10%）
 * 3. LLMで最終30件選定（重複排除、バランス調整）
 */

import prisma from '@/lib/prisma';
import { vidiqApi, VidIQKeywordData } from './vidiq-api';
import { createLLMClient } from '@/lib/llm/llm-factory';
import type { LLMProvider } from '@/types/agent';

interface ScoreFactor {
  name: string;
  value: number;
  weight: number;
  raw: string | number;
}

interface ScoredKeyword {
  id: string;
  keyword: string;
  score: number;
  factors: ScoreFactor[];
  category?: string | null;
  volume?: number | null;
  usageCount: number;
  lastUsedAt?: Date | null;
  vidiqScore?: number | null;
  trend?: string | null;
}

interface SelectedKeyword {
  keyword: string;
  score: number;
  reason: string;
  category?: string | null;
  estimatedVolume: number;
  priority: number;
}

interface StrategyOptions {
  targetCount: number;
  strategy: 'volume_first' | 'untapped' | 'trending' | 'balanced';
  minVolume?: number;
  maxUsageCount?: number;
  excludeRecentlyUsed?: number; // 日数
  preferUntapped?: boolean;
  categories?: string[];
}

interface TrendData {
  channelTopKeywords?: string[];
  competitorTopKeywords?: string[];
  risingKeywords?: string[];
}

export class KeywordStrategyAI {
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider = 'claude') {
    this.llmProvider = llmProvider;
  }

  /**
   * メインエントリポイント: キーワード選定
   */
  async selectKeywords(
    options: StrategyOptions,
    trendData?: TrendData
  ): Promise<SelectedKeyword[]> {
    // 1. 候補キーワードを取得
    const candidates = await this.getCandidates(options);

    if (candidates.length === 0) {
      console.warn('No candidate keywords found');
      return [];
    }

    // 2. スコアリング
    const scored = this.scoreKeywords(candidates, options, trendData);

    // 3. 戦略に基づいてソート
    const sorted = this.sortByStrategy(scored, options.strategy);

    // 4. LLMで最終選定（重複排除、カテゴリバランス）
    const selected = await this.llmFinalSelection(
      sorted,
      options.targetCount,
      trendData
    );

    return selected;
  }

  /**
   * 候補キーワードを取得
   */
  private async getCandidates(options: StrategyOptions): Promise<ScoredKeyword[]> {
    const where: Record<string, unknown> = {
      isActive: true,
    };

    // 最近使用したキーワードを除外
    if (options.excludeRecentlyUsed) {
      const excludeDate = new Date();
      excludeDate.setDate(excludeDate.getDate() - options.excludeRecentlyUsed);
      where.OR = [
        { lastUsedAt: null },
        { lastUsedAt: { lt: excludeDate } },
      ];
    }

    // 使用回数制限
    if (options.maxUsageCount !== undefined) {
      where.usageCount = { lte: options.maxUsageCount };
    }

    // カテゴリフィルター
    if (options.categories && options.categories.length > 0) {
      where.category = { in: options.categories };
    }

    const keywords = await prisma.keyword.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { volume: 'desc' },
      ],
      take: 200, // 候補は多めに取得
    });

    return keywords.map(k => ({
      id: k.id,
      keyword: k.keyword,
      score: 0,
      factors: [],
      category: k.category,
      volume: k.volume,
      usageCount: k.usageCount,
      lastUsedAt: k.lastUsedAt,
      vidiqScore: k.vidiqScore,
      trend: k.trend,
    }));
  }

  /**
   * キーワードをスコアリング
   */
  private scoreKeywords(
    candidates: ScoredKeyword[],
    options: StrategyOptions,
    trendData?: TrendData
  ): ScoredKeyword[] {
    // 最大ボリュームを取得（正規化用）
    const maxVolume = Math.max(...candidates.map(k => k.volume || 0), 1);

    return candidates.map(kw => {
      const factors: ScoreFactor[] = [];
      let totalScore = 0;

      // 1. ボリュームスコア（30%）
      const volumeNormalized = (kw.volume || 0) / maxVolume;
      const volumeScore = volumeNormalized * 30;
      totalScore += volumeScore;
      factors.push({
        name: 'volume',
        value: volumeScore,
        weight: 0.3,
        raw: kw.volume || 0,
      });

      // 2. 未使用ボーナス（25%）
      // 使用回数が少ないほど高スコア
      const usageScore = Math.max(0, 25 - kw.usageCount * 5);
      totalScore += usageScore;
      factors.push({
        name: 'untapped',
        value: usageScore,
        weight: 0.25,
        raw: kw.usageCount,
      });

      // 3. トレンドスコア（20%）
      let trendScore = 10; // デフォルト（stable）
      if (kw.trend === 'rising') {
        trendScore = 20;
      } else if (kw.trend === 'declining') {
        trendScore = 0;
      }
      // トレンドデータにあればボーナス
      if (trendData?.risingKeywords?.some(rk => kw.keyword.includes(rk))) {
        trendScore = Math.min(trendScore + 5, 20);
      }
      totalScore += trendScore;
      factors.push({
        name: 'trend',
        value: trendScore,
        weight: 0.2,
        raw: kw.trend || 'stable',
      });

      // 4. vidIQスコア（15%）
      const vidiqNormalized = (kw.vidiqScore || 50) / 100;
      const vidiqScore = vidiqNormalized * 15;
      totalScore += vidiqScore;
      factors.push({
        name: 'vidiq',
        value: vidiqScore,
        weight: 0.15,
        raw: kw.vidiqScore || 50,
      });

      // 5. 競合ギャップ（10%）
      // 競合が使っていて自分は使っていないキーワード = 狙い目
      let competitorScore = 5; // デフォルト
      if (trendData?.competitorTopKeywords?.some(ck => kw.keyword.includes(ck))) {
        if (kw.usageCount === 0) {
          competitorScore = 10; // 競合が使用中 & 自分は未使用 = 高スコア
        }
      }
      totalScore += competitorScore;
      factors.push({
        name: 'competitor_gap',
        value: competitorScore,
        weight: 0.1,
        raw: 'calculated',
      });

      return {
        ...kw,
        score: totalScore,
        factors,
      };
    });
  }

  /**
   * 戦略に基づいてソート
   */
  private sortByStrategy(
    scored: ScoredKeyword[],
    strategy: StrategyOptions['strategy']
  ): ScoredKeyword[] {
    switch (strategy) {
      case 'volume_first':
        return scored.sort((a, b) => (b.volume || 0) - (a.volume || 0));

      case 'untapped':
        return scored.sort((a, b) => {
          // まず使用回数で並べ、同じなら総合スコアで
          const usageDiff = a.usageCount - b.usageCount;
          if (usageDiff !== 0) return usageDiff;
          return b.score - a.score;
        });

      case 'trending':
        return scored.sort((a, b) => {
          const trendOrder = { rising: 0, stable: 1, declining: 2 };
          const trendDiff =
            (trendOrder[a.trend as keyof typeof trendOrder] || 1) -
            (trendOrder[b.trend as keyof typeof trendOrder] || 1);
          if (trendDiff !== 0) return trendDiff;
          return b.score - a.score;
        });

      case 'balanced':
      default:
        return scored.sort((a, b) => b.score - a.score);
    }
  }

  /**
   * LLMで最終選定
   */
  private async llmFinalSelection(
    sorted: ScoredKeyword[],
    targetCount: number,
    trendData?: TrendData
  ): Promise<SelectedKeyword[]> {
    // 上位候補を取得（targetCountの2倍程度）
    const topCandidates = sorted.slice(0, targetCount * 2);

    if (topCandidates.length <= targetCount) {
      // 候補が少ない場合はそのまま返す
      return topCandidates.map((k, i) => ({
        keyword: k.keyword,
        score: k.score,
        reason: this.generateReason(k.factors),
        category: k.category,
        estimatedVolume: k.volume || 0,
        priority: i + 1,
      }));
    }

    // LLMで最終選定
    const llm = createLLMClient(this.llmProvider);

    const prompt = `
あなたはYouTube企画のキーワード戦略エキスパートです。
以下の候補キーワードから、最適な${targetCount}個を選定してください。

## 選定基準
1. **カテゴリバランス**: 同じカテゴリに偏りすぎない
2. **重複排除**: 類似キーワードは1つに絞る（例: 「新築 間取り」と「間取り 新築」）
3. **視聴者ニーズ多様性**: 異なるニーズ（知識系、比較系、体験系など）をカバー
4. **季節性**: 現在の時期に合ったキーワードを優先

## トレンド情報
${trendData?.risingKeywords?.length ? `上昇トレンド: ${trendData.risingKeywords.slice(0, 10).join(', ')}` : 'トレンド情報なし'}
${trendData?.competitorTopKeywords?.length ? `競合人気: ${trendData.competitorTopKeywords.slice(0, 10).join(', ')}` : ''}

## 候補キーワード
${topCandidates
  .map(
    (k, i) =>
      `${i + 1}. "${k.keyword}" (スコア: ${k.score.toFixed(1)}, カテゴリ: ${k.category || '未分類'}, 使用回数: ${k.usageCount})`
  )
  .join('\n')}

## 出力形式
以下のJSON形式で出力してください。必ず有効なJSONを出力してください。
\`\`\`json
{
  "selected": [
    {
      "keyword": "キーワード",
      "priority": 1,
      "reason": "選定理由（20字以内）"
    }
  ]
}
\`\`\`
`;

    try {
      const response = await llm.generate(prompt);

      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('JSON not found in response');
      }

      const parsed = JSON.parse(jsonMatch[1]);
      const selectedKeywords = parsed.selected as {
        keyword: string;
        priority: number;
        reason: string;
      }[];

      // 選定結果とスコア情報を結合
      return selectedKeywords.slice(0, targetCount).map((sel, i) => {
        const original = topCandidates.find(k => k.keyword === sel.keyword);
        return {
          keyword: sel.keyword,
          score: original?.score || 50,
          reason: sel.reason,
          category: original?.category,
          estimatedVolume: original?.volume || 0,
          priority: sel.priority || i + 1,
        };
      });
    } catch (error) {
      console.error('LLM selection failed, using score-based selection:', error);

      // フォールバック: スコア順で上位を返す
      return sorted.slice(0, targetCount).map((k, i) => ({
        keyword: k.keyword,
        score: k.score,
        reason: this.generateReason(k.factors),
        category: k.category,
        estimatedVolume: k.volume || 0,
        priority: i + 1,
      }));
    }
  }

  /**
   * スコア要因から選定理由を生成
   */
  private generateReason(factors: ScoreFactor[]): string {
    const topFactor = factors.reduce((a, b) => (a.value > b.value ? a : b));

    const reasonMap: Record<string, string> = {
      volume: '検索ボリューム高',
      untapped: '未使用キーワード',
      trend: 'トレンド上昇中',
      vidiq: 'vidIQ高スコア',
      competitor_gap: '競合狙い目',
    };

    return reasonMap[topFactor.name] || 'バランス良好';
  }

  /**
   * トレンドデータを取得
   */
  async getTrendData(): Promise<TrendData> {
    // 最新のTrendSnapshotを取得
    const latestSnapshot = await prisma.trendSnapshot.findFirst({
      orderBy: { capturedAt: 'desc' },
    });

    if (!latestSnapshot) {
      return {};
    }

    return {
      channelTopKeywords: (latestSnapshot.channelData as { keywords?: string[] })?.keywords || [],
      competitorTopKeywords: (latestSnapshot.competitorData as { keywords?: string[] })?.keywords || [],
      risingKeywords: (latestSnapshot.trendKeywords as string[]) || [],
    };
  }

  /**
   * 戦略実行結果をDBに保存
   */
  async saveStrategyResult(
    batchId: string,
    selectedKeywords: SelectedKeyword[]
  ): Promise<void> {
    await prisma.autoPlanBatch.update({
      where: { id: batchId },
      data: {
        strategyPhaseResult: JSON.parse(JSON.stringify(selectedKeywords)),
        selectedKeywords: selectedKeywords.map(k => k.keyword),
      },
    });

    // 使用回数を更新
    for (const kw of selectedKeywords) {
      await prisma.keyword.updateMany({
        where: { keyword: kw.keyword },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date(),
        },
      });
    }
  }
}

// シングルトンインスタンス
export const keywordStrategy = new KeywordStrategyAI();
