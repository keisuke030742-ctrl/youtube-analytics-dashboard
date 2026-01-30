/**
 * キーワード関連の型定義
 */

export interface Keyword {
  id: string;
  keyword: string;
  volume?: number | null;
  difficulty?: number | null;
  usageCount: number;
  lastUsedAt?: Date | null;
  category?: string | null;
  priority: number;
  isActive: boolean;
  notes?: string | null;
  source?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KeywordCreateInput {
  keyword: string;
  volume?: number;
  difficulty?: number;
  category?: string;
  priority?: number;
  notes?: string;
  source?: string;
}

export interface KeywordUpdateInput {
  keyword?: string;
  volume?: number | null;
  difficulty?: number | null;
  category?: string | null;
  priority?: number;
  isActive?: boolean;
  notes?: string | null;
  source?: string | null;
}

export interface KeywordImportRow {
  keyword: string;
  volume?: number;
  difficulty?: number;
  category?: string;
}

export interface KeywordStats {
  total: number;
  active: number;
  inactive: number;
  avgVolume: number;
  avgUsageCount: number;
  byCategory: Record<string, number>;
}
