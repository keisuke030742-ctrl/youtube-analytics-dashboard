/**
 * Slack Notify Service
 * Slack Incoming Webhookを使って通知を送信
 */

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: {
    type: string;
    text: string;
  }[];
  elements?: {
    type: string;
    text?: string;
    url?: string;
  }[];
  accessory?: {
    type: string;
    text?: { type: string; text: string };
    url?: string;
  };
}

interface SlackMessage {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: {
    color: string;
    blocks?: SlackBlock[];
  }[];
}

export class SlackNotifyService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = SLACK_WEBHOOK_URL;
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
  async sendMessage(message: SlackMessage): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Slack Webhook not configured');
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error('Slack Webhook error:', response.status);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      return false;
    }
  }

  /**
   * バッチ開始通知
   */
  async notifyBatchStart(batchId: string, targetCount: number): Promise<boolean> {
    const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return this.sendMessage({
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 週次企画生成を開始しました',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: `*バッチID:*\n\`${batchId}\`` },
            { type: 'mrkdwn', text: `*目標生成数:*\n${targetCount}件` },
            { type: 'mrkdwn', text: `*開始時刻:*\n${now}` },
            { type: 'mrkdwn', text: `*ステータス:*\n実行中` },
          ],
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: '処理完了後に再度通知します' },
          ],
        },
      ],
    });
  }

  /**
   * 進捗通知（10件ごと）
   */
  async notifyProgress(
    batchId: string,
    current: number,
    total: number,
    latestTitle?: string
  ): Promise<boolean> {
    const progress = Math.round((current / total) * 100);
    const progressBar = '▓'.repeat(Math.floor(progress / 10)) + '░'.repeat(10 - Math.floor(progress / 10));

    return this.sendMessage({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📊 *企画生成進捗* (${batchId.slice(0, 8)}...)\n\`${progressBar}\` *${progress}%* (${current}/${total}件)`,
          },
        },
        ...(latestTitle
          ? [
              {
                type: 'context',
                elements: [
                  { type: 'mrkdwn', text: `最新: ${latestTitle.substring(0, 80)}` },
                ],
              } as SlackBlock,
            ]
          : []),
      ],
    });
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
    topPlans?: { title: string; priorityRank: number; keyword: string }[];
  }): Promise<boolean> {
    const statusConfig: Record<string, { emoji: string; color: string; text: string }> = {
      COMPLETED: { emoji: '✅', color: '#2ecc71', text: '完了' },
      PARTIAL: { emoji: '⚠️', color: '#f39c12', text: '一部成功' },
      FAILED: { emoji: '❌', color: '#e74c3c', text: '失敗' },
      RUNNING: { emoji: '⏳', color: '#3498db', text: '実行中' },
    };

    const config = statusConfig[batch.status] || { emoji: '❓', color: '#95a5a6', text: batch.status };
    const successRate =
      batch.totalPlans > 0
        ? Math.round((batch.completedPlans / batch.totalPlans) * 100)
        : 0;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://hiramatsu-youtube-planner.vercel.app';

    const blocks: SlackBlock[] = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${config.emoji} 週次企画生成が${config.text}しました`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*実行日時:*\n${batch.triggeredAt.toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}` },
          { type: 'mrkdwn', text: `*ステータス:*\n${batch.status}` },
          { type: 'mrkdwn', text: `*成功:*\n${batch.completedPlans}件` },
          { type: 'mrkdwn', text: `*失敗:*\n${batch.failedPlans}件` },
          { type: 'mrkdwn', text: `*成功率:*\n${successRate}%` },
        ],
      },
    ];

    // TOP企画があれば表示
    if (batch.topPlans && batch.topPlans.length > 0) {
      const topPlansList = batch.topPlans
        .slice(0, 5)
        .map((p, i) => `${i + 1}. *${p.title || '無題'}* (\`${p.keyword}\`)`)
        .join('\n');

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🏆 優先度TOP5:*\n${topPlansList}`,
        },
      });
    }

    // ダッシュボードリンク
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<${appUrl}/auto-planner|📊 ダッシュボードを開く>`,
      },
    });

    return this.sendMessage({
      attachments: [
        {
          color: config.color,
          blocks,
        },
      ],
    });
  }

  /**
   * キーワード戦略完了通知
   */
  async notifyStrategyComplete(
    batchId: string,
    selectedKeywords: { keyword: string; score: number; reason: string }[]
  ): Promise<boolean> {
    const keywordList = selectedKeywords
      .slice(0, 10)
      .map((k, i) => `${i + 1}. \`${k.keyword}\` (スコア: ${k.score.toFixed(1)})`)
      .join('\n');

    return this.sendMessage({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🎯 *キーワード戦略完了* (${batchId.slice(0, 8)}...)\n\n選定数: ${selectedKeywords.length}件\n\n*TOP10キーワード:*\n${keywordList}`,
          },
        },
      ],
    });
  }

  /**
   * エラー通知
   */
  async notifyError(error: string, context?: string): Promise<boolean> {
    return this.sendMessage({
      attachments: [
        {
          color: '#e74c3c',
          blocks: [
            {
              type: 'header',
              text: {
                type: 'plain_text',
                text: '❌ エラーが発生しました',
                emoji: true,
              },
            },
            ...(context
              ? [
                  {
                    type: 'section',
                    text: {
                      type: 'mrkdwn',
                      text: `*発生箇所:* ${context}`,
                    },
                  } as SlackBlock,
                ]
              : []),
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*エラー内容:*\n\`\`\`${error.substring(0, 500)}\`\`\``,
              },
            },
          ],
        },
      ],
    });
  }
}

// シングルトンインスタンス
export const slackNotify = new SlackNotifyService();
