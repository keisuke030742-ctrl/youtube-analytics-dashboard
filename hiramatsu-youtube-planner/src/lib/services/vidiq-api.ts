/**
 * vidIQ API Service
 * vidIQ Pro/Boost APIを使ってキーワードデータを取得
 *
 * Note: vidIQの公式APIは限定的なので、主にスクレイピング代替として
 * 手動同期やCSVインポートも併用することを想定
 */

import prisma from '@/lib/prisma';

const VIDIQ_API_KEY = process.env.VIDIQ_API_KEY || '';

export interface VidIQKeywordData {
  keyword: string;
  searchVolume: number;
  competition: number; // 0-1
  overallScore: number; // 0-100
  trend: 'rising' | 'stable' | 'declining';
  relatedKeywords?: string[];
}

export interface VidIQSearchResult {
  keywords: VidIQKeywordData[];
  totalResults: number;
  timestamp: Date;
}

export class VidIQApiService {
  private apiKey: string;

  constructor() {
    this.apiKey = VIDIQ_API_KEY;
  }

  /**
   * APIキーが設定されているか確認
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * キーワードのスコア・ボリュームを取得
   * Note: vidIQの実際のAPIエンドポイントに合わせて調整が必要
   */
  async getKeywordData(keyword: string): Promise<VidIQKeywordData | null> {
    if (!this.isConfigured()) {
      console.warn('vidIQ API not configured, using mock data');
      return this.getMockKeywordData(keyword);
    }

    try {
      // vidIQ APIの実際のエンドポイント（要調整）
      // vidIQはブラウザ拡張機能ベースのため、APIアクセスは限定的
      // ここでは代替としてYouTube Data APIベースの推定を使用
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(keyword)}&type=video&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      const totalResults = data.pageInfo?.totalResults || 0;

      // 競合度を推定（結果数ベース）
      const competition = Math.min(totalResults / 1000000, 1);

      // トレンドを推定（簡易版）
      const trend = this.estimateTrend(keyword);

      // スコアを計算（vidIQ風）
      const overallScore = this.calculateScore(totalResults, competition);

      return {
        keyword,
        searchVolume: this.estimateSearchVolume(totalResults),
        competition,
        overallScore,
        trend,
        relatedKeywords: [],
      };
    } catch (error) {
      console.error('vidIQ API error:', error);
      return this.getMockKeywordData(keyword);
    }
  }

  /**
   * 複数キーワードのデータを一括取得
   */
  async getBulkKeywordData(keywords: string[]): Promise<VidIQKeywordData[]> {
    const results: VidIQKeywordData[] = [];

    // 並列処理（5並列に制限）
    const CONCURRENT_LIMIT = 5;
    for (let i = 0; i < keywords.length; i += CONCURRENT_LIMIT) {
      const batch = keywords.slice(i, i + CONCURRENT_LIMIT);
      const batchResults = await Promise.allSettled(
        batch.map(kw => this.getKeywordData(kw))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }

      // レート制限対策
      if (i + CONCURRENT_LIMIT < keywords.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * DBにキーワードデータを同期
   */
  async syncToDatabase(keywordData: VidIQKeywordData[]): Promise<number> {
    let synced = 0;

    for (const data of keywordData) {
      try {
        await prisma.vidIQKeyword.upsert({
          where: { keyword: data.keyword },
          create: {
            keyword: data.keyword,
            searchVolume: data.searchVolume,
            competition: data.competition,
            overallScore: data.overallScore,
            trend: data.trend,
            relatedKeywords: data.relatedKeywords || [],
            syncedAt: new Date(),
          },
          update: {
            searchVolume: data.searchVolume,
            competition: data.competition,
            overallScore: data.overallScore,
            trend: data.trend,
            relatedKeywords: data.relatedKeywords || [],
            syncedAt: new Date(),
          },
        });

        // Keywordテーブルにも反映
        await prisma.keyword.updateMany({
          where: { keyword: data.keyword },
          data: {
            vidiqScore: data.overallScore,
            trend: data.trend,
            lastTrendCheck: new Date(),
          },
        });

        synced++;
      } catch (error) {
        console.error(`Failed to sync keyword: ${data.keyword}`, error);
      }
    }

    return synced;
  }

  /**
   * CSVからキーワードデータをインポート
   * vidIQからエクスポートしたCSVを手動でインポートする用
   */
  async importFromCSV(csvContent: string): Promise<number> {
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    const keywordIdx = headers.findIndex(h => h.includes('keyword'));
    const volumeIdx = headers.findIndex(h => h.includes('volume') || h.includes('search'));
    const scoreIdx = headers.findIndex(h => h.includes('score') || h.includes('vidiq'));
    const competitionIdx = headers.findIndex(h => h.includes('competition') || h.includes('comp'));

    const keywordData: VidIQKeywordData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

      if (keywordIdx >= 0 && values[keywordIdx]) {
        keywordData.push({
          keyword: values[keywordIdx],
          searchVolume: volumeIdx >= 0 ? parseInt(values[volumeIdx]) || 0 : 0,
          competition: competitionIdx >= 0 ? parseFloat(values[competitionIdx]) || 0 : 0,
          overallScore: scoreIdx >= 0 ? parseInt(values[scoreIdx]) || 0 : 50,
          trend: 'stable',
        });
      }
    }

    return this.syncToDatabase(keywordData);
  }

  /**
   * DBからトップキーワードを取得
   */
  async getTopKeywords(limit: number = 30): Promise<VidIQKeywordData[]> {
    const keywords = await prisma.vidIQKeyword.findMany({
      orderBy: [
        { overallScore: 'desc' },
        { searchVolume: 'desc' },
      ],
      take: limit,
    });

    return keywords.map(k => ({
      keyword: k.keyword,
      searchVolume: k.searchVolume || 0,
      competition: k.competition || 0,
      overallScore: k.overallScore || 0,
      trend: (k.trend as 'rising' | 'stable' | 'declining') || 'stable',
      relatedKeywords: (k.relatedKeywords as string[]) || [],
    }));
  }

  // ===== Private helper methods =====

  private getMockKeywordData(keyword: string): VidIQKeywordData {
    // 実際のAPIがない場合のモックデータ
    return {
      keyword,
      searchVolume: Math.floor(Math.random() * 50000) + 1000,
      competition: Math.random() * 0.8,
      overallScore: Math.floor(Math.random() * 60) + 40,
      trend: ['rising', 'stable', 'declining'][Math.floor(Math.random() * 3)] as 'rising' | 'stable' | 'declining',
      relatedKeywords: [],
    };
  }

  private estimateSearchVolume(totalResults: number): number {
    // YouTube検索結果数から月間検索ボリュームを推定
    // これは非常に簡易的な推定
    if (totalResults > 10000000) return 100000;
    if (totalResults > 1000000) return 50000;
    if (totalResults > 100000) return 10000;
    if (totalResults > 10000) return 5000;
    return Math.max(1000, totalResults / 10);
  }

  private estimateTrend(keyword: string): 'rising' | 'stable' | 'declining' {
    // トレンドの簡易推定（実際はGoogle Trendsなどを使うべき）
    const risingKeywords = ['2024', '2025', '最新', '新築', 'コスパ'];
    const decliningKeywords = ['2022', '2021', '古い'];

    if (risingKeywords.some(k => keyword.includes(k))) return 'rising';
    if (decliningKeywords.some(k => keyword.includes(k))) return 'declining';
    return 'stable';
  }

  private calculateScore(totalResults: number, competition: number): number {
    // vidIQ風スコア計算
    // 高ボリューム・低競合が高スコア
    const volumeScore = Math.min(totalResults / 100000, 50);
    const competitionScore = (1 - competition) * 50;
    return Math.round(volumeScore + competitionScore);
  }
}

// シングルトンインスタンス
export const vidiqApi = new VidIQApiService();
