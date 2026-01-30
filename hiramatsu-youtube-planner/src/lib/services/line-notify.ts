/**
 * LINE Notify Service
 * LINE Notifyを使って通知を送信
 */

import type { AutoPlanBatch } from '@prisma/client';

const LINE_NOTIFY_API = 'https://notify-api.line.me/api/notify';

export class LineNotifyService {
  private token: string;

  constructor() {
    this.token = process.env.LINE_NOTIFY_TOKEN || '';
  }

  /**
   * 設定が有効かチェック
   */
  isConfigured(): boolean {
    return !!this.token;
  }

  /**
   * メッセージを送信
   */
  async sendNotification(message: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('LINE Notify not configured');
      return false;
    }

    try {
      const response = await fetch(LINE_NOTIFY_API, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ message }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LINE Notify error:', response.status, errorText);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send LINE notification:', error);
      return false;
    }
  }

  /**
   * バッチ開始通知
   */
  async notifyBatchStart(targetCount: number): Promise<boolean> {
    const message = `
🚀 週次企画生成を開始しました

📊 目標生成数: ${targetCount}件
⏰ 開始時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}

処理完了後に再度通知します。
    `.trim();

    return this.sendNotification(message);
  }

  /**
   * バッチ完了通知
   */
  async notifyBatchComplete(batch: {
    id: string;
    triggeredAt: Date;
    status: string;
    completedPlans: number;
    failedPlans: number;
    totalPlans: number;
  }): Promise<boolean> {
    const statusEmoji = {
      COMPLETED: '✅',
      PARTIAL: '⚠️',
      FAILED: '❌',
      RUNNING: '⏳',
    }[batch.status] || '❓';

    const successRate =
      batch.totalPlans > 0
        ? Math.round((batch.completedPlans / batch.totalPlans) * 100)
        : 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hiramatsu-youtube-planner.vercel.app';

    const message = `
${statusEmoji} 週次企画生成が完了しました

📅 実行日時: ${batch.triggeredAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
📊 ステータス: ${batch.status}

📈 結果:
  - 成功: ${batch.completedPlans}件
  - 失敗: ${batch.failedPlans}件
  - 成功率: ${successRate}%

👉 確認: ${appUrl}/auto-planner
    `.trim();

    return this.sendNotification(message);
  }

  /**
   * エラー通知
   */
  async notifyError(error: string, context?: string): Promise<boolean> {
    const message = `
❌ エラーが発生しました

${context ? `📍 発生箇所: ${context}\n` : ''}
🔴 エラー内容:
${error.substring(0, 500)}${error.length > 500 ? '...' : ''}

⏰ 発生時刻: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
    `.trim();

    return this.sendNotification(message);
  }

  /**
   * 進捗通知（オプション）
   */
  async notifyProgress(
    current: number,
    total: number,
    latestTitle?: string
  ): Promise<boolean> {
    const progress = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const message = `
📊 企画生成進捗

[${progressBar}] ${progress}%
${current}/${total}件完了

${latestTitle ? `📝 最新: ${latestTitle.substring(0, 30)}...` : ''}
    `.trim();

    return this.sendNotification(message);
  }
}

// シングルトンインスタンス
export const lineNotify = new LineNotifyService();
