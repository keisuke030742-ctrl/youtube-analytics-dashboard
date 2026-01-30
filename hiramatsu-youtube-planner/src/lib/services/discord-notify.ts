/**
 * Discord Notify Service
 * Discord Webhookを使って通知を送信
 */

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || '';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

export class DiscordNotifyService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = DISCORD_WEBHOOK_URL;
  }

  /**
   * 設定が有効かチェック
   */
  isConfigured(): boolean {
    return !!this.webhookUrl;
  }

  /**
   * メッセージを送信
   */
  async sendMessage(content: string, embeds?: DiscordEmbed[]): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Discord Webhook not configured');
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          embeds,
        }),
      });

      if (!response.ok) {
        console.error('Discord Webhook error:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      return false;
    }
  }

  /**
   * バッチ開始通知
   */
  async notifyBatchStart(targetCount: number): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '🚀 週次企画生成を開始しました',
      color: 0x3498db, // 青
      fields: [
        { name: '目標生成数', value: `${targetCount}件`, inline: true },
        { name: '開始時刻', value: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }), inline: true },
      ],
      footer: { text: '処理完了後に再度通知します' },
    };

    return this.sendMessage('', [embed]);
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
    const statusConfig = {
      COMPLETED: { emoji: '✅', color: 0x2ecc71, text: '完了' },
      PARTIAL: { emoji: '⚠️', color: 0xf39c12, text: '一部成功' },
      FAILED: { emoji: '❌', color: 0xe74c3c, text: '失敗' },
      RUNNING: { emoji: '⏳', color: 0x3498db, text: '実行中' },
    }[batch.status] || { emoji: '❓', color: 0x95a5a6, text: batch.status };

    const successRate =
      batch.totalPlans > 0
        ? Math.round((batch.completedPlans / batch.totalPlans) * 100)
        : 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hiramatsu-youtube-planner.vercel.app';

    const embed: DiscordEmbed = {
      title: `${statusConfig.emoji} 週次企画生成が${statusConfig.text}しました`,
      color: statusConfig.color,
      fields: [
        { name: '実行日時', value: batch.triggeredAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }), inline: true },
        { name: 'ステータス', value: batch.status, inline: true },
        { name: '成功', value: `${batch.completedPlans}件`, inline: true },
        { name: '失敗', value: `${batch.failedPlans}件`, inline: true },
        { name: '成功率', value: `${successRate}%`, inline: true },
        { name: '確認', value: `[ダッシュボードを開く](${appUrl}/auto-planner)`, inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage('', [embed]);
  }

  /**
   * エラー通知
   */
  async notifyError(error: string, context?: string): Promise<boolean> {
    const embed: DiscordEmbed = {
      title: '❌ エラーが発生しました',
      color: 0xe74c3c, // 赤
      fields: [
        ...(context ? [{ name: '発生箇所', value: context, inline: false }] : []),
        { name: 'エラー内容', value: error.substring(0, 1000), inline: false },
      ],
      timestamp: new Date().toISOString(),
    };

    return this.sendMessage('', [embed]);
  }

  /**
   * 進捗通知
   */
  async notifyProgress(
    current: number,
    total: number,
    latestTitle?: string
  ): Promise<boolean> {
    const progress = Math.round((current / total) * 100);
    const progressBar = '█'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    const embed: DiscordEmbed = {
      title: '📊 企画生成進捗',
      color: 0x3498db,
      description: `\`[${progressBar}]\` **${progress}%**\n${current}/${total}件完了`,
      fields: latestTitle
        ? [{ name: '最新', value: latestTitle.substring(0, 100), inline: false }]
        : [],
    };

    return this.sendMessage('', [embed]);
  }
}

// シングルトンインスタンス
export const discordNotify = new DiscordNotifyService();
