/**
 * プロジェクト関連の型定義
 */

export type ProjectStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface Project {
  id: string;
  title?: string;
  keyword?: string;
  userInstruction: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  phase1Result?: any;
  phase2Result?: any;
  phase3Result?: any;
  phase4Result?: any;
  finalScript?: string;
  thumbnailWord?: string;
}
