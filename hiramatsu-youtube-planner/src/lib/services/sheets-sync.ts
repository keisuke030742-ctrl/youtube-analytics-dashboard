/**
 * Google Sheets Sync Service
 * スプレッドシートとキーワードデータを同期
 */

import type { KeywordImportRow } from '@/types/keyword';
import type { Project } from '@prisma/client';

// Google Sheets API用の型定義
interface SheetRange {
  values: string[][];
}

interface KeywordSheetRow {
  keyword: string;
  volume?: number;
  difficulty?: number;
  category?: string;
}

export class SheetsSyncService {
  private apiKey: string;
  private keywordsSheetId: string;
  private plansExportSheetId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_SHEETS_API_KEY || '';
    this.keywordsSheetId = process.env.KEYWORDS_SHEET_ID || '';
    this.plansExportSheetId = process.env.PLANS_EXPORT_SHEET_ID || '';
  }

  /**
   * 設定が有効かチェック
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.keywordsSheetId;
  }

  /**
   * スプレッドシートからキーワードをインポート
   * 期待するシート形式:
   * | キーワード | ボリューム | 競合度 | カテゴリ |
   */
  async importKeywords(): Promise<KeywordImportRow[]> {
    if (!this.isConfigured()) {
      console.warn('Google Sheets API not configured');
      return [];
    }

    try {
      // シートデータを取得（A:D列を想定）
      const range = 'A2:D1000'; // ヘッダー行をスキップ
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.keywordsSheetId}/values/${range}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const data: SheetRange = await response.json();

      if (!data.values || data.values.length === 0) {
        return [];
      }

      // 行データをパース
      const keywords: KeywordImportRow[] = data.values
        .map((row): KeywordImportRow | null => {
          const keyword = row[0]?.trim();
          if (!keyword) return null;

          return {
            keyword,
            volume: row[1] ? parseInt(row[1], 10) || undefined : undefined,
            difficulty: row[2] ? parseInt(row[2], 10) || undefined : undefined,
            category: row[3]?.trim() || undefined,
          };
        })
        .filter((item): item is KeywordImportRow => item !== null);

      return keywords;
    } catch (error) {
      console.error('Failed to import keywords from sheet:', error);
      return [];
    }
  }

  /**
   * 特定のシート名からキーワードをインポート
   */
  async importKeywordsFromSheet(
    sheetId: string,
    sheetName: string = 'Sheet1'
  ): Promise<KeywordImportRow[]> {
    if (!this.apiKey) {
      console.warn('Google Sheets API key not configured');
      return [];
    }

    try {
      const range = `${sheetName}!A2:D1000`;
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Google Sheets API error: ${response.status}`);
      }

      const data: SheetRange = await response.json();

      if (!data.values || data.values.length === 0) {
        return [];
      }

      const keywords: KeywordImportRow[] = data.values
        .map((row): KeywordImportRow | null => {
          const keyword = row[0]?.trim();
          if (!keyword) return null;

          return {
            keyword,
            volume: row[1] ? parseInt(row[1], 10) || undefined : undefined,
            difficulty: row[2] ? parseInt(row[2], 10) || undefined : undefined,
            category: row[3]?.trim() || undefined,
          };
        })
        .filter((item): item is KeywordImportRow => item !== null);

      return keywords;
    } catch (error) {
      console.error('Failed to import keywords from sheet:', error);
      return [];
    }
  }

  /**
   * 企画をスプレッドシートにエクスポート
   * ※ Google Sheets API v4のwrite操作にはOAuth認証が必要
   * ここでは公開用のURLを生成するだけ
   */
  async generateExportData(
    projects: Project[]
  ): Promise<{ headers: string[]; rows: string[][] }> {
    const headers = [
      '生成日時',
      'タイトル',
      'キーワード',
      'ステータス',
      'サムネイル単語',
      '台本（抜粋）',
    ];

    const rows = projects.map((project) => [
      project.createdAt.toLocaleString('ja-JP'),
      project.title || '',
      project.keyword || '',
      project.status,
      project.thumbnailWord || '',
      project.finalScript ? project.finalScript.substring(0, 200) + '...' : '',
    ]);

    return { headers, rows };
  }

  /**
   * CSVとしてエクスポートデータを生成
   */
  async exportToCSV(projects: Project[]): Promise<string> {
    const { headers, rows } = await this.generateExportData(projects);

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const csvLines = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ];

    return csvLines.join('\n');
  }

  /**
   * シートの最終更新日時を取得
   */
  async getSheetLastModified(sheetId?: string): Promise<Date | null> {
    const targetSheetId = sheetId || this.keywordsSheetId;
    if (!this.apiKey || !targetSheetId) {
      return null;
    }

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetSheetId}?key=${this.apiKey}&fields=properties.title`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      // Note: Google Sheets APIのv4では直接最終更新日時を取得できないため、
      // ここではシートへのアクセス可否のみを確認
      return new Date();
    } catch {
      return null;
    }
  }
}

// シングルトンインスタンス
export const sheetsSync = new SheetsSyncService();
